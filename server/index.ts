import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import dataRoutes from './routes/data.js';
import webhookRoutes from './routes/webhooks.js';
import discoveryRoutes from './routes/discovery.js';
import logRoutes from './routes/logs.js';
import registryRoutes from './routes/registry.js';
import infraRoutes from './routes/infra.js';
import chatRoutes from './routes/chat.js';
import llmUsageRoutes from './routes/llmUsage.js';
import { setupTelemetryWebSocket } from './telemetryWs.js';
import { setupIncidentWS } from './incidentWs.js';
import { setupWebhookWebSocket } from './routes/webhooks.js';
import { setupLogWebSocket } from './routes/logs.js';
import { setupPortfolioWebSocket } from './portfolioWs.js';
import { seedDatabase } from './seedData.js';
import { 
  fetchServiceNowIncidents, 
  fetchJiraIncidents, 
  fetchZendeskIncidents 
} from './services/ticketingService.js';

dotenv.config();

// Validate critical environment variables
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'MONGO_URI'];
REQUIRED_ENV_VARS.forEach(envVar => {
  if (!process.env[envVar]) {
    console.warn(`[API] WARNING: Missing required environment variable: ${envVar}`);
  }
});

const app = express();

// Connect to MongoDB
connectDB().then(() => {
  console.log('[API] Database connection initialized');
  seedDatabase();
}).catch((err) => {
  console.error('[API] Database connection failed - running in limited mode:', err.message);
  (global as any).dbError = err.message;
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
import onboardingRoutes from './routes/onboarding.js';

app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/registry', registryRoutes);
app.use('/api/infra', infraRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/llm', llmUsageRoutes);


app.post('/api/rum/ingest', (req, res) => {
  // Acknowledge RUM tracking data without saving to avoid 404 errors in production
  res.status(200).json({ success: true, message: "RUM telemetry received" });
});

app.get('/api/incidents', async (req, res) => {
  const platform = req.query.platform || 'servicenow';
  
  try {
    let incidents = [];
    if (platform === 'jira') {
      console.log(`[API] Fetching incidents from Jira...`);
      incidents = await fetchJiraIncidents();
    } else if (platform === 'zendesk') {
      console.log(`[API] Fetching tickets from Zendesk...`);
      incidents = await fetchZendeskIncidents();
    } else {
      console.log('[API] Fetching incidents from ServiceNow...');
      incidents = await fetchServiceNowIncidents();
    }
    
    res.json(incidents.map(inc => ({
      ...inc,
      // Map field names to what the frontend expects if they differ
      priority: inc.priority,
      age: inc.age,
      owner: inc.owner
    })));
  } catch (error: any) {
    console.error(`[API] Failed to fetch ${platform} incidents:`, error);
    res.json([]);
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Observability.OS API is running',
    database: (global as any).dbError ? 'disconnected' : 'connected',
    dbError: (global as any).dbError || null
  });
});

// ── Ticketing Proxies ──────────────────────────────────────────────────────
/**
 * Generic proxy to forward requests to external ticketing platforms
 * to bypass browser CORS restrictions.
 */
app.post('/api/ticketing/proxy', async (req, res) => {
  const { url, method, headers, body } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, message: 'URL is required' });
  }

  try {
    console.log(`[Proxy] Forwarding ${method || 'GET'} to ${url}`);
    if (body) console.log(`[Proxy] Body:`, JSON.stringify(body, null, 2));

    const response = await fetch(url, {
      method: method || 'GET',
      headers: {
        ...headers,
        'User-Agent': 'Observability OS Dashboard/1.0',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      console.error(`[Proxy] Error from ${url} (${response.status}):`, JSON.stringify(data, null, 2));
      return res.status(response.status).json(data);
    }

    res.status(response.status).json(data);
  } catch (error: any) {
    console.error(`[Proxy] Failed to reach ${url}:`, error.message);
  }
});

app.get('/api/ticketing/config', (req, res) => {
  res.json({
    platform: 'jira',
    jira: {
      domain: process.env.JIRA_DOMAIN || '',
      email: process.env.JIRA_EMAIL || '',
      apiToken: process.env.JIRA_API_TOKEN || '',
      projectKey: process.env.JIRA_PROJECT_KEY || '',
      issueType: process.env.JIRA_ISSUE_TYPE || 'Task'
    },
    servicenow: {
      instanceUrl: process.env.SERVICENOW_INSTANCE_URL || '',
      user: process.env.SERVICENOW_USER || '',
      password: process.env.SERVICENOW_PASSWORD || '',
      autoIncidentEnabled: false
    },
    zendesk: {
      subdomain: process.env.ZENDESK_SUBDOMAIN || '',
      email: process.env.ZENDESK_EMAIL || '',
      apiToken: process.env.ZENDESK_API_TOKEN || ''
    }
  });
});

app.post('/api/portfolio/restart/:appId', (req, res) => {
  if (typeof (global as any).restartPortfolioApp === 'function') {
    (global as any).restartPortfolioApp(req.params.appId);
    res.json({ success: true, message: `App ${req.params.appId} restarted and healed.` });
  } else {
    res.status(500).json({ success: false, message: 'Restart function not bound.' });
  }
});

// ── Ollama Proxy Routes ────────────────────────────────────────────────────
// Use Node's native http module (not fetch) – confirmed working on this system.
const OLLAMA_HOST = '127.0.0.1';
const OLLAMA_PORT = 11434;

/** Make a server-side HTTP request to Ollama and return the response body */
function ollamaRequest(path: string, method: string, body?: object): Promise<{ status: number; data: Buffer }> {
  return new Promise((resolve, reject) => {
    const payload = body ? Buffer.from(JSON.stringify(body)) : undefined;
    const options: http.RequestOptions = {
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': payload.length } : {}),
      },
    };
    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 200, data: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('Ollama request timed out')); });
    if (payload) req.write(payload);
    req.end();
  });
}

/** Pipe a streaming Ollama response (NDJSON) back to the Express response */
function ollamaStream(path: string, body: object, res: express.Response): Promise<void> {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const options: http.RequestOptions = {
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length },
    };
    const req = http.request(options, (upstream) => {
      res.setHeader('Content-Type', 'application/x-ndjson');
      upstream.pipe(res);
      upstream.on('end', resolve);
      upstream.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(new Error('Ollama stream timed out')); });
    req.write(payload);
    req.end();
  });
}

app.get('/api/ollama/tags', async (_req, res) => {
  try {
    console.log('[Ollama] Fetching model list...');
    const { status, data } = await ollamaRequest('/api/tags', 'GET');
    const parsed = JSON.parse(data.toString());
    console.log(`[Ollama] Found ${parsed.models?.length ?? 0} models`);
    res.status(status).json(parsed);
  } catch (err: any) {
    console.error('[Ollama] tags error:', err.message);
    res.status(503).json({ error: `Cannot reach Ollama: ${err.message}` });
  }
});

app.post('/api/ollama/generate', async (req, res) => {
  try {
    await ollamaStream('/api/generate', req.body, res);
  } catch (err: any) {
    console.error('[Ollama] generate error:', err.message);
    if (!res.headersSent) res.status(503).json({ error: `Ollama error: ${err.message}` });
  }
});
// ──────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Attach WebSocket Servers without binding upgrade events
const wssTelemetry = setupTelemetryWebSocket();
const wssIncident = setupIncidentWS();
const wssWebhook = setupWebhookWebSocket();
const wssLogs = setupLogWebSocket();
const wssPortfolio = setupPortfolioWebSocket();

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  if (pathname === '/api/telemetry') {
    wssTelemetry.handleUpgrade(request, socket, head, (ws) => {
      wssTelemetry.emit('connection', ws, request);
    });
  } else if (pathname === '/api/ws') {
    wssIncident.handleUpgrade(request, socket, head, (ws) => {
      wssIncident.emit('connection', ws, request);
    });
  } else if (pathname === '/api/webhooks') {
    wssWebhook.handleUpgrade(request, socket, head, (ws) => {
      wssWebhook.emit('connection', ws, request);
    });
  } else if (pathname === '/api/logs') {
    wssLogs.handleUpgrade(request, socket, head, (ws) => {
      wssLogs.emit('connection', ws, request);
    });
  } else if (pathname === '/api/portfolio') {
    wssPortfolio.handleUpgrade(request, socket, head, (ws) => {
      wssPortfolio.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});
