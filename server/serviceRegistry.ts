/**
 * Service Registry - Simple API-based registration for real apps
 * 
 * Real apps can register and send metrics via REST API
 * This replaces simulated data with actual metrics
 */

import { WebSocketServer } from 'ws';

export interface ServiceMetrics {
  timestamp: Date;
  latency?: number;      // in ms
  errorRate?: number;  // percentage
  cpu?: number;         // percentage
  memory?: number;      // percentage
  uptime?: number;      // percentage
  health?: number;      // 0-100
  status?: 'healthy' | 'degraded' | 'down' | 'unknown';
}

export interface RegisteredService {
  id: string;
  name: string;
  type: 'application' | 'database' | 'cache' | 'queue' | 'gateway' | 'external';
  tier?: string;           // T1, T2, T3
  owner?: string;
  environment?: string;
  region?: string;
  version?: string;
  registeredAt: Date;
  lastHeartbeat: Date;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  metrics: ServiceMetrics;
  metadata?: Record<string, any>;
}

// In-memory service registry (could be persisted to DB)
const services = new Map<string, RegisteredService>();

// Configuration
const HEARTBEAT_TIMEOUT_MS = 60000; // 60 seconds - if no heartbeat, mark as unknown

/**
 * Register a new service
 */
export function registerService(data: {
  id: string;
  name: string;
  type?: 'application' | 'database' | 'cache' | 'queue' | 'gateway' | 'external';
  tier?: string;
  owner?: string;
  environment?: string;
  region?: string;
  version?: string;
  metadata?: Record<string, any>;
}): { success: boolean; service?: RegisteredService; message: string } {
  
  const { id, name, type = 'application' } = data;
  
  if (!id || !name) {
    return { success: false, message: 'Service ID and name are required' };
  }
  
  if (services.has(id)) {
    return { success: false, message: `Service ${id} is already registered` };
  }
  
  const service: RegisteredService = {
    id,
    name,
    type,
    tier: data.tier,
    owner: data.owner,
    environment: data.environment,
    region: data.region || 'us-east-1',
    version: data.version,
    registeredAt: new Date(),
    lastHeartbeat: new Date(),
    status: 'unknown',
    metrics: {
      timestamp: new Date(),
    },
    metadata: data.metadata
  };
  
  services.set(id, service);
  console.log(`[ServiceRegistry] Registered: ${name} (${id})`);
  
  return { success: true, service, message: `Service ${name} registered successfully` };
}

/**
 * Send heartbeat with metrics (called by real apps)
 */
export function updateHeartbeat(serviceId: string, data: {
  status?: 'healthy' | 'degraded' | 'down' | 'unknown';
  latency?: number;
  errorRate?: number;
  cpu?: number;
  memory?: number;
  uptime?: number;
  health?: number;
  metadata?: Record<string, any>;
}): { success: boolean; message: string } {
  
  const service = services.get(serviceId);
  
  if (!service) {
    return { success: false, message: `Service ${serviceId} not found. Register first at POST /api/registry/register` };
  }
  
  // Update status
  if (data.status) {
    service.status = data.status;
  } else if (data.health !== undefined) {
    service.status = data.health >= 80 ? 'healthy' : data.health >= 50 ? 'degraded' : 'down';
  }
  
  // Update metrics
  service.metrics = {
    timestamp: new Date(),
    latency: data.latency,
    errorRate: data.errorRate,
    cpu: data.cpu,
    memory: data.memory,
    uptime: data.uptime,
    health: data.health,
    status: service.status
  };
  
  // Update metadata if provided
  if (data.metadata) {
    service.metadata = { ...service.metadata, ...data.metadata };
  }
  
  service.lastHeartbeat = new Date();
  
  return { success: true, message: `Heartbeat updated for ${service.name}` };
}

/**
 * Get all registered services with their current status
 */
export function getAllServices(): RegisteredService[] {
  const now = new Date();
  
  // Check for stale services (no heartbeat in 60s)
  const allServices: RegisteredService[] = [];
  
  services.forEach((service) => {
    const timeSinceHeartbeat = now.getTime() - new Date(service.lastHeartbeat).getTime();
    
    // If no heartbeat for > 60s, mark as unknown
    if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT_MS && service.status !== 'unknown') {
      service.status = 'unknown';
    }
    
    allServices.push(service);
  });
  
  return allServices;
}

/**
 * Get a specific service
 */
export function getService(serviceId: string): RegisteredService | undefined {
  return services.get(serviceId);
}

/**
 * Unregister a service
 */
export function unregisterService(serviceId: string): boolean {
  const deleted = services.delete(serviceId);
  if (deleted) {
    console.log(`[ServiceRegistry] Unregistered: ${serviceId}`);
  }
  return deleted;
}

/**
 * Get service by name
 */
export function getServiceByName(name: string): RegisteredService | undefined {
  for (const service of services.values()) {
    if (service.name.toLowerCase() === name.toLowerCase()) {
      return service;
    }
  }
  return undefined;
}

/**
 * Convert registered service to portfolio app format
 */
export function toPortfolioFormat(service: RegisteredService): {
  id: string;
  name: string;
  tier: string;
  health: number;
  errorRate: string;
  latency: string;
  status: string;
  uptime: string;
  owner: string;
} {
  const health = service.metrics.health ?? 
    (service.status === 'healthy' ? 95 : service.status === 'degraded' ? 65 : 20);
  
  const latency = service.metrics.latency 
    ? `${service.metrics.latency}ms` 
    : 'N/A';
  
  const errorRate = service.metrics.errorRate 
    ? `${service.metrics.errorRate}%` 
    : '0%';
  
  const uptime = service.metrics.uptime 
    ? `${service.metrics.uptime}%` 
    : '100%';
  
  return {
    id: service.id,
    name: service.name,
    tier: service.tier || 'T2',
    health,
    errorRate,
    latency,
    status: service.status === 'healthy' ? 'Healthy' : 
            service.status === 'degraded' ? 'Warning' : 
            service.status === 'down' ? 'Critical' : 'Unknown',
    uptime,
    owner: service.owner || 'Unknown'
  };
}
