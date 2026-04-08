// ============================================
// Layout Component — Navbar + Content wrapper
// ============================================

import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { HiOutlineChatAlt2, HiOutlineQuestionMarkCircle, HiOutlineSparkles } from 'react-icons/hi';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    navigate(path);
    setBubbleOpen(false);
  };

  return (
    <div className="flex h-screen bg-transparent font-sans overflow-hidden">
      {/* Pro Clean Background */}
      <div className="absolute inset-0 -z-50 bg-[#F8FAFC]"></div>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto h-full animate-fadeIn pb-10">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bubble Button with Options */}
      <div className="fixed bottom-6 right-6 z-50">
        {bubbleOpen && (
          <div className="absolute bottom-16 right-0 mb-3 bg-white rounded-xl shadow-xl shadow-indigo-500/20 border border-slate-200 py-2 min-w-[180px] overflow-hidden animate-fadeIn">
            <button
              onClick={() => handleNavigate('/ai-suggestions')}
              className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors text-slate-700 text-sm font-medium"
            >
              <HiOutlineSparkles className="w-5 h-5 text-purple-500" />
              AI Assistant
            </button>
            <button
              onClick={() => handleNavigate('/help')}
              className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors text-slate-700 text-sm font-medium"
            >
              <HiOutlineQuestionMarkCircle className="w-5 h-5 text-indigo-500" />
              Help & Support
            </button>
          </div>
        )}
        <button
          onClick={() => setBubbleOpen(!bubbleOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:scale-110 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300"
        >
          <HiOutlineChatAlt2 className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default Layout;
