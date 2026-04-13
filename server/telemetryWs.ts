import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export function setupTelemetryWebSocket() {
  const wss = new WebSocketServer({ noServer: true });

  // Baseline mock data
  let currentMetrics = {
    latency: 120,
    throughput: 450,
    errorRate: 0.02,
    cpu: 45,
    memory: 62
  };

  // Broadcast function to all connected clients
  const broadcastMetrics = () => {
    // Math logic originally living in the frontend useTelemetry.ts
    currentMetrics = {
      latency: Math.max(80, Math.min(500, currentMetrics.latency + (Math.random() * 40 - 20))),
      throughput: Math.max(100, Math.min(1000, currentMetrics.throughput + (Math.random() * 100 - 50))),
      errorRate: Math.max(0, Math.min(0.2, currentMetrics.errorRate + (Math.random() * 0.01 - 0.005))),
      cpu: Math.max(10, Math.min(100, currentMetrics.cpu + (Math.random() * 10 - 5))),
      memory: Math.max(20, Math.min(100, currentMetrics.memory + (Math.random() * 5 - 2.5)))
    };

    const payload = JSON.stringify({ type: 'telemetry', data: currentMetrics });
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  // Update metrics and emit every 2 seconds
  const intervalId = setInterval(broadcastMetrics, 2000);

  wss.on('connection', (ws) => {
    console.log('[Telemetry WS] Client connected');
    
    // Send immediate initial data state upon connecting
    ws.send(JSON.stringify({ type: 'telemetry', data: currentMetrics }));

    ws.on('close', () => {
      console.log('[Telemetry WS] Client disconnected');
    });
  });

  wss.on('close', () => {
    clearInterval(intervalId);
  });

  return wss;
}
