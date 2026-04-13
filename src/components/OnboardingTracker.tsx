import React, { useState } from 'react';
import { 
  Rocket, 
  CheckCircle2, 
  Circle, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Search,
  Plus,
  X,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/context/AuthContext';

interface OnboardingRequest {
  _id: string;
  appName: string;
  tier: string;
  owner: string;
  environment: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  rejectionReason?: string;
}

const waves = [
  { id: 1, name: 'Wave 1: Pilot', status: 'Completed', apps: 15, progress: 100, date: 'Jan 2024' },
  { id: 2, name: 'Wave 2: Scale', status: 'In Progress', apps: 45, progress: 65, date: 'Feb - Mar 2024' },
  { id: 3, name: 'Wave 3: Full Rollout', status: 'Planned', apps: 92, progress: 0, date: 'Apr - Jun 2024' },
];

const checklistItems = [
  { label: 'Telemetry Ingestion (Logs/Metrics)', status: 'done' },
  { label: 'Standard Dashboard Deployment', status: 'done' },
  { label: 'Alert Rule Optimization', status: 'doing' },
  { label: 'ServiceNow Integration Mapping', status: 'doing' },
  { label: 'CMDB Relationship Validation', status: 'todo' },
  { label: 'RACI Documentation Finalized', status: 'todo' },
];

export default function OnboardingTracker() {
  const { token } = useAuth();
  const [onboardedApps, setOnboardedApps] = useState<OnboardingRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    appName: '',
    tier: 'T1',
    owner: '',
    environment: 'Production'
  });

  React.useEffect(() => {
    fetchApprovedApps();
  }, []);

  const fetchApprovedApps = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/requests?status=approved', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOnboardedApps(data);
      }
    } catch (err) {
      console.error('Failed to fetch apps:', err);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const res = await fetch('/api/onboarding/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Onboarding request submitted! Pending admin approval.');
        setIsModalOpen(false);
        setFormData({ appName: '', tier: 'T1', owner: '', environment: 'Production' });
      } else {
        toast.error(data.message || 'Failed to submit request');
      }
    } catch (err) {
      toast.error('Failed to submit request');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Onboarding Factory</h1>
          <p className="text-sm text-text-secondary font-mono">Application Onboarding Pipeline V1</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-inverse-bg text-inverse-text rounded-lg text-xs font-bold hover:bg-white transition-colors shadow-lg shadow-white/5"
        >
          <Plus size={16} /> New Onboarding Request
        </button>
      </div>

      {/* Onboarding Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-bg-main/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-bg-surface border border-border-main rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border-main flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">New Onboarding Request</h2>
                  <p className="text-xs text-text-secondary font-mono">Intake Form Version 1.2</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-border-main rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Application Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Global Checkout Service"
                    className="w-full bg-bg-main border border-border-main rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 outline-none transition-colors"
                    value={formData.appName}
                    onChange={(e) => setFormData({...formData, appName: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Service Tier</label>
                    <select 
                      className="w-full bg-bg-main border border-border-main rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 outline-none transition-colors appearance-none"
                      value={formData.tier}
                      onChange={(e) => setFormData({...formData, tier: e.target.value})}
                    >
                      <option value="T1">Tier 1 (Critical)</option>
                      <option value="T2">Tier 2 (Important)</option>
                      <option value="T3">Tier 3 (Supporting)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Environment</label>
                    <select 
                      className="w-full bg-bg-main border border-border-main rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 outline-none transition-colors appearance-none"
                      value={formData.environment}
                      onChange={(e) => setFormData({...formData, environment: e.target.value})}
                    >
                      <option value="Production">Production</option>
                      <option value="Staging">Staging</option>
                      <option value="Development">Development</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Service Owner (Email)</label>
                  <input 
                    required
                    type="email" 
                    placeholder="owner@enterprise.com"
                    className="w-full bg-bg-main border border-border-main rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 outline-none transition-colors"
                    value={formData.owner}
                    onChange={(e) => setFormData({...formData, owner: e.target.value})}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-border-main rounded-lg text-sm font-bold hover:bg-border-main transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-inverse-bg text-inverse-text rounded-lg text-sm font-bold hover:bg-white transition-colors flex items-center justify-center gap-2"
                  >
                    Submit Request <ChevronRight size={16} />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Wave Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {waves.map((wave) => (
          <div key={wave.id} className="bg-bg-surface border border-border-main rounded-xl p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Phase 0{wave.id}</span>
                <h3 className="font-bold text-sm">{wave.name}</h3>
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded text-[10px] font-mono",
                wave.status === 'Completed' ? "bg-green-500/10 text-green-500" : 
                wave.status === 'In Progress' ? "bg-blue-500/10 text-blue-500" : "bg-border-main text-text-muted"
              )}>
                {wave.status}
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-text-secondary">{wave.apps} Applications</span>
                <span className="font-mono">{wave.progress}%</span>
              </div>
              <div className="h-1.5 bg-bg-main rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all duration-1000", wave.status === 'Completed' ? "bg-green-500" : "bg-blue-500")} 
                  style={{ width: `${wave.progress}%` }} 
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border-main">
              <span className="text-[10px] font-mono text-text-muted">{wave.date}</span>
              <button 
                onClick={() => toast.info(`Viewing details for ${wave.name}`)}
                className="text-[10px] font-mono text-text-secondary hover:text-text-main flex items-center gap-1 transition-colors"
              >
                View Details <ArrowRight size={10} />
              </button>
            </div>

            {wave.status === 'Completed' && (
              <ShieldCheck size={48} className="absolute -right-4 -bottom-4 text-green-500/5 rotate-12" />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Onboarding Checklist */}
        <div className="bg-bg-surface border border-border-main rounded-xl p-6">
          <h3 className="text-sm font-mono font-bold text-text-secondary uppercase tracking-wider mb-6">Standard "Definition of Done"</h3>
          <div className="space-y-4">
            {checklistItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 group">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center border transition-colors",
                  item.status === 'done' ? "bg-green-500/10 border-green-500/30 text-green-500" : 
                  item.status === 'doing' ? "bg-blue-500/10 border-blue-500/30 text-blue-500" : "border-border-main text-text-muted"
                )}>
                  {item.status === 'done' ? <CheckCircle2 size={12} /> : 
                   item.status === 'doing' ? <Clock size={12} className="animate-spin-slow" /> : <Circle size={12} />}
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  item.status === 'done' ? "text-text-secondary line-through" : "text-text-main"
                )}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

{/* Recent Onboarded Apps */}
        <div className="bg-bg-surface border border-border-main rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-mono font-bold text-text-secondary uppercase tracking-wider">Recently Onboarded</h3>
            <div className="flex items-center gap-2 bg-bg-main px-2 py-1 rounded border border-border-main">
              <Search size={12} className="text-text-muted" />
              <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-[10px] w-24" />
            </div>
          </div>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border-main">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-text-muted" />
              </div>
            ) : onboardedApps.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">No onboarded applications yet</p>
            ) : (
              <div className="space-y-2">
                {onboardedApps.map((app) => (
                  <OnboardedItem key={app._id} name={app.appName} id={app._id} date={app.requestedAt} />
                ))}
              </div>
            )}
          </div>
          
          <button 
            onClick={() => toast.info('Loading full history...')}
            className="w-full mt-4 py-2 border border-border-main rounded-lg text-[10px] font-mono text-text-muted hover:bg-border-main hover:text-text-main transition-all"
          >
            View All Onboarding History
          </button>
        </div>
      </div>
    </div>
  );
}

function OnboardedItem({ name, id, date }: { name: string; id: string; date: string; key?: string }) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  return (
    <div className="flex items-center justify-between p-3 bg-bg-main border border-border-main rounded-lg hover:border-border-hover transition-colors cursor-pointer group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-bg-surface border border-border-main flex items-center justify-center text-text-muted group-hover:text-blue-500 transition-colors">
          <Rocket size={14} />
        </div>
        <div>
          <p className="text-xs font-bold">{name}</p>
          <p className="text-[10px] font-mono text-text-muted">{id.slice(-8)}</p>
        </div>
      </div>
      <span className="text-[10px] font-mono text-text-muted">{formatDate(date)}</span>
    </div>
  );
}


