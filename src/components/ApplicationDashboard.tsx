import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpRight, 
  MoreHorizontal,
  Cpu,
  Database,
  Network,
  Layers,
  Activity,
  Eye,
  RotateCw,
  Copy,
  Bell,
  Trash2,
  X,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';
import { useAppContext } from '@/src/context/AppContext';



export default function ApplicationDashboard() {
  const { portfolioApps, setPortfolioApps, createIncident, serviceNowSettings } = useAppContext();
  const apps = portfolioApps;
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllMetrics, setShowAllMetrics] = useState(false);
  const [activeActionsApp, setActiveActionsApp] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<{type: 'details' | 'restart' | 'alert' | 'decommission', app: any} | null>(null);

  // Track which app IDs have already had incidents raised this session
  const firedIncidents = useRef<Set<string>>(new Set());

  const criticalApps = apps.filter(a => a.status === 'Critical');
  const warningApps  = apps.filter(a => a.status === 'Warning');
  const healthyApps  = apps.filter(a => a.status === 'Healthy');

  // ── Auto-Incident Generation ─────────────────────────────────────────────
  useEffect(() => {
    if (!serviceNowSettings.autoIncidentEnabled) return;

    const unfired = criticalApps.filter(a => !firedIncidents.current.has(a.id));
    if (unfired.length === 0) return;

    toast.warning(`🚨 ${unfired.length} critical app(s) detected — raising ServiceNow incidents…`, { duration: 4000 });

    // Stagger so we don't flood ServiceNow simultaneously
    unfired.forEach((app, i) => {
      setTimeout(async () => {
        if (firedIncidents.current.has(app.id)) return;
        firedIncidents.current.add(app.id);
        try {
          const details =
            `Application ${app.name} (${app.id}) is in CRITICAL state. ` +
            `Health: ${app.health}%, Error Rate: ${app.errorRate}, Latency: ${app.latency}, ` +
            `Uptime: ${app.uptime}. Owner: ${app.owner}. ` +
            `Automated incident raised by Intelligent Monitoring System.`;
          const result = await createIncident(`${app.name} — Critical Degradation`, details, 'Critical');
          toast.error(`Auto-Incident raised for ${app.name}`, {
            description: result?.number ? `ServiceNow: ${result.number}` : 'Incident created successfully',
            duration: 7000,
          });
        } catch (err: any) {
          console.error(`[AutoIncident] Failed for ${app.id}:`, err.message);
          toast.warning(`Auto-incident failed for ${app.name}`, {
            description: 'Check ServiceNow settings.',
            duration: 5000,
          });
        }
      }, i * 2000); // 2s stagger per app
    });
  }, [serviceNowSettings.autoIncidentEnabled, criticalApps]);
  // ─────────────────────────────────────────────────────────────────────────



  const filteredApps = apps.filter(app =>
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.tier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Application Portfolio</h1>
          {serviceNowSettings.autoIncidentEnabled && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-green-500">
              <Zap size={10} className="animate-pulse" />
              Auto-Incident Active — Critical apps automatically raise ServiceNow incidents
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-bg-surface px-3 py-2 rounded-lg border border-border-main">
            <Search size={14} className="text-text-muted" />
            <input
              type="text"
              placeholder="Filter by name, ID, or tier..."
              className="bg-transparent border-none outline-none text-xs w-48 placeholder:text-text-muted"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => toast.success('Filter pane opened.')}
            className="p-2 bg-bg-surface border border-border-main rounded-lg hover:bg-border-main transition-colors"
          >
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatBox label="Total Apps" value={String(apps.length)} icon={<Layers size={14} />} />
        <StatBox
          label="Critical"
          value={String(criticalApps.length)}
          color="text-red-500"
          icon={<AlertCircle size={14} />}
          badge={serviceNowSettings.autoIncidentEnabled ? 'AUTO' : undefined}
        />
        <StatBox label="Warning" value={String(warningApps.length)} color="text-amber-500" icon={<AlertTriangle size={14} />} />
        <StatBox label="Healthy" value={String(healthyApps.length)} color="text-green-500" icon={<CheckCircle size={14} />} />
      </div>

      {/* App Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {filteredApps.map((app) => (
          <AppCard 
            key={app.id} 
            app={app} 
            onViewDetails={() => setActiveModal({type: 'details', app})}
          />
        ))}
      </div>

      {/* Detailed Table */}
      <div className="bg-bg-surface border border-border-main rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border-main flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider">Performance Metrics</h3>
          <button 
            onClick={() => setShowAllMetrics(!showAllMetrics)}
            className="text-[10px] font-mono text-blue-500 hover:underline"
          >
            {showAllMetrics ? 'Hide Extended Metrics' : 'View All Metrics'}
          </button>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-main text-text-muted font-mono uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">App ID</th>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Tier</th>
                <th className="px-6 py-3 font-medium">Health Score</th>
                <th className="px-6 py-3 font-medium">Error Rate</th>
                <th className="px-6 py-3 font-medium">Latency</th>
                {showAllMetrics && (
                  <>
                    <th className="px-6 py-3 font-medium text-blue-400">Owner</th>
                    <th className="px-6 py-3 font-medium text-blue-400">Uptime</th>
                  </>
                )}
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main pb-24">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-border-main/50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-text-muted">{app.id}</td>
                  <td className="px-6 py-4 font-medium">{app.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-1.5 py-0.5 rounded bg-border-main border border-border-hover text-[10px] font-mono">
                      {app.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-bg-main rounded-full overflow-hidden w-20">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            app.health > 90 ? "bg-green-500" : app.health > 70 ? "bg-amber-500" : "bg-red-500"
                          )} 
                          style={{ width: `${app.health}%` }} 
                        />
                      </div>
                      <span className="font-mono">{app.health}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono">{app.errorRate}</td>
                  <td className="px-6 py-4 font-mono">{app.latency}</td>
                  {showAllMetrics && (
                    <>
                      <td className="px-6 py-4">{app.owner}</td>
                      <td className="px-6 py-4 font-mono">{app.uptime}</td>
                    </>
                  )}
                  <td className="px-6 py-4 relative">
                    <button 
                      onClick={() => setActiveActionsApp(activeActionsApp === app.id ? null : app.id)}
                      className="p-1.5 hover:bg-border-hover rounded transition-colors"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {activeActionsApp === app.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveActionsApp(null)} />
                        <div className="absolute right-8 top-4 w-52 bg-bg-surface border border-border-hover rounded-lg shadow-2xl overflow-hidden z-50">
                          <button onClick={() => {setActiveModal({type: 'details', app}); setActiveActionsApp(null)}} className="w-full text-left px-4 py-2 hover:bg-border-main flex items-center gap-2 text-text-main transition-colors"><Eye size={14}/> View details</button>
                          <button onClick={() => {setActiveModal({type: 'restart', app}); setActiveActionsApp(null)}} className="w-full text-left px-4 py-2 hover:bg-border-main flex items-center gap-2 text-text-main transition-colors"><RotateCw size={14}/> Restart service</button>
                          <button onClick={() => {navigator.clipboard.writeText(app.id); toast.success(`Copied ${app.id} to clipboard`); setActiveActionsApp(null)}} className="w-full text-left px-4 py-2 hover:bg-border-main flex items-center gap-2 text-text-main transition-colors"><Copy size={14}/> Copy APP ID</button>
                          <button onClick={() => {setActiveModal({type: 'alert', app}); setActiveActionsApp(null)}} className="w-full text-left px-4 py-2 hover:bg-border-main flex items-center gap-2 text-text-main transition-colors"><Bell size={14}/> Manage alert</button>
                          <div className="h-px bg-border-main w-full my-1"></div>
                          <button onClick={() => {setActiveModal({type: 'decommission', app}); setActiveActionsApp(null)}} className="w-full text-left px-4 py-2 hover:bg-red-500/10 flex items-center gap-2 text-red-500 transition-colors"><Trash2 size={14}/> Decommission service</button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-bg-surface border border-border-main rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border-main">
              <h2 className="font-bold">
                {activeModal.type === 'details' && `App Details: ${activeModal.app.name}`}
                {activeModal.type === 'restart' && `Restart Service`}
                {activeModal.type === 'alert' && `Manage Alerts: ${activeModal.app.name}`}
                {activeModal.type === 'decommission' && `Decommission Service`}
              </h2>
              <button onClick={() => setActiveModal(null)} className="p-1 hover:bg-border-main rounded transition-colors"><X size={16} /></button>
            </div>
            
            <div className="p-4 space-y-4">
              {activeModal.type === 'details' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-text-muted">App ID:</span><span className="font-mono text-right">{activeModal.app.id}</span>
                    <span className="text-text-muted">Name:</span><span className="font-medium text-right">{activeModal.app.name}</span>
                    <span className="text-text-muted">Tier:</span><span className="text-right">{activeModal.app.tier}</span>
                    <span className="text-text-muted">Status:</span><span className="text-right">{activeModal.app.status}</span>
                    <span className="text-text-muted">Owner:</span><span className="text-right">{activeModal.app.owner}</span>
                    <span className="text-text-muted">Health Score:</span><span className="text-right">{activeModal.app.health}%</span>
                    <span className="text-text-muted">Uptime:</span><span className="font-mono text-right">{activeModal.app.uptime}</span>
                    <span className="text-text-muted">Error Rate:</span><span className="font-mono text-right">{activeModal.app.errorRate}</span>
                    <span className="text-text-muted">Latency:</span><span className="font-mono text-right">{activeModal.app.latency}</span>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button onClick={() => setActiveModal(null)} className="px-3 py-1.5 rounded bg-blue-500 hover:bg-blue-600 text-white transition-colors">Done</button>
                  </div>
                </div>
              )}
              
              {activeModal.type === 'restart' && (
                <div className="space-y-4 text-sm">
                  <p>Are you sure you want to restart <strong className="text-text-main">{activeModal.app.name}</strong>? This may cause a temporary disruption in service.</p>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setActiveModal(null)} className="px-3 py-1.5 rounded bg-bg-main border border-border-main hover:bg-border-main transition-colors">Cancel</button>
                    <button onClick={() => {toast.success(`Successfully restarted ${activeModal.app.name}`); setActiveModal(null)}} className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-white transition-colors font-medium">Confirm Restart</button>
                  </div>
                </div>
              )}
              
              {activeModal.type === 'alert' && (
                <div className="space-y-4 text-sm">
                  <p className="text-text-muted mb-2">Configure notification channels for <strong className="text-text-main">{activeModal.app.name}</strong>.</p>
                  <label className="flex items-center gap-3 p-2 rounded border border-border-main hover:border-border-hover cursor-pointer transition-colors bg-bg-main group">
                    <input type="checkbox" defaultChecked className="rounded border-border-main bg-bg-main accent-blue-500 w-4 h-4" />
                    <div className="flex flex-col">
                      <span className="font-medium group-hover:text-text-main transition-colors">Email Notifications</span>
                      <span className="text-xs text-text-muted">Receive alerts directly to the owner's inbox.</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-2 rounded border border-border-main hover:border-border-hover cursor-pointer transition-colors bg-bg-main group">
                    <input type="checkbox" defaultChecked className="rounded border-border-main bg-bg-main accent-blue-500 w-4 h-4" />
                    <div className="flex flex-col">
                      <span className="font-medium group-hover:text-text-main transition-colors">Slack Integration</span>
                      <span className="text-xs text-text-muted">Post alerts to #incidents channel.</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-2 rounded border border-border-main hover:border-border-hover cursor-pointer transition-colors bg-bg-main group">
                    <input type="checkbox" className="rounded border-border-main bg-bg-main accent-blue-500 w-4 h-4" />
                    <div className="flex flex-col">
                      <span className="font-medium group-hover:text-text-main transition-colors">PagerDuty Escalation</span>
                      <span className="text-xs text-text-muted">Trigger on-call escalation policies.</span>
                    </div>
                  </label>
                  <div className="flex justify-end pt-2">
                    <button onClick={() => {toast.success(`Alert preferences saved for ${activeModal.app.name}`); setActiveModal(null)}} className="px-3 py-1.5 rounded bg-blue-500 hover:bg-blue-600 text-white transition-colors font-medium">Save Preferences</button>
                  </div>
                </div>
              )}
              
              {activeModal.type === 'decommission' && (
                <div className="space-y-4 text-sm">
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded flex gap-2">
                    <Trash2 size={16} className="shrink-0 mt-0.5" />
                    <p><strong>Warning:</strong> Decommissioning <span className="font-bold">{activeModal.app.name}</span> is permanent and will destroy all associated resources and historical data.</p>
                  </div>
                  <div className="pt-2">
                    <label className="text-xs text-text-muted block mb-1">To confirm, type the app ID "{activeModal.app.id}" below:</label>
                    <input type="text" placeholder={activeModal.app.id} className="w-full bg-bg-main border border-border-main rounded px-3 py-2 outline-none focus:border-red-500 transition-colors" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setActiveModal(null)} className="px-3 py-1.5 rounded bg-bg-main border border-border-main hover:bg-border-main transition-colors">Cancel</button>
                    <button onClick={() => {toast.error(`Service ${activeModal.app.name} has been decommissioned`); setActiveModal(null)}} className="px-3 py-1.5 rounded bg-red-500 hover:bg-red-600 text-white transition-colors font-bold">Decommission</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color = "text-text-main", icon, badge }: any) {
  return (
    <div className="bg-bg-surface border border-border-main p-4 rounded-xl flex items-center justify-between">
      <div>
        <p className="text-[10px] font-mono text-text-muted uppercase mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <p className={cn("text-xl font-bold", color)}>{value}</p>
          {badge && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20 animate-pulse">
              {badge}
            </span>
          )}
        </div>
      </div>
      <div className="p-2 bg-bg-main rounded-lg border border-border-main text-text-muted">
        {icon}
      </div>
    </div>
  );
}

function AppCard({ app, ...props }: { app: any, [key: string]: any }) {
  const isHealthy = app.status === 'Healthy';
  const isCritical = app.status === 'Critical';

  return (
    <div className={cn(
      "bg-bg-surface border rounded-xl p-4 transition-all hover:translate-y-[-2px] cursor-pointer group",
      isHealthy ? "border-border-main hover:border-green-500/30" : 
      isCritical ? "border-red-500/30 hover:border-red-500/50" : "border-amber-500/30 hover:border-amber-500/50"
    )}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-[10px] font-mono text-text-muted block mb-1">{app.id}</span>
          <h3 className="font-bold text-sm group-hover:text-text-main transition-colors">{app.name}</h3>
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded text-[10px] font-mono",
          isHealthy ? "bg-green-500/10 text-green-500" : 
          isCritical ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
        )}>
          {app.status}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-mono text-text-muted uppercase">Latency</p>
          <p className="text-xs font-bold">{app.latency}</p>
        </div>
        <div>
          <p className="text-[10px] font-mono text-text-muted uppercase">Errors</p>
          <p className="text-xs font-bold">{app.errorRate}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border-main">
        <div className="flex gap-1.5 cursor-help" onClick={() => toast.info(`${app.name} dependencies map`)}>
          <Cpu size={12} className="text-text-muted hover:text-text-main transition-colors" />
          <Database size={12} className="text-text-muted hover:text-text-main transition-colors" />
          <Network size={12} className="text-text-muted hover:text-text-main transition-colors" />
        </div>
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (props.onViewDetails) {
              props.onViewDetails(app);
            } else {
              toast.success(`Viewing ${app.name} detailed topology`); 
            }
          }}
          className="p-1 hover:bg-border-main rounded transition-colors"
        >
          <ArrowUpRight size={14} className="text-text-muted group-hover:text-text-main transition-colors" />
        </button>
      </div>
    </div>
  );
}

function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function AlertTriangle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}


