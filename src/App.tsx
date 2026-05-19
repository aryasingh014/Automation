/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  Server, 
  Bell, 
  Rocket, 
  Settings,
  Search,
  User,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  Info,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Users,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { cn } from './lib/utils';
import { useAppContext } from './context/AppContext';
import { PLATFORM_INFO } from './lib/ticketing';
import { useAuth } from './context/AuthContext';
import { usePermissions } from './hooks/usePermissions';
import LoginScreen from './components/LoginScreen';

// Dashboards
import ExecutiveDashboard from './components/ExecutiveDashboard';
import ApplicationDashboard from './components/ApplicationDashboard';
import InfrastructureDashboard from './components/InfrastructureDashboard';
import NOCDashboard from './components/NOCDashboard';
import OnboardingTracker from './components/OnboardingTracker';
import GlobalSearchModal from './components/GlobalSearchModal';
import SettingsModal from './components/SettingsModal';
import UserManagementPanel from './components/UserManagementPanel';
import PlatformChatbot from './components/PlatformChatbot';

type DashboardType = 'executive' | 'application' | 'infrastructure' | 'noc' | 'onboarding' | 'chatbot';

const FormattedAnalysis = ({ text }: { text: string }) => {
  if (!text) return null;
  
  let lines = text.split('\n');
  // If the LLM returned a single line with ' * ' separators instead of newlines
  if (lines.length === 1 && text.includes(' * ')) {
    lines = text.split(/(?=\s\*\s)/).map(s => s.trim());
  }

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return null;
        
        const isList = line.trim().match(/^[\*\-\+]\s/);
        const cleanLine = line.replace(/^[\*\-\+]\s+/, '');
        
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        const formattedContent = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-semibold text-text-main">{part.slice(2, -2)}</strong>;
          }
          return <span key={j}>{part}</span>;
        });

        if (isList) {
          return (
            <div key={i} className="flex gap-3 items-start ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
              <div className="text-sm text-text-main leading-relaxed">{formattedContent}</div>
            </div>
          );
        }

        return (
          <div key={i} className="text-sm text-text-main leading-relaxed mb-1">
            {formattedContent}
          </div>
        );
      })}
    </div>
  );
};

export default function App() {
  const { user, isLoading, logout, token } = useAuth();
  const { isAdmin, canManageUsers } = usePermissions();
  const { 
    isAiModalOpen, 
    aiContent, 
    closeAiModal, 
    createIncident, 
    aiSettings, 
    updateAiSettings, 
    availableModels, 
    fetchModels, 
    testConnection,
    theme,
    setTheme,
    alertRules,
    updateAlertRules,
    ticketingSettings,
    updateTicketingSettings
  } = useAppContext();
  const [activeDashboard, setActiveDashboard] = useState<DashboardType>('executive');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [onboardingCount, setOnboardingCount] = useState(0);

  useEffect(() => {
    if (isAdmin && token) {
      Promise.all([
        fetch('/api/auth/admin/pending-count', {
          headers: { 'Authorization': 'Bearer ' + token }
        }),
        fetch('/api/onboarding/pending-count', {
          headers: { 'Authorization': 'Bearer ' + token }
        })
      ])
        .then(([usersRes, onboardingRes]) => {
          return Promise.all([usersRes.json(), onboardingRes.json()]);
        })
        .then(([usersData, onboardingData]) => {
          setPendingCount(usersData.count || 0);
          setOnboardingCount(onboardingData.count || 0);
        })
        .catch(() => {});
    }
  }, [isAdmin, token]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { id: 'executive', label: 'Executive', icon: LayoutDashboard },
    { id: 'application', label: 'Applications', icon: Activity },
    { id: 'infrastructure', label: 'Infrastructure', icon: Server },
    { id: 'noc', label: 'NOC / Operations', icon: Bell },
    { id: 'onboarding', label: 'Onboarding', icon: Rocket },
    { id: 'chatbot', label: 'AI Assistant', icon: MessageCircle },
  ];

  const renderDashboard = () => {
    switch (activeDashboard) {
      case 'executive': return <ExecutiveDashboard />;
      case 'application': return <ApplicationDashboard />;
      case 'infrastructure': return <InfrastructureDashboard />;
      case 'noc': return <NOCDashboard />;
      case 'onboarding': return <OnboardingTracker />;
      case 'chatbot': return null; // Rendered via PlatformChatbot fullscreen
      default: return <ExecutiveDashboard />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-bg-main text-text-main font-sans selection:bg-inverse-bg selection:text-inverse-text">
      <Toaster theme="dark" position="bottom-right" richColors />
      
      {/* AI Insight Modal */}
      <AnimatePresence>
        {isAiModalOpen && aiContent && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAiModal}
              className="absolute inset-0 bg-bg-main/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-bg-surface border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden"
            >
              <div className="p-6 border-b border-border-main flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-transparent flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">AI Mission Analysis</h2>
                    <p className="text-[10px] font-mono text-blue-500 uppercase tracking-widest">{aiContent.title}</p>
                  </div>
                </div>
                <button onClick={closeAiModal} className="p-2 hover:bg-border-main rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-8 space-y-8 overflow-y-auto">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-mono text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <Info size={12} /> Analysis Report
                  </h3>
                  <div className="bg-bg-main/50 p-4 rounded-xl border border-border-main/50">
                    <FormattedAnalysis text={aiContent.analysis} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-mono text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle size={12} /> Strategic Recommendations
                  </h3>
                  <div className="grid gap-3">
                    {aiContent.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-bg-main border border-border-main rounded-xl group hover:border-blue-500/30 transition-colors">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-xs text-text-main">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-border-main">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-text-muted">Severity Index:</span>
                    <span className={cn(
                      "text-[10px] font-mono px-2 py-0.5 rounded",
                      aiContent.severity === 'Critical' ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                    )}>
                      {aiContent.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={async () => {
                        toast.promise(
                          createIncident(aiContent.title, aiContent.analysis, aiContent.severity),
                          {
                            loading: 'Creating ServiceNow Incident...',
                            success: (data) => `Incident ${data.number} created successfully!`,
                            error: 'Failed to create incident. Check connection.'
                          }
                        );
                      }}
                      className="px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-white transition-all flex items-center gap-2"
                    >
                      <ExternalLink size={14} /> Create {PLATFORM_INFO[ticketingSettings.platform]?.name || 'Incident'}
                    </button>
                    <button 
                      onClick={closeAiModal}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                    >
                      Acknowledge Insights
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal onClose={() => setIsSettingsOpen(false)} />
        )}
      </AnimatePresence>

      {/* User Management Modal */}
      <AnimatePresence>
        {isUserManagementOpen && (
          <UserManagementPanel onClose={() => setIsUserManagementOpen(false)} />
        )}
      </AnimatePresence>


      {/* Header */}
      <header className="h-14 border-b border-border-main flex items-center justify-between px-4 sticky top-0 z-50 bg-bg-main/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-border-main rounded-md transition-colors"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-inverse-bg rounded-sm flex items-center justify-center">
              <div className="w-3 h-3 bg-bg-main rounded-full animate-pulse" />
            </div>
            <span className="font-mono text-sm font-bold tracking-tighter uppercase">Observability.OS</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center gap-2 bg-border-main px-3 py-1.5 rounded-md border border-border-hover cursor-pointer hover:bg-border-hover transition-colors"
          >
            <Search size={14} className="text-text-secondary" />
            <span className="text-xs w-48 text-text-muted">Search telemetry...</span>
            <span className="text-[10px] text-text-muted font-mono border border-border-hover px-1 rounded">⌘K</span>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Sparkles size={14} className={(ticketingSettings?.servicenow?.autoIncidentEnabled ?? false) ? "text-blue-400" : "text-text-muted"} />
                <button
                  type="button"
                  onClick={() => {
                    const servicenow = ticketingSettings?.servicenow;
                    const currentValue = servicenow?.autoIncidentEnabled ?? false;
                    const newEnabled = !currentValue;
                    updateTicketingSettings({
                      servicenow: { 
                        instanceUrl: servicenow?.instanceUrl ?? '', 
                        user: servicenow?.user ?? '', 
                        password: servicenow?.password ?? '', 
                        autoIncidentEnabled: newEnabled 
                      }
                    });
                    toast.success(`Autonomous Engine ${newEnabled ? 'enabled' : 'disabled'}`);
                  }}
                  className={cn(
                    "w-10 h-5 rounded-full p-0.5 transition-all duration-300 relative cursor-pointer",
                    (ticketingSettings?.servicenow?.autoIncidentEnabled ?? false) ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700"
                  )}
                  title={`${ticketingSettings?.servicenow?.autoIncidentEnabled ? 'Disable' : 'Enable'} Autonomous Engine`}
                >
                  <div className={cn(
                    "w-3 h-3 bg-white rounded-full transition-transform duration-300 shadow-sm",
                    (ticketingSettings?.servicenow?.autoIncidentEnabled ?? false) ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>
            )}
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-text-secondary uppercase">{user.name || user.email}</span>
              <span className="text-[10px] font-mono text-green-500 flex items-center gap-1">
                <span className="w-1 h-1 bg-green-500 rounded-full" />
                {user.role === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>
            <button 
              onClick={() => {
                toast.success('Logged out successfully');
                logout();
              }}
              title="Sign Out"
              className="w-8 h-8 rounded-full bg-border-main border border-border-hover flex items-center justify-center overflow-hidden hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors"
            >
              <User size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside 
          className={cn(
            "fixed md:sticky top-14 h-[calc(100vh-3.5rem)] border-r border-border-main bg-bg-main transition-all duration-300 z-40 overflow-hidden",
            isSidebarOpen ? "w-64" : "w-16"
          )}
        >
          <nav className="p-3 flex flex-col gap-1 h-full">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveDashboard(item.id as DashboardType)}
                className={cn(
                  "flex items-center p-2 rounded-lg transition-all duration-200 group relative",
                  isSidebarOpen ? "px-3 py-2.5 gap-3" : "justify-center aspect-square mx-auto w-10 h-10",
                  activeDashboard === item.id 
                    ? "bg-inverse-bg text-inverse-text shadow-lg shadow-inverse-bg/10" 
                    : "text-text-secondary hover:bg-border-main/50 hover:text-text-main"
                )}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <div className="flex items-center justify-center flex-shrink-0">
                  {isSidebarOpen ? (
                    <item.icon size={18} className={cn(
                      "transition-transform duration-200 group-hover:scale-110",
                      activeDashboard === item.id ? "text-inverse-text" : "text-text-muted"
                    )} />
                  ) : (
                    <span className={cn(
                      "text-sm font-bold tracking-tighter transition-all duration-200",
                      activeDashboard === item.id ? "text-inverse-text" : "text-blue-500"
                    )}>
                      {item.label[0]}
                    </span>
                  )}
                </div>
                
                <span className={cn(
                  "text-xs font-medium whitespace-nowrap transition-all duration-300",
                  isSidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none absolute"
                )}>
                  {item.label}
                </span>

                {activeDashboard === item.id && isSidebarOpen && (
                  <motion.div 
                    layoutId="active-nav"
                    className="absolute right-2 w-1 h-4 bg-bg-main rounded-full"
                  />
                )}
              </button>
            ))}
            
            <div className="mt-auto pt-4 border-t border-border-main space-y-1">
              {isAdmin && (
                <button 
                  onClick={() => setIsUserManagementOpen(true)}
                  className={cn(
                    "flex items-center rounded-lg transition-all duration-200 text-text-secondary hover:bg-border-main hover:text-text-main group relative",
                    isSidebarOpen ? "px-3 py-2.5 gap-3" : "justify-center aspect-square mx-auto w-10 h-10"
                  )}
                >
                  <Users size={18} className={cn("flex-shrink-0 transition-transform duration-200 group-hover:scale-110 text-text-muted")} />
                  <span className={cn(
                    "text-xs font-medium whitespace-nowrap transition-all duration-300",
                    isSidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none absolute"
                  )}>
                    User Management
                  </span>
                  {pendingCount > 0 && (
                    <span className={cn(
                      "absolute flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full transition-all",
                      isSidebarOpen ? "right-2 w-5 h-5 shadow-sm" : "-top-1 -right-1 w-4 h-4 shadow-md"
                    )}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className={cn(
                  "flex items-center rounded-lg transition-all duration-200 text-text-secondary hover:bg-border-main hover:text-text-main group relative",
                  isSidebarOpen ? "px-3 py-2.5 gap-3" : "justify-center aspect-square mx-auto w-10 h-10"
                )}
              >
                <Settings size={18} className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110 text-text-muted" />
                <span className={cn(
                  "text-xs font-medium whitespace-nowrap transition-all duration-300",
                  isSidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none absolute"
                )}>
                  Settings
                </span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className={cn("flex-1 min-w-0", activeDashboard !== 'chatbot' && "p-6")}>
          {activeDashboard === 'chatbot' ? (
            <PlatformChatbot 
              forceFullscreen={true}
              onNavigateAway={() => setActiveDashboard('executive')}
            />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeDashboard}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderDashboard()}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
      
      <GlobalSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onNavigate={setActiveDashboard}
      />
      
      {/* Floating chatbot — only shown when NOT on the chatbot nav tab */}
      {activeDashboard !== 'chatbot' && (
        <PlatformChatbot onOpenFullscreen={() => setActiveDashboard('chatbot')} />
      )}
    </div>
  );
}
