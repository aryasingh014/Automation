import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiOutlineSparkles, 
  HiOutlinePaperAirplane, 
  HiOutlineChatAlt2,
  HiOutlineRefresh,
  HiOutlineLightBulb,
  HiOutlineUser,
  HiOutlineChevronRight,
  HiOutlineSave
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const AiSuggestions = () => {
  const scrollRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (e) => setInput(e.target.value);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/ai/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: currentInput }] })
      });

      if (!response.ok) throw new Error('Failed to connect to AI');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantMessageId = (Date.now() + 1).toString();

      setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the last incomplete line in the buffer

        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const text = JSON.parse(line.substring(2));
              assistantContent += text;
              setMessages(prev => prev.map(m => 
                m.id === assistantMessageId ? { ...m, content: assistantContent } : m
              ));
            } catch (e) {
               console.error('Partial JSON chunk error:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Chat Error:', err);
      toast.error('An error occurred while getting suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProposal = async (content) => {
    try {
      setIsSaving(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/ai/save-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: 'AI Generated Draft',
          content: { fullText: content },
          grantId: 'manual-draft'
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Draft saved to your proposals!');
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      toast.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStarterClick = (prompt) => {
    setInput(prompt);
    // Auto-submit after a short delay to allow state update
    setTimeout(() => {
      const submitBtn = document.getElementById('chat-submit-btn');
      if (submitBtn) submitBtn.click();
    }, 100);
  };

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const starterPrompts = [
    "I need a grant for environmental conservation in Texas.",
    "What grants are available for small non-profits?",
    "Show me upcoming deadlines for tech innovation grants.",
    "Help me find funding for healthcare research projects."
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            AI Grant Assistant <HiOutlineSparkles className="text-indigo-500 w-6 h-6 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Get personalized grant recommendations and insights based on your requirements.
          </p>
        </div>
        <button 
          onClick={() => typeof setMessages === 'function' && setMessages([])}
          className="btn-secondary flex items-center gap-2 text-xs py-1.5"
        >
          <HiOutlineRefresh className="w-4 h-4" />
          Clear Chat
        </button>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        {/* Messages Container */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/30"
        >
          <AnimatePresence>
            {(!messages || messages.length === 0) ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col items-center justify-center text-center p-8"
              >
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                  <HiOutlineChatAlt2 className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">How can I help you today?</h3>
                <p className="text-sm text-slate-500 max-w-sm mb-8">
                  Ask me about specific grants, eligibility criteria, or let me suggest opportunities based on your project goals.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {starterPrompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => typeof handleStarterClick === 'function' && handleStarterClick(p)}
                      className="text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <HiOutlineLightBulb className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">{p}</span>
                        <HiOutlineChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm ${
                      m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-indigo-600'
                    }`}>
                      {m.role === 'user' ? <HiOutlineUser className="w-5 h-5" /> : <HiOutlineSparkles className="w-5 h-5" />}
                    </div>
                    <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                      m.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none prose prose-slate max-w-none'
                    }`}>
                      {(m.content || '').split('\n').map((line, i) => (
                        <p key={i} className={i > 0 ? 'mt-2' : ''}>
                          {line}
                        </p>
                      ))}
                      
                      {m.role === 'assistant' && m.content.length > 50 && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                          <button
                            disabled={isSaving}
                            onClick={() => typeof handleSaveProposal === 'function' && handleSaveProposal(m.content)}
                            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            <HiOutlineSave className="w-3.5 h-3.5" />
                            {isSaving ? 'Saving...' : 'Save as Draft'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex-shrink-0 flex items-center justify-center">
                    <HiOutlineSparkles className="w-5 h-5 text-indigo-600 animate-spin" />
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-400 text-sm italic">
                    Thinking...
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form 
            onSubmit={(e) => {
              if (typeof handleSubmit === 'function') {
                handleSubmit(e);
              } else {
                e.preventDefault();
                console.error('handleSubmit is not a function');
              }
            }} 
            className="relative flex items-center"
          >
            <input
              value={input}
              onChange={handleInputChange}
              disabled={isLoading}
              placeholder="Ask for grant suggestions..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50"
            />
            <button
              id="chat-submit-btn"
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20"
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

export default AiSuggestions;
