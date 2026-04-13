import express from 'express';

const router = express.Router();

export interface ServiceNode {
  id: string;
  name: string;
  type: 'application' | 'database' | 'cache' | 'queue' | 'gateway' | 'external';
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  environment: string;
  region: string;
  version?: string;
  endpoints: string[];
  metadata: Record<string, unknown>;
  discoveredAt: Date;
  lastSeen: Date;
}

export interface ServiceDependency {
  source: string;
  target: string;
  type: 'sync' | 'async' | 'http' | 'grpc' | 'database' | 'cache' | 'queue';
  latency?: number;
  errorRate?: number;
  requestRate?: number;
}

export interface DiscoveredService {
  id: string;
  name: string;
  type: string;
  health: number;
  services: ServiceNode[];
  dependencies: ServiceDependency[];
}

const discoveredServices: Map<string, ServiceNode> = new Map();
const serviceDependencies: ServiceDependency[] = [];
const discoveryEnabled = process.env.SERVICE_DISCOVERY_ENABLED === 'true';

function initMockServices() {
  const mockServices: ServiceNode[] = [
    {
      id: 'svc-auth-001',
      name: 'auth-service',
      type: 'application',
      status: 'healthy',
      environment: 'production',
      region: 'us-east-1',
      version: '2.4.1',
      endpoints: ['/api/auth/*', '/api/oauth/*'],
      metadata: { team: 'security', owner: 'platform' },
      discoveredAt: new Date(),
      lastSeen: new Date(),
    },
    {
      id: 'svc-api-001',
      name: 'api-gateway',
      type: 'gateway',
      status: 'healthy',
      environment: 'production',
      region: 'us-east-1',
      version: '3.1.0',
      endpoints: ['/api/*'],
      metadata: { team: 'platform', owner: 'infrastructure' },
      discoveredAt: new Date(),
      lastSeen: new Date(),
    },
    {
      id: 'svc-db-001',
      name: 'postgres-main',
      type: 'database',
      status: 'healthy',
      environment: 'production',
      region: 'us-east-1',
      version: '14.8',
      endpoints: ['postgresql://db-main:5432'],
      metadata: { team: 'data', owner: 'platform' },
      discoveredAt: new Date(),
      lastSeen: new Date(),
    },
    {
      id: 'svc-cache-001',
      name: 'redis-session',
      type: 'cache',
      status: 'healthy',
      environment: 'production',
      region: 'us-east-1',
      version: '7.0.5',
      endpoints: ['redis://cache-001:6379'],
      metadata: { team: 'platform', owner: 'infrastructure' },
      discoveredAt: new Date(),
      lastSeen: new Date(),
    },
    {
      id: 'svc-queue-001',
      name: 'rabbit-mq',
      type: 'queue',
      status: 'degraded',
      environment: 'production',
      region: 'us-east-1',
      version: '3.11.0',
      endpoints: ['amqp://queue-001:5672'],
      metadata: { team: 'platform', owner: 'infrastructure' },
      discoveredAt: new Date(),
      lastSeen: new Date(),
    },
    {
      id: 'svc-payment-001',
      name: 'payment-service',
      type: 'application',
      status: 'healthy',
      environment: 'production',
      region: 'us-east-1',
      version: '1.8.2',
      endpoints: ['/api/payments/*'],
      metadata: { team: 'billing', owner: 'commerce' },
      discoveredAt: new Date(),
      lastSeen: new Date(),
    },
    {
      id: 'svc-order-001',
      name: 'order-service',
      type: 'application',
      status: 'degraded',
      environment: 'production',
      region: 'us-east-1',
      version: '2.1.0',
      endpoints: ['/api/orders/*'],
      metadata: { team: 'commerce', owner: 'commerce' },
      discoveredAt: new Date(),
      lastSeen: new Date(),
    },
    {
      id: 'svc-inventory-001',
      name: 'inventory-service',
      type: 'application',
      status: 'down',
      environment: 'production',
      region: 'us-east-1',
      version: '1.5.3',
      endpoints: ['/api/inventory/*'],
      metadata: { team: 'logistics', owner: 'supply-chain' },
      discoveredAt: new Date(),
      lastSeen: new Date(),
    },
  ];

  mockServices.forEach(s => discoveredServices.set(s.id, s));

  const mockDependencies: ServiceDependency[] = [
    { source: 'api-gateway', target: 'auth-service', type: 'http', latency: 12, errorRate: 0.01, requestRate: 1500 },
    { source: 'api-gateway', target: 'payment-service', type: 'http', latency: 45, errorRate: 0.02, requestRate: 800 },
    { source: 'api-gateway', target: 'order-service', type: 'http', latency: 38, errorRate: 0.15, requestRate: 1200 },
    { source: 'api-gateway', target: 'inventory-service', type: 'http', latency: 850, errorRate: 4.5, requestRate: 500 },
    { source: 'auth-service', target: 'postgres-main', type: 'database', latency: 5, errorRate: 0.001, requestRate: 3000 },
    { source: 'auth-service', target: 'redis-session', type: 'cache', latency: 1, errorRate: 0.001, requestRate: 5000 },
    { source: 'payment-service', target: 'postgres-main', type: 'database', latency: 8, errorRate: 0.01, requestRate: 1200 },
    { source: 'order-service', target: 'postgres-main', type: 'database', latency: 12, errorRate: 0.05, requestRate: 2500 },
    { source: 'order-service', target: 'rabbit-mq', type: 'queue', latency: 3, errorRate: 0.02, requestRate: 800 },
    { source: 'order-service', target: 'inventory-service', type: 'http', latency: 120, errorRate: 0.1, requestRate: 600 },
    { source: 'inventory-service', target: 'postgres-main', type: 'database', latency: 15, errorRate: 0.1, requestRate: 400 },
  ];

  serviceDependencies.push(...mockDependencies);
}

if (discoveryEnabled || !discoveryEnabled) {
  initMockServices();
}

router.get('/services', (req, res) => {
  const status = req.query.status as string;
  const type = req.query.type as string;
  const environment = req.query.environment as string;

  let services = Array.from(discoveredServices.values());

  if (status) {
    services = services.filter(s => s.status === status);
  }
  if (type) {
    services = services.filter(s => s.type === type);
  }
  if (environment) {
    services = services.filter(s => s.environment === environment);
  }

  res.json({
    count: services.length,
    services,
  });
});

router.get('/services/:id', (req, res) => {
  const service = discoveredServices.get(req.params.id);
  
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const dependencies = serviceDependencies.filter(d => d.source === service.name || d.target === service.name);
  
  res.json({
    ...service,
    dependencies,
  });
});

router.get('/topology', (req, res) => {
  const nodes = Array.from(discoveredServices.values()).map(s => ({
    id: s.id,
    name: s.name,
    type: s.type,
    status: s.status,
    group: s.type,
  }));

  const edges = serviceDependencies.map(d => {
    const allServices = Array.from(discoveredServices.values());
    const sourceNode = allServices.find(s => s.name === d.source);
    const targetNode = allServices.find(s => s.name === d.target);
    
    return {
      source: sourceNode?.id || d.source,
      target: targetNode?.id || d.target,
      type: d.type,
      latency: d.latency,
      errorRate: d.errorRate,
    };
  });

  res.json({ nodes, edges });
});

router.get('/dependencies', (req, res) => {
  const service = req.query.service as string;
  
  if (service) {
    const deps = serviceDependencies.filter(
      d => d.source === service || d.target === service
    );
    return res.json(deps);
  }

  res.json(serviceDependencies);
});

router.post('/register', (req, res) => {
  const service = req.body as ServiceNode;
  
  if (!service.id || !service.name) {
    return res.status(400).json({ error: 'Missing required fields: id, name' });
  }

  service.discoveredAt = new Date();
  service.lastSeen = new Date();
  
  discoveredServices.set(service.id, service);

  console.log(`[Discovery] Registered service: ${service.name}`);

  res.json({ status: 'registered', service });
});

router.post('/heartbeat', (req, res) => {
  const { serviceId, status, metadata } = req.body;
  
  const service = discoveredServices.get(serviceId);
  
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  service.lastSeen = new Date();
  if (status) {
    service.status = status;
  }
  if (metadata) {
    service.metadata = { ...service.metadata, ...metadata };
  }

  res.json({ status: 'ok' });
});

router.get('/health', (req, res) => {
  const now = new Date();
  let healthy = 0;
  let degraded = 0;
  let down = 0;
  let unknown = 0;

  discoveredServices.forEach(s => {
    const diff = now.getTime() - new Date(s.lastSeen).getTime();
    const isStale = diff > 60000;

    if (s.status === 'healthy' && !isStale) healthy++;
    else if (s.status === 'degraded' && !isStale) degraded++;
    else if (s.status === 'down') down++;
    else unknown++;
  });

  res.json({
    total: discoveredServices.size,
    healthy,
    degraded,
    down,
    unknown,
  });
});

export default router;