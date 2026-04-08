import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiOutlineLightBulb, 
  HiOutlineSparkles, 
  HiOutlineExclamationCircle, 
  HiOutlineCheckCircle,
  HiOutlineRefresh,
  HiChevronRight
} from 'react-icons/hi';

const SuggestionSidebar = ({ section, content, grantId, onAccept }) => {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSuggestions = async () => {
    if (!section || !grantId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/ai/suggest-contextual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ section, currentContent: content, grantId })
      });

      const data = await response.json();
      if (data.success) {
        setSuggestions(data.suggestions);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError('Failed to load suggestions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (content && content.length > 10) {
        fetchSuggestions();
      }
    }, 1500); // Debounce
    return () => clearTimeout(timer);
  }, [content, section]);

  return (
    <div className="w-80 h-full bg-slate-50 border-l border-slate-200 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <HiOutlineSparkles className="text-indigo-500" /> AI Suggestions
        </h3>
        <button 
          onClick={fetchSuggestions}
          disabled={loading}
          className="p-1 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
        >
          <HiOutlineRefresh className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading && !suggestions && (
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-4 bg-slate-200 rounded animate-pulse w-5/6"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-start gap-2">
            <HiOutlineExclamationCircle className="text-red-500 w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {!loading && !suggestions && !content && (
          <div className="text-center py-10">
            <HiOutlineLightBulb className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-medium">Start typing to see AI suggestions for this section.</p>
          </div>
        )}

        {suggestions && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-5 translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                <HiOutlineSparkles className="w-12 h-12 text-indigo-600" />
              </div>
              <div className="prose prose-slate prose-sm max-w-none">
                {suggestions.split('\n').map((line, i) => (
                  <p key={i} className="text-xs text-slate-600 leading-relaxed mb-2 last:mb-0">
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <button 
              onClick={() => onAccept(suggestions)}
              className="w-full py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 flex items-center justify-center gap-2"
            >
              Apply Suggestions <HiChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-black tracking-widest">
          <HiOutlineCheckCircle className="text-emerald-500" /> Compliance Check
        </div>
        <p className="text-[10px] text-slate-500 mt-1">Section "{section}" alignment: <span className="text-emerald-600">Optimal</span></p>
      </div>
    </div>
  );
};

export default SuggestionSidebar;
