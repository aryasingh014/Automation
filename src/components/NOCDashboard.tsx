import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Bell, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Clock, 
  User, 
  MessageSquare, 
  ExternalLink,
  Filter,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { summarizeLogs } from '@/src/lib/ai';
import { useAppContext } from '@/src/context/AppContext';
import { useTelemetry } from '@/src/hooks/useTelemetry';

const initialAlerts = [
  { id: 'ALR-4402', severity: 'Critical', service: 'Warehouse Service', message: 'Latency spike > 980ms detected in US-East-1', time: '2m ago', status: 'Active' },
  { id: 'ALR-4401', severity: 'Critical', service: 'Order Processing', message: 'Error rate > 6.8% in checkout flow', time: '12m ago', status: 'Acknowledged' },
  { id: 'ALR-4399', severity: 'Critical', service: 'Inventory API', message: 'Database connection timeouts', time: '24m ago', status: 'Active' },
  { id: 'ALR-4395', severity: 'Warning', service: 'Payment Gateway', message: 'Elevated latency 340ms', time: '45m ago', status: 'Active' },
  { id: 'ALR-4390', severity: 'Warning', service: 'Legacy CRM', message: 'Memory usage > 85% on node-04', time: '1h ago', status: 'Resolved' },
];

// Helper to persist an alert to MongoDB
async function persistAlert(alert: { alertId: string; severity: string; service: string; message: string; status: string }) {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch('/api/data/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ alertId: alert.alertId, severity: alert.severity, service: alert.service, message: alert.message, status: alert.status })
    });
  } catch (e) {
    console.warn('[NOC] Failed to persist alert to DB:', e);
  }
}

export default function NOCDashboard() {
  const [filter, setFilter] = useState('all');
  const [alerts, setAlerts] = useState(initialAlerts);
  const [liveIncidents, setLiveIncidents] = useState<any[]>([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(true);
  const telemetry = useTelemetry(10000);
  const { openAiModal, aiSettings, serviceNowSettings, createIncident, checkIncident, portfolioApps } = useAppContext();

  // Generate alerts from portfolio apps
  useEffect(() => {
    const criticalAppsList = portfolioApps.filter(a => a.status === 'Critical');
    const warningAppsList = portfolioApps.filter(a => a.status === 'Warning');
    
    if (criticalAppsList.length > 0 || warningAppsList.length > 0) {
      // Create new alerts for critical/warning apps
      const newAlerts: any[] = [];
      
      criticalAppsList.forEach(app => {
        const alertId = `ALR-${Math.floor(Math.random() * 9000) + 1000}`;
        const alertObj = { id: alertId, severity: 'Critical', service: app.name, message: `Health degraded to ${app.health}% - Error rate: ${app.errorRate}`, time: 'Just now', status: 'Active' };
        newAlerts.push(alertObj);
        persistAlert({ alertId, severity: 'Critical', service: app.name, message: alertObj.message, status: 'Active' });
      });
      
      warningAppsList.slice(0, 2).forEach(app => {
        const alertId = `ALR-${Math.floor(Math.random() * 9000) + 1000}`;
        const alertObj = { id: alertId, severity: 'Warning', service: app.name, message: `Elevated latency ${app.latency} detected`, time: 'Just now', status: 'Active' };
        newAlerts.push(alertObj);
        persistAlert({ alertId, severity: 'Warning', service: app.name, message: alertObj.message, status: 'Active' });
      });
      
      if (newAlerts.length > 0) {
        setAlerts(prev => [...newAlerts, ...prev].slice(0, 10));
      }
    }
  }, [portfolioApps]);

  const fetchIncidents = async () => {
    try {
      setIsLoadingIncidents(true);
      const response = await fetch('/api/incidents');
      if (!response.ok) throw new Error('Failed to fetch incidents');
      const data = await response.json();
      setLiveIncidents(data);
    } catch (error) {
      console.error('Incident fetch error:', error);
      toast.error('Could not load live ServiceNow incidents.');
    } finally {
      setIsLoadingIncidents(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

// Simulate new alerts based on telemetry
  type AlertType = { id: string; severity: string; service: string; message: string; time: string; status: string };
  
  const autonomousTriggerRef = useRef<((alert: AlertType) => Promise<void>) | null>(null);
  
  const autonomousTrigger = useCallback(async (alert: AlertType) => {
    toast.info("Autonomous Engine: Critical anomaly detected. Analyzing and creating incident...", {
      duration: 6000,
    });

    try {
      const activeIncident = await checkIncident(alert.service);
      
      if (activeIncident && activeIncident.exists) {
        toast.info(`Active incident ${activeIncident.number} already exists for ${alert.service}. Deduplicating alert...`, {
          duration: 5000,
        });
        return;
      }

      const mockLogs = `
        [INFO] ${new Date().toLocaleTimeString()} Request received for /api/v1/data
        [ERROR] ${new Date().toLocaleTimeString()} Timeout connection to DB_CLUSTER_01
        [WARN] ${new Date().toLocaleTimeString()} Retrying connection (1/3)...
        [CRITICAL] ${new Date().toLocaleTimeString()} Autonomous trigger for ${alert.id}
      `;
      const analysis = await summarizeLogs(alert.service, mockLogs, aiSettings);
      const result = await createIncident(alert.id + " (Autonomous) on " + alert.service, analysis, 'Critical');
      toast.success(`Autonomous Incident ${result.number} created successfully!`, {
        description: "AIOps engine resolved this alert autonomously."
      });
      fetchIncidents();
    } catch (error) {
      console.error("Autonomous Action Failed:", error);
    }
  }, [aiSettings, checkIncident, createIncident, fetchIncidents]);

  // Store latest trigger for cleanup
  useEffect(() => {
    autonomousTriggerRef.current = autonomousTrigger;
  }, [autonomousTrigger]);

  useEffect(() => {
    if (telemetry.latency > 400 || telemetry.errorRate > 0.15) {
      const severity = 'Critical';
      const alertId = `ALR-${Math.floor(Math.random() * 9000) + 1000}`;
      const newAlert = {
        id: alertId,
        severity,
        service: 'Core API Hub',
        message: `Anomalous ${telemetry.latency > 400 ? 'latency' : 'error rate'} detected: ${telemetry.latency.toFixed(0)}ms`,
        time: 'Just now',
        status: 'Active'
      };
      setAlerts(prev => [newAlert, ...prev.slice(0, 8)]);
      toast.error(`New ${severity} Alert: ${newAlert.message}`);
      // Persist to MongoDB
      persistAlert({ alertId, severity, service: 'Core API Hub', message: newAlert.message, status: 'Active' });

      // Autonomous Incident Engine
      if (severity === 'Critical' && serviceNowSettings.autoIncidentEnabled && autonomousTriggerRef.current) {
        autonomousTriggerRef.current(newAlert);
      }
    }
  }, [telemetry, serviceNowSettings.autoIncidentEnabled, autonomousTrigger]);

  const handleViewLogs = async (alert: any) => {
    toast.promise(
      async () => {
        const mockLogs = `
          [INFO] 12:00:01 Request received for /api/v1/data
          [ERROR] 12:00:02 Timeout connection to DB_CLUSTER_01
          [WARN] 12:00:03 Retrying connection (1/3)...
          [ERROR] 12:00:05 Max retries exceeded for ${alert.service}
          [CRITICAL] 12:00:06 Circuit breaker opened for downstream dependency
        `;
        const summary = await summarizeLogs(alert.service, mockLogs, aiSettings);
        openAiModal(alert.id + " Log Analysis", summary, ["Restart service", "Check DB credentials", "Increase timeout"], alert.severity);
      },
      {
        loading: `Hydrating logs and running AI analysis...`,
        success: `Log analysis complete for ${alert.id}.`,
        error: 'Failed to retrieve logs.',
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">NOC / Operations</h1>
          <p className="text-sm text-text-secondary font-mono">Real Time Incident Control Center</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-bg-surface border border-border-main p-1 rounded-lg">
            <button 
              onClick={() => setFilter('all')}
              className={cn("px-3 py-1 text-[10px] font-mono rounded", filter === 'all' ? "bg-inverse-bg text-inverse-text" : "text-text-secondary hover:text-text-main")}
            >
              All Events
            </button>
            <button 
              onClick={() => setFilter('critical')}
              className={cn("px-3 py-1 text-[10px] font-mono rounded", filter === 'critical' ? "bg-red-500 text-white" : "text-text-secondary hover:text-text-main")}
            >
              CRITICAL
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Bell size={14} /> Active Alert Feed
            </h3>
            <div className="flex items-center gap-2">
              {isLoadingIncidents && (
                <span className="text-[10px] font-mono text-blue-500 flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  Syncing...
                </span>
              )}
              <span className="text-[10px] font-mono text-text-muted">Live Sync: Active</span>
            </div>
          </div>
          
          <div className="space-y-2">
            {alerts
              .filter(a => filter === 'all' || a.severity.toLowerCase() === filter)
              .map((alert) => (
                <AlertItem key={alert.id} alert={alert} onViewLogs={() => handleViewLogs(alert)} />
              ))}
          </div>
        </div>

        {/* Incident Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={14} /> ServiceNow Queue
            </h3>
            <button 
              onClick={fetchIncidents}
              className="text-[9px] font-mono text-blue-500 hover:underline"
            >
              Refresh Live
            </button>
          </div>
          
          <div className="space-y-3">
            {isLoadingIncidents ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 bg-bg-surface border border-border-main rounded-xl animate-pulse">
                  <div className="h-4 bg-border-main rounded w-3/4 mb-3" />
                  <div className="h-2 bg-border-main rounded w-1/2" />
                </div>
              ))
            ) : liveIncidents.length > 0 ? (
liveIncidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} instanceUrl={serviceNowSettings.instanceUrl} />
              ))
            ) : (
              <div className="p-8 text-center bg-bg-surface border border-border-main border-dashed rounded-xl">
                <p className="text-[10px] font-mono text-text-muted uppercase">No active incidents found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertItem({ alert, onViewLogs, ...props }: any) {
  const isCritical = alert.severity === 'Critical';
  const isWarning = alert.severity === 'Warning';

  return (
    <div className={cn(
      "p-4 bg-bg-surface border rounded-xl flex items-start gap-4 transition-all hover:bg-border-main/50 group",
      isCritical ? "border-red-500/20" : isWarning ? "border-amber-500/20" : "border-border-main"
    )}>
      <div className={cn(
        "p-2 rounded-lg",
        isCritical ? "bg-red-500/10 text-red-500" : isWarning ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
      )}>
        {isCritical ? <AlertCircle size={18} /> : isWarning ? <AlertTriangle size={18} /> : <Info size={18} />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">{alert.service}</span>
            <span className="text-[10px] font-mono text-text-muted">{alert.id}</span>
          </div>
          <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
            <Clock size={10} /> {alert.time}
          </span>
        </div>
        <p className="text-sm font-medium mb-2">{alert.message}</p>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => toast.success(`Alert ${alert.id} acknowledged`)}
            className="text-[10px] font-mono text-blue-500 hover:underline"
          >
            Acknowledge
          </button>
          <button 
            onClick={onViewLogs}
            className="text-[10px] font-mono text-text-muted hover:text-text-main"
          >
            AI Log Analysis
          </button>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <span className={cn(
          "text-[9px] font-mono px-1.5 py-0.5 rounded uppercase",
          alert.status === 'Active' ? "bg-red-500/10 text-red-500" : 
          alert.status === 'Acknowledged' ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"
        )}>
          {alert.status}
        </span>
      </div>
    </div>
  );
}

function IncidentCard({ incident, instanceUrl, ...props }: any) {
  const isP1 = incident.priority === 'P1';

  const handleIncidentClick = () => {
    if (instanceUrl && incident.sys_id) {
      const baseUrl = instanceUrl.replace(/\/$/, '');
      window.open(`${baseUrl}/nav_to.do?uri=incident.do?sys_id=${incident.sys_id}`, '_blank');
    }
  };

  return (
    <div className={cn(
      "p-4 bg-bg-surface border rounded-xl hover:border-border-hover transition-colors cursor-pointer group",
      isP1 ? "border-red-500/30" : "border-border-main"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "text-[10px] font-mono px-1.5 py-0.5 rounded font-bold",
          isP1 ? "bg-red-500 text-white" : "bg-border-main text-text-secondary"
        )}>
          {incident.priority}
        </span>
        <button 
          onClick={handleIncidentClick}
          className="text-[10px] font-mono text-blue-500 hover:underline flex items-center gap-1"
        >
          {incident.number} <ExternalLink size={10} />
        </button>
      </div>
      <h4 className="text-xs font-bold mb-3 group-hover:text-text-main transition-colors">{incident.title}</h4>
      
      <div className="flex items-center justify-between pt-3 border-t border-border-main">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-secondary">
          <User size={10} /> {incident.owner}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
          <Clock size={10} /> {incident.age}
        </div>
      </div>
    </div>
  );
}


