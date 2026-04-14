import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Settings as SettingsIcon, 
  Activity, 
  Sparkles, 
  Cloud, 
  ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useAppContext, AiProvider } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';

interface SettingsModalProps {
  onClose: () => void;
}

type TabId = 'general' | 'ai' | 'servicenow';

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { 
    theme, 
    setTheme, 
    alertRules, 
    updateAlertRules,
    aiSettings,
    updateAiSettings,
    availableModels,
    fetchModels,
    testConnection,
    serviceNowSettings,
    updateServiceNowSettings,
    testServiceNowConnection
  } = useAppContext();
  const { isAdmin, canConfigureAlerts } = usePermissions();

  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [selectedProviderSetup, setSelectedProviderSetup] = useState<AiProvider | null>(null);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [isTestingSN, setIsTestingSN] = useState(false);

  const aiProviders: { id: AiProvider; label: string }[] = [
    { id: 'openai', label: 'OpenAI' },
    { id: 'ollama', label: 'Ollama' },
    { id: 'anthropic', label: 'Anthropic' },
    { id: 'azure', label: 'Microsoft Azure Cloud' },
    { id: 'openrouter', label: 'OpenRouter' },
    { id: 'groq', label: 'Groq' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-bg-main/80 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl h-[85vh] bg-bg-surface border border-border-main rounded-2xl shadow-2xl flex overflow-hidden"
      >
        {/* Sidebar Tabs */}
        <div className="w-64 bg-bg-main border-r border-border-main flex flex-col">
          <div className="p-6">
            <h2 className="text-xl font-bold">Settings</h2>
          </div>
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            <button
              onClick={() => { setActiveTab('general'); setSelectedProviderSetup(null); }}
              className={cn(
                "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                activeTab === 'general' ? "bg-inverse-bg text-inverse-text font-medium" : "text-text-secondary hover:bg-border-main hover:text-text-main"
              )}
            >
              <SettingsIcon size={16} className={activeTab === 'general' ? "text-inverse-text" : "text-text-muted"} />
              General
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => { setActiveTab('ai'); setSelectedProviderSetup(null); }}
                  className={cn(
                    "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    activeTab === 'ai' ? "bg-inverse-bg text-inverse-text font-medium" : "text-text-secondary hover:bg-border-main hover:text-text-main"
                  )}
                >
                  <Sparkles size={16} className={activeTab === 'ai' ? "text-inverse-text" : "text-text-muted"} />
                  AI Intelligence
                </button>
                <button
                  onClick={() => { setActiveTab('servicenow'); setSelectedProviderSetup(null); }}
              className={cn(
                "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                activeTab === 'servicenow' ? "bg-inverse-bg text-inverse-text font-medium" : "text-text-secondary hover:bg-border-main hover:text-text-main"
              )}
            >
              <Cloud size={16} className={activeTab === 'servicenow' ? "text-inverse-text" : "text-text-muted"} />
              ServiceNow Integration
            </button>
              </>
            )}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-bg-surface relative">
          <div className="absolute top-4 right-4 z-10">
            <button onClick={onClose} className="p-2 hover:bg-border-main rounded-full transition-colors text-text-muted">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === 'general' && (
              <div className="max-w-2xl space-y-10">
                <div>
                  <h3 className="text-lg font-bold mb-6">Preferences</h3>
                  <div className="space-y-3 p-5 border border-border-main rounded-xl bg-bg-main/50">
                    <label className="text-sm font-medium">Interface Theme</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setTheme('light')}
                        className={cn(
                          "px-4 py-8 rounded-xl border-2 transition-all flex flex-col items-center gap-3",
                          theme === 'light' 
                            ? "bg-blue-500/10 border-blue-500 text-blue-500" 
                            : "bg-bg-main border-border-main text-text-muted hover:border-border-hover"
                        )}
                      >
                        <div className="w-8 h-8 rounded-full border border-current flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
                        </div>
                        <span className="font-semibold">Light Mode</span>
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={cn(
                          "px-4 py-8 rounded-xl border-2 transition-all flex flex-col items-center gap-3",
                          theme === 'dark' 
                            ? "bg-blue-500/10 border-blue-500 text-blue-500" 
                            : "bg-bg-main border-border-main text-text-muted hover:border-border-hover"
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-100 flex items-center justify-center border border-slate-700 shadow-inner">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                        </div>
                        <span className="font-semibold">Dark Mode</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-amber-500"><Activity size={20} /> Alert Thresholds</h3>
                  {canConfigureAlerts ? (
                    <div className="grid grid-cols-2 gap-6 p-5 border border-border-main rounded-xl bg-bg-main/50">
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div>
                            <label className="text-sm font-medium block">CPU Usage</label>
                            <span className="text-xs text-text-muted">Triggers alert above threshold</span>
                          </div>
                          <span className="text-sm font-bold text-amber-500">{alertRules.cpuThreshold}%</span>
                        </div>
                        <input 
                          type="range" min="1" max="100" 
                          value={alertRules.cpuThreshold}
                          onChange={(e) => updateAlertRules({ cpuThreshold: parseInt(e.target.value) })}
                          className="w-full accent-amber-500 h-2 bg-border-main rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div>
                            <label className="text-sm font-medium block">Memory Usage</label>
                            <span className="text-xs text-text-muted">Triggers alert above threshold</span>
                          </div>
                          <span className="text-sm font-bold text-amber-500">{alertRules.memoryThreshold}%</span>
                        </div>
                        <input 
                          type="range" min="1" max="100" 
                          value={alertRules.memoryThreshold}
                          onChange={(e) => updateAlertRules({ memoryThreshold: parseInt(e.target.value) })}
                          className="w-full accent-amber-500 h-2 bg-border-main rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div>
                            <label className="text-sm font-medium block">Latency Limit</label>
                            <span className="text-xs text-text-muted">Max acceptable response time</span>
                          </div>
                          <span className="text-sm font-bold text-amber-500">{alertRules.latencyThreshold}ms</span>
                        </div>
                        <input 
                          type="range" min="10" max="1000" step="10"
                          value={alertRules.latencyThreshold}
                          onChange={(e) => updateAlertRules({ latencyThreshold: parseInt(e.target.value) })}
                          className="w-full accent-amber-500 h-2 bg-border-main rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div>
                            <label className="text-sm font-medium block">Error Rate Limit</label>
                            <span className="text-xs text-text-muted">Max acceptable error percentage</span>
                          </div>
                          <span className="text-sm font-bold text-amber-500">{alertRules.errorRateThreshold}%</span>
                        </div>
                        <input 
                          type="range" min="1" max="20" 
                          value={alertRules.errorRateThreshold}
                          onChange={(e) => updateAlertRules({ errorRateThreshold: parseInt(e.target.value) })}
                          className="w-full accent-amber-500 h-2 bg-border-main rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 border border-border-main rounded-xl bg-bg-main/50 text-center">
                      <p className="text-sm text-text-muted">Alert thresholds are managed by administrators only.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="max-w-3xl">
                {!selectedProviderSetup ? (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="text-2xl font-bold mb-2">Add LLM Provider</h3>
                    <p className="text-text-secondary mb-8 text-sm">
                      Add a new LLM provider by either selecting from one of the default providers or by specifying your own custom LLM provider.
                    </p>
                    <div className="space-y-3">
                      {aiProviders.map((provider) => (
                        <div 
                          key={provider.id} 
                          className="flex items-center justify-between p-4 bg-bg-surface border border-border-main rounded-xl shadow-sm hover:border-blue-500/30 hover:shadow-md transition-all"
                          style={{ backgroundColor: theme === 'light' ? '#ffffff' : undefined }}
                        >
                          <span className="text-lg font-medium text-text-main">{provider.label}</span>
                          <button 
                            onClick={() => {
                              updateAiSettings({ provider: provider.id });
                              setSelectedProviderSetup(provider.id);
                            }}
                            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors"
                          >
                            Set up
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <button 
                      onClick={() => setSelectedProviderSetup(null)}
                      className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 font-medium mb-6 transition-colors"
                    >
                      <ChevronLeft size={16} /> Back to providers
                    </button>
                    
                    <h3 className="text-2xl font-bold mb-8">Setup {aiProviders.find(p => p.id === selectedProviderSetup)?.label}</h3>
                    
                    <div className="space-y-8 bg-bg-main/50 p-6 rounded-2xl border border-border-main">
                      {/* Display Name - All Providers */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold block">Display Name</label>
                        <p className="text-xs text-text-muted mb-2">A name which you can use to identify this provider when selecting it in the UI.</p>
                        <input 
                          type="text"
                          value={aiSettings.displayName ?? ''}
                          onChange={(e) => updateAiSettings({ displayName: e.target.value })}
                          placeholder="Display Name"
                          className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                        />
                      </div>

                      {/* Provider-Specific Fields */}
                      {selectedProviderSetup === 'ollama' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">API Base</label>
                            <p className="text-xs text-text-muted mb-2">Ollama server URL (local or cloud)</p>
                            <input 
                              type="text"
                              value={aiSettings.endpoint}
                              onChange={(e) => updateAiSettings({ endpoint: e.target.value })}
                              placeholder="http://127.0.0.1:11434 or https://ollama.com"
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">Ollama API Key <span className="text-text-muted font-normal text-xs">(optional - for ollama.com cloud)</span></label>
                            <p className="text-xs text-text-muted mb-2">Only required if using ollama.com cloud API</p>
                            <input 
                              type="password"
                              value={aiSettings.apiKey}
                              onChange={(e) => updateAiSettings({ apiKey: e.target.value })}
                              placeholder="ollama_xxxxx (leave empty for local)"
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                            />
                          </div>
                          <div>
                            <button 
                              onClick={async () => {
                                setIsFetchingModels(true);
                                await fetchModels();
                                setIsFetchingModels(false);
                              }}
                              disabled={isFetchingModels}
                              className="px-4 py-2 bg-inverse-bg text-inverse-text rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                              {isFetchingModels ? 'Fetching...' : 'Fetch Available Models'}
                            </button>
                            <p className="text-xs text-text-muted mt-2">Retrieve the latest available models for this provider.</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">Default Model</label>
                            <p className="text-xs text-text-muted mb-2">The model to use by default</p>
                            {availableModels.length > 0 ? (
                              <select 
                                value={aiSettings.model}
                                onChange={(e) => updateAiSettings({ model: e.target.value })}
                                className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm appearance-none font-mono"
                              >
                                {availableModels.map(m => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                            ) : (
                              <input 
                                type="text"
                                value={aiSettings.model}
                                onChange={(e) => updateAiSettings({ model: e.target.value })}
                                placeholder="llama3, mistral, codellama, etc."
                                className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm font-mono"
                              />
                            )}
                          </div>
                        </>
                      )}

                      {selectedProviderSetup === 'openai' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">OpenAI API Key <span className="text-red-500">*</span></label>
                            <p className="text-xs text-text-muted mb-2">Get your API key from platform.openai.com</p>
                            <input 
                              type="password"
                              value={aiSettings.apiKey}
                              onChange={(e) => updateAiSettings({ apiKey: e.target.value })}
                              placeholder="sk-xxxxx..."
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">Organization ID <span className="text-text-muted font-normal text-xs">(optional)</span></label>
                            <p className="text-xs text-text-muted mb-2">Required only if you belong to multiple organizations</p>
                            <input 
                              type="text"
                              value={aiSettings.organizationId ?? ''}
                              onChange={(e) => updateAiSettings({ organizationId: e.target.value })}
                              placeholder="org-xxxxx..."
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">Default Model</label>
                            <p className="text-xs text-text-muted mb-2">The default model to use for inferences</p>
                            <input 
                              type="text"
                              value={aiSettings.model}
                              onChange={(e) => updateAiSettings({ model: e.target.value })}
                              placeholder="gpt-4o, gpt-4-turbo, gpt-3.5-turbo"
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm font-mono"
                            />
                          </div>
                        </>
                      )}

                      {selectedProviderSetup === 'anthropic' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">Anthropic API Key <span className="text-red-500">*</span></label>
                            <p className="text-xs text-text-muted mb-2">Get your API key from console.anthropic.com</p>
                            <input 
                              type="password"
                              value={aiSettings.apiKey}
                              onChange={(e) => updateAiSettings({ apiKey: e.target.value })}
                              placeholder="sk-ant-xxxxx..."
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">API Version <span className="text-text-muted font-normal text-xs">(optional)</span></label>
                            <p className="text-xs text-text-muted mb-2">Used for the anthropic-version header. Default is 2023-06-01</p>
                            <input 
                              type="text"
                              value={aiSettings.apiVersion ?? ''}
                              onChange={(e) => updateAiSettings({ apiVersion: e.target.value })}
                              placeholder="2023-06-01"
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">Default Model</label>
                            <p className="text-xs text-text-muted mb-2">The default model to use for inferences</p>
                            <input 
                              type="text"
                              value={aiSettings.model}
                              onChange={(e) => updateAiSettings({ model: e.target.value })}
                              placeholder="claude-3-5-sonnet-20240620"
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm font-mono"
                            />
                          </div>
                        </>
                      )}

                      {selectedProviderSetup === 'azure' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">Azure OpenAI Endpoint <span className="text-red-500">*</span></label>
                            <p className="text-xs text-text-muted mb-2">Your Azure OpenAI resource endpoint URL</p>
                            <input 
                              type="text"
                              value={aiSettings.endpoint}
                              onChange={(e) => updateAiSettings({ endpoint: e.target.value })}
                              placeholder="https://your-resource.openai.azure.com/"
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">Azure API Key <span className="text-red-500">*</span></label>
                            <p className="text-xs text-text-muted mb-2">Your Azure OpenAI API key</p>
                            <input 
                              type="password"
                              value={aiSettings.apiKey}
                              onChange={(e) => updateAiSettings({ apiKey: e.target.value })}
                              placeholder="Azure API key"
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">API Version <span className="text-red-500">*</span></label>
                            <p className="text-xs text-text-muted mb-2">Azure API version requirement (e.g. 2024-02-15-preview)</p>
                            <input 
                              type="text"
                              value={aiSettings.apiVersion ?? ''}
                              onChange={(e) => updateAiSettings({ apiVersion: e.target.value })}
                              placeholder="2024-02-15-preview"
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">Deployment Name <span className="text-red-500">*</span></label>
                            <p className="text-xs text-text-muted mb-2">Your Azure OpenAI deployment name</p>
                            <input 
                              type="text"
                              value={aiSettings.model}
                              onChange={(e) => updateAiSettings({ model: e.target.value })}
                              placeholder="gpt-4o-deployment"
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm font-mono"
                            />
                          </div>
                        </>
                      )}

                      {selectedProviderSetup === 'openrouter' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">OpenRouter API Key <span className="text-red-500">*</span></label>
                            <p className="text-xs text-text-muted mb-2">Get your API key from openrouter.ai</p>
                            <input 
                              type="password"
                              value={aiSettings.apiKey}
                              onChange={(e) => updateAiSettings({ apiKey: e.target.value })}
                              placeholder="sk-or-xxxxx..."
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">Site URL <span className="text-text-muted font-normal text-xs">(optional)</span></label>
                            <p className="text-xs text-text-muted mb-2">Sent as HTTP-Referer for app ranking</p>
                            <input 
                              type="text"
                              value={aiSettings.siteUrl ?? ''}
                              onChange={(e) => updateAiSettings({ siteUrl: e.target.value })}
                              placeholder="https://your-domain.com"
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">Site Name <span className="text-text-muted font-normal text-xs">(optional)</span></label>
                            <p className="text-xs text-text-muted mb-2">Sent as X-Title header for app ranking</p>
                            <input 
                              type="text"
                              value={aiSettings.siteName ?? ''}
                              onChange={(e) => updateAiSettings({ siteName: e.target.value })}
                              placeholder="Enterprise Dashboard"
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">Default Model</label>
                            <p className="text-xs text-text-muted mb-2">The default model to use for inferences</p>
                            <input 
                              type="text"
                              value={aiSettings.model}
                              onChange={(e) => updateAiSettings({ model: e.target.value })}
                              placeholder="openai/gpt-4o, anthropic/claude-3.5-sonnet"
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm font-mono"
                            />
                          </div>
                        </>
                      )}

                      {selectedProviderSetup === 'groq' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">Groq API Key <span className="text-red-500">*</span></label>
                            <p className="text-xs text-text-muted mb-2">Get your API key from console.groq.com</p>
                            <input 
                              type="password"
                              value={aiSettings.apiKey}
                              onChange={(e) => updateAiSettings({ apiKey: e.target.value })}
                              placeholder="gsk_xxxxx..."
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold block">Default Model</label>
                            <p className="text-xs text-text-muted mb-2">The default model to use for inferences (e.g. llama3-8b-8192)</p>
                            <input 
                              type="text"
                              value={aiSettings.model}
                              onChange={(e) => updateAiSettings({ model: e.target.value })}
                              placeholder="llama3-8b-8192, mixtral-8x7b-32768"
                              className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm font-mono"
                            />
                          </div>
                        </>
                      )}

                      <div className="pt-6 border-t border-border-main">
                        <button 
                          onClick={async () => {
                            setIsTestingAi(true);
                            const res = await testConnection();
                            if (res.success) {
                              toast.success(res.message);
                            } else {
                              toast.error('Connection failed: ' + res.message);
                            }
                            setIsTestingAi(false);
                          }}
                          disabled={isTestingAi}
                          className="w-full py-3 bg-inverse-bg text-inverse-text rounded-xl font-bold shadow-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {isTestingAi ? 'Verifying...' : 'Save and Verify Connection'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'servicenow' && (
              <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-bold mb-2">ServiceNow Integration</h3>
                <p className="text-text-secondary text-sm mb-6">Connect Observability.OS to your ServiceNow instance to automate incident management.</p>
                
                <div className="space-y-6 p-6 border border-border-main rounded-2xl bg-bg-main/50">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold block">Instance URL</label>
                    <input 
                      type="text"
                      value={serviceNowSettings.instanceUrl}
                      onChange={(e) => updateServiceNowSettings({ instanceUrl: e.target.value })}
                      placeholder="https://devXXXXX.service-now.com"
                      className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold block">Username</label>
                      <input 
                        type="text"
                        value={serviceNowSettings.user}
                        onChange={(e) => updateServiceNowSettings({ user: e.target.value })}
                        placeholder="admin"
                        className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold block">Password</label>
                      <input 
                        type="password"
                        value={serviceNowSettings.password}
                        onChange={(e) => updateServiceNowSettings({ password: e.target.value })}
                        placeholder="********"
                        className="w-full bg-bg-surface border border-border-hover rounded-lg px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="p-5 bg-blue-500/5 border border-blue-500/20 rounded-xl mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-blue-500 flex items-center gap-2">
                        <Sparkles size={16} /> Autonomous Engine
                      </h4>
                      <button 
                        onClick={() => updateServiceNowSettings({ autoIncidentEnabled: !serviceNowSettings.autoIncidentEnabled })}
                        className={cn(
                          "w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
                          serviceNowSettings.autoIncidentEnabled ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm",
                          serviceNowSettings.autoIncidentEnabled ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Enable the Autonomous Engine to continually analyze high-risk telemetry and seamlessly generate ServiceNow incidents during critical events, avoiding manual intervention.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border-main text-right">
                    <button 
                      onClick={async () => {
                        setIsTestingSN(true);
                        const res = await testServiceNowConnection();
                        setIsTestingSN(false);
                        if (res.success) {
                          toast.success(res.message);
                        } else {
                          toast.error(res.message);
                        }
                      }}
                      disabled={isTestingSN}
                      className="px-6 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-all shadow-md disabled:opacity-50"
                    >
                      {isTestingSN ? 'Verifying Credentials...' : 'Test Connection'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
