// ============================================
// Global Chatbot Page
// Accessible from anywhere, no login required
// ============================================

import { useState, useRef, useEffect } from 'react';
import { chatbotAPI } from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiOutlineSparkles, 
  HiOutlinePaperAirplane, 
  HiOutlineChatAlt2,
  HiOutlineRefresh,
  HiOutlineLightBulb,
  HiOutlineUser,
  HiOutlineChevronRight,
  HiOutlineGlobe
} from 'react-icons/hi';

const GlobalChatbot = () => {
  const scrollRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [serviceStatus, setServiceStatus] = useState(null);

  useEffect(() => {
    checkServiceHealth();
  }, []);

  const checkServiceHealth = async () => {
    try {
      const res = await chatbotAPI.health();
      setServiceStatus(res.data);
    } catch (err) {
      setServiceStatus({ success: false, message: 'Service unavailable' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    setHistory(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const res = await chatbotAPI.ask(userMessage, history);
      
      if (res.data.success) {
        setHistory(prev => [...prev, { role: 'assistant', content: res.data.response }]);
      } else {
        toast.error(res.data.message || 'Failed to get response');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to connect to chatbot';
      toast.error(errorMessage);
      setHistory(prev => [...prev, { 
        role: 'assistant', 
        content: errorMessage 
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleClear = () => {
    setHistory([]);
    toast.success('Chat cleared');
  };

  const starterPrompts = [
    "What is this application about?",
    "How do I apply for a grant?",
    "What user roles are available?",
    "How does the expense approval work?"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
            <HiOutlineGlobe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              GrantHub Assistant 
              <HiOutlineSparkles className="text-emerald-500 w-5 h-5" />
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Get instant help with any question about the system
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Service Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            serviceStatus?.success !== false 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              serviceStatus?.success !== false ? 'bg-emerald-500' : 'bg-red-500'
            }`} />
            {serviceStatus?.success !== false ? 'Online' : 'Offline'}
          </div>
          
          <button 
            onClick={handleClear}
            className="btn-secondary flex items-center gap-2 text-xs py-1.5"
          >
            <HiOutlineRefresh className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/30"
        >
          <AnimatePresence>
            {history.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col items-center justify-center text-center p-8"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mb-4">
                  <HiOutlineChatAlt2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Welcome to GrantHub Assistant!</h3>
                <p className="text-sm text-slate-500 max-w-sm mb-8">
                  I'm here to help you understand and use the Grant Management System. Ask me anything!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {starterPrompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(p)}
                      className="text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <HiOutlineLightBulb className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700">{p}</span>
                        <HiOutlineChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              history.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm ${
                      m.role === 'user' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                    }`}>
                      {m.role === 'user' 
                        ? <HiOutlineUser className="w-5 h-5" /> 
                        : <HiOutlineSparkles className="w-5 h-5" />
                      }
                    </div>
                    <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                      m.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                    }`}>
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
            
            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex-shrink-0 flex items-center justify-center">
                    <HiOutlineSparkles className="w-5 h-5 text-white animate-spin" />
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-400 text-sm italic">
                    <span className="inline-flex gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask anything about the system..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-colors disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
            >
              <HiOutlinePaperAirplane className="w-5 h-5 rotate-90" />
            </button>
          </form>
          <p className="text-[11px] text-center text-slate-400 mt-2">
            AI can make mistakes. Please verify grant details independently.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GlobalChatbot;