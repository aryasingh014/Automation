import React from 'react';
import { 
  Server, 
  Database, 
  Network, 
  HardDrive, 
  Cpu, 
  Activity,
  ArrowUp,
  ArrowDown,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { cn } from '../lib/utils';
import { useAppContext } from '../context/AppContext';
import ServiceTopology from './ServiceTopology';

const initialResourceUsage = [
  { name: '00:00', cpu: 45, mem: 62, disk: 30 },
  { name: '04:00', cpu: 38, mem: 58, disk: 30 },
  { name: '08:00', cpu: 65, mem: 72, disk: 32 },
  { name: '12:00', cpu: 82, mem: 85, disk: 35 },
  { name: '16:00', cpu: 78, mem: 80, disk: 38 },
  { name: '20:00', cpu: 55, mem: 68, disk: 40 },
{ name: '23:59', cpu: 48, mem: 64, disk: 42 },
];

export default function InfrastructureDashboard() {
  const [isMounted, setIsMounted] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'resources' | 'topology'>('resources');
  const { portfolioApps } = useAppContext();
  const [resourceUsage, setResourceUsage] = React.useState(initialResourceUsage);

  // Dynamic resource usage based on app health
  React.useEffect(() => {
    const avgHealth = portfolioApps.reduce((sum, app) => sum + app.health, 0) / portfolioApps.length;
    const criticalCount = portfolioApps.filter(a => a.status === 'Critical').length;
    
    // Simulate resource usage based on app health
    const interval = setInterval(() => {
      setResourceUsage(prev => {
        const newData = [...prev.slice(1), {
          name: 'Now',
          cpu: Math.max(20, 95 - avgHealth * 0.7 + Math.random() * 20 - criticalCount * 2),
          mem: Math.max(30, 90 - avgHealth * 0.5 + Math.random() * 15),
          disk: 30 + Math.floor(Math.random() * 20)
        }];
        return newData;
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, [portfolioApps]);

  // Dynamic cluster health based on portfolio apps
  const criticalCount = portfolioApps.filter(a => a.status === 'Critical').length;
  const warningCount = portfolioApps.filter(a => a.status === 'Warning').length;
  
  const clusterHealth = [
    { name: 'US-East-1', status: criticalCount > 2 ? 'Critical' : warningCount > 0 ? 'Warning' : 'Healthy', nodes: 24, load: `${Math.min(95, 40 + criticalCount * 10 + warningCount * 5)}%` },
    { name: 'US-West-2', status: warningCount > 1 ? 'Warning' : 'Healthy', nodes: 18, load: `${Math.min(90, 35 + warningCount * 8)}%` },
    { name: 'EU-Central-1', status: criticalCount > 0 ? 'Critical' : 'Healthy', nodes: 12, load: `${Math.min(85, 45 + criticalCount * 15)}%` },
    { name: 'AP-South-1', status: 'Healthy', nodes: 8, load: '22%' },
  ];

  // Dynamic inventory based on apps
  const inventoryData = portfolioApps.slice(0, 5).map((app, idx) => ({
    id: `SRV-${9900 + idx}`,
    type: idx < 2 ? 'Compute' : 'Database',
    env: app.tier === 'T1' ? 'Production' : app.tier === 'T2' ? 'Staging' : 'Development',
    region: ['US-East-1', 'US-West-2', 'EU-Central-1', 'AP-South-1', 'Global'][idx],
    status: app.status === 'Critical' ? 'Offline' : app.status === 'Warning' ? 'Degraded' : 'Online'
  }));

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDownloadCSV = () => {
    const headers = ['Resource ID', 'Type', 'Environment', 'Region', 'Status'];
    const csvContent = [
      headers.join(','),
      ...inventoryData.map(row => `${row.id},${row.type},${row.env},${row.region},${row.status}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'infrastructure_inventory.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('infrastructure_inventory.csv downloaded locally.');
  };

return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Infrastructure Health</h1>
            <p className="text-sm text-text-secondary">Hybrid Cloud Resource Monitor</p>
          </div>
          <div className="flex items-center gap-1 bg-bg-surface border border-border-main p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('resources')}
              className={cn(
                "px-3 py-1.5 text-xs font-mono rounded",
                activeTab === 'resources' ? "bg-inverse-bg text-inverse-text" : "text-text-secondary hover:text-text-main"
              )}
            >
              Resources
            </button>
            <button
              onClick={() => setActiveTab('topology')}
              className={cn(
                "px-3 py-1.5 text-xs font-mono rounded flex items-center gap-1.5",
                activeTab === 'topology' ? "bg-inverse-bg text-inverse-text" : "text-text-secondary hover:text-text-main"
              )}
            >
              <Network size={12} /> Topology
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'topology' ? (
        <ServiceTopology />
      ) : (
      <>
      {/* Resource Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-bg-surface border border-border-main rounded-xl p-6 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-mono font-bold text-text-secondary uppercase tracking-wider">Aggregate Resource Utilization</h3>
            <div className="flex gap-3">
              <span className="flex items-center gap-1 text-[10px] font-mono text-blue-500">
                <div className="w-2 h-2 rounded-full bg-blue-500" /> CPU
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-purple-500">
                <div className="w-2 h-2 rounded-full bg-purple-500" /> MEMORY
              </span>
            </div>
          </div>
          <div className="h-[250px] w-full relative">
            {isMounted && (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={resourceUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)' }} />
                  <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="mem" stroke="#a855f7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-bg-surface border border-border-main rounded-xl p-6">
          <h3 className="text-sm font-mono font-bold text-text-secondary uppercase tracking-wider mb-6">Cluster Status</h3>
          <div className="space-y-4">
            {clusterHealth.map((cluster) => (
              <div key={cluster.name} className="p-3 bg-bg-main border border-border-main rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold">{cluster.name}</span>
                  <span className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded",
                    cluster.status === 'Healthy' ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                  )}>
                    {cluster.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span>{cluster.nodes} NODES</span>
                  <span>{cluster.load} LOAD</span>
                </div>
                <div className="mt-2 h-1 bg-border-main rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full", parseInt(cluster.load) > 80 ? "bg-amber-500" : "bg-blue-500")} 
                    style={{ width: cluster.load }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Component Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ResourceCard 
          title="Compute Instances" 
          count="1,240" 
          status="Operational" 
          icon={<Cpu size={18} />} 
          metrics={[{ label: 'Avg CPU', value: '42%' }, { label: 'Uptime', value: '99.99%' }]}
        />
        <ResourceCard 
          title="Database Clusters" 
          count="48" 
          status="Operational" 
          icon={<Database size={18} />} 
          metrics={[{ label: 'Connections', value: '12k' }, { label: 'IOPS', value: '450k' }]}
        />
        <ResourceCard 
          title="Network Links" 
          count="156" 
          status="Degraded" 
          icon={<Network size={18} />} 
          metrics={[{ label: 'Packet Loss', value: '0.02%' }, { label: 'Jitter', value: '12ms' }]}
          isWarning
        />
        <ResourceCard 
          title="Storage Volumes" 
          count="850" 
          status="Operational" 
          icon={<HardDrive size={18} />} 
          metrics={[{ label: 'Used', value: '640TB' }, { label: 'Free', value: '210TB' }]}
        />
      </div>

      {/* Inventory Table */}
      <div className="bg-bg-surface border border-border-main rounded-xl overflow-hidden min-h-[350px]">
        <div className="p-4 border-b border-border-main flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider">Infrastructure Inventory</h3>
          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-text-muted font-mono mr-2 hidden sm:inline-block">
              {isMounted ? `Last Sync: ${new Date().toLocaleTimeString()}` : 'Sync: Pending'}
            </span>
            <button 
              onClick={handleDownloadCSV}
              className="text-[10px] font-mono border border-border-main px-2 py-1 rounded hover:bg-border-main transition-colors"
            >
              Export CSV
            </button>
            <button 
              onClick={() => toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
                loading: 'Synchronizing with Master CMDB...',
                success: 'All resources matched and synced.',
                error: 'CMDB sync failed.',
              })}
              className="text-[10px] font-mono border border-border-main px-2 py-1 rounded hover:bg-border-main transition-colors bg-border-main/50"
            >
              Sync CMDB
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-main text-text-muted font-mono uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">Resource ID</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Environment</th>
                <th className="px-6 py-3 font-medium">Region</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {inventoryData.map(item => (
                <InventoryRow key={item.id} {...item} />
              ))}
            </tbody>
          </table>
</div>
      </div>
      </>
      )}
    </div>
  );
}

function ResourceCard({ title, count, status, icon, metrics, isWarning }: any) {
  return (
    <div className="bg-bg-surface border border-border-main rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-bg-main rounded-lg border border-border-main text-text-secondary">
          {icon}
        </div>
        <span className={cn(
          "text-[10px] font-mono px-1.5 py-0.5 rounded",
          isWarning ? "bg-amber-500/10 text-amber-500" : "bg-green-500/10 text-green-500"
        )}>
          {status}
        </span>
      </div>
      <div className="mb-4">
        <h3 className="text-xs font-mono text-text-muted uppercase mb-1">{title}</h3>
        <p className="text-2xl font-bold">{count}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border-main">
        {metrics.map((m: any) => (
          <div key={m.label}>
            <p className="text-[9px] font-mono text-text-muted uppercase">{m.label}</p>
            <p className="text-xs font-bold">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function InventoryRow({ id, type, env, region, status }: any) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <tr className="hover:bg-border-main/50 transition-colors">
      <td className="px-6 py-4 font-mono">{id}</td>
      <td className="px-6 py-4">{type}</td>
      <td className="px-6 py-4">
        <span className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-mono border",
          env === 'Production' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-border-main text-text-secondary border-border-hover"
        )}>
          {env}
        </span>
      </td>
      <td className="px-6 py-4 text-text-secondary">{region}</td>
      <td className="px-6 py-4">
        <span className={cn(
          "flex items-center gap-1.5",
          status === 'Online' ? "text-green-500" : "text-amber-500"
        )}>
          <div className={cn("w-1.5 h-1.5 rounded-full", status === 'Online' ? "bg-green-500" : "bg-amber-500")} />
          {status}
        </span>
      </td>
      <td className="px-6 py-4 relative">
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-text-muted hover:text-text-main transition-colors p-1.5 hover:bg-border-hover rounded"
        >
          <ExternalLink size={14} />
        </button>
        {menuOpen && (
          <div className="absolute right-12 top-4 w-36 bg-bg-surface border border-border-hover rounded-lg shadow-2xl overflow-hidden z-50">
            <button 
              onClick={() => { toast.success(`Configuration opened for ${id}`); setMenuOpen(false); }} 
              className="w-full text-left px-4 py-2 hover:bg-border-main text-xs transition-colors"
            >
              Configure Node
            </button>
            <button 
              onClick={() => { toast.info(`Initializing SSH session to ${id}...`); setMenuOpen(false); }} 
              className="w-full text-left px-4 py-2 hover:bg-border-main text-xs transition-colors"
            >
              SSH Console
            </button>
            <button 
              onClick={() => { toast.error(`Sending restart sigterm to ${id}`); setMenuOpen(false); }} 
              className="w-full text-left px-4 py-2 hover:bg-red-500/10 text-red-500 text-xs transition-colors border-t border-border-hover"
            >
              Restart Node
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}


