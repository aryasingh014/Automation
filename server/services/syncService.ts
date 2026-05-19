import { Incident, Notification, AppRegistry, Alert } from '../models/Telemetry.js';

interface ServiceNowIncident {
  number: string;
  short_description: string;
  description: string;
  priority: string;
  state: string;
  category: string;
  assigned_to: string;
  impact: string;
  urgency: string;
  sys_created_on: string;
  sys_updated_on: string;
  resolved_at: string;
}

interface SyncResult {
  success: boolean;
  incidentsSynced: number;
  incidentsUpdated: number;
  errors: string[];
  lastSyncAt: Date;
}

export async function syncIncidentsFromServiceNow(): Promise<SyncResult> {
  const { SERVICENOW_INSTANCE_URL, SERVICENOW_USER, SERVICENOW_PASSWORD } = process.env;
  
  const result: SyncResult = {
    success: false,
    incidentsSynced: 0,
    incidentsUpdated: 0,
    errors: [],
    lastSyncAt: new Date()
  };

  if (!SERVICENOW_INSTANCE_URL || !SERVICENOW_USER || !SERVICENOW_PASSWORD) {
    result.errors.push('ServiceNow credentials not configured');
    return result;
  }

  try {
    const auth = Buffer.from(`${SERVICENOW_USER}:${SERVICENOW_PASSWORD}`).toString('base64');
    
    const response = await fetch(
      `${SERVICENOW_INSTANCE_URL}/api/now/table/incident?sysparm_limit=500&sysparm_query=ORDERBYDESCsys_created_on&sysparm_display_value=true`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      result.errors.push(`ServiceNow API error: ${response.status}`);
      return result;
    }

    const data = await response.json();
    const incidents: ServiceNowIncident[] = data.result || [];

    for (const inc of incidents) {
      const existingIncident = await Incident.findOne({ number: inc.number });
      
      const incidentData = {
        number: inc.number,
        title: inc.short_description || "No description",
        description: inc.description || "",
        severity: mapPriority(inc.priority),
        status: mapState(inc.state),
        serviceName: inc.category || "Unknown",
        category: inc.category || "",
        assignedTo: inc.assigned_to || "",
        priority: inc.priority || "",
        impact: inc.impact || "",
        urgency: inc.urgency || "",
        createdAt: inc.sys_created_on ? new Date(inc.sys_created_on) : new Date(),
        updatedAt: inc.sys_updated_on ? new Date(inc.sys_updated_on) : new Date(),
        resolvedAt: inc.resolved_at ? new Date(inc.resolved_at) : undefined,
        source: 'servicenow',
        syncFromServiceNowAt: new Date()
      };

      if (existingIncident) {
        const updated = await Incident.findOneAndUpdate(
          { number: inc.number },
          { ...incidentData, updatedAt: new Date() },
          { returnDocument: 'after' }
        );
        if (updated) result.incidentsUpdated++;
      } else {
        await Incident.create(incidentData);
        result.incidentsSynced++;
      }
    }

    result.success = true;
    console.log(`[Sync] Synced ${result.incidentsSynced} new incidents, updated ${result.incidentsUpdated} existing`);
    return result;
  } catch (error: any) {
    result.errors.push(`Sync error: ${error.message}`);
    console.error('[Sync] ServiceNow sync error:', error);
    return result;
  }
}

function mapPriority(priority: string | number): string {
  const p = String(priority);
  if (p === '1' || p === 'P1' || p.toLowerCase() === 'critical') return 'P1';
  if (p === '2' || p === 'P2' || p.toLowerCase() === 'high') return 'P2';
  if (p === '3' || p === 'P3' || p.toLowerCase() === 'medium') return 'P3';
  return 'P4';
}

function mapState(state: string | number): string {
  const s = String(state).toLowerCase();
  if (s === '1' || s === 'new') return 'New';
  if (s === '2' || s === 'in progress') return 'In Progress';
  if (s === '3' || s === 'assigned') return 'Assigned';
  if (s === '4' || s === 'pending') return 'Pending';
  if (s === '7' || s === 'resolved') return 'Resolved';
  if (s === '8' || s === 'closed') return 'Closed';
  if (s === '9' || s === 'cancelled') return 'Cancelled';
  return 'New';
}

export async function getIncidentsFromLocalDB(options: {
  startDate?: Date;
  endDate?: Date;
  severity?: string;
  status?: string;
  serviceName?: string;
  limit?: number;
  skip?: number;
} = {}): Promise<{
  incidents: any[];
  total: number;
  stats: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    critical: number;
    bySeverity: Record<string, number>;
    byService: Record<string, number>;
    byStatus: Record<string, number>;
  };
}> {
  const { startDate, endDate, severity, status, serviceName, limit = 100, skip = 0 } = options;
  
  const query: any = {};
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }
  if (severity) query.severity = severity;
  if (status) query.status = status;
  if (serviceName) query.serviceName = serviceName;

  let incidents: any[] = [];
  let total = 0;
  let todayCount = 0;
  let weekCount = 0;
  let monthCount = 0;
  let criticalCount = 0;

  try {
    const [inc, cnt] = await Promise.all([
      Incident?.find?.(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Incident?.countDocuments?.(query)
    ]);
    incidents = inc || [];
    total = typeof cnt === 'number' ? cnt : 0;
  } catch (e) {
    console.warn('[Sync] Incident find failed:', (e as any)?.message);
    return {
      incidents: [],
      total: 0,
      stats: { today: 0, thisWeek: 0, thisMonth: 0, critical: 0, bySeverity: {}, byService: {}, byStatus: {} }
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  try {
    const [t, w, m, c] = await Promise.all([
      Incident?.countDocuments?.({ createdAt: { $gte: today } }),
      Incident?.countDocuments?.({ createdAt: { $gte: weekAgo } }),
      Incident?.countDocuments?.({ createdAt: { $gte: monthAgo } }),
      Incident?.countDocuments?.({ severity: { $in: ['P1', 'Critical'] }, status: { $nin: ['Resolved', 'Closed'] } })
    ]);
    todayCount = typeof t === 'number' ? t : 0;
    weekCount = typeof w === 'number' ? w : 0;
    monthCount = typeof m === 'number' ? m : 0;
    criticalCount = typeof c === 'number' ? c : 0;
  } catch (e) {
    console.warn('[Sync] Incident count failed:', (e as any)?.message);
  }

  let allIncidents: any[] = [];
  try {
    allIncidents = await Incident?.find?.(Object.keys(query).length === 0 ? {} : query) || [];
  } catch (e) {
    console.warn('[Sync] All incidents fetch failed:', (e as any)?.message);
  }
  
  const bySeverity: Record<string, number> = {};
  const byService: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  
  allIncidents.forEach((inc: any) => {
    bySeverity[inc.severity] = (bySeverity[inc.severity] || 0) + 1;
    byService[inc.serviceName] = (byService[inc.serviceName] || 0) + 1;
    byStatus[inc.status] = (byStatus[inc.status] || 0) + 1;
  });

  return {
    incidents: incidents.map(inc => ({
      number: inc.number,
      title: inc.title,
      description: inc.description,
      severity: inc.severity,
      status: inc.status,
      serviceName: inc.serviceName,
      category: inc.category,
      assignedTo: inc.assignedTo,
      priority: inc.priority,
      impact: inc.impact,
      urgency: inc.urgency,
      rootCause: inc.rootCause,
      impactAnalysis: inc.impactAnalysis,
      resolutionNotes: inc.resolutionNotes,
      createdAt: inc.createdAt,
      updatedAt: inc.updatedAt,
      resolvedAt: inc.resolvedAt
    })),
    total,
    stats: {
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      critical: criticalCount,
      bySeverity,
      byService,
      byStatus
    }
  };
}

export async function getAppsFromLocalDB(): Promise<{
  apps: any[];
  total: number;
  stats: {
    total: number;
    active: number;
    degraded: number;
    down: number;
    byCategory: Record<string, number>;
  };
}> {
  let apps: any[] = [];
  try {
    apps = await AppRegistry?.find?.({}).sort({ name: 1 }) || [];
  } catch (e) {
    console.warn('[Sync] AppRegistry find failed:', (e as any)?.message);
    return { apps: [], total: 0, stats: { total: 0, active: 0, degraded: 0, down: 0, byCategory: {} } };
  }
  
  let active = 0, degraded = 0, down = 0;
  try {
    const [a, d, dn] = await Promise.all([
      AppRegistry?.countDocuments?.({ status: 'active' }),
      AppRegistry?.countDocuments?.({ status: 'degraded' }),
      AppRegistry?.countDocuments?.({ status: 'down' })
    ]);
    active = typeof a === 'number' ? a : 0;
    degraded = typeof d === 'number' ? d : 0;
    down = typeof dn === 'number' ? dn : 0;
  } catch (e) {
    console.warn('[Sync] AppRegistry count failed:', (e as any)?.message);
  }

  const byCategory: Record<string, number> = {};
  apps.forEach((app: any) => {
    byCategory[app.category] = (byCategory[app.category] || 0) + 1;
  });

  return {
    apps: apps.map(app => ({
      appId: app.appId,
      name: app.name,
      description: app.description,
      status: app.status,
      category: app.category,
      owner: app.owner,
      ownerEmail: app.ownerEmail,
      team: app.team,
      environment: app.environment,
      endpoint: app.endpoint,
      incidentCount: app.incidentCount,
      lastIncidentAt: app.lastIncidentAt,
      lastHealthStatus: app.lastHealthStatus,
      tags: app.tags,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt
    })),
    total: apps.length,
    stats: {
      total: apps.length,
      active,
      degraded,
      down,
      byCategory
    }
  };
}

export async function getNotificationsFromLocalDB(options: {
  incidentId?: string;
  type?: string;
  status?: string;
  startDate?: Date;
  limit?: number;
} = {}): Promise<{
  notifications: any[];
  total: number;
  stats: {
    sent: number;
    failed: number;
    byType: Record<string, number>;
  };
}> {
  const { incidentId, type, status, startDate, limit = 100 } = options;
  
  const query: any = {};
  if (incidentId) query.incidentId = incidentId;
  if (type) query.type = type;
  if (status) query.status = status;
  if (startDate) query.sentAt = { $gte: startDate };

  let notifications: any[] = [];
  let total = 0;
  let sentCount = 0;
  let failedCount = 0;

  try {
    const [notifs, cnt, s, f] = await Promise.all([
      Notification?.find?.(query).sort({ sentAt: -1 }).limit(limit),
      Notification?.countDocuments?.(query),
      Notification?.countDocuments?.({ status: 'sent' }),
      Notification?.countDocuments?.({ status: 'failed' })
    ]);
    notifications = notifs || [];
    total = typeof cnt === 'number' ? cnt : 0;
    sentCount = typeof s === 'number' ? s : 0;
    failedCount = typeof f === 'number' ? f : 0;
  } catch (e) {
    console.warn('[Sync] Notification query failed:', (e as any)?.message);
    return { notifications: [], total: 0, stats: { sent: 0, failed: 0, byType: {} } };
  }

  const byType: Record<string, number> = {};
  notifications.forEach((notif: any) => {
    byType[notif.type] = (byType[notif.type] || 0) + 1;
  });

  return {
    notifications: notifications.map(n => ({
      id: n._id,
      type: n.type,
      recipient: n.recipient,
      recipientEmail: n.recipientEmail,
      channel: n.channel,
      message: n.message,
      subject: n.subject,
      incidentId: n.incidentId,
      appId: n.appId,
      severity: n.severity,
      sentAt: n.sentAt,
      status: n.status,
      errorMessage: n.errorMessage
    })),
    total,
    stats: {
      sent: sentCount,
      failed: failedCount,
      byType
    }
  };
}

export async function recordNotification(data: {
  type: string;
  recipient: string;
  recipientEmail?: string;
  channel?: string;
  message: string;
  subject?: string;
  incidentId?: string;
  appId?: string;
  severity?: string;
  status?: string;
  errorMessage?: string;
  metadata?: any;
}): Promise<any> {
  const notification = await Notification.create({
    ...data,
    sentAt: new Date()
  });
  return notification;
}

let syncInterval: NodeJS.Timeout | null = null;

export function startPeriodicSync(intervalMinutes = 10): void {
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  
  console.log(`[Sync] Starting periodic sync every ${intervalMinutes} minutes`);
  
  syncIncidentsFromServiceNow();
  
  syncInterval = setInterval(() => {
    syncIncidentsFromServiceNow();
  }, intervalMinutes * 60 * 1000);
}

export function stopPeriodicSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[Sync] Stopped periodic sync');
  }
}