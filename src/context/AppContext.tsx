import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { createServiceNowIncident, checkActiveIncident } from '../lib/servicenow';
import { getAvailableModels, testAiConnection } from '../lib/ai';
import { createTicket, checkExistingTicket, DEFAULT_TICKETING_SETTINGS, type TicketingSettings, type TicketingPlatform } from '../lib/ticketing';
import { toast } from 'sonner';

interface App {
  id: string;
  name: string;
  tier: string;
  owner: string;
  environment: string;
  date: string;
}

export interface PortfolioApp {
  id: string;
  name: string;
  tier: string;
  health: number;
  errorRate: string;
  latency: string;
  status: 'Healthy' | 'Warning' | 'Critical';
  uptime: string;
  owner: string;
}

export type AiProvider = 'ollama' | 'openai' | 'anthropic' | 'azure' | 'openrouter' | 'groq' | 'gemini' | 'bedrock' | 'vertexai';

// Pricing per 1K tokens (can be customized by admin)
export interface LlmPricing {
  inputCost: number;   // per 1K input tokens
  outputCost: number; // per 1K output tokens
}

export interface LlmProviderUsage {
  provider: AiProvider;
  model: string;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  tokenLimit: number;      // monthly limit
  rateLimit: number;       // requests per minute
  lastUsed: Date;
}

export interface LlmUserUsage {
  userId: string;
  userName: string;
  email: string;
  provider: AiProvider;
  model: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  lastUsed: Date;
}

export interface ServiceNowSettings {
  instanceUrl: string;
  user: string;
  password: string;
  autoIncidentEnabled: boolean;
}

export interface TicketingSettings {
  platform: TicketingPlatform;
  servicenow: { instanceUrl: string; user: string; password: string; autoIncidentEnabled: boolean };
  jira: { domain: string; email: string; apiToken: string; projectKey: string; issueType?: string };
  zendesk: { subdomain: string; email: string; apiToken: string };
}

export interface AiSettings {
  provider: AiProvider;
  apiKey: string;
  model: string;
  endpoint: string;
  displayName?: string;
  apiVersion?: string;
  organizationId?: string;
  siteUrl?: string;
  siteName?: string;
}

export interface AlertRules {
  cpuThreshold: number;
  memoryThreshold: number;
  latencyThreshold: number;
  errorRateThreshold: number;
}

export interface TicketingIncident {
  id: string;
  number: string;
  sys_id?: string;
  title: string;
  priority: string;
  status: string;
  owner: string;
  age: string;
  serviceName: string;
  platform: 'servicenow' | 'jira' | 'zendesk';
}

export interface TicketingStats {
  totalIncidents: number;
  openIncidents: number;
  criticalIncidents: number;
  myAssigned: number;
}

export interface ApiEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  service: string;
  rateLimit: number;
  currentUsage: number;
  latency: string;
  status: 'active' | 'deprecated' | 'disabled';
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  service: string;
  created: string;
  expires: string;
  permissions: string[];
  rateLimit: number;
}

export interface ApiSettings {
  endpoints: ApiEndpoint[];
  apiKeys: ApiKey[];
}

export type Environment = 'development' | 'staging' | 'production';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const DEFAULT_PORTFOLIO_APPS: PortfolioApp[] = [
  { id: 'APP-001', name: 'Customer Portal', tier: 'T1', health: 98, errorRate: '0.02%', latency: '124ms', status: 'Healthy', uptime: '99.99%', owner: 'Frontend Team' },
  { id: 'APP-002', name: 'Inventory API', tier: 'T1', health: 45, errorRate: '4.5%', latency: '850ms', status: 'Critical', uptime: '98.45%', owner: 'Backend Team' },
  { id: 'APP-003', name: 'Auth Service', tier: 'T1', health: 99, errorRate: '0.01%', latency: '45ms', status: 'Healthy', uptime: '99.99%', owner: 'Security Team' },
  { id: 'APP-004', name: 'Payment Gateway', tier: 'T1', health: 82, errorRate: '1.2%', latency: '340ms', status: 'Warning', uptime: '99.95%', owner: 'Billing Team' },
  { id: 'APP-005', name: 'Reporting Engine', tier: 'T2', health: 95, errorRate: '0.15%', latency: '1.2s', status: 'Healthy', uptime: '99.90%', owner: 'Data Team' },
  { id: 'APP-006', name: 'Legacy CRM', tier: 'T3', health: 70, errorRate: '2.4%', latency: '2.5s', status: 'Warning', uptime: '99.10%', owner: 'Legacy Team' },
  { id: 'APP-007', name: 'Mobile Backend', tier: 'T1', health: 97, errorRate: '0.05%', latency: '88ms', status: 'Healthy', uptime: '99.98%', owner: 'Mobile Team' },
  { id: 'APP-008', name: 'Email Dispatcher', tier: 'T2', health: 100, errorRate: '0.00%', latency: '15ms', status: 'Healthy', uptime: '100%', owner: 'Comms Team' },
  { id: 'APP-009', name: 'Order Processing', tier: 'T1', health: 38, errorRate: '6.8%', latency: '1.4s', status: 'Critical', uptime: '97.20%', owner: 'Commerce Team' },
  { id: 'APP-010', name: 'Warehouse Service', tier: 'T2', health: 52, errorRate: '3.9%', latency: '980ms', status: 'Critical', uptime: '98.10%', owner: 'Logistics Team' },
  { id: 'APP-011', name: 'Notification Hub', tier: 'T2', health: 88, errorRate: '0.8%', latency: '220ms', status: 'Warning', uptime: '99.80%', owner: 'Platform Team' },
  { id: 'APP-012', name: 'Analytics Pipeline', tier: 'T2', health: 91, errorRate: '0.3%', latency: '310ms', status: 'Healthy', uptime: '99.85%', owner: 'Data Team' },
];

interface AppContextType {
  onboardedApps: App[];
  addOnboardedApp: (app: Omit<App, 'id' | 'date'>) => void;
  portfolioApps: PortfolioApp[];
  setPortfolioApps: React.Dispatch<React.SetStateAction<PortfolioApp[]>>;
  isAiModalOpen: boolean;
  aiContent: { title: string; analysis: string; recommendations: string[]; severity: string } | null;
  openAiModal: (title: string, analysis: string, recommendations: string[], severity: string) => void;
  closeAiModal: () => void;
  createIncident: (title: string, details: string, severity: string) => Promise<any>;
  checkIncident: (serviceName: string) => Promise<any>;
  aiSettings: AiSettings;
  updateAiSettings: (settings: Partial<AiSettings>) => void;
  ticketingSettings: TicketingSettings;
  updateTicketingSettings: (settings: Partial<TicketingSettings>) => void;
  testTicketingConnection: (platform?: TicketingPlatform) => Promise<{ success: boolean; message: string }>;
  availableModels: string[];
  fetchModels: () => Promise<void>;
  testConnection: () => Promise<{ success: boolean; message: string }>;
  testServiceNowConnection: () => Promise<{ success: boolean; message: string }>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  alertRules: AlertRules;
  updateAlertRules: (rules: Partial<AlertRules>) => void;
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  apiSettings: ApiSettings;
  updateApiSettings: (settings: Partial<ApiSettings>) => void;
  ticketingIncidents: TicketingIncident[];
  ticketingStats: TicketingStats;
  fetchTicketingIncidents: () => Promise<void>;
  llmProviderUsage: LlmProviderUsage[];
  llmUserUsage: LlmUserUsage[];
  fetchLlmUsage: () => Promise<void>;
  trackLlmUsage: (usage: { provider: string; model: string; inputTokens: number; outputTokens: number }) => Promise<void>;
  llmConfigs: ILlmConfig[];
  updateLlmConfig: (config: Partial<ILlmConfig> & { provider: string; model: string }) => Promise<void>;
}

export interface ILlmConfig {
  _id?: string;
  provider: string;
  model: string;
  inputCost: number;
  outputCost: number;
  tokenLimit: number;
  rateLimit: number;
}

const DEFAULT_AI_SETTINGS: AiSettings = { provider: 'ollama', apiKey: '', model: 'llama3', endpoint: 'http://localhost:11434' };
const DEFAULT_ALERT_RULES: AlertRules = { cpuThreshold: 85, memoryThreshold: 85, latencyThreshold: 200, errorRateThreshold: 5 };
const DEFAULT_API_SETTINGS: ApiSettings = {
  endpoints: [
    { id: 'ep1', path: '/api/v1/users', method: 'GET', service: 'User Service', rateLimit: 1000, currentUsage: 456, latency: '45ms', status: 'active' },
    { id: 'ep2', path: '/api/v1/orders', method: 'POST', service: 'Order Service', rateLimit: 500, currentUsage: 234, latency: '120ms', status: 'active' },
    { id: 'ep3', path: '/api/v1/inventory', method: 'GET', service: 'Inventory Service', rateLimit: 800, currentUsage: 789, latency: '85ms', status: 'active' },
    { id: 'ep4', path: '/api/v1/auth', method: 'POST', service: 'Auth Service', rateLimit: 2000, currentUsage: 1234, latency: '25ms', status: 'active' },
    { id: 'ep5', path: '/api/v1/payments', method: 'POST', service: 'Payment Gateway', rateLimit: 300, currentUsage: 145, latency: '250ms', status: 'active' },
    { id: 'ep6', path: '/api/v2/reports', method: 'GET', service: 'Reporting Engine', rateLimit: 100, currentUsage: 23, latency: '1.2s', status: 'deprecated' },
    { id: 'ep7', path: '/api/v1/webhooks', method: 'POST', service: 'Notification Hub', rateLimit: 5000, currentUsage: 3456, latency: '15ms', status: 'active' },
  ],
  apiKeys: [
    { id: 'key1', name: 'Production App', key: 'sk-prod-xxxx...', service: 'Customer Portal', created: '2024-01-15', expires: '2025-12-31', permissions: ['read', 'write'], rateLimit: 1000 },
    { id: 'key2', name: 'Mobile Service', key: 'sk-mobile-xxx...', service: 'Mobile Backend', created: '2024-03-20', expires: '2025-06-30', permissions: ['read'], rateLimit: 500 },
    { id: 'key3', name: 'Analytics Worker', key: 'sk-analytics...', service: 'Analytics Pipeline', created: '2024-02-10', expires: '2025-09-15', permissions: ['read'], rateLimit: 2000 },
    { id: 'key4', name: 'Internal Dashboard', key: 'sk-internal...', service: 'Executive Dashboard', created: '2024-04-01', expires: '2025-04-01', permissions: ['read', 'write', 'admin'], rateLimit: 5000 },
  ],
};

export const DEFAULT_LLM_PRICING: Record<string, Record<string, LlmPricing>> = {
  openai: {
    'gpt-4o': { inputCost: 0.005, outputCost: 0.015 },
    'gpt-4o-mini': { inputCost: 0.00015, outputCost: 0.0006 },
    'gpt-4-turbo': { inputCost: 0.01, outputCost: 0.03 },
  },
  anthropic: {
    'claude-3-opus': { inputCost: 0.015, outputCost: 0.075 },
    'claude-3-sonnet': { inputCost: 0.003, outputCost: 0.015 },
    'claude-3-haiku': { inputCost: 0.00025, outputCost: 0.00125 },
  },
  azure: {
    'gpt-4': { inputCost: 0.004, outputCost: 0.012 },
  },
  gemini: {
    'gemini-1.5-pro': { inputCost: 0.00125, outputCost: 0.005 },
    'gemini-1.5-flash': { inputCost: 0.000075, outputCost: 0.0003 },
  },
  groq: {
    'llama-3.1-70b-versatile': { inputCost: 0.00059, outputCost: 0.00079 },
  },
  ollama: {
    // Local - no API cost
    'default': { inputCost: 0, outputCost: 0 },
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [onboardedApps, setOnboardedApps] = useState<App[]>([
    { id: 'APP-042', name: 'Logistics Tracking', tier: 'T1', owner: 'admin@ent.com', environment: 'Production', date: '2h ago' },
    { id: 'APP-088', name: 'Vendor Portal', tier: 'T2', owner: 'dev@ent.com', environment: 'Production', date: '5h ago' },
  ]);

  const [portfolioApps, setPortfolioApps] = useState<PortfolioApp[]>(DEFAULT_PORTFOLIO_APPS);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      try {
        // Use wss:// in production (HTTPS), ws:// in development
        const isProd = import.meta.env.PROD;
        const protocol = isProd ? 'wss' : 'ws';
        const wsUrl = isProd 
          ? `${protocol}://${window.location.host}/api/portfolio`
          : `${protocol}://${window.location.hostname}:5000/api/portfolio`;
        ws = new WebSocket(wsUrl);
        ws.onerror = (e) => {
          console.warn('[Portfolio WS] Connection error - data may appear static:', e);
        };
        ws.onopen = () => {
          console.log('[Portfolio WS] Connected to real-time data feed');
        };
        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'portfolio') {
              setPortfolioApps(payload.data);
            }
          } catch (err) {
            console.error('Failed to parse portfolio data:', err);
          }
        };
        ws.onclose = () => {
          ws = null;
          if (!destroyed) {
            reconnectTimeout = setTimeout(connect, 2000);
          }
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
      }
    }

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null; // prevent reconnect loop on intentional close
        ws.close();
      }
    };
  }, []);

  const [aiModal, setAiModal] = useState<{ isOpen: boolean; content: AppContextType['aiContent'] }>({ isOpen: false, content: null });
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => { const saved = localStorage.getItem('observability_theme'); return saved === 'light' || saved === 'dark' ? saved : 'light'; });

  useEffect(() => { if (theme === 'dark') document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); localStorage.setItem('observability_theme', theme); }, [theme]);
  const setTheme = useCallback((newTheme: 'light' | 'dark') => setThemeState(newTheme), []);

  const [aiSettings, setAiSettings] = useState<AiSettings>(() => { try { const saved = localStorage.getItem('observability_ai_settings'); if (saved) { const parsed = JSON.parse(saved); if (!['ollama','openai','anthropic','azure','openrouter','groq'].includes(parsed.provider)) { parsed.provider = 'ollama'; parsed.model = 'llama3'; } return parsed; } } catch { return DEFAULT_AI_SETTINGS; } return DEFAULT_AI_SETTINGS; });
  const [alertRules, setAlertRules] = useState<AlertRules>(() => { try { const saved = localStorage.getItem('observability_alert_rules'); if (saved) return JSON.parse(saved); } catch { return DEFAULT_ALERT_RULES; } return DEFAULT_ALERT_RULES; });
  const [environment, setEnvironmentState] = useState<Environment>(() => { const saved = localStorage.getItem('observability_environment'); if (saved === 'development' || saved === 'staging' || saved === 'production') return saved; return 'development'; });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [apiSettings, setApiSettings] = useState<ApiSettings>(() => { try { const saved = localStorage.getItem('observability_api_settings'); if (saved) return JSON.parse(saved); } catch { return DEFAULT_API_SETTINGS; } return DEFAULT_API_SETTINGS; });
  const [ticketingSettings, setTicketingSettings] = useState<TicketingSettings>(() => {
    try {
      const saved = localStorage.getItem('observability_ticketing_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Deep merge to ensure new fields like issueType are present
        return {
          ...DEFAULT_TICKETING_SETTINGS,
          ...parsed,
          servicenow: { ...DEFAULT_TICKETING_SETTINGS.servicenow, ...(parsed.servicenow || {}) },
          jira: { ...DEFAULT_TICKETING_SETTINGS.jira, ...(parsed.jira || {}) },
          zendesk: { ...DEFAULT_TICKETING_SETTINGS.zendesk, ...(parsed.zendesk || {}) },
        };
      }
    } catch (e) {
      console.error('Failed to parse ticketing settings:', e);
    }
    return DEFAULT_TICKETING_SETTINGS;
  });

  const [ticketingIncidents, setTicketingIncidents] = useState<TicketingIncident[]>([]);
  const [ticketingStats, setTicketingStats] = useState<TicketingStats>({ totalIncidents: 0, openIncidents: 0, criticalIncidents: 0, myAssigned: 0 });
  
  const [llmProviderUsage, setLlmProviderUsage] = useState<LlmProviderUsage[]>([]);
  const [llmUserUsage, setLlmUserUsage] = useState<LlmUserUsage[]>([]);
  const [llmConfigs, setLlmConfigs] = useState<ILlmConfig[]>([]);

  const fetchTicketingIncidents = useCallback(async () => {
    try {
      const res = await fetch(`/api/incidents?platform=${ticketingSettings.platform}`);
      if (!res.ok) return;
      const data = await res.json();
      setTicketingIncidents(data);
      
      const platform = ticketingSettings.platform;
      const isOpen = (s: string) => platform === 'servicenow' ? ['1','2','3','New','In Progress'].includes(s) : platform === 'jira' ? ['Open','In Progress','To Do'].includes(s) : ['open','new','pending'].includes(s?.toLowerCase());
      const isCritical = (p: string) => ['1','P1','Highest','Critical','urgent'].includes(p?.toString());
      
      setTicketingStats({
        totalIncidents: data.length,
        openIncidents: data.filter((i: TicketingIncident) => isOpen(i.status)).length,
        criticalIncidents: data.filter((i: TicketingIncident) => isCritical(i.priority)).length,
        myAssigned: data.filter((i: TicketingIncident) => i.owner && i.owner !== 'Unassigned').length,
      });
    } catch (e) {
      console.error('Failed to fetch ticketing incidents:', e);
    }
  }, [ticketingSettings.platform]);

  useEffect(() => {
    fetchTicketingIncidents();
  }, [fetchTicketingIncidents]);

  useEffect(() => {
    // Fetch ticketing config from server on mount if not already set or to ensure sync
    const fetchTicketingConfig = async () => {
      try {
        const response = await fetch('/api/ticketing/config');
        if (response.ok) {
          const serverConfig = await response.json();
          // Merge with current state (giving precedence to state if it's already customized, 
          // but here we might want to prioritize server config if it's "the API")
          setTicketingSettings(prev => ({
            ...prev,
            ...serverConfig,
            // Deep merge jira settings specifically
            jira: { ...prev.jira, ...serverConfig.jira }
          }));
        }
      } catch (error) {
        console.error('Failed to fetch ticketing configuration from server:', error);
      }
    };
    
    // Only fetch if domain is empty (indicates first time setup) 
    if (!ticketingSettings.jira.domain) {
      fetchTicketingConfig();
    }
  }, []);

  useEffect(() => { localStorage.setItem('observability_ai_settings', JSON.stringify(aiSettings)); }, [aiSettings]);
  useEffect(() => { localStorage.setItem('observability_alert_rules', JSON.stringify(alertRules)); }, [alertRules]);
  useEffect(() => { localStorage.setItem('observability_ticketing_settings', JSON.stringify(ticketingSettings)); }, [ticketingSettings]);
  useEffect(() => { localStorage.setItem('observability_api_settings', JSON.stringify(apiSettings)); }, [apiSettings]);

  const updateAiSettings = useCallback((newSettings: Partial<AiSettings>) => setAiSettings(prev => { if (newSettings.provider && newSettings.provider !== prev.provider) setAvailableModels([]); return { ...prev, ...newSettings }; }), []);
  const updateAlertRules = useCallback((newRules: Partial<AlertRules>) => setAlertRules(prev => ({ ...prev, ...newRules })), []);
  const updateTicketingSettings = useCallback((newSettings: Partial<TicketingSettings>) => setTicketingSettings(prev => ({ ...prev, ...newSettings })), []);
  const updateApiSettings = useCallback((newSettings: Partial<ApiSettings>) => setApiSettings(prev => ({ ...prev, ...newSettings })), []);
  const setEnvironment = useCallback((env: Environment) => { setEnvironmentState(env); localStorage.setItem('observability_environment', env); }, []);
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => { setNotifications(prev => [{ ...notification, id: Math.random().toString(36).substring(7), timestamp: new Date(), read: false }, ...prev].slice(0, 50)); }, []);
  const markNotificationRead = useCallback((id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)), []);
  const clearNotifications = useCallback(() => setNotifications([]), []);

  const fetchModels = useCallback(async () => { try { const models = await getAvailableModels(aiSettings); setAvailableModels(models); toast.success('AI models updated'); } catch (error: any) { console.error('Fetch models failed:', error); setAvailableModels([]); toast.error(error.message || 'Failed to fetch models'); } }, [aiSettings]);
  const testConnection = useCallback(async () => await testAiConnection(aiSettings), [aiSettings]);
  const testServiceNowConnection = useCallback(async () => { try { const result = await createServiceNowIncident('Connection Test', 'Testing connection', '3', '3', ticketingSettings.servicenow); return { success: true, message: 'Connected! Incident ' + result.number + ' created' }; } catch (error: any) { return { success: false, message: error.message || 'Failed' }; } }, [ticketingSettings.servicenow]);
  
  const testTicketingConnection = useCallback(async (platform?: TicketingPlatform) => {
    const targetPlatform = platform || ticketingSettings.platform;
    try {
      const result = await createTicket(
        { shortDescription: 'Connection Test', description: 'Testing connection', urgency: '3', impact: '3' },
        { ...ticketingSettings, platform: targetPlatform }
      );
      return { success: true, message: `Connected! ${targetPlatform.charAt(0).toUpperCase() + targetPlatform.slice(1)} ticket ${result.number || result.ticketId} created` };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed' };
    }
  }, [ticketingSettings]);

  const addOnboardedApp = useCallback((app: Omit<App, 'id' | 'date'>) => setOnboardedApps(prev => [{ ...app, id: 'APP-' + (Math.floor(Math.random() * 900) + 100), date: 'Just now' }, ...prev]), []);
  const openAiModal = useCallback((title: string, analysis: string, recommendations: string[], severity: string) => setAiModal({ isOpen: true, content: { title, analysis, recommendations, severity } }), []);
  const closeAiModal = useCallback(() => setAiModal(prev => ({ ...prev, isOpen: false })), []);
  const createIncident = useCallback(async (title: string, details: string, severity: string) => { 
    const urgencyMap: Record<string, string> = { 'Critical': '1', 'Warning': '2', 'Info': '3' };
    const urgency = urgencyMap[severity] || '2';
    return await createTicket(
      { shortDescription: title, description: details, urgency, impact: urgency },
      ticketingSettings
    );
  }, [ticketingSettings]);
  const checkIncident = useCallback(async (serviceName: string) => await checkExistingTicket(serviceName, ticketingSettings), [ticketingSettings]);

  const fetchLlmUsage = useCallback(async () => {
    try {
      const providersRes = await fetch('/api/llm/providers', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (providersRes.ok) setLlmProviderUsage(await providersRes.json());
      
      const usersRes = await fetch('/api/llm/users', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (usersRes.ok) setLlmUserUsage(await usersRes.json());

      const configRes = await fetch('/api/llm/pricing', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (configRes.ok) setLlmConfigs(await configRes.json());
    } catch (e) {
      console.error('Failed to fetch LLM usage/configs:', e);
    }
  }, []);

  const updateLlmConfig = useCallback(async (config: Partial<ILlmConfig> & { provider: string; model: string }) => {
    try {
      const res = await fetch('/api/llm/pricing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });
      if (res.ok) fetchLlmUsage();
    } catch (e) {
      console.error('Failed to update LLM config:', e);
    }
  }, [fetchLlmUsage]);

  // Initial load
  useEffect(() => {
    fetchLlmUsage();
  }, [fetchLlmUsage]);

  const trackLlmUsage = useCallback(async (usage: { provider: string; model: string; inputTokens: number; outputTokens: number }) => {
    try {
      // Calculate cost on frontend for immediate feedback/logging
      const providerPricing = DEFAULT_LLM_PRICING[usage.provider] || {};
      const pricing = providerPricing[usage.model] || providerPricing['default'] || { inputCost: 0, outputCost: 0 };
      const cost = (usage.inputTokens / 1000 * pricing.inputCost) + (usage.outputTokens / 1000 * pricing.outputCost);

      const res = await fetch('/api/llm/usage', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...usage, cost })
      });
      
      if (res.ok) {
        fetchLlmUsage(); // Refresh usage data
      }
    } catch (e) {
      console.error('Failed to track LLM usage:', e);
    }
  }, [fetchLlmUsage]);

  return (
    <AppContext.Provider value={{ 
      onboardedApps, addOnboardedApp, portfolioApps, setPortfolioApps, 
      isAiModalOpen: aiModal.isOpen, aiContent: aiModal.content, openAiModal, closeAiModal, 
      createIncident, checkIncident, 
      ticketingSettings, updateTicketingSettings, testTicketingConnection,
      aiSettings, updateAiSettings, 
      availableModels, fetchModels, testConnection, testServiceNowConnection, 
      theme, setTheme, alertRules, updateAlertRules, 
      environment, setEnvironment, notifications, addNotification, markNotificationRead, clearNotifications,
      apiSettings, updateApiSettings,
      ticketingIncidents, ticketingStats, fetchTicketingIncidents,
      llmProviderUsage, llmUserUsage, llmConfigs, fetchLlmUsage, trackLlmUsage, updateLlmConfig
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() { const context = useContext(AppContext); if (context === undefined) throw new Error('useAppContext must be used within an AppProvider'); return context; }