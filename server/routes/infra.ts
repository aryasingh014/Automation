import express from 'express';
import { getAllEC2Instances, addManualInstance, removeManualInstance, getManualInstances, isAWSConfigured, discoverEC2Instances } from '../infraMonitor.js';

const router = express.Router();

// ====================
// EC2 Infrastructure Monitoring
// ====================

/**
 * GET /api/infra/instances
 * Get all EC2 instances with their metrics
 * 
 * Returns: Array of instances with CPU, memory, disk, status
 */
router.get('/instances', async (req, res) => {
  try {
    const instances = await getAllEC2Instances();
    res.json({ count: instances.length, instances });
  } catch (error: any) {
    console.error('[Infra] Failed to get instances:', error.message);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/infra/status
 * Check infrastructure monitoring status and configuration
 */
router.get('/status', (req, res) => {
  res.json({
    awsConfigured: isAWSConfigured(),
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    manualInstances: getManualInstances().length,
    message: isAWSConfigured() 
      ? 'AWS CloudWatch integration active' 
      : 'Add manual instances or configure AWS credentials'
  });
});

/**
 * POST /api/infra/instances
 * Add a manual EC2 instance with Node Exporter
 */
router.post('/instances', (req, res) => {
  try {
    const { name, ip, port = 9100 } = req.body;

    if (!name || !ip) {
      return res.status(400).json({ message: 'Name and IP are required' });
    }

    const instance = {
      id: `manual-${Date.now()}`,
      name,
      ip,
      port,
      type: 'node-exporter' as const
    };

    addManualInstance(instance);

    res.status(201).json({ 
      message: `Instance ${name} added for monitoring`,
      instance 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/infra/instances/:id
 * Remove a manual EC2 instance
 */
router.delete('/instances/:id', (req, res) => {
  try {
    const deleted = removeManualInstance(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Instance not found' });
    }

    res.json({ message: 'Instance removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/infra/discover
 * Trigger AWS EC2 discovery (requires AWS credentials)
 */
router.get('/discover', async (req, res) => {
  try {
    if (!isAWSConfigured()) {
      return res.status(503).json({ 
        message: 'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.',
        configure: {
          AWS_ACCESS_KEY_ID: 'your-access-key',
          AWS_SECRET_ACCESS_KEY: 'your-secret-key',
          AWS_REGION: 'us-east-1'
        }
      });
    }

    const instances = await discoverEC2Instances();
    res.json({ count: instances.length, instances });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/infra/metrics/:instanceId
 * Get detailed metrics for a specific EC2 instance
 */
router.get('/metrics/:instanceId', async (req, res) => {
  try {
    const { getEC2Metrics } = await import('../infraMonitor.js');
    const metrics = await getEC2Metrics(req.params.instanceId);
    
    if (!metrics) {
      return res.status(404).json({ message: 'Instance not found or metrics unavailable' });
    }

    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
