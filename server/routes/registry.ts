import express from 'express';
import { registerService, updateHeartbeat, getAllServices, getService, unregisterService, toPortfolioFormat } from '../serviceRegistry.js';

const router = express.Router();

// ====================
// Public API (No Auth) - For real services to register themselves
// ====================

/**
 * POST /api/registry/register
 * Register a new service
 * 
 * Body:
 * {
 *   "id": "svc-001",
 *   "name": "My Service",
 *   "type": "application", // application, database, cache, queue, gateway
 *   "tier": "T1",
 *   "owner": "team@company.com",
 *   "environment": "production",
 *   "region": "us-east-1",
 *   "version": "1.0.0"
 * }
 */
router.post('/register', (req, res) => {
  try {
    const result = registerService(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/registry/heartbeat
 * Send metrics/heartbeat from a service
 * 
 * Body:
 * {
 *   "serviceId": "svc-001",
 *   "status": "healthy", // healthy, degraded, down
 *   "latency": 45,       // ms
 *   "errorRate": 0.5,    // percentage
 *   "cpu": 42,          // percentage
 *   "memory": 68,       // percentage
 *   "uptime": 99.99,    // percentage
 *   "health": 95        // 0-100
 * }
 */
router.post('/heartbeat', (req, res) => {
  try {
    const { serviceId, ...metrics } = req.body;
    
    if (!serviceId) {
      return res.status(400).json({ success: false, message: 'serviceId is required' });
    }
    
    const result = updateHeartbeat(serviceId, metrics);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/registry/services
 * Get all registered services
 */
router.get('/services', (req, res) => {
  try {
    const services = getAllServices();
    res.json({ count: services.length, services });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/registry/services/:id
 * Get a specific service
 */
router.get('/services/:id', (req, res) => {
  try {
    const service = getService(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json(service);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/registry/services/:id
 * Unregister a service
 */
router.delete('/services/:id', (req, res) => {
  try {
    const deleted = unregisterService(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json({ message: 'Service unregistered successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/registry/portfolio
 * Get services in portfolio format (for WebSocket)
 */
router.get('/portfolio', (req, res) => {
  try {
    const services = getAllServices();
    const portfolio = services.map(s => toPortfolioFormat(s));
    res.json(portfolio);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
