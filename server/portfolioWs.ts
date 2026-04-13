import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import OnboardingRequest from './models/OnboardingRequest.js';
import { getAllServices, toPortfolioFormat } from './serviceRegistry.js';
import { getAllEC2Instances } from './infraMonitor.js';

// Static fallback apps (for demo when no DB data)
const fallbackApps = [
  { id: 'APP-001', name: 'Customer Portal', tier: 'T1', health: 98, errorRate: '0.02%', latency: '124ms', status: 'Healthy', uptime: '99.99%', owner: 'Frontend Team' },
  { id: 'APP-002', name: 'Inventory API', tier: 'T1', health: 45, errorRate: '4.5%', latency: '850ms', status: 'Critical', uptime: '98.45%', owner: 'Backend Team' },
  { id: 'APP-003', name: 'Auth Service', tier: 'T1', health: 99, errorRate: '0.01%', latency: '45ms', status: 'Healthy', uptime: '99.99%', owner: 'Security Team' },
  { id: 'APP-004', name: 'Payment Gateway', tier: 'T1', health: 82, errorRate: '1.2%', latency: '340ms', status: 'Warning', uptime: '99.95%', owner: 'Billing Team' },
  { id: 'APP-005', name: 'Reporting Engine', tier: 'T2', health: 95, errorRate: '0.15%', latency: '1.2s', status: 'Healthy', uptime: '99.90%', owner: 'Data Team' },
  { id: 'APP-006', name: 'Legacy CRM', tier: 'T3', health: 70, errorRate: '2.4%', latency: '2.5s', status: 'Warning', uptime: '99.10%', owner: 'Legacy Team' },
  { id: 'APP-007', name: 'Mobile Backend', tier: 'T1', health: 97, errorRate: '0.05%', latency: '88ms', status: 'Healthy', uptime: '99.98%', owner: 'Mobile Team' },
  { id: 'APP-008', name: 'Email Dispatcher', tier: 'T2', health: 100, errorRate: '0.00%', latency: '15ms', status: 'Healthy', uptime: '100%', owner: 'Comms Team' },
  { id: 'APP-009', name: 'Order Processing', tier: 'T1', health: 38, errorRate: '6.8%', latency: '1.4s', status: 'Critical', uptime: '97.20%', owner: 'Commerce Team' },
  { id: 'APP-010', name: 'Warehouse Service', tier: 'T2', health: 52, errorRate: '3.9%', latency: '980ms', status: 'Critical', uptime: '98.10%', owner: 'Logistics Team' },
  { id: 'APP-011', name: 'Notification Hub', tier: 'T2', health: 88, errorRate: '0.8%', latency: '220ms', status: 'Warning', uptime: '99.80%', owner: 'Platform Team' },
  { id: 'APP-012', name: 'Analytics Pipeline', tier: 'T2', health: 91, errorRate: '0.3%', latency: '310ms', status: 'Healthy', uptime: '99.85%', owner: 'Data Team' },
];

// Generate random health metrics for an app
function generateMetrics(status: string) {
  if (status === 'Healthy') {
    return {
      health: Math.floor(Math.random() * 15) + 85,
      latency: Math.floor(Math.random() * 200 + 20) + 'ms',
      errorRate: (Math.random() * 0.5).toFixed(2) + '%'
    };
  } else if (status === 'Warning') {
    return {
      health: Math.floor(Math.random() * 30) + 50,
      latency: Math.floor(Math.random() * 800 + 200) + 'ms',
      errorRate: (Math.random() * 3 + 0.5).toFixed(2) + '%'
    };
  } else {
    return {
      health: Math.floor(Math.random() * 40) + 10,
      latency: (Math.random() * 2 + 1).toFixed(1) + 's',
      errorRate: (Math.random() * 8 + 3).toFixed(2) + '%'
    };
  }
}

export function setupPortfolioWebSocket() {
  const wss = new WebSocketServer({ noServer: true });

  // Build portfolio from: registered services + onboarded requests + EC2 infra + fallback apps
  let portfolioApps: any[] = [...fallbackApps];

  async function loadPortfolio() {
    try {
      // 1. Get registered services from Service Registry (real apps sending metrics via API)
      let registeredApps: any[] = [];
      try {
        const registryServices = getAllServices();
        registeredApps = registryServices.map(service => toPortfolioFormat(service));
        console.log(`[Portfolio WS] Found ${registeredApps.length} registered real services`);
      } catch (err) {
        console.log('[Portfolio WS] Service registry not available, skipping');
      }

      // 2. Fetch approved onboarding requests from database
      let onboardedApps: any[] = [];
      try {
        const onboardingRequests = await OnboardingRequest.find({ status: 'approved' });
        onboardedApps = onboardingRequests.map((req: any) => {
          const metrics = generateMetrics('Healthy');
          return {
            id: `APP-${req._id.toString().slice(-6)}`,
            name: req.appName,
            tier: req.tier,
            health: metrics.health,
            errorRate: metrics.errorRate,
            latency: metrics.latency,
            status: metrics.health > 80 ? 'Healthy' : metrics.health > 50 ? 'Warning' : 'Critical',
            uptime: (99 + Math.random()).toFixed(2) + '%',
            owner: req.owner
          };
        });
      } catch (err) {
        console.log('[Portfolio WS] DB not available, skipping onboarded apps');
      }

      // 3. Get EC2 infrastructure instances
      let infraApps: any[] = [];
      try {
        const ec2Instances = await getAllEC2Instances();
        infraApps = ec2Instances.map((instance: any) => ({
          id: instance.id,
          name: instance.name,
          tier: 'Infra',
          health: Math.round(100 - instance.cpu * 0.5),
          errorRate: instance.status === 'healthy' ? '0.00%' : '1.00%',
          latency: 'N/A',
          status: instance.status === 'healthy' ? 'Healthy' : 
                  instance.status === 'degraded' ? 'Warning' : 'Critical',
          uptime: instance.uptime,
          owner: instance.owner,
          type: 'ec2'
        }));
        console.log(`[Portfolio WS] Found ${infraApps.length} EC2 infrastructure instances`);
      } catch (err) {
        console.log('[Portfolio WS] Infra monitor not available, skipping EC2 instances');
      }

      // Combine: registered + onboarded + infra + fallback
      portfolioApps = [...registeredApps, ...onboardedApps, ...infraApps, ...fallbackApps];
      console.log(`[Portfolio WS] Total: ${registeredApps.length} registered + ${onboardedApps.length} onboarded + ${infraApps.length} infra + ${fallbackApps.length} demo`);
    } catch (err) {
      console.log('[Portfolio WS] Error loading portfolio:', err);
      portfolioApps = [...fallbackApps];
    }
  }

  // Initial load
  loadPortfolio();

  const broadcastPortfolio = async () => {
    // Reload from all sources
    await loadPortfolio();

    // Randomly update some fallback app metrics only (not registered, onboarded, or infra)
    const newApps = [...portfolioApps];
    const registeredCount = getAllServices().length;
    
    // Count non-fallback apps
    let onboardedCount = 0;
    let infraCount = 0;
    try {
      const onboardingRequests = await OnboardingRequest.find({ status: 'approved' });
      onboardedCount = onboardingRequests.length;
    } catch {}
    
    try {
      const ec2Instances = await getAllEC2Instances();
      infraCount = ec2Instances.length;
    } catch {}

    const specialAppsCount = registeredCount + onboardedCount + infraCount;
    
    const numToChange = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numToChange; i++) {
      // Only update fallback apps
      if (fallbackApps.length > 0) {
        const idx = Math.floor(Math.random() * fallbackApps.length) + specialAppsCount;
        if (idx < newApps.length && idx >= specialAppsCount) {
          const app = { ...newApps[idx] };
          app.health = Math.max(10, Math.min(100, app.health + Math.floor(Math.random() * 31) - 15));
          app.status = app.health > 80 ? 'Healthy' : app.health > 50 ? 'Warning' : 'Critical';
          const metrics = generateMetrics(app.status);
          app.latency = metrics.latency;
          app.errorRate = metrics.errorRate;
          newApps[idx] = app;
        }
      }
    }
    portfolioApps = newApps;

    const payload = JSON.stringify({ type: 'portfolio', data: portfolioApps });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  const intervalId = setInterval(broadcastPortfolio, 2000);

  wss.on('connection', (ws) => {
    console.log('[Portfolio WS] Client connected');
    loadPortfolio().then(() => {
      ws.send(JSON.stringify({ type: 'portfolio', data: portfolioApps }));
    });

    ws.on('close', () => {
      console.log('[Portfolio WS] Client disconnected');
    });
  });

  return wss;
}
