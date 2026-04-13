import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Activity, Server, AlertTriangle, FileText, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (dashboard: string) => void;
}

export default function GlobalSearchModal({ isOpen, onClose, onNavigate }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Mock search results based on query
  const getResults = () => {
    if (!query) return [];
    
    const q = query.toLowerCase();
    const results = [];

    // Quick Actions
    if ('executive dashboard'.includes(q) || 'home'.includes(q)) {
      results.push({ type: 'action', title: 'Go to Executive Dashboard', icon: <Activity size={14} />, action: () => onNavigate?.('executive') });
    }
    if ('infrastructure dashboard'.includes(q) || 'servers'.includes(q)) {
      results.push({ type: 'action', title: 'Go to Infrastructure Dashboard', icon: <Server size={14} />, action: () => onNavigate?.('infrastructure') });
    }
    if ('application dashboard'.includes(q) || 'apps'.includes(q)) {
      results.push({ type: 'action', title: 'Go to Application Dashboard', icon: <Activity size={14} />, action: () => onNavigate?.('application') });
    }

    // Mock Services
    const services = ['Payment Gateway', 'User Auth Service', 'Inventory Scan', 'CDN Edge Nodes'];
    services.forEach(s => {
      if (s.toLowerCase().includes(q)) {
        results.push({ type: 'service', title: s, icon: <FileText size={14} />, desc: 'Application Service' });
      }
    });

    // Mock Issues
    if ('cpu'.includes(q) || 'high load'.includes(q) || 'alert'.includes(q)) {
      results.push({ type: 'alert', title: 'High CPU on Node US-East', icon: <AlertTriangle size={14} className="text-amber-500" />, desc: 'Active Alert' });
    }

    return results;
  };

  const results = getResults();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center pt-[15vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg-main/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-xl bg-bg-surface border border-border-main rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center px-4 py-3 border-b border-border-main gap-3">
              <Search size={18} className="text-text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search resources, services, actions..."
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-text-muted text-text-main"
              />
              <span className="text-[10px] font-mono text-text-muted border border-border-hover px-1.5 py-0.5 rounded bg-bg-main">ESC</span>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {query && results.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-xs text-text-muted font-mono">No results found for "{query}"</p>
                </div>
              ) : (
                <div className="py-2">
                  {results.length === 0 && !query && (
                    <div className="px-4 py-6 text-center">
                      <p className="text-xs text-text-muted font-mono">Type to start searching</p>
                    </div>
                  )}
                  {results.map((res, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (res.action) res.action();
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-border-main/50 transition-colors group text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-bg-main border border-border-main rounded-md group-hover:bg-bg-surface transition-colors">
                          {res.icon}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-text-main group-hover:text-blue-400 transition-colors">{res.title}</p>
                          {res.desc && <p className="text-[10px] text-text-muted font-mono mt-0.5">{res.desc}</p>}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-transparent group-hover:text-text-muted transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
