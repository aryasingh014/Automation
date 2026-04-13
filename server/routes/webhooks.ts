import express from 'express';
import { WebSocketServer } from 'ws';

const router = express.Router();

interface WebhookPayload {
  source: string;
  alert_type?: string;
  message: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  timestamp?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  services?: string[];
}

interface StoredWebhookEvent {
  id: string;
  source: string;
  alertType: string;
  message: string;
  severity: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
  tags: string[];
  services: string[];
  receivedAt: Date;
}

const webhookEvents: StoredWebhookEvent[] = [];

const webhookAuthToken = process.env.WEBHOOK_AUTH_TOKEN;

function authenticateWebhook(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!webhookAuthToken) {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${webhookAuthToken}`) {
    return next();
  }
  
  return res.status(401).json({ error: 'Unauthorized' });
}

router.post('/alert', authenticateWebhook, (req, res) => {
  const body = req.body as WebhookPayload;
  
  if (!body.source || !body.message) {
    return res.status(400).json({ 
      error: 'Missing required fields: source, message' 
    });
  }

  const event: StoredWebhookEvent = {
    id: `WH-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    source: body.source,
    alertType: body.alert_type || 'unknown',
    message: body.message,
    severity: body.severity || 'info',
    timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
    metadata: body.metadata || {},
    tags: body.tags || [],
    services: body.services || [],
    receivedAt: new Date(),
  };

  webhookEvents.unshift(event);
  
  if (webhookEvents.length > 1000) {
    webhookEvents.pop();
  }

  broadcastWebhookEvent(event);

  console.log(`[Webhook] Received alert from ${body.source}: ${body.message}`);

  res.json({ 
    status: 'received', 
    id: event.id,
    timestamp: event.receivedAt 
  });
});

router.post('/metric', authenticateWebhook, (req, res) => {
  const body = req.body;
  
  if (!body.metric || body.value === undefined) {
    return res.status(400).json({ 
      error: 'Missing required fields: metric, value' 
    });
  }

  console.log(`[Webhook] Received metric: ${body.metric} = ${body.value}`);

  res.json({ status: 'received' });
});

router.post('/log', authenticateWebhook, (req, res) => {
  const body = req.body;
  
  if (!body.message) {
    return res.status(400).json({ 
      error: 'Missing required field: message' 
    });
  }

  console.log(`[Webhook] Received log from ${body.source || 'unknown'}: ${body.message}`);

  res.json({ status: 'received' });
});

router.get('/events', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const source = req.query.source as string;
  const severity = req.query.severity as string;

  let events = [...webhookEvents];

  if (source) {
    events = events.filter(e => e.source === source);
  }
  if (severity) {
    events = events.filter(e => e.severity === severity);
  }

  res.json(events.slice(0, limit));
});

router.get('/sources', (req, res) => {
  const sources = [...new Set(webhookEvents.map(e => e.source))];
  res.json(sources);
});

function broadcastWebhookEvent(event: StoredWebhookEvent) {
  const wss = (global as any).webhookWSS;
  if (!wss) return;

  const payload = JSON.stringify({
    type: 'webhook_event',
    data: event,
  });

  wss.clients.forEach((client: any) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

export function setupWebhookWebSocket() {
  const wss = new WebSocketServer({ noServer: true });
  
  wss.on('connection', (ws: any) => {
    console.log('[Webhook WS] Client connected');
    
    ws.on('close', () => {
      console.log('[Webhook WS] Client disconnected');
    });
  });

  (global as any).webhookWSS = wss;
  return wss;
}

export default router;