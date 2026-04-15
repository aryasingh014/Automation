import { useState, useEffect } from 'react';

export interface TelemetryData {
  latency: number;
  throughput: number;
  errorRate: number;
  cpu: number;
  memory: number;
}

const getWsUrl = (path: string) => {
  if (typeof window === 'undefined') return `ws://localhost:5000${path}`;
  if (import.meta.env.PROD) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${path}`;
  }
  return `ws://localhost:5000${path}`;
};
const WS_URL = getWsUrl('/api/telemetry');

function generateSimulatedData(prev: TelemetryData): TelemetryData {
  const jitter = (val: number, range: number, min: number, max: number) =>
    Math.min(max, Math.max(min, val + (Math.random() - 0.5) * range));
  return {
    latency: Math.round(jitter(prev.latency, 20, 60, 400)),
    throughput: Math.round(jitter(prev.throughput, 50, 100, 1200)),
    errorRate: parseFloat(jitter(prev.errorRate, 0.005, 0, 0.15).toFixed(4)),
    cpu: parseFloat(jitter(prev.cpu, 5, 5, 95).toFixed(1)),
    memory: parseFloat(jitter(prev.memory, 3, 20, 95).toFixed(1)),
  };
}

export function useTelemetry(interval = 2000) {
  const [data, setData] = useState<TelemetryData>({
    latency: 120,
    throughput: 450,
    errorRate: 0.02,
    cpu: 45,
    memory: 62
  });

  useEffect(() => {
    let ws: WebSocket | null = null;
    let simInterval: ReturnType<typeof setInterval> | null = null;
    let retries = 0;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    const MAX_RETRIES = 10;
    const BASE_DELAY = 2000;
    const MAX_DELAY = 30000;

    function startSimulation() {
      if (simInterval) return;
      simInterval = setInterval(() => {
        setData(prev => generateSimulatedData(prev));
      }, interval);
    }

    function getReconnectDelay() {
      const delay = Math.min(BASE_DELAY * Math.pow(2, retries), MAX_DELAY);
      return delay + Math.random() * 1000;
    }

    function connect() {
      try {
        ws = new WebSocket(WS_URL);

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'telemetry') {
              if (simInterval) { clearInterval(simInterval); simInterval = null; }
              setData(payload.data);
              retries = 0;
            }
          } catch (err) {
            console.error('Failed to parse telemetry data:', err);
          }
        };

        ws.onerror = () => {
          if (retries === 0) {
            console.warn('[Telemetry] WebSocket server unavailable — falling back to simulated data.');
          }
        };

        ws.onclose = () => {
          ws = null;
          if (retries < MAX_RETRIES) {
            const delay = getReconnectDelay();
            console.log(`[Telemetry] Reconnecting in ${Math.round(delay/1000)}s (attempt ${retries + 1}/${MAX_RETRIES})`);
            reconnectTimeout = setTimeout(connect, delay);
            retries++;
          } else {
            console.warn('[Telemetry] Max retries reached - using simulated data permanently');
            startSimulation();
          }
        };
      } catch {
        startSimulation();
      }
    }

    connect();

    return () => {
      if (ws) {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => ws?.close();
        } else {
          ws.close();
        }
      }
      if (simInterval) clearInterval(simInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [interval]);

  return data;
}

export function useHistoricalTelemetry(points = 10, interval = 2000) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const now = new Date();
    let current: TelemetryData = { latency: 120, throughput: 450, errorRate: 0.02, cpu: 45, memory: 62 };

    setHistory(Array.from({ length: points }).map((_, i) => ({
      time: new Date(now.getTime() - (points - i) * interval).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      latency: current.latency,
      throughput: current.throughput,
      errorRate: current.errorRate
    })));

    let ws: WebSocket | null = null;
    let simInterval: ReturnType<typeof setInterval> | null = null;

    function push(d: TelemetryData) {
      setHistory(prev => {
        const next = [...prev];
        if (next.length >= points) next.shift();
        next.push({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          latency: d.latency,
          throughput: d.throughput,
          errorRate: d.errorRate
        });
        return next;
      });
    }

    function startSimulation() {
      if (simInterval) return;
      simInterval = setInterval(() => {
        current = generateSimulatedData(current);
        push(current);
      }, interval);
    }

    try {
      ws = new WebSocket(WS_URL);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'telemetry') {
            if (simInterval) { clearInterval(simInterval); simInterval = null; }
            push(payload.data);
          }
        } catch {
          // ignore parse errors
        }
      };
      ws.onerror = () => startSimulation();
    } catch {
      startSimulation();
    }

    return () => {
      if (ws) {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => ws?.close();
        } else {
          ws.close();
        }
      }
      if (simInterval) clearInterval(simInterval);
    };
  }, [points, interval]);

  return history;
}
