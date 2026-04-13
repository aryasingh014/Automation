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
  number: String,
  title: String,
  description: String,
  severity: String,
  status: String,
  serviceName: String,
  createdAt: { type: Date, default: Date.now },
  resolvedAt: Date,
  source: { type: String, enum: ['manual', 'autonomous'], default: 'manual' }
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

export const Telemetry = mongoose.model('Telemetry', telemetrySchema);
export const Alert = mongoose.model('Alert', alertSchema);
export const Incident = mongoose.model('Incident', incidentSchema);
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export const CustomDashboard = mongoose.model('CustomDashboard', customDashboardSchema);
export const AppConfig = mongoose.model('AppConfig', appConfigSchema);