import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Sparkles, Zap, AlertTriangle, Activity, HelpCircle, Maximize2, Minimize2, ArrowLeft, Smartphone, Mail, Server, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { callAI } from '../lib/ai';

/** Generate a smart, data-driven response from platform stats without needing an LLM */
function generateSmartResponse(question: string, stats: any, systemPrompt: string): string {
  const q = question.toLowerCase();
  
  if ((q.includes('app') || q.includes('service')) && (q.includes('list') || q.includes('show') || q.includes('all') || q.includes('connected'))) {
    const apps = stats.connectedApps ?? [];
    if (apps.length > 0) {
      const activeApps = apps.filter((a: any) => a.status === 'active').length;
      const downApps = apps.filter((a: any) => a.status === 'down').length;
      const degradedApps = apps.filter((a: any) => a.status === 'degraded').length;
      
      let response = ` **Connected Apps**\n\n• Total: **${apps.length}** | Active: **${activeApps}** | Degraded: **${degradedApps}** | Down: **${downApps}**\n\n`;
      
      response += `**Apps:**\n${apps.slice(0, 8).map((a: any) => {
        const emoji = a.status === 'active' ? '' : a.status === 'degraded' ? '' : a.status === 'down' ? '' : '';
        return `  ${emoji} ${a.name} (${a.category}) - ${a.status}`;
      }).join('\n')}`;
      
      return response;
    }
    return ' No apps registered yet. Go to Settings to add applications.';
  }

  if ((q.includes('app') || q.includes('service')) && (q.includes('down') || q.includes('fail'))) {
    const apps = stats.connectedApps ?? [];
    const downApps = apps.filter((a: any) => a.status === 'down' || a.status === 'degraded');
    if (downApps.length > 0) {
      return ` **Apps with Issues**\n\n${downApps.map((a: any) => {
        const emoji = a.status === 'down' ? '' : '';
        return `  ${emoji} ${a.name}: ${a.status} (${a.incidentCount ?? 0} incidents)`;
      }).join('\n')}`;
    }
    return ' No apps currently down or degraded.';
  }

  if (q.includes('notification') || q.includes('alert sent') || q.includes('email') || q.includes('slack')) {
    const sent = stats.notificationsSent ?? 0;
    const failed = stats.notificationsFailed ?? 0;
    let response = ` **Notification Status**\n\n• Sent: **${sent}**\n• Failed: **${failed}**\n`;
    
    if (sent > 0) {
      response += '\n Notifications are being sent successfully.';
    } else if (failed > 0) {
      response += `\n ${failed} notification(s) failed to send. Check notification settings.`;
    } else {
      response += '\n No notifications sent yet.';
    }
    return response;
  }

  if (q.includes('incident') && (q.includes('today') || q.includes('how many') || q.includes('count'))) {
    const todayCount = stats.incidentsToday ?? 0;
    const weekCount = stats.incidentsThisWeek ?? 0;
    const totalCount = stats.totalIncidents ?? todayCount;
    let response = ` **Incident Summary**\n\n• Total Incidents: **${totalCount}**\n• Incidents Today: **${todayCount}**\n• Incidents This Week: **${weekCount}**\n• Active Alerts: **${stats.activeAlerts ?? 0}**\n`;
    
    if (todayCount > 0) {
      response += `\n ${todayCount} incident(s) created today requiring attention.`;
      if (stats.recentIncidents?.length > 0) {
        const todayIncidents = stats.recentIncidents.slice(0, 3).map((i: any) => `\n  • [${i.severity}] ${i.number}: ${i.title}`).join('');
        response += `\n Recent incidents:${todayIncidents}`;
      }
    } else {
      response += '\n No new incidents today — platform looks stable.';
    }
    
    if (weekCount > todayCount) {
      response += `\n\nNote: ${weekCount - todayCount} additional incidents from earlier this week.`;
    }
    return response;
  }

  if ((q.includes('total') || q.includes('how many')) && (q.includes('app') || q.includes('service'))) {
    const apps = stats.connectedApps ?? [];
    return ` **Total Connected Apps: ${apps.length}**\n\n${apps.filter((a: any) => a.status === 'active').length} active, ${apps.filter((a: any) => a.status === 'degraded').length} degraded, ${apps.filter((a: any) => a.status === 'down').length} down`;
  }

  if (q.includes('critical') || q.includes('alert')) {
    const critCount = stats.criticalAlerts ?? 0;
    const warnCount = stats.warningAlerts ?? 0;
    const activeCount = stats.activeAlerts ?? 0;
    let response = ` **Alert Status**\n\n• Critical Alerts: **${critCount}**\n• Warning Alerts: **${warnCount}**\n• Total Active Alerts: **${activeCount}**\n`;
    
    if (critCount > 0) {
      response += `\n ${critCount} critical alert(s) need immediate attention!`;
      if (stats.servicesWithIssues?.length > 0) {
        response += `\n\n Affected services:\n${stats.servicesWithIssues.map((s: string) => `  • ${s}`).join('\n')}`;
      }
    } else if (warnCount > 0) {
      response += '\n Some services in warning state - monitor closely.';
    } else {
      response += '\n No critical alerts at this time.';
    }
    
    // If we have recent incidents with high severity, note them
    if (stats.recentIncidents?.length > 0) {
      const highSev = stats.recentIncidents.filter((i: any) => 
        i.severity === 'P1' || i.severity === '1' || i.severity === 'Critical'
      ).slice(0, 3);
      if (highSev.length > 0) {
        response += `\n\n HighPriority Incidents:\n${highSev.map((i: any) => `  • ${i.number}: ${i.title}`).join('\n')}`;
      }
    }
    return response;
  }

  if (q.includes('health') || q.includes('status') || q.includes('platform')) {
    const critCount = stats.criticalAlerts ?? 0;
    const warnCount = stats.warningAlerts ?? 0;
    const health = critCount > 5 || critCount > warnCount ? 'Critical' : warnCount > 0 ? 'Degraded' : 'Healthy';
    const statusText = critCount > 5 || critCount > warnCount ? '' : warnCount > 0 ? '' : '';
    
    let response = ` **Platform Health: ${health}**\n\n`;
    response += `• Incidents Today: ${stats.incidentsToday ?? 0}\n`;
    response += `• Incidents This Week: ${stats.incidentsThisWeek ?? 0}\n`;
    response += `• Active Alerts: ${stats.activeAlerts ?? 0}\n`;
    response += `• Critical Alerts: ${critCount}\n`;
    response += `• Warning Alerts: ${warnCount}\n`;
    
    if (stats.servicesWithIssues?.length > 0) {
      response += `\n Services with CRITICAL issues:\n${stats.servicesWithIssues.map((s: string) => `  • ${s}`).join('\n')}`;
    } else if (warnCount > 0) {
      response += '\n Service degradations detected - monitor closely.';
    } else {
      response += '\n All services appear healthy.';
    }
    
    // Add recent incident summary
    if (stats.recentIncidents?.length > 0) {
      const criticalInc = stats.recentIncidents.filter((i: any) => i.status === 'New' || i.status === 'Open').length;
      if (criticalInc > 0) {
        response += `\n\n ${criticalInc} open incident(s) awaiting action.`;
      }
    }
    
    return response;
  }

  if (q.includes('common') || q.includes('issue') || q.includes('problem')) {
    // First check if we have data from our own platform (recent alerts)
    if (stats.commonIssues?.length > 0) {
      const issueList = stats.commonIssues.slice(0, 5).map((i: any) => `  • ${i.service}: ${i.count} alerts`).join('\n');
      return ` **Most Common Issues**\n\n${issueList}\n\nFocus remediation on the top services listed above.`;
    }
    // If we have recent incidents from ServiceNow, analyze them for patterns
    if (stats.recentIncidents?.length > 0) {
      const serviceCounts: Record<string, number> = {};
      stats.recentIncidents.forEach((i: any) => {
        const service = i.serviceName || 'Unknown';
        serviceCounts[service] = (serviceCounts[service] || 0) + 1;
      });
      const topServices = Object.entries(serviceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([s, c]) => `  • ${s}: ${c} incident(s)`)
        .join('\n');
      return ` **Common Issues from Recent Incidents**\n\n${topServices}\n\nThese services have the highest incident frequency this week.`;
    }
    return ' No recurring issues detected at this time. The platform appears stable.';
  }

  if (q.includes('recent') || q.includes('latest') || q.includes('last')) {
    if (stats.recentIncidents?.length > 0) {
      const list = stats.recentIncidents.slice(0, 5).map((i: any) => `  • [${i.severity}] ${i.number} — ${i.title} (${i.status})`).join('\n');
      return ` **Recent Incidents**\n\n${list}\n\nTotal this week: ${stats.incidentsThisWeek ?? 0}`;
    }
    return ' No recent incidents found.';
  }

  if (q.includes('hello') || q.includes('hi ') || q === 'hi' || q.includes('hey')) {
    return ` **Hello!** I'm your Universal IT Operations Assistant.\n\nI can help you analyze data from **ServiceNow**, **Jira**, **Zendesk**, and **AWS Infrastructure**.\n\nCurrently, I see:\n• **${stats.totalIncidents ?? 0}** total incidents/tickets\n• **${stats.criticalAlerts ?? 0}** critical issues\n• **${stats.activeConnectors?.join(', ') || 'Local DB'}** active connectors\n\nWhat can I help you with today?`;
  }

  if (q.includes('jira')) {
    const jiraTickets = stats.recentIncidents?.filter((i: any) => i.platform?.toLowerCase() === 'jira') || [];
    if (jiraTickets.length > 0) {
      return ` **Jira Status**\n\nI found **${jiraTickets.length}** recent Jira issues.\n\n${jiraTickets.slice(0, 5).map((i: any) => `  • ${i.number}: ${i.title} (${i.status})`).join('\n')}`;
    }
    return ' I couldn\'t find any recent Jira tickets in the current sync data.';
  }

  if (q.includes('zendesk')) {
    const zdTickets = stats.recentIncidents?.filter((i: any) => i.platform?.toLowerCase() === 'zendesk') || [];
    if (zdTickets.length > 0) {
      return ` **Zendesk Status**\n\nI found **${zdTickets.length}** recent Zendesk tickets.\n\n${zdTickets.slice(0, 5).map((i: any) => `  • ${i.number}: ${i.title} (${i.status})`).join('\n')}`;
    }
    return ' No Zendesk tickets found in the latest data sync.';
  }

  if (q.includes('aws') || q.includes('infra') || q.includes('server') || q.includes('host')) {
    if (stats.infraStats) {
      return ` **Infrastructure Health (AWS)**\n\n• Total Hosts: **${stats.infraStats.total}**\n• Healthy: **${stats.infraStats.healthy}**\n• Degraded: **${stats.infraStats.degraded}**\n• Down/Critical: **${stats.infraStats.down}**\n\nAll infrastructure data is being pulled from CloudWatch metrics.`;
    }
    return ' Infrastructure monitoring (AWS CloudWatch) is not currently configured. Please check your .env settings.';
  }

  if (q.includes('help') || q.includes('what can') || q.includes('capability')) {
    return ` **Platform Assistant Capabilities**\n\nI can help you with:\n\n• **Universal Search** — "Show all incidents from all platforms"\n• **Jira Tasks** — "What are my current Jira tickets?"\n• **Zendesk Support** — "Are there any open Zendesk tickets?"\n• **Infra Health** — "What is our AWS infrastructure status?"\n• **ServiceNow** — "List latest ServiceNow incidents"\n\n Tip: Configure an AI provider (Gemini, Ollama) in Settings for deep analysis.`;
  }

  // Fallback: return a summary of the current platform state
  return ` **Universal Platform Overview** (for: "${question}")\n\n• Total Incidents: ${stats.totalIncidents ?? 0}\n• Critical Issues: ${stats.criticalAlerts ?? 0}\n• Active Connectors: ${stats.activeConnectors?.join(', ') || 'Local DB'}\n\n For more detailed AI-powered analysis, ensure your AI Provider is correctly configured in Settings.`;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatStats {
  incidentsToday: number;
  incidentsThisWeek: number;
  incidentsThisMonth: number;
  totalIncidents?: number;
  activeAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  connectedApps?: { name: string; status: string; category: string; incidentCount: number }[];
  notificationsSent?: number;
  notificationsFailed?: number;
  infraStats?: { total: number; healthy: number; degraded: number; down: number };
  activeConnectors: string[];
  dataSource?: string;
}

const quickActions = [
  { label: 'Incidents today', icon: Zap, query: 'How many incidents were created today?' },
  { label: 'Critical alerts', icon: AlertTriangle, query: 'How many critical alerts are active?' },
  { label: 'List all apps', icon: Smartphone, query: 'Show me all connected applications' },
  { label: 'Apps down', icon: Server, query: 'Which apps are currently down or degraded?' },
  { label: 'Notifications', icon: Mail, query: 'How many notifications were sent?' },
  { label: 'Platform health', icon: Sparkles, query: 'What is the current platform health status?' },
  { label: 'Help', icon: HelpCircle, query: 'What can you help me with?' },
];

interface PlatformChatbotProps {
  forceFullscreen?: boolean;
  onNavigateAway?: () => void;
  onOpenFullscreen?: () => void;
}

export default function PlatformChatbot({ forceFullscreen = false, onNavigateAway, onOpenFullscreen }: PlatformChatbotProps) {
  const { token } = useAuth();
  const { aiSettings } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your IT Operations Assistant.\n\nI can help you with:\n•  "How many incidents today?"\n•  "Show critical alerts"\n•  "List all connected applications"\n•  "Which apps are down?"\n•  "How many notifications sent?"\n•  "What is the platform health status?"\n•  "What are the most common issues?"\n\nAsk me anything about your platform!',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [aiSource, setAiSource] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Step 1: Fetch platform context from backend
      const response = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          question: text,
          messages: messages.slice(-6).map(m => ({ role: m.role, content: m.content })) 
        })
      });

      if (!response.ok) {
        let errData: any = {};
        try {
          errData = await response.json();
        } catch {
          errData = { error: `Server error: ${response.status}` };
        }
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        data = { 
          systemPrompt: '', 
          userPrompt: '', 
          stats: {
            incidentsToday: 0,
            incidentsThisWeek: 0,
            incidentsThisMonth: 0,
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
            dataSource: 'local' as const,
            lastSyncAt: new Date()
          }
        };
      }

      if (!data.systemPrompt || !data.userPrompt) {
        throw new Error('Invalid response from server');
      }
      
      if (data.stats) {
        setStats(data.stats);
      }

      // Format conversation history for the AI prompt
      const historyText = messages.slice(-5).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      const combinedPrompt = `${data.systemPrompt}\n\nCONVERSATION HISTORY:\n${historyText}\n\nUSER: ${text}\n\n${data.userPrompt}`;
      
      let aiResponseText: string | null = null;
      let usedFallback = false;

      // Step 2a: Try configured AI provider
      try {
        aiResponseText = await callAI(combinedPrompt, aiSettings);
        setAiSource(aiSettings.provider);
      } catch (aiErr: any) {
        console.warn(`[Chatbot] Configured AI (${aiSettings.provider}) failed:`, aiErr.message);

        // Step 2b: Try Gemini with env API key as fallback
        const envGeminiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (envGeminiKey && envGeminiKey !== 'MY_GEMINI_API_KEY' && envGeminiKey.length > 10) {
          try {
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(envGeminiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent(combinedPrompt);
            aiResponseText = result.response.text();
            setAiSource('gemini');
            usedFallback = true;
          } catch (geminiErr: any) {
            console.warn('[Chatbot] Gemini fallback also failed:', geminiErr.message);
          }
        }
      }

      // Step 2c: Check if AI response is too vague or empty - use smart response instead
      const responseStr = aiResponseText || '';
      if (responseStr.length < 20 || 
          responseStr.includes('based on the data') || 
          responseStr.includes('currently at 0') ||
          responseStr.includes("don't have enough")) {
        console.log('[Chatbot] AI response too vague, using smart response instead');
        aiResponseText = generateSmartResponse(text, data.stats || {}, data.systemPrompt || '');
        setAiSource('data');
        usedFallback = true;
      }

      const responseContent = aiResponseText || generateSmartResponse(text, data.stats || {}, data.systemPrompt || '');

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (usedFallback && aiSettings.provider === 'ollama') {
        toast.info('Using data-driven mode. Configure an AI provider in Settings for richer answers.', { duration: 4000 });
      }
    } catch (error: any) {
      console.error('[Chatbot] Fatal error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Error: ${error.message}\n\nPlease check your connection and try again. If problem persists, verify your AI provider settings.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error(error.message || 'Failed to get response.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Determine if we should show fullscreen layout
  const showFullscreen = forceFullscreen || isFullscreen;

  // Chat panel content (shared between popup and fullscreen)
  const chatPanel = (
    <motion.div 
      initial={showFullscreen ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={cn(
        "flex flex-col overflow-hidden",
        showFullscreen
          ? "w-full h-full bg-bg-main"
          : "w-96 h-[580px] fixed bottom-6 right-6 z-50 rounded-2xl shadow-2xl border border-border-main bg-bg-surface/95 backdrop-blur-xl transition-all duration-300",
        !showFullscreen && !isOpen && "opacity-0 translate-y-4 pointer-events-none scale-95"
      )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between p-4 text-white",
        showFullscreen
          ? "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/5"
          : "bg-gradient-to-r from-slate-800 to-slate-900"
      )}>
        <div className="flex items-center gap-3">
          {forceFullscreen && onNavigateAway && (
            <button
              onClick={onNavigateAway}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors mr-1"
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className={cn(
            "p-2 bg-white/20 rounded-lg",
            showFullscreen && "p-2.5"
          )}>
            <Bot size={showFullscreen ? 24 : 20} />
          </div>
          <div>
            <h3 className={cn("font-bold", showFullscreen ? "text-lg" : "text-sm")}>Platform Assistant</h3>
            <p className={cn("text-white/70", showFullscreen ? "text-sm" : "text-xs")}>
              {aiSource === 'data' ? ' Universal Data Mode'
                : aiSource === 'gemini' ? ' Gemini AI (Multi-Source)'
                : aiSource ? ` ${aiSource.charAt(0).toUpperCase() + aiSource.slice(1)} AI`
                : ` ${aiSettings.provider.charAt(0).toUpperCase() + aiSettings.provider.slice(1)} · Universal`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!forceFullscreen && (
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              title={isFullscreen ? 'Minimize' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
          {!forceFullscreen && (
            <button
              onClick={() => { setIsOpen(false); setIsFullscreen(false); }}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="flex items-center gap-2 px-4 py-2 bg-bg-surface border-b border-border-main overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 whitespace-nowrap">
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", stats.dataSource === 'universal' ? "bg-blue-500" : "bg-green-500")} />
            <span className="text-[9px] font-bold font-mono tracking-tighter text-text-main uppercase">
              {stats.dataSource === 'universal' ? 'UNIVERSAL SYNC' : 'LOCAL CACHE'}
            </span>
          </div>
          
          {stats.activeConnectors?.map(connector => (
             <div key={connector} className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-500/10 border border-slate-500/20 whitespace-nowrap">
                <span className="text-[9px] font-bold font-mono tracking-tighter text-text-muted uppercase">
                  {connector}
                </span>
             </div>
          ))}

          <div className="h-4 w-px bg-border-main mx-1" />

          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <Zap size={10} className="text-amber-500" />
            <span className="text-text-main">{stats.incidentsToday} incidents</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <AlertTriangle size={10} className="text-red-500" />
            <span className="text-text-main">{stats.criticalAlerts} critical</span>
          </div>

          {stats.infraStats && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <Server size={10} className="text-purple-500" />
              <span className="text-text-main">{stats.infraStats.total} hosts</span>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className={cn(
        "flex gap-1.5 p-3 border-b border-border-main overflow-x-auto",
        showFullscreen && "flex-wrap"
      )}>
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => sendMessage(action.query)}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 font-mono bg-bg-surface border border-border-main rounded-lg hover:bg-border-main hover:border-slate-500 transition-all whitespace-nowrap",
              showFullscreen ? "text-xs" : "text-[10px]"
            )}
          >
            <action.icon size={showFullscreen ? 12 : 10} className="text-blue-400" />
            {action.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className={cn(
        "flex-1 overflow-y-auto space-y-4 custom-scrollbar",
        showFullscreen ? "p-8" : "p-4"
      )}>
        {messages.map((message, idx) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === 'user' && "flex-row-reverse"
            )}
          >
            <div className={cn(
              "rounded-xl flex items-center justify-center flex-shrink-0",
              showFullscreen ? "w-10 h-10" : "w-8 h-8",
              message.role === 'assistant'
                ? "bg-gradient-to-br from-slate-700 to-slate-800"
                : "bg-border-main"
            )}>
              {message.role === 'assistant' ? (
                <Bot size={showFullscreen ? 18 : 14} className="text-white" />
              ) : (
                <span className="text-[10px] font-bold text-text-muted">YOU</span>
              )}
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              showFullscreen ? "max-w-[70%] text-sm" : "max-w-[75%] text-sm",
              message.role === 'assistant'
                ? "bg-bg-surface border border-border-main"
                : "bg-slate-700 text-white"
            )}>
              {message.role === 'assistant' ? (
                <div className="whitespace-pre-wrap font-sans leading-relaxed">
                  {message.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={i} className="font-semibold text-text-main">{part.slice(2, -2)}</strong>
                      : <span key={i}>{part}</span>
                  )}
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
              )}
              <span className="text-[10px] opacity-50 mt-1 block">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className={cn(
              "rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center",
              showFullscreen ? "w-10 h-10" : "w-8 h-8"
            )}>
              <Bot size={showFullscreen ? 18 : 14} className="text-white" />
            </div>
            <div className="bg-bg-surface border border-border-main p-3 rounded-xl">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className={cn(
        "border-t border-border-main bg-bg-surface",
        showFullscreen ? "p-4" : "p-3"
      )}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your platform..."
            disabled={isLoading}
            autoFocus={showFullscreen}
            className={cn(
              "flex-1 px-4 bg-bg-main border border-border-main rounded-xl focus:outline-none focus:border-slate-500 transition-colors",
              showFullscreen ? "py-3 text-sm" : "py-2 text-sm"
            )}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={cn(
              "bg-gradient-to-br from-slate-600 to-slate-800 text-white rounded-xl hover:from-slate-500 hover:to-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg",
              showFullscreen ? "px-5 py-3" : "p-2"
            )}
          >
            <Send size={showFullscreen ? 18 : 16} />
          </button>
        </div>
        {showFullscreen && (
          <p className="text-[10px] text-text-muted mt-2 text-center font-mono">
            Powered by {aiSettings.provider} · Press Enter to send
          </p>
        )}
      </form>
    </motion.div>
  );

  // ── Fullscreen overlay (from floating icon) ──────────────────────────────
  if (isFullscreen) {
    return (
      <>
        {/* Floating button hidden while fullscreen */}
        <div className="fixed inset-0 z-[60] bg-bg-main flex flex-col">
          {chatPanel}
        </div>
      </>
    );
  }

  // ── Nav-tab full-page mode ───────────────────────────────────────────────
  if (forceFullscreen) {
    return (
      <div className="w-full h-[calc(100vh-3.5rem)] bg-bg-main flex flex-col">
        {chatPanel}
      </div>
    );
  }

  // ── Default floating popup mode ──────────────────────────────────────────
  return (
    <>
      {/* Floating button — always visible in default floating mode */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.button
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onOpenFullscreen ? onOpenFullscreen() : setIsOpen(true)}
            className={cn(
              "fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-2xl hover:shadow-blue-500/20 transition-all group",
              isOpen && "hidden"
            )}
            title="Open AI Assistant"
          >
            <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl group-hover:bg-blue-500/20 transition-colors" />
            <MessageCircle size={24} className="relative z-10" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-slate-900" />
            <span className="absolute right-14 bottom-1 bg-slate-800/90 backdrop-blur-md text-white text-[10px] font-mono tracking-wider uppercase whitespace-nowrap px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 pointer-events-none shadow-xl border border-white/10">
              AI Assistant
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Small popup (preserved but isOpen never set in default mode now) */}
      <AnimatePresence>
        {isOpen && !showFullscreen && chatPanel}
      </AnimatePresence>
    </>
  );
}
