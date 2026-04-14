import express from 'express';
import { protect, AuthRequest } from '../middleware/authMiddleware.js';
import { Telemetry, Alert, Incident, AuditLog, CustomDashboard } from '../models/Telemetry.js';

const router = express.Router();

router.use(protect);

interface PlatformStats {
  incidentsToday: number;
  incidentsThisWeek: number;
  activeAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  servicesWithIssues: string[];
  commonIssues: { service: string; count: number }[];
  frequentlyDownApps: { name: string; failureCount: number }[];
  avgResolutionTime: string;
  topSeverities: { severity: string; count: number }[];
  recentIncidents: { number: string; title: string; severity: string; status: string; createdAt: Date; serviceName: string }[];
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

async function getPlatformStats(): Promise<PlatformStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    incidentsFromSN,
    activeAlerts,
    criticalAlertsCount,
    warningAlertsCount,
    allAlerts,
    allTelemetry
  ] = await Promise.all([
    fetchIncidentsFromServiceNow(),
    Alert.countDocuments({ status: 'Active' }),
    Alert.countDocuments({ status: 'Active', severity: 'Critical' }),
    Alert.countDocuments({ status: 'Active', severity: 'Warning' }),
    Alert.find({ status: 'Active' }).limit(100),
    Telemetry.find().sort({ timestamp: -1 }).limit(100)
  ]);

  const incidentsTodayCount = incidentsFromSN.today;
  const incidentsThisWeekCount = incidentsFromSN.week;
  const allIncidents = incidentsFromSN.all;

  const serviceAlertCounts: Record<string, number> = {};
  allAlerts.forEach((alert: any) => {
    if (alert.service) {
      serviceAlertCounts[alert.service] = (serviceAlertCounts[alert.service] || 0) + 1;
    }
  });

  const commonIssues = Object.entries(serviceAlertCounts)
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const servicesWithIssues = Array.from(new Set(
    allAlerts.filter((a: any) => a.severity === 'Critical').map((a: any) => a.service).filter(Boolean)
  )).slice(0, 10);

  const severityCounts: Record<string, number> = {};
  allAlerts.forEach((alert: any) => {
    severityCounts[alert.severity] = (severityCounts[alert.severity] || 0) + 1;
  });
  const topSeverities = Object.entries(severityCounts)
    .map(([severity, count]) => ({ severity, count }))
    .sort((a, b) => b.count - a.count);

  const resolvedIncidents = allIncidents.filter((i: any) => {
    const state = (i.status || '').toLowerCase();
    return state === 'resolved' || state === 'closed';
  });
  let avgResolutionHours = 'N/A';
  if (resolvedIncidents.length > 0) {
    avgResolutionHours = `${resolvedIncidents.length} resolved`;
  }

  const recentIncidents = allIncidents.slice(0, 10).map((i: any) => ({
    number: i.number,
    title: i.title,
    severity: i.severity,
    status: i.status,
    createdAt: i.createdAt,
    serviceName: i.serviceName
  }));

  return {
    incidentsToday: incidentsTodayCount,
    incidentsThisWeek: incidentsThisWeekCount,
    activeAlerts,
    criticalAlerts: criticalAlertsCount,
    warningAlerts: warningAlertsCount,
    servicesWithIssues,
    commonIssues,
    frequentlyDownApps: [],
    avgResolutionTime: avgResolutionHours,
    topSeverities,
    recentIncidents
  };
}

router.post('/ask', async (req: AuthRequest, res) => {
  try {
    const { question, context } = req.body;
    
    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Question is required' });
      return;
    }

    const stats = await getPlatformStats();
    
    const systemPrompt = `You are an IT Operations Assistant for an Enterprise IT Observability Platform. You help users understand platform metrics, incidents, alerts, and provide troubleshooting guidance.

CURRENT PLATFORM STATISTICS:
- Incidents Today: ${stats.incidentsToday}
- Incidents This Week: ${stats.incidentsThisWeek}
- Active Alerts: ${stats.activeAlerts}
- Critical Alerts: ${stats.criticalAlerts}
- Warning Alerts: ${stats.warningAlerts}
- Average Resolution Time: ${stats.avgResolutionTime}

SERVICES WITH ISSUES:
${stats.servicesWithIssues.length > 0 ? stats.servicesWithIssues.join(', ') : 'None'}

COMMON ISSUES (by alert frequency):
${stats.commonIssues.map(c => `${c.service}: ${c.count} alerts`).join(', ')}

TOP SEVERITIES:
${stats.topSeverities.map(s => `${s.severity}: ${s.count}`).join(', ')}

RECENT INCIDENTS:
${stats.recentIncidents.map(i => `[${i.severity}] ${i.number} - ${i.title} (${i.status})`).join('\\n')}

INSTRUCTIONS:
1. Answer questions about platform health, incidents, alerts, and performance
2. Provide actionable insights and recommendations
3. When asked about root causes, analyze recent incidents and alerts
4. When asked how to fix issues, provide specific troubleshooting steps
5. Be concise but informative
6. If you don't have enough information, say so
7. Format responses with bullet points for clarity`;

    const userPrompt = `Question: ${question}
${context ? `\nContext: ${context}` : ''}

Provide a helpful, accurate response based on the platform data above.`;

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