import React, { useState } from 'react';
import { 
  MessageSquare, 
  Github, 
  Mail, 
  Database, 
  Cloud, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Trello
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';

const integrationCategories = [
  { id: 'all', label: 'All' },
  { id: 'communication', label: 'Communication' },
  { id: 'devops', label: 'DevOps' },
  { id: 'crm', label: 'CRM & Sales' },
  { id: 'productivity', label: 'Productivity' },
];

const integrations = [
  { 
    id: 'slack', 
    name: 'Slack', 
    category: 'communication', 
    icon: MessageSquare, 
    status: 'Connected', 
    description: 'Send alerts and incident updates directly to channels.',
    color: 'text-[#4A154B]'
  },
  { 
    id: 'jira', 
    name: 'Jira', 
    category: 'productivity', 
    icon: Trello, 
    status: 'Not Connected', 
    description: 'Automatically create and sync Jira tickets from incidents.',
    color: 'text-[#0052CC]'
  },
  { 
    id: 'github', 
    name: 'GitHub', 
    category: 'devops', 
    icon: Github, 
    status: 'Connected', 
    description: 'Track deployments and link commits to performance drops.',
    color: 'text-text-main'
  },
  { 
    id: 'salesforce', 
    name: 'Salesforce', 
    category: 'crm', 
    icon: Cloud, 
    status: 'Not Connected', 
    description: 'Monitor customer impact and sync account health data.',
    color: 'text-[#00A1E0]'
  },
  { 
    id: 'gmail', 
    name: 'Gmail / G-Suite', 
    category: 'communication', 
    icon: Mail, 
    status: 'Not Connected', 
    description: 'Send daily executive reports and email notifications.',
    color: 'text-[#EA4335]'
  },
  { 
    id: 'servicenow', 
    name: 'ServiceNow', 
    category: 'devops', 
    icon: Database, 
    status: 'Connected', 
    description: 'The master CMDB and incident management integration.',
    color: 'text-[#81B5A1]'
  },
];

export default function IntegrationsDashboard() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIntegrations = integrations.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleConnect = (name: string) => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
      loading: `Connecting to ${name} via OAuth 2.0...`,
      success: `${name} integration established successfully!`,
      error: `Failed to connect to ${name}. Please check your credentials.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">SaaS Integrations</h1>
          <p className="text-sm text-text-secondary font-mono">External Service Connectors V2</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-bg-surface px-3 py-2 rounded-lg border border-border-main">
            <input 
              type="text" 
              placeholder="Search integrations..." 
              className="bg-transparent border-none outline-none text-xs w-48 placeholder:text-text-muted"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {integrationCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-mono whitespace-nowrap transition-all border",
              activeCategory === cat.id 
                ? "bg-inverse-bg text-inverse-text border-inverse-bg" 
                : "text-text-secondary border-border-main hover:border-border-hover hover:text-text-main"
            )}
          >
            {cat.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredIntegrations.map((item) => (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-bg-surface border border-border-main rounded-2xl p-6 flex flex-col h-full group hover:border-border-hover transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn("p-3 rounded-xl bg-bg-main border border-border-main", item.color)}>
                  <item.icon size={24} />
                </div>
                <div className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1.5",
                  item.status === 'Connected' ? "bg-green-500/10 text-green-500" : "bg-border-main text-text-muted"
                )}>
                  <span className={cn("w-1 h-1 rounded-full", item.status === 'Connected' ? "bg-green-500" : "bg-text-muted")} />
                  {item.status.toUpperCase()}
                </div>
              </div>

              <h3 className="text-lg font-bold mb-2">{item.name}</h3>
              <p className="text-xs text-text-secondary leading-relaxed mb-6 flex-1">
                {item.description}
              </p>

              <div className="pt-4 border-t border-border-main flex items-center justify-between">
                <button 
                  onClick={() => toast.info('Opening documentation...')}
                  className="text-[10px] font-mono text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
                >
                  View Docs <ExternalLink size={10} />
                </button>
                {item.status === 'Connected' ? (
                  <button 
                    onClick={() => toast.info(`Managing ${item.name} settings...`)}
                    className="px-3 py-1.5 bg-border-main text-text-main rounded-lg text-[10px] font-bold hover:bg-border-hover transition-colors"
                  >
                    Configure
                  </button>
                ) : (
                  <button 
                    onClick={() => handleConnect(item.name)}
                    className="px-3 py-1.5 bg-inverse-bg text-inverse-text rounded-lg text-[10px] font-bold hover:bg-white transition-colors"
                  >
                    Connect App
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Custom Integration Card */}
        <button 
          onClick={() => toast.info('Custom webhook configuration opened.')}
          className="bg-bg-surface border border-border-main border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-border-main/50 transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-bg-main border border-border-main flex items-center justify-center text-text-muted group-hover:text-text-main transition-colors">
            <Plus size={24} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold">Custom Webhook</p>
            <p className="text-[10px] font-mono text-text-muted">Add New Connector</p>
          </div>
        </button>
      </div>

      {/* Integration Status Banner */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-4">
        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
          <AlertCircle size={18} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-blue-500 mb-1">Enterprise Security Note</h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            All external integrations use OAuth 2.0 and are scoped to read-only access by default. 
            Write permissions for Jira and ServiceNow require admin approval via the <span className="text-text-main font-mono">Security Policy Manager</span>.
          </p>
        </div>
      </div>
    </div>
  );
}


