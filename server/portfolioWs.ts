import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import OnboardingRequest from './models/OnboardingRequest.js';
import { AppRegistry, Alert, Incident } from './models/Telemetry.js';
import { getAllServices, toPortfolioFormat } from './serviceRegistry.js';
import { getAllEC2Instances } from './infraMonitor.js';

// Generate random health metrics for an app based on its status
function generateInitialMetrics(status: string) {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'healthy') {
    return { health: 92 + Math.random() * 8, latency: 100 + Math.random() * 50, errorRate: 0.05 };
  } else if (s === 'warning' || s === 'degraded') {
    return { health: 60 + Math.random() * 15, latency: 350 + Math.random() * 150, errorRate: 1.8 };
  } else {
    return { health: 25 + Math.random() * 10, latency: 1100 + Math.random() * 500, errorRate: 6.5 };
  }
}

export function setupPortfolioWebSocket() {
  const wss = new WebSocketServer({ noServer: true });
  let portfolioApps: any[] = [];
  
  // Keep stateful metrics to allow graceful drifting
  const appMetricsState: Record<string, { health: number, latency: number, errorRate: number, recoveryTarget: string | null }> = {};

  async function loadPortfolio() {
    try {
      const registeredApps = await AppRegistry.find({});
      const activeAlerts = await Alert.find({ status: 'Active' });
      
      const mappedApps = registeredApps.map(app => {
        // Initialize state if not present
        if (!appMetricsState[app.appId]) {
            appMetricsState[app.appId] = { ...generateInitialMetrics(app.status || 'Healthy'), recoveryTarget: null };
        }

        const state = appMetricsState[app.appId];
        
        // 1. Check for DB alerts (they still take priority if active)
        const serviceAlerts = activeAlerts.filter(a => a.service === app.name);
        const hasDbCritical = serviceAlerts.some(a => a.severity === 'Critical');
        const hasDbWarning = serviceAlerts.some(a => a.severity === 'Warning');

        // 2. Randomly trigger a status change (3% chance per cycle per app)
        if (!state.recoveryTarget && Math.random() < 0.03) {
            state.recoveryTarget = Math.random() > 0.75 ? 'Critical' : 'Warning';
        }

        // 3. Process the drift based on the target
        const drift = Math.random() > 0.4 ? 1 : -1;
        
        if (state.recoveryTarget === 'Critical') {
            state.health = Math.max(15, state.health - (Math.random() * 8));
            state.latency = Math.min(2800, state.latency + (Math.random() * 300));
            state.errorRate = Math.min(12, state.errorRate + 0.5);
            if (state.health <= 28) state.recoveryTarget = 'Recovery'; // Start healing once hit bottom
        } else if (state.recoveryTarget === 'Warning') {
            state.health = Math.max(50, state.health - (Math.random() * 5));
            state.latency = Math.min(750, state.latency + (Math.random() * 100));
            if (state.health <= 58) state.recoveryTarget = 'Recovery';
        } else if (state.recoveryTarget === 'Recovery') {
            state.health = Math.min(96, state.health + (Math.random() * 6));
            state.latency = Math.max(90, state.latency - (Math.random() * 150));
            state.errorRate = Math.max(0.01, state.errorRate - 0.5);
            if (state.health >= 92) state.recoveryTarget = null; // Healed
        } else {
            // Normal background drift
            state.health = Math.max(10, Math.min(100, state.health + (drift * 0.4)));
            state.latency = Math.max(30, Math.min(3000, state.latency + (drift * 8)));
            state.errorRate = Math.max(0, state.errorRate + (drift * 0.05));
        }

        // 4. Final Status Determination
        let finalStatus = 'Healthy';
        if (hasDbCritical || state.health < 40) finalStatus = 'Critical';
        else if (hasDbWarning || state.health < 80) finalStatus = 'Warning';
        
        return {
          id: app.appId,
          name: app.name,
          tier: app.metadata?.tier || 'T1',
          health: Math.round(state.health),
          errorRate: Math.max(0, state.errorRate).toFixed(2) + '%',
          latency: Math.round(state.latency) + 'ms',
          status: finalStatus,
          uptime: (99 + (state.health / 500)).toFixed(2) + '%', // Slight uptime variability
          owner: app.owner || 'System Team'
        };
      });

      const onboardingRequests = await OnboardingRequest.find({ status: 'approved' });
      const onboardedApps = onboardingRequests.map((req: any) => {
        const id = `APP-${req._id.toString().slice(-6)}`;
        if (!appMetricsState[id]) {
            appMetricsState[id] = { ...generateInitialMetrics('Healthy'), recoveryTarget: null };
        }
        const state = appMetricsState[id];
        
        // Simpler drift for onboarded apps
        const drift = Math.random() > 0.5 ? 1 : -1;
        state.health = Math.max(85, Math.min(100, state.health + (drift * 0.1)));
        state.latency = Math.max(50, Math.min(200, state.latency + (drift * 2)));

        return {
          id: id,
          name: req.appName,
          tier: req.tier,
          health: Math.round(state.health),
          errorRate: '0.01%',
          latency: Math.round(state.latency) + 'ms',
          status: 'Healthy',
          uptime: '100%',
          owner: req.owner
        };
      });

      portfolioApps = [...mappedApps, ...onboardedApps];
    } catch (err) {
      console.error('[Portfolio WS] Error loading portfolio:', err);
    }
  }

  loadPortfolio();

  const broadcastPortfolio = async () => {
    await loadPortfolio();
    const payload = JSON.stringify({ type: 'portfolio', data: portfolioApps });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  const intervalId = setInterval(broadcastPortfolio, 3000); 

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'portfolio', data: portfolioApps }));
    ws.on('close', () => {});
  });

  return wss;
}
