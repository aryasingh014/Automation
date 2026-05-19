import express from 'express';
import { protect, AuthRequest } from '../middleware/authMiddleware.js';
import { Telemetry, Alert, Incident, AuditLog, CustomDashboard } from '../models/Telemetry.js';

const router = express.Router();

router.use(protect);

router.post('/telemetry', async (req: AuthRequest, res) => {
  try {
    const telemetry = await Telemetry.create(req.body);
    res.json(telemetry);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/telemetry/history', async (req: AuthRequest, res) => {
  try {
    const { service, from, to, limit = 100 } = req.query;
    const query: any = {};
    if (service) query.serviceName = service;
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from as string);
      if (to) query.timestamp.$lte = new Date(to as string);
    }
    const data = await Telemetry.find(query).sort({ timestamp: -1 }).limit(Number(limit));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/telemetry/latest', async (req: AuthRequest, res) => {
  try {
    const data = await Telemetry.findOne().sort({ timestamp: -1 });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/alerts', async (req: AuthRequest, res) => {
  try {
    const alert = await Alert.create(req.body);
    await AuditLog.create({
      userId: req.user?._id,
      userEmail: req.user?.email,
      action: 'alert_created',
      resource: 'alerts',
      details: alert
    });
    res.json(alert);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/alerts', async (req: AuthRequest, res) => {
  try {
    const { status, severity, limit = 50 } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;
    const alerts = await Alert.find(query).sort({ createdAt: -1 }).limit(Number(limit));
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/alerts/:id', async (req: AuthRequest, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    await AuditLog.create({
      userId: req.user?._id,
      userEmail: req.user?.email,
      action: 'alert_updated',
      resource: 'alerts',
      details: req.body
    });
    res.json(alert);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/incidents', async (req: AuthRequest, res) => {
  try {
    const incident = await Incident.create(req.body);
    await AuditLog.create({
      userId: req.user?._id,
      userEmail: req.user?.email,
      action: 'incident_created',
      resource: 'incidents',
      details: incident
    });
    res.json(incident);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/incidents', async (req: AuthRequest, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const query: any = {};
    if (status) query.status = status;
    const incidents = await Incident.find(query).sort({ createdAt: -1 }).limit(Number(limit));
    res.json(incidents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/audit-log', async (req: AuthRequest, res) => {
  try {
    const { userId, action, limit = 100 } = req.query;
    const query: any = {};
    if (userId) query.userId = userId;
    if (action) query.action = action;
    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).limit(Number(limit));
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/dashboards', async (req: AuthRequest, res) => {
  try {
    const dashboard = await CustomDashboard.create({
      ...req.body,
      userId: req.user?._id
    });
    res.json(dashboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dashboards', async (req: AuthRequest, res) => {
  try {
    const dashboards = await CustomDashboard.find({ userId: req.user?._id });
    res.json(dashboards);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/dashboards/:id', async (req: AuthRequest, res) => {
  try {
    const dashboard = await CustomDashboard.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?._id },
      { ...req.body, updatedAt: new Date() },
      { returnDocument: 'after' }
    );
    res.json(dashboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/dashboards/:id', async (req: AuthRequest, res) => {
  try {
    await CustomDashboard.findOneAndDelete({ _id: req.params.id, userId: req.user?._id });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;