import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { createServiceNowIncident, checkActiveIncident } from '../lib/servicenow';
import { getAvailableModels, testAiConnection } from '../lib/ai';
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

export interface ServiceNowSettings {
  instanceUrl: string;
  user: string;
  password: string;
  autoIncidentEnabled: boolean;
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
  serviceNowSettings: ServiceNowSettings;
  updateServiceNowSettings: (settings: Partial<ServiceNowSettings>) => void;
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
}

const DEFAULT_AI_SETTINGS: AiSettings = { provider: 'ollama', apiKey: '', model: 'llama3', endpoint: 'http://localhost:11434' };
const DEFAULT_SN_SETTINGS: ServiceNowSettings = { instanceUrl: import.meta.env.VITE_SERVICENOW_INSTANCE_URL || 'https://dev363754.service-now.com', user: import.meta.env.VITE_SERVICENOW_USER || 'admin', password: import.meta.env.VITE_SERVICENOW_PASSWORD || '', autoIncidentEnabled: false };
const DEFAULT_ALERT_RULES: AlertRules = { cpuThreshold: 85, memoryThreshold: 85, latencyThreshold: 200, errorRateThreshold: 5 };

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
  const setTheme = (newTheme: 'light' | 'dark') => setThemeState(newTheme);

  const [aiSettings, setAiSettings] = useState<AiSettings>(() => { try { const saved = localStorage.getItem('observability_ai_settings'); if (saved) { const parsed = JSON.parse(saved); if (!['ollama','openai','anthropic','azure','openrouter','groq'].includes(parsed.provider)) { parsed.provider = 'ollama'; parsed.model = 'llama3'; } return parsed; } } catch { return DEFAULT_AI_SETTINGS; } return DEFAULT_AI_SETTINGS; });
  const [serviceNowSettings, setServiceNowSettings] = useState<ServiceNowSettings>(() => { try { const saved = localStorage.getItem('observability_sn_settings'); if (saved) return JSON.parse(saved); } catch { return DEFAULT_SN_SETTINGS; } return DEFAULT_SN_SETTINGS; });
  const [alertRules, setAlertRules] = useState<AlertRules>(() => { try { const saved = localStorage.getItem('observability_alert_rules'); if (saved) return JSON.parse(saved); } catch { return DEFAULT_ALERT_RULES; } return DEFAULT_ALERT_RULES; });
  const [environment, setEnvironmentState] = useState<Environment>(() => { const saved = localStorage.getItem('observability_environment'); if (saved === 'development' || saved === 'staging' || saved === 'production') return saved; return 'development'; });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => { localStorage.setItem('observability_ai_settings', JSON.stringify(aiSettings)); }, [aiSettings]);
  useEffect(() => { localStorage.setItem('observability_sn_settings', JSON.stringify(serviceNowSettings)); }, [serviceNowSettings]);
  useEffect(() => { localStorage.setItem('observability_alert_rules', JSON.stringify(alertRules)); }, [alertRules]);

  const updateAiSettings = (newSettings: Partial<AiSettings>) => setAiSettings(prev => { if (newSettings.provider && newSettings.provider !== prev.provider) setAvailableModels([]); return { ...prev, ...newSettings }; });
  const updateServiceNowSettings = (newSettings: Partial<ServiceNowSettings>) => setServiceNowSettings(prev => ({ ...prev, ...newSettings }));
  const updateAlertRules = (newRules: Partial<AlertRules>) => setAlertRules(prev => ({ ...prev, ...newRules }));
  const setEnvironment = (env: Environment) => { setEnvironmentState(env); localStorage.setItem('observability_environment', env); };
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => { setNotifications(prev => [{ ...notification, id: Math.random().toString(36).substring(7), timestamp: new Date(), read: false }, ...prev].slice(0, 50)); };
  const markNotificationRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const clearNotifications = () => setNotifications([]);

  const fetchModels = async () => { try { const models = await getAvailableModels(aiSettings); setAvailableModels(models); toast.success('AI models updated'); } catch (error: any) { console.error('Fetch models failed:', error); setAvailableModels([]); toast.error(error.message || 'Failed to fetch models'); } };
  const testConnection = async () => await testAiConnection(aiSettings);
  const testServiceNowConnection = async () => { try { const result = await createServiceNowIncident('Connection Test', 'Testing connection', '3', '3', serviceNowSettings); return { success: true, message: 'Connected! Incident ' + result.number + ' created' }; } catch (error: any) { return { success: false, message: error.message || 'Failed' }; } };

  const addOnboardedApp = (app: Omit<App, 'id' | 'date'>) => setOnboardedApps(prev => [{ ...app, id: 'APP-' + (Math.floor(Math.random() * 900) + 100), date: 'Just now' }, ...prev]);
  const openAiModal = (title: string, analysis: string, recommendations: string[], severity: string) => setAiModal({ isOpen: true, content: { title, analysis, recommendations, severity } });
  const closeAiModal = () => setAiModal(prev => ({ ...prev, isOpen: false }));
  const createIncident = async (title: string, details: string, severity: string) => { const urgencyMap: Record<string, string> = { 'Critical': '1', 'Warning': '2', 'Info': '3' }; return await createServiceNowIncident(title, details, urgencyMap[severity] || '2', urgencyMap[severity] || '2', serviceNowSettings); };
  const checkIncident = async (serviceName: string) => await checkActiveIncident(serviceName, serviceNowSettings);

  return (
    <AppContext.Provider value={{ onboardedApps, addOnboardedApp, portfolioApps, setPortfolioApps, isAiModalOpen: aiModal.isOpen, aiContent: aiModal.content, openAiModal, closeAiModal, createIncident, checkIncident, aiSettings, updateAiSettings, serviceNowSettings, updateServiceNowSettings, availableModels, fetchModels, testConnection, testServiceNowConnection, theme, setTheme, alertRules, updateAlertRules, environment, setEnvironment, notifications, addNotification, markNotificationRead, clearNotifications }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() { const context = useContext(AppContext); if (context === undefined) throw new Error('useAppContext must be used within an AppProvider'); return context; }