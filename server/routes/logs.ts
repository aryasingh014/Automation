import express from 'express';
import { WebSocketServer } from 'ws';

const router = express.Router();

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  service: string;
  message: string;
  traceId?: string;
  spanId?: string;
  metadata?: Record<string, unknown>;
  source: string;
  host?: string;
  container?: string;
  kubernetes?: {
    pod: string;
    namespace: string;
    container: string;
  };
}

const logStore: LogEntry[] = [];
const MAX_LOGS = 10000;

const logLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

const mockServices = [
  'auth-service',
  'api-gateway',
  'payment-service',
  'order-service',
  'inventory-service',
  'postgres-main',
  'redis-session',
  'rabbit-mq',
];

const mockMessages = {
  DEBUG: [
    'Request received at /api/v1/data',
    'Parsing request payload',
    'Checking cache for key: user_session_',
    'Executing query plan',
    'Connection pool status: 5/10 active',
  ],
  INFO: [
    'Service started successfully',
    'User authenticated successfully',
    'Request processed in 45ms',
    'Cache hit for key: user_profile_123',
    'Database connection established',
    'Health check passed',
    'Configuration reloaded',
  ],
  WARN: [
    'High memory usage detected: 85%',
    'Slow query detected: 2.5s',
    'Cache miss for key: session_xyz',
    'Rate limit threshold approaching: 90%',
    'Connection pool reaching capacity: 8/10',
    'Retrying failed request (1/3)',
  ],
  ERROR: [
    'Connection timeout to database',
    'Authentication failed for user',
    'Failed to process payment',
    'Invalid request payload',
    'External API call failed',
    'Database query timeout',
  ],
  FATAL: [
    'Out of memory - service crashing',
    'Database connection pool exhausted',
    'Unhandled exception in request handler',
    'Critical security breach detected',
  ],
};

function generateMockLog(level?: string): LogEntry {
  const logLevel = (level || logLevels[Math.floor(Math.random() * logLevels.length)]) as LogEntry['level'];
  const service = mockServices[Math.floor(Math.random() * mockServices.length)];
  const messages = mockMessages[logLevel];
  const message = messages[Math.floor(Math.random() * messages.length)];

  return {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: new Date(),
    level: logLevel,
    service,
    message: `${message} [trace: ${Math.random().toString(36).substring(10)}]`,
    traceId: `trace-${Math.random().toString(36).substring(10)}`,
    spanId: `span-${Math.random().toString(36).substring(8)}`,
    metadata: {
      duration_ms: Math.floor(Math.random() * 1000),
      status_code: logLevel === 'ERROR' || logLevel === 'FATAL' ? 500 : 200,
    },
    source: 'agent',
    host: `node-${Math.floor(Math.random() * 10) + 1}`,
    container: `container-${Math.floor(Math.random() * 100) + 1}`,
  };
}

for (let i = 0; i < 100; i++) {
  const log = generateMockLog();
  log.timestamp = new Date(Date.now() - Math.random() * 3600000);
  logStore.push(log);
}

logStore.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

router.post('/ingest', (req, res) => {
  const body = req.body;
  
  if (!body.message || !body.service) {
    return res.status(400).json({ 
      error: 'Missing required fields: message, service' 
    });
  }

  const entry: LogEntry = {
    id: body.id || `log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
    level: body.level || 'INFO',
    service: body.service,
    message: body.message,
    traceId: body.traceId,
    spanId: body.spanId,
    metadata: body.metadata,
    source: body.source || 'http',
    host: body.host,
    container: body.container,
    kubernetes: body.kubernetes,
  };

  logStore.unshift(entry);

  if (logStore.length > MAX_LOGS) {
    logStore.pop();
  }

  broadcastLog(entry);

  res.json({ status: 'ingested', id: entry.id });
});

router.post('/batch', (req, res) => {
  const body = req.body as { logs: Partial<LogEntry>[] };
  
  if (!body.logs || !Array.isArray(body.logs)) {
    return res.status(400).json({ error: 'Missing logs array' });
  }

  const entries: LogEntry[] = body.logs.map(log => ({
    id: log.id || `log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
    level: log.level || 'INFO',
    service: log.service || 'unknown',
    message: log.message || '',
    traceId: log.traceId,
    spanId: log.spanId,
    metadata: log.metadata,
    source: 'batch',
  }));

  entries.forEach(e => {
    logStore.unshift(e);
  });

  while (logStore.length > MAX_LOGS) {
    logStore.pop();
  }

  res.json({ status: 'ingested', count: entries.length });
});

router.get('/query', (req, res) => {
  const {
    service,
    level,
    start,
    end,
    search,
    traceId,
    limit = '100',
    offset = '0',
  } = req.query;

  let results = [...logStore];

  if (service) {
    results = results.filter(l => l.service === service);
  }
  if (level) {
    results = results.filter(l => l.level === level);
  }
  if (start) {
    const startTime = new Date(start as string).getTime();
    results = results.filter(l => new Date(l.timestamp).getTime() >= startTime);
  }
  if (end) {
    const endTime = new Date(end as string).getTime();
    results = results.filter(l => new Date(l.timestamp).getTime() <= endTime);
  }
  if (search) {
    const searchLower = (search as string).toLowerCase();
    results = results.filter(l => 
      l.message.toLowerCase().includes(searchLower) ||
      l.service.toLowerCase().includes(searchLower)
    );
  }
  if (traceId) {
    results = results.filter(l => l.traceId === traceId);
  }

  const limitNum = parseInt(limit as string);
  const offsetNum = parseInt(offset as string);

  const total = results.length;
  results = results.slice(offsetNum, offsetNum + limitNum);

  res.json({
    total,
    limit: limitNum,
    offset: offsetNum,
    logs: results,
  });
});

router.get('/services', (req, res) => {
  const services = [...new Set(logStore.map(l => l.service))];
  const serviceCounts = services.map(service => ({
    name: service,
    count: logStore.filter(l => l.service === service).length,
    levels: {
      DEBUG: logStore.filter(l => l.service === service && l.level === 'DEBUG').length,
      INFO: logStore.filter(l => l.service === service && l.level === 'INFO').length,
      WARN: logStore.filter(l => l.service === service && l.level === 'WARN').length,
      ERROR: logStore.filter(l => l.service === service && l.level === 'ERROR').length,
      FATAL: logStore.filter(l => l.service === service && l.level === 'FATAL').length,
    },
  }));

  res.json(serviceCounts);
});

router.get('/stats', (req, res) => {
  const stats = {
    total: logStore.length,
    byLevel: {
      DEBUG: logStore.filter(l => l.level === 'DEBUG').length,
      INFO: logStore.filter(l => l.level === 'INFO').length,
      WARN: logStore.filter(l => l.level === 'WARN').length,
      ERROR: logStore.filter(l => l.level === 'ERROR').length,
      FATAL: logStore.filter(l => l.level === 'FATAL').length,
    },
    byService: {} as Record<string, number>,
  };

  logStore.forEach(l => {
    stats.byService[l.service] = (stats.byService[l.service] || 0) + 1;
  });

  res.json(stats);
});

router.get('/recent', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json(logStore.slice(0, limit));
});

function broadcastLog(entry: LogEntry) {
  const wss = (global as any).logWSS;
  if (!wss) return;

  const payload = JSON.stringify({
    type: 'log',
    data: entry,
  });

  wss.clients.forEach((client: any) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

export function setupLogWebSocket() {
  const wss = new WebSocketServer({ noServer: true });
  
  wss.on('connection', (ws: any) => {
    console.log('[Log WS] Client connected');
    
    ws.on('close', () => {
      console.log('[Log WS] Client disconnected');
    });
  });

  (global as any).logWSS = wss;
  return wss;
}

export default router;