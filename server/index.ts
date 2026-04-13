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
import { setupTelemetryWebSocket } from './telemetryWs.js';
import { setupIncidentWS } from './incidentWs.js';
import { setupWebhookWebSocket } from './routes/webhooks.js';
import { setupLogWebSocket } from './routes/logs.js';
import { setupPortfolioWebSocket } from './portfolioWs.js';

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB().then(() => {
  console.log('[API] Database connection initialized');
}).catch((err) => {
  console.error('[API] Database connection failed - running in limited mode:', err.message);
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

app.get('/api/incidents', async (req, res) => {
  const { SERVICENOW_INSTANCE_URL, SERVICENOW_USER, SERVICENOW_PASSWORD } = process.env;
  console.log('[API] Fetching incidents from ServiceNow...');

  if (!SERVICENOW_INSTANCE_URL || !SERVICENOW_USER || !SERVICENOW_PASSWORD) {
    console.error('[API] ServiceNow credentials missing');
    return res.status(500).json({ error: 'ServiceNow credentials are not configured on the server.' });
  }

  try {
    const auth = Buffer.from(`${SERVICENOW_USER}:${SERVICENOW_PASSWORD}`).toString('base64');
    const response = await fetch(`${SERVICENOW_INSTANCE_URL}/api/now/table/incident?sysparm_limit=10&sysparm_query=ORDERBYDESCsys_created_on&sysparm_display_value=true`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] ServiceNow error (${response.status}):`, errorText);
      return res.status(response.status).json({ error: `ServiceNow error: ${errorText}` });
    }

    const data = await response.json();
    console.log(`[API] Successfully fetched ${data.result?.length || 0} incidents`);
    const incidents = (data.result || []).map((inc: any) => ({
      id: inc.number,
      number: inc.number,
      sys_id: inc.sys_id,
      title: inc.short_description || "No description provided",
      priority: inc.priority || "P3",
      status: inc.state || "New",
      owner: inc.assigned_to?.display_value || "Unassigned",
      age: inc.sys_created_on ? new Date(inc.sys_created_on).toLocaleString() : "Recently"
    }));

    res.json(incidents);
  } catch (error: any) {
    console.error('[API] Failed to fetch ServiceNow incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents from ServiceNow.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Observability.OS API is running' });
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
