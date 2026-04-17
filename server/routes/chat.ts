import express from 'express';
import { protect, AuthRequest } from '../middleware/authMiddleware.js';
import { Alert } from '../models/Telemetry.js';
import {
  getIncidentsFromLocalDB,
  getAppsFromLocalDB,
  getNotificationsFromLocalDB,
  syncIncidentsFromServiceNow,
  startPeriodicSync
} from '../services/syncService.js';
import { fetchAllIncidents, IncidentData } from '../services/ticketingService.js';
import { getAllEC2Instances, isAWSConfigured } from '../infraMonitor.js';

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
  recentIncidents: { number: string; title: string; severity: string; status: string; createdAt: string; serviceName: string; rootCause?: string; platform: string }[];
  connectedApps: { name: string; status: string; category: string; incidentCount: number }[];
  notificationsSent: number;
  notificationsFailed: number;
  infraStats?: { total: number; healthy: number; degraded: number; down: number };
  dataSource: 'local' | 'universal';
  activeConnectors: string[];
  lastSyncAt: Date;
}

async function getPlatformStats(): Promise<PlatformStats> {
  let localIncidents: any = { incidents: [], total: 0, stats: { today: 0, thisWeek: 0, thisMonth: 0, critical: 0, bySeverity: {}, byService: {}, byStatus: {} } };
  let appsData: any = { apps: [], total: 0, stats: { total: 0, active: 0, degraded: 0, down: 0, byCategory: {} } };
  let notifData: any = { notifications: [], total: 0, stats: { sent: 0, failed: 0, byType: {} } };
  let activeAlerts = 0, criticalAlertsCount = 0, warningAlertsCount = 0;

  // 1. Fetch Local DB Data
  try { 
    localIncidents = await getIncidentsFromLocalDB({ limit: 50 }) || localIncidents;
    appsData = await getAppsFromLocalDB() || appsData;
    notifData = await getNotificationsFromLocalDB({ limit: 100 }) || notifData;
    
    const [alertCount, critCount, warnCount] = await Promise.all([
      Alert?.countDocuments?.({ status: 'Active' }),
      Alert?.countDocuments?.({ status: 'Active', severity: 'Critical' }),
      Alert?.countDocuments?.({ status: 'Active', severity: 'Warning' })
    ]);
    activeAlerts = Number(alertCount) || 0;
    criticalAlertsCount = Number(critCount) || 0;
    warningAlertsCount = Number(warnCount) || 0;
  } catch (e) { console.warn('[Chat] DB fetch error:', (e as any)?.message); }

  // 2. Fetch Live Connector Data (Universal)
  let universalIncidents: IncidentData[] = [];
  let activeConnectors: string[] = ['Local Database'];
  
  try {
    universalIncidents = await fetchAllIncidents();
    if (universalIncidents.length > 0) {
      const platforms = [...new Set(universalIncidents.map(i => i.platform))];
      activeConnectors.push(...platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)));
    }
  } catch (e) {
    console.warn('[Chat] Multi-connector fetch failed:', (e as any)?.message);
  }

  // 3. Fetch Infrastructure Stats
  let infraStats = undefined;
  if (isAWSConfigured()) {
    try {
      const instances = await getAllEC2Instances();
      infraStats = {
        total: instances.length,
        healthy: instances.filter((i: any) => i.status === 'healthy' || i.state === 'running').length,
        degraded: instances.filter((i: any) => i.status === 'degraded').length,
        down: instances.filter((i: any) => i.status === 'down' || i.state === 'stopped').length
      };
      activeConnectors.push('AWS CloudWatch');
    } catch (e) { console.warn('[Chat] Infra stats fetch failed'); }
  }

  // Combine data
  const incidents = universalIncidents.length > 0 ? universalIncidents : localIncidents.incidents;
  const stats = localIncidents.stats;

  // Recalculate context-aware counts
  const incidentsToday = universalIncidents.length > 0 
    ? universalIncidents.filter(i => {
        const d = new Date(i.createdAt);
        return d.toDateString() === new Date().toDateString();
      }).length 
    : stats.today;

  const incidentsThisWeek = universalIncidents.length > 0
    ? universalIncidents.filter(i => {
        const d = new Date(i.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo;
      }).length
    : stats.thisWeek;

  const servicesWithIssues = Array.from(new Set(
    incidents
      .filter((i: any) => ['P1', 'Critical', 'high', '1'].includes(String(i.severity)))
      .map((i: any) => i.serviceName)
  )).slice(0, 10);

  const commonIssues = Object.entries(stats.byService)
    .map(([service, count]) => ({ service, count: Number(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    incidentsToday,
    incidentsThisWeek,
    incidentsThisMonth: stats.thisMonth,
    totalIncidents: incidents.length,
    activeAlerts: activeAlerts || incidents.length,
    criticalAlerts: criticalAlertsCount || incidents.filter((i: any) => String(i.severity).includes('1') || String(i.severity).toLowerCase().includes('crit')).length,
    warningAlerts: warningAlertsCount,
    servicesWithIssues: servicesWithIssues as string[],
    commonIssues,
    frequentlyDownApps: [],
    avgResolutionTime: 'N/A',
    topSeverities: Object.entries(stats.bySeverity).map(([severity, count]) => ({ severity, count: Number(count) })),
    recentIncidents: incidents.slice(0, 15).map((i: any) => ({
      number: i.number,
      title: i.title,
      severity: i.priority || i.severity,
      status: i.status,
      createdAt: i.createdAt,
      serviceName: i.serviceName,
      platform: i.platform || 'Local'
    })),
    connectedApps: (appsData.apps || []).slice(0, 50).map((a: any) => ({
      name: a.name, status: a.status, category: a.category, incidentCount: a.incidentCount
    })),
    notificationsSent: notifData.stats?.sent || 0,
    notificationsFailed: notifData.stats?.failed || 0,
    infraStats,
    dataSource: universalIncidents.length > 0 ? 'universal' : 'local',
    activeConnectors,
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
    const { question, messages = [], context } = req.body;
    
    if (!question && messages.length === 0) {
      res.status(400).json({ error: 'Question or messages are required' });
      return;
    }

    const stats = await getPlatformStats();
    
    const healthStatus = stats.criticalAlerts > 0 || stats.incidentsToday > 5 ? 'CRITICAL' : 
                         stats.warningAlerts > 0 || stats.incidentsThisWeek > 10 ? 'DEGRADED' : 'HEALTHY';
    
    const systemPrompt = `You are the "Universal Service Intelligence Assistant" for an Enterprise IT Observability Platform. 
    
    IDENTITY & MISSION:
    - You are an expert Senior Site Reliability Engineer (SRE).
    - Your goal is to monitor, analyze, and troubleshoot the "Application Portfolio" (Services like Inventory API, Auth Service, etc.).
    - You use data synced from ServiceNow, Jira, and AWS Infrastructure to provide deep insights into these services.

    KNOWLEDGE & DATA SOURCES:
    - PLATFORMS: ServiceNow (Incidents), Jira (Tasks), AWS (Metrics/Health).
    - SERVICES: Detailed health data for each service (Inventory API, Authentication, etc.).
    - TELEMETRY: Real-time stats on latency, CPU, and alerts.

    ADVISORY CAPABILITIES:
    - You ARE allowed and encouraged to provide general IT troubleshooting advice (e.g., "To fix a memory leak, check your garbage collection settings" or "High latency on an API usually suggests database contention").
    - Be proactive: if a service is down, suggest likely causes and technical fixes.

    CONNECTED PLATFORMS: ${stats.activeConnectors.join(', ')}

    APP REGISTRY (SERVIC-CENTRIC DATA):
    ${stats.connectedApps.map(a => `- ${a.name} [${a.category.toUpperCase()}]: Status: ${a.status.toUpperCase()}, Incidents: ${a.incidentCount}`).join('\n')}

    LATEST INCIDENTS (CROSS-PLATFORM):
    ${stats.recentIncidents.slice(0,10).map(i => `• [${i.platform}] [${i.severity}] ${i.number}: ${i.title} (${i.status})`).join('\n')}

    RECOVERY RULES:
    1. Focus on the SERVICES first. Use the platform data to explain service health.
    2. Understand common industry shortforms: "SNow" (ServiceNow), "ZD" (Zendesk), "CW" (CloudWatch), "P1/Sev1" (Critical incidents).
    3. If asked about a greeting (hi, hello), be friendly but stay professional and mention a quick summary of current service health.
    4. If asked something completely outside IT/Ops, politely say you're focused on service intelligence but try to relate it back if possible.
    5. Provide direct, factual answers. Use ACTUAL numbers provided in the Registry and Incident lists.`;

    // Process messages to flatten for the simple callAI if needed, 
    // or just pass as the "Context" if the caller handles it.
    // For now, we return the prompts for the frontend to handle with callAI.
    
    res.json({
      systemPrompt,
      userPrompt: `Question: ${question || messages[messages.length-1]?.content}\n\nAnswer based on the Service Registry and Incidents above. If a specific service like "Inventory API" has incidents, mention them. Give troubleshooting advice if relevant.`,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;