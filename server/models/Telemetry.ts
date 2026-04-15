import mongoose from 'mongoose';

const telemetrySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  latency: Number,
  throughput: Number,
  errorRate: Number,
  cpu: Number,
  memory: Number,
  serviceName: String
});

telemetrySchema.index({ timestamp: -1 });

const alertSchema = new mongoose.Schema({
  alertId: { type: String, required: true },
  severity: { type: String, enum: ['Critical', 'Warning', 'Info'], required: true },
  service: String,
  message: String,
  time: String,
  status: { type: String, enum: ['Active', 'Acknowledged', 'Resolved'], default: 'Active' },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: Date
});

alertSchema.index({ createdAt: -1 });

const incidentSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  title: String,
  description: String,
  severity: { type: String, enum: ['P1', 'P2', 'P3', 'P4', 'Critical', 'High', 'Medium', 'Low'] },
  status: { type: String, enum: ['New', 'In Progress', 'Assigned', 'Pending', 'Resolved', 'Closed', 'Cancelled'], default: 'New' },
  serviceName: String,
  category: String,
  assignedTo: String,
  priority: String,
  impact: String,
  urgency: String,
  rootCause: String,
  impactAnalysis: String,
  resolutionNotes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  resolvedAt: Date,
  source: { type: String, enum: ['manual', 'autonomous', 'servicenow'], default: 'servicenow' },
  syncFromServiceNowAt: Date
});

const auditLogSchema = new mongoose.Schema({
  userId: String,
  userEmail: String,
  action: { type: String, required: true },
  resource: String,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  timestamp: { type: Date, default: Date.now }
});

auditLogSchema.index({ timestamp: -1 });

const customDashboardSchema = new mongoose.Schema({
  userId: String,
  name: String,
  widgets: [{
    type: { type: String },
    title: String,
    config: mongoose.Schema.Types.Mixed,
    position: { x: Number, y: Number, w: Number, h: Number }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const appConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now }
});

const appRegistrySchema = new mongoose.Schema({
  appId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['active', 'degraded', 'down', 'maintenance', 'decommissioned'], default: 'active' },
  category: { type: String, enum: ['database', 'api', 'frontend', 'backend', 'middleware', 'infrastructure', 'security', 'monitoring', 'other'], default: 'other' },
  owner: String,
  ownerEmail: String,
  team: String,
  environment: { type: String, enum: ['production', 'staging', 'development'], default: 'production' },
  endpoint: String,
  healthCheckUrl: String,
  metadata: mongoose.Schema.Types.Mixed,
  incidentCount: { type: Number, default: 0 },
  lastIncidentAt: Date,
  lastHealthCheckAt: Date,
  lastHealthStatus: { type: String, enum: ['healthy', 'degraded', 'down', 'unknown'], default: 'unknown' },
  isMonitored: { type: Boolean, default: true },
  tags: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['email', 'slack', 'sms', 'webhook', 'pagerduty'], required: true },
  recipient: String,
  recipientEmail: String,
  channel: String,
  message: String,
  subject: String,
  incidentId: String,
  appId: String,
  severity: String,
  sentAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['sent', 'delivered', 'failed', 'pending'], default: 'pending' },
  errorMessage: String,
  metadata: mongoose.Schema.Types.Mixed
});

export const Telemetry = mongoose.model('Telemetry', telemetrySchema);
export const Alert = mongoose.model('Alert', alertSchema);
export const Incident = mongoose.model('Incident', incidentSchema);
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export const CustomDashboard = mongoose.model('CustomDashboard', customDashboardSchema);
export const AppConfig = mongoose.model('AppConfig', appConfigSchema);
export const AppRegistry = mongoose.model('AppRegistry', appRegistrySchema);
export const Notification = mongoose.model('Notification', notificationSchema);