import express from 'express';
import { protect, AuthRequest } from '../middleware/authMiddleware.js';
import { Telemetry, Alert, Incident, AuditLog, CustomDashboard, AppRegistry, Notification } from '../models/Telemetry.js';
import {
  getIncidentsFromLocalDB,
  getAppsFromLocalDB,
  getNotificationsFromLocalDB,
  syncIncidentsFromServiceNow,
  startPeriodicSync
} from '../services/syncService.js';

const router = express.Router();

router.use(protect);

interface PlatformStats {
  incidentsToday: number;
  incidentsThisWeek: number;
  incidentsThisMonth: number;
  totalIncidents: number;
  activeAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  servicesWithIssues: string[];
  commonIssues: { service: string; count: number }[];
  frequentlyDownApps: { name: string; failureCount: number }[];
  avgResolutionTime: string;
  topSeverities: { severity: string; count: number }[];
  recentIncidents: { number: string; title: string; severity: string; status: string; createdAt: Date; serviceName: string; rootCause?: string }[];
  connectedApps: { name: string; status: string; category: string; incidentCount: number }[];
  notificationsSent: number;
  notificationsFailed: number;
  dataSource: 'local' | 'servicenow';
  lastSyncAt: Date;
}

async function getPlatformStats(): Promise<PlatformStats> {
  const emptyStats: PlatformStats = {
    incidentsToday: 0,
    incidentsThisWeek: 0,
    incidentsThisMonth: 0,
    totalIncidents: 0,
    activeAlerts: 0,
    criticalAlerts: 0,
    warningAlerts: 0,
    servicesWithIssues: [],
    commonIssues: [],
    frequentlyDownApps: [],
    avgResolutionTime: 'N/A',
    topSeverities: [],
    recentIncidents: [],
    connectedApps: [],
    notificationsSent: 0,
    notificationsFailed: 0,
    dataSource: 'local',
    lastSyncAt: new Date()
  };

  let localData: any = { incidents: [], total: 0, stats: { today: 0, thisWeek: 0, thisMonth: 0, critical: 0, bySeverity: {}, byService: {}, byStatus: {} } };
  let appsData: any = { apps: [], total: 0, stats: { total: 0, active: 0, degraded: 0, down: 0, byCategory: {} } };
  let notifData: any = { notifications: [], total: 0, stats: { sent: 0, failed: 0, byType: {} } };
  let activeAlerts = 0, criticalAlertsCount = 0, warningAlertsCount = 0;

  // 1. Fetch Local Data
  try { 
    const result = await getIncidentsFromLocalDB({ limit: 50 });
    localData = result || localData;
  } catch (e) { console.warn('[Chat] DB unavailable for incidents:', (e as any)?.message); }
  
  try { 
    const result = await getAppsFromLocalDB();
    appsData = result || appsData;
  } catch (e) { console.warn('[Chat] DB unavailable for apps:', (e as any)?.message); }
  
  try { 
    const result = await getNotificationsFromLocalDB({ limit: 100 });
    notifData = result || notifData;
  } catch (e) { console.warn('[Chat] DB unavailable for notifications:', (e as any)?.message); }
  
  try {
    const alertCount = await Alert?.countDocuments?.({ status: 'Active' });
    activeAlerts = typeof alertCount === 'number' ? alertCount : 0;
    const critCount = await Alert?.countDocuments?.({ status: 'Active', severity: 'Critical' });
    criticalAlertsCount = typeof critCount === 'number' ? critCount : 0;
    const warnCount = await Alert?.countDocuments?.({ status: 'Active', severity: 'Warning' });
    warningAlertsCount = typeof warnCount === 'number' ? warnCount : 0;
  } catch (e) {
    console.warn('[Chat] DB unavailable for alerts:', (e as any)?.message);
  }

  // 2. Try Real-time ServiceNow Fetch (Live Data Override)
  let dataSource: 'local' | 'servicenow' = 'local';
  let liveIncidentsResponse: any = null;
  
  try {
    const { SERVICENOW_INSTANCE_URL, SERVICENOW_USER, SERVICENOW_PASSWORD } = process.env;
    if (SERVICENOW_INSTANCE_URL && SERVICENOW_USER && SERVICENOW_PASSWORD) {
      console.log('[Chat] Fetching LIVE ServiceNow stats...');
      liveIncidentsResponse = await fetchIncidentsFromServiceNow();
      if (liveIncidentsResponse && (liveIncidentsResponse.today > 0 || liveIncidentsResponse.all.length > 0)) {
        dataSource = 'servicenow';
      }
    }
  } catch (e) {
    console.warn('[Chat] Live ServiceNow fetch failed, falling back to local DB:', (e as any)?.message);
  }

  const incidents = dataSource === 'servicenow' ? liveIncidentsResponse.all : (localData?.incidents || []);
  const stats = localData?.stats || { today: 0, thisWeek: 0, thisMonth: 0, critical: 0, bySeverity: {}, byService: {}, byStatus: {} };

  // Use LIVE counts if available, otherwise fallback to local stats
  const incidentsToday = dataSource === 'servicenow' ? liveIncidentsResponse.today : stats.today;
  const incidentsThisWeek = dataSource === 'servicenow' ? liveIncidentsResponse.week : stats.thisWeek;

  let criticalAlertCount = criticalAlertsCount;
  let warningAlertCount = warningAlertsCount;
  let activeAlertCount = activeAlerts;

  if (activeAlerts === 0 && incidents.length > 0) {
    activeAlertCount = incidents.filter((i: any) => 
      ['New', 'In Progress', 'Assigned', 'Pending'].includes(i.status)
    ).length;
    criticalAlertCount = stats.critical;
    warningAlertCount = incidents.filter((i: any) => 
      i.severity === 'P2' || i.severity === '2'
    ).length;
  }

  const servicesWithIssues: string[] = Array.from(new Set(
    incidents
      .filter((i: any) => i.severity === 'P1' || i.severity === 'Critical')
      .map((i: any) => i.serviceName)
      .filter(Boolean)
  )).slice(0, 10) as string[];

  const commonIssues = Object.entries(stats.byService)
    .map(([service, count]) => ({ service, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topSeverities = Object.entries(stats.bySeverity)
    .map(([severity, count]) => ({ severity, count: count as number }))
    .sort((a, b) => b.count - a.count);

  const resolvedIncidents = incidents.filter((i: any) => 
    ['Resolved', 'Closed'].includes(i.status)
  );
  const avgResolutionHours = resolvedIncidents.length > 0 ? `${resolvedIncidents.length} resolved` : 'N/A';

  const connectedApps = (appsData?.apps || []).slice(0, 10).map((app: any) => ({
    name: app.name,
    status: app.status,
    category: app.category,
    incidentCount: app.incidentCount
  }));

  return {
    incidentsToday,
    incidentsThisWeek,
    incidentsThisMonth: stats.thisMonth,
    totalIncidents: incidents.length,
    activeAlerts: activeAlertCount,
    criticalAlerts: criticalAlertCount,
    warningAlerts: warningAlertCount,
    servicesWithIssues,
    commonIssues,
    frequentlyDownApps: [],
    avgResolutionTime: avgResolutionHours,
    topSeverities,
    recentIncidents: incidents.slice(0, 10).map((i: any) => ({
      number: i.number,
      title: i.title,
      severity: i.severity,
      status: i.status,
      createdAt: i.createdAt,
      serviceName: i.serviceName,
      rootCause: i.rootCause
    })),
    connectedApps,
    notificationsSent: notifData?.stats?.sent || 0,
    notificationsFailed: notifData?.stats?.failed || 0,
    dataSource,
    lastSyncAt: new Date()
  };
}


async function fetchIncidentsFromServiceNow(): Promise<{ today: number; week: number; all: any[] }> {
  const { SERVICENOW_INSTANCE_URL, SERVICENOW_USER, SERVICENOW_PASSWORD } = process.env;
  
  if (!SERVICENOW_INSTANCE_URL || !SERVICENOW_USER || !SERVICENOW_PASSWORD) {
    return { today: 0, week: 0, all: [] };
  }

  try {
    const auth = Buffer.from(`${SERVICENOW_USER}:${SERVICENOW_PASSWORD}`).toString('base64');
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const response = await fetch(
      `${SERVICENOW_INSTANCE_URL}/api/now/table/incident?sysparm_limit=1000&sysparm_query=ORDERBYDESCsys_created_on&sysparm_display_value=true`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('[Chat] ServiceNow fetch failed:', response.status);
      return { today: 0, week: 0, all: [] };
    }

    const data = await response.json();
    const incidents = data.result || [];
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const incidentsToday = incidents.filter((inc: any) => {
      const created = inc.sys_created_on?.split(' ')[0];
      return created === todayStr;
    }).length;
    
    const incidentsThisWeek = incidents.filter((inc: any) => {
      const created = new Date(inc.sys_created_on);
      return created >= weekAgo;
    }).length;

    const mappedIncidents = incidents.map((inc: any) => ({
      number: inc.number,
      title: inc.short_description || "No description",
      severity: inc.priority || "P3",
      status: inc.state || "New",
      createdAt: inc.sys_created_on,
      serviceName: inc.category || "Unknown"
    }));

    return { today: incidentsToday, week: incidentsThisWeek, all: mappedIncidents };
  } catch (error) {
    console.error('[Chat] ServiceNow fetch error:', error);
    return { today: 0, week: 0, all: [] };
}
}

router.get('/incidents', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, severity, status, serviceName, limit = 100, skip = 0 } = req.query;
    
    const options: any = { limit: parseInt(limit as string), skip: parseInt(skip as string) };
    if (startDate) options.startDate = new Date(startDate as string);
    if (endDate) options.endDate = new Date(endDate as string);
    if (severity) options.severity = severity as string;
    if (status) options.status = status as string;
    if (serviceName) options.serviceName = serviceName as string;

    const result = await getIncidentsFromLocalDB(options);
    res.json(result);
  } catch (error: any) {
    console.error('Incidents API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/incidents/count', async (req: AuthRequest, res) => {
  try {
    const result = await getIncidentsFromLocalDB({});
    res.json({
      today: result.stats.today,
      thisWeek: result.stats.thisWeek,
      thisMonth: result.stats.thisMonth,
      critical: result.stats.critical,
      bySeverity: result.stats.bySeverity,
      byService: result.stats.byService,
      byStatus: result.stats.byStatus
    });
  } catch (error: any) {
    console.error('Incidents count API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/apps', async (req: AuthRequest, res) => {
  try {
    const result = await getAppsFromLocalDB();
    res.json(result);
  } catch (error: any) {
    console.error('Apps API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/notifications', async (req: AuthRequest, res) => {
  try {
    const { incidentId, type, status, startDate, limit = 100 } = req.query;
    
    const options: any = { limit: parseInt(limit as string) };
    if (incidentId) options.incidentId = incidentId as string;
    if (type) options.type = type as string;
    if (status) options.status = status as string;
    if (startDate) options.startDate = new Date(startDate as string);

    const result = await getNotificationsFromLocalDB(options);
    res.json(result);
  } catch (error: any) {
    console.error('Notifications API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/sync', async (req: AuthRequest, res) => {
  try {
    const result = await syncIncidentsFromServiceNow();
    res.json(result);
  } catch (error: any) {
    console.error('Sync API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/ask', async (req: AuthRequest, res) => {
  try {
    const { question, context } = req.body;
    
    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Question is required' });
      return;
    }

    const stats = await getPlatformStats();
    
    const healthStatus = stats.criticalAlerts > 0 || stats.incidentsToday > 5 ? 'CRITICAL' : 
                         stats.warningAlerts > 0 || stats.incidentsThisWeek > 10 ? 'DEGRADED' : 'HEALTHY';
    
    const systemPrompt = `You are an IT Operations Expert Assistant for an Enterprise Observability Platform. Your job is to analyze REAL platform data and provide accurate, actionable answers.

 IMPORTANT: You must base your response ONLY on the actual numeric values provided below. NEVER guess or estimate.

 PLATFORM DATA (FROM REAL-TIME SOURCE):
- Total Incidents: ${stats.totalIncidents}  ← USE THIS EXACT NUMBER for general incident count
- Incidents Today: ${stats.incidentsToday}  ← USE THIS EXACT NUMBER for today
- Incidents This Week: ${stats.incidentsThisWeek}
- Active Alerts: ${stats.activeAlerts}
- Critical Alerts: ${stats.criticalAlerts}  ← USE THIS EXACT NUMBER
- Warning Alerts: ${stats.warningAlerts}
- Avg Resolution: ${stats.avgResolutionTime}

 CURRENT PLATFORM HEALTH: ${healthStatus}

${stats.servicesWithIssues.length > 0 ? ` SERVICES NEEDING ATTENTION:
${stats.servicesWithIssues.map(s => `  • ${s}`).join('\n')}` : ' No services currently flagged'}

${stats.commonIssues.length > 0 ? ` TOP ISSUES BY FREQUENCY:
${stats.commonIssues.slice(0,5).map(c => `  • ${c.service}: ${c.count} alerts`).join('\n')}` : ' No recurring issues detected'}

${stats.recentIncidents.length > 0 ? ` RECENT INCIDENTS:
${stats.recentIncidents.slice(0,5).map(i => `  • [${i.severity}] ${i.number}: ${i.title} (${i.status})`).join('\n')}` : ' No recent incidents on record'}

${stats.connectedApps.length > 0 ? ` CONNECTED APPS:
${stats.connectedApps.slice(0,5).map(a => `  • ${a.name}: ${a.status} (${a.category})`).join('\n')}` : ' No apps registered'}

${stats.notificationsSent > 0 ? ` NOTIFICATIONS SENT: ${stats.notificationsSent} sent, ${stats.notificationsFailed} failed` : ''}

 RESPONSE RULES - FOLLOW EXACTLY:
1. When asked "how many incidents", "incident count", or "how many total incidents" - ANSWER: "${stats.totalIncidents}" (the exact total number)
2. When asked "how many incidents today" - ANSWER: "${stats.incidentsToday}"
3. When asked "how many critical alerts" - ANSWER: "${stats.criticalAlerts}"
4. When asked about "common issues" - reference the commonIssues array data
5. When asked about "connected apps" or "all apps" - reference the connectedApps array
6. If value is 0, say "0" explicitly - do NOT say "no" or "none" if data shows zeros
7. If user asks about specific numbers, provide them with EXACT values from data above
8. Be direct, factual, and use the actual numbers in your response`;

    const userPrompt = `Question: ${question}
${context ? `\nContext: ${context}` : ''}

Answer the question directly using the platform data above. If the data clearly shows issues (like ${stats.criticalAlerts} critical alerts or ${stats.incidentsToday} incidents today), acknowledge them explicitly. If a value is 0, state "0" - don't be vague.`;

    res.json({
      systemPrompt,
      userPrompt,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;