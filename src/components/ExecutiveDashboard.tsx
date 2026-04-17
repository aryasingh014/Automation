import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  ShieldCheck,
  Globe,
  Zap
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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn } from '@/src/lib/utils';
import { useTelemetry, useHistoricalTelemetry } from '@/src/hooks/useTelemetry';
import { useAppContext } from '@/src/context/AppContext';
import { analyzeIncident } from '@/src/lib/ai';

export default function ExecutiveDashboard() {
  const [isMounted, setIsMounted] = React.useState(false);
  const telemetry = useTelemetry();
  const history = useHistoricalTelemetry(15, 3000);
  const { openAiModal, aiSettings, portfolioApps } = useAppContext();
  const [isExporting, setIsExporting] = React.useState(false);

  const healthData = [
    { name: 'Critical', value: portfolioApps.filter(a => a.status === 'Critical').length, color: '#ef4444' },
    { name: 'Warning', value: portfolioApps.filter(a => a.status === 'Warning').length, color: '#f59e0b' },
    { name: 'Healthy', value: portfolioApps.filter(a => a.status === 'Healthy').length, color: '#22c55e' },
  ];

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleInvestigate = async (serviceName: string, status: string) => {
    toast.promise(
      async () => {
        const details = `Service ${serviceName} is current in ${status} state. Telemetry shows latency at ${telemetry.latency.toFixed(2)}ms and error rate at ${(telemetry.errorRate * 100).toFixed(2)}%.`;
        const result = await analyzeIncident(serviceName, details, aiSettings);
        openAiModal(serviceName + " Investigation", result.analysis, result.recommendations, result.severity);
      },
      {
        loading: `AI is analyzing ${serviceName} telemetry...`,
        success: `Intelligence report for ${serviceName} ready.`,
        error: 'AI analysis failed. Please check connection.',
      }
    );
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('executive-dashboard-content');
    if (!element) return;

    setIsExporting(true);
    const toastId = toast.loading('Generating Executive PDF Report...');

    const safetyTimer = setTimeout(() => setIsExporting(false), 30000);

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const isDark = document.documentElement.classList.contains('dark');
      const bgColor = isDark ? '#0A0A0A' : '#FFFFFF';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: bgColor,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ unit: 'in', format: 'legal', orientation: 'landscape' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 0.5;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;
      const imgRatio = canvas.width / canvas.height;
      const imgWidth = availableWidth;
      const imgHeight = imgWidth / imgRatio;

      if (imgHeight <= availableHeight) {
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
      } else {
        const totalPages = Math.ceil(imgHeight / availableHeight);
        for (let i = 0; i < totalPages; i++) {
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', margin, margin - i * availableHeight, imgWidth, imgHeight);
        }
      }

      pdf.save(`executive_report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF Report downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error('PDF Export error:', err);
      toast.error('Failed to generate PDF. Please try again.', { id: toastId });
    } finally {
      clearTimeout(safetyTimer);
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    const telemetryData = [
      { metric: 'Latency (ms)', value: telemetry.latency.toFixed(2) },
      { metric: 'Throughput', value: telemetry.throughput },
      { metric: 'Error Rate (%)', value: (telemetry.errorRate * 100).toFixed(2) },
      { metric: 'CPU (%)', value: telemetry.cpu.toFixed(1) },
      { metric: 'Memory (%)', value: telemetry.memory.toFixed(1) },
      { metric: 'Health (%)', value: telemetry.errorRate > 0.1 ? '84.2' : '94.8' },
      { metric: 'SLA Compliance (%)', value: '99.85' },
      { metric: 'Timestamp', value: new Date().toISOString() }
    ];

    const csvContent = [
      ['Metric', 'Value'].join(','),
      ...telemetryData.map(row => [row.metric, row.value].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `telemetry_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Executive Overview</h1>
          <p className="text-sm text-text-secondary font-mono">Portfolio Health Summary V2.0</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportCSV}
            className="text-xs font-mono font-bold bg-border-main hover:bg-border-hover border border-border-hover px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-text-main"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            CSV
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="text-xs font-mono font-bold bg-border-main hover:bg-border-hover border border-border-hover px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-text-main disabled:opacity-50"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-text-main border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            )}
            {isExporting ? 'Generating...' : 'PDF'}
          </button>
        </div>
      </div>

      <div id="executive-dashboard-content" className="space-y-6 pt-2">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Avg. Latency" 
          value={`${telemetry.latency.toFixed(1)}ms`} 
          trend={telemetry.latency > 150 ? "+5.2%" : "-2.1%"} 
          isPositive={telemetry.latency < 150} 
          icon={<Zap className={telemetry.latency > 150 ? "text-amber-500" : "text-blue-500"} size={20} />} 
        />
        <KpiCard 
          title="Error Rate" 
          value={`${(telemetry.errorRate * 100).toFixed(2)}%`} 
          trend={telemetry.errorRate > 0.05 ? "+0.4%" : "-0.1%"} 
          isPositive={telemetry.errorRate < 0.05} 
          icon={<AlertTriangle className={telemetry.errorRate > 0.05 ? "text-red-500" : "text-amber-500"} size={20} />} 
        />
        <KpiCard 
          title="Overall Health" 
          value={telemetry.errorRate > 0.1 ? "84.2%" : "94.8%"} 
          trend="+1.2%" 
          isPositive={true} 
          icon={<ShieldCheck className="text-green-500" size={20} />} 
        />
        <KpiCard 
          title="SLA Compliance" 
          value="99.85%" 
          trend="-0.02%" 
          isPositive={false} 
          icon={<Globe className="text-purple-500" size={20} />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Distribution */}
        <div className="lg:col-span-1 bg-bg-surface border border-border-main rounded-xl p-6 min-w-0">
          <h3 className="text-sm font-mono font-bold mb-6 text-text-secondary uppercase tracking-wider">Portfolio Distribution</h3>
          <div className="h-[250px] w-full relative">
            {isMounted && (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {healthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)' }}
                    itemStyle={{ color: 'var(--text-main)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {healthData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-text-secondary">{item.name}</span>
                </div>
                <span className="font-mono font-bold">{item.value} Apps</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Trends */}
        <div className="lg:col-span-2 bg-bg-surface border border-border-main rounded-xl p-6 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-mono font-bold text-text-secondary uppercase tracking-wider">System Performance Trends (Live)</h3>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-[10px] font-mono text-green-500">
                <div className="w-2 h-0.5 bg-green-500" /> Throughput
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-blue-500">
                <div className="w-2 h-0.5 bg-blue-500" /> Latency
              </span>
            </div>
          </div>
          <div className="h-[300px] w-full relative">
            {isMounted && (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke="var(--text-muted)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="throughput" 
                    stroke="#22c55e" 
                    fillOpacity={1} 
                    fill="url(#colorThroughput)" 
                    isAnimationActive={false}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="latency" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorLatency)" 
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Business Impact Table */}
      <div className="bg-bg-surface border border-border-main rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border-main">
          <h3 className="text-sm font-mono font-bold text-text-secondary uppercase tracking-wider">Critical Service Impact</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-main text-text-muted font-mono uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">Service Name</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Impact Level</th>
                <th className="px-6 py-3 font-medium">Revenue Risk</th>
                <th className="px-6 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {portfolioApps
                .filter(a => a.status !== 'Healthy')
                .sort((a, b) => (a.status === 'Critical' ? -1 : 1))
                .slice(0, 5)
                .map(app => (
                  <ImpactRow 
                    key={app.id}
                    name={app.name} 
                    status={app.status} 
                    impact={app.status === 'Critical' ? 'Severe' : 'Medium'} 
                    risk={app.status === 'Critical' ? '$$$$' : '$$'} 
                    statusColor={app.status === 'Critical' ? 'text-red-500' : 'text-amber-500'}
                    onInvestigate={() => handleInvestigate(app.name, app.status)}
                  />
                ))}
              {portfolioApps.filter(a => a.status !== 'Healthy').length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-text-muted font-mono uppercase">
                    All core services performing within SLA parameters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, trend, isPositive, icon }: { 
  title: string, value: string, trend: string, isPositive: boolean, icon: React.ReactNode 
}) {
  return (
    <div className="bg-bg-surface border border-border-main rounded-xl p-5 hover:border-border-hover transition-colors group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">{title}</span>
        <div className="p-2 bg-bg-main rounded-lg border border-border-main group-hover:border-border-hover transition-colors">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded",
          isPositive ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10"
        )}>
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {trend}
        </div>
      </div>
    </div>
  );
}

function ImpactRow({ name, status, impact, risk, statusColor, onInvestigate }: any) {
  return (
    <tr className="hover:bg-border-main/50 transition-colors cursor-pointer">
      <td className="px-6 py-4 font-medium">{name}</td>
      <td className="px-6 py-4">
        <span className={cn("flex items-center gap-1.5", statusColor)}>
          <div className={cn("w-1.5 h-1.5 rounded-full", statusColor.replace('text-', 'bg-'))} />
          {status}
        </span>
      </td>
      <td className="px-6 py-4 text-text-secondary">{impact}</td>
      <td className="px-6 py-4 font-mono text-amber-500">{risk}</td>
      <td className="px-6 py-4">
        <button 
          onClick={onInvestigate}
          className="text-[10px] font-mono border border-border-hover px-2 py-1 rounded hover:bg-inverse-bg hover:text-inverse-text transition-colors"
        >
          Investigate
        </button>
      </td>
    </tr>
  );
}


