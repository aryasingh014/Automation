import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Sparkles, Zap, AlertTriangle, Activity, HelpCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { callAI } from '../lib/ai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatStats {
  incidentsToday: number;
  incidentsThisWeek: number;
  activeAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
}

const quickActions = [
  { label: 'Incidents today', icon: Zap, query: 'How many incidents were created today?' },
  { label: 'Critical alerts', icon: AlertTriangle, query: 'How many critical alerts are active?' },
  { label: 'Common issues', icon: Activity, query: 'What are the most common issues happening in the platform?' },
  { label: 'Platform health', icon: Sparkles, query: 'What is the current platform health status?' },
  { label: 'Help', icon: HelpCircle, query: 'What can you help me with?' },
];

export default function PlatformChatbot() {
  const { token } = useAuth();
  const { aiSettings } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your IT Operations Assistant. I can help you with:\n\n• Incidents: "How many incidents today?"\n• Alerts: "Show critical alerts"\n• Troubleshooting: "How to fix database timeout"\n• Root cause analysis\n\nAsk me anything about your platform!',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<ChatStats | null>(null);
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
      const response = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ question: text })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      
      if (data.stats) {
        setStats(data.stats);
      }

      const combinedPrompt = `${data.systemPrompt}\n\n${data.userPrompt}`;
      const aiResponseText = await callAI(combinedPrompt, aiSettings);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponseText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error('Failed to get response. Please try again.');
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110",
          isOpen && "hidden"
        )}
      >
        <MessageCircle size={24} />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
      </button>

      {/* Chat Window */}
      <div className={cn(
        "fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-bg-main border border-border-main rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300",
        !isOpen && "opacity-0 translate-y-4 pointer-events-none scale-95"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Platform Assistant</h3>
              <p className="text-xs text-white/70">IT Operations Helper</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="flex items-center gap-2 px-4 py-2 bg-bg-surface border-b border-border-main overflow-x-auto">
            <span className="text-[10px] font-mono text-text-muted whitespace-nowrap">LIVE:</span>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <Zap size={10} className="text-amber-500" />
              <span className="text-text-main">{stats.incidentsToday} incidents</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <AlertTriangle size={10} className="text-red-500" />
              <span className="text-text-main">{stats.criticalAlerts} critical</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <Activity size={10} className="text-amber-500" />
              <span className="text-text-main">{stats.activeAlerts} alerts</span>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-1 p-2 border-b border-border-main overflow-x-auto">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => sendMessage(action.query)}
              disabled={isLoading}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono bg-bg-surface border border-border-main rounded-md hover:bg-border-main transition-colors whitespace-nowrap"
            >
              <action.icon size={10} className="text-blue-500" />
              {action.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2",
                message.role === 'user' && "flex-row-reverse"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                message.role === 'assistant' 
                  ? "bg-gradient-to-br from-slate-700 to-slate-800" 
                  : "bg-border-main"
              )}>
                {message.role === 'assistant' ? (
                  <Bot size={14} className="text-white" />
                ) : (
                  <span className="text-[10px] font-bold text-text-muted">YOU</span>
                )}
              </div>
              <div className={cn(
                "max-w-[75%] p-3 rounded-xl text-sm",
                message.role === 'assistant' 
                  ? "bg-bg-surface border border-border-main" 
                  : "bg-slate-700 text-white"
              )}>
                <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                <span className="text-[10px] opacity-50 mt-1 block">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                <Bot size={14} className="text-white" />
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
        <form onSubmit={handleSubmit} className="p-3 border-t border-border-main bg-bg-surface">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your platform..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-sm bg-bg-main border border-border-main rounded-lg focus:outline-none focus:border-slate-500"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
