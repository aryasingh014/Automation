// ============================================
// Sidebar — Light theme, role-based navigation
// ============================================

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineViewGrid,
  HiOutlineDocumentText,
  HiOutlineReceiptTax,
  HiOutlineClipboardCheck,
  HiOutlineFolderOpen,
  HiOutlineBookOpen,
  HiOutlineChartBar,
  HiOutlineLogout,
  HiOutlineX,
  HiOutlineUserGroup,
  HiOutlineSparkles,
  HiOutlineChatAlt2,
} from 'react-icons/hi';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();

  const adminNav = [
    { label: 'Overview', items: [
      { to: '/dashboard', icon: HiOutlineViewGrid, label: 'Dashboard' },
    ]},
    { label: 'Management', items: [
      { to: '/grants', icon: HiOutlineDocumentText, label: 'Grants' },
      { to: '/proposals', icon: HiOutlineFolderOpen, label: 'Proposals' },
      { to: '/knowledge-base', icon: HiOutlineBookOpen, label: 'Knowledge Base' },
      { to: '/vendors', icon: HiOutlineUserGroup, label: 'Vendors' },
      { to: '/expenses', icon: HiOutlineReceiptTax, label: 'Expenses' },
      { to: '/approvals', icon: HiOutlineClipboardCheck, label: 'Approvals', badge: true },
    ]},
    { label: 'Insights', items: [
      { to: '/reports', icon: HiOutlineChartBar, label: 'Reports' },
    ]},
    { label: 'Admin', items: [
      { to: '/users', icon: HiOutlineUserGroup, label: 'User Management' },
    ]},
    { label: 'AI Suite', items: [
      { to: '/ai-suggestions', icon: HiOutlineSparkles, label: 'AI Assistant' },
      { to: '/help', icon: HiOutlineChatAlt2, label: 'Help & Support' },
    ]},
  ];

  const subrecipientNav = [
    { label: 'My Portal', items: [
      { to: '/dashboard', icon: HiOutlineViewGrid, label: 'Dashboard' },
      { to: '/grants', icon: HiOutlineDocumentText, label: 'My Grants' },
      { to: '/proposals', icon: HiOutlineFolderOpen, label: 'My Proposals' },
      { to: '/expenses', icon: HiOutlineReceiptTax, label: 'Submit Expense' },
      { to: '/reports', icon: HiOutlineChartBar, label: 'Reports' },
    ]},
    { label: 'AI Suite', items: [
      { to: '/ai-suggestions', icon: HiOutlineSparkles, label: 'AI Assistant' },
      { to: '/help', icon: HiOutlineChatAlt2, label: 'Help & Support' },
    ]},
  ];

  const navGroups = isAdmin ? adminNav : subrecipientNav;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => typeof onClose === 'function' && onClose()}
        />
      )}

      {/* Professional Minimal Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-[260px] flex flex-col
        bg-white border-r border-slate-200 shadow-sm
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* ── Logo ────────────────────────────── */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img src="/favicon.jpeg" alt="Infosoft Inc." className="h-10 object-contain" />
          </div>
          <button 
            onClick={() => typeof onClose === 'function' && onClose()} 
            className="lg:hidden w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* ── Role badge ──────────────────────── */}
        <div className="px-6 pt-5 pb-2 flex-shrink-0">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${isAdmin ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
            {isAdmin ? 'Admin Portal' : 'Subrecipient'}
          </div>
        </div>

        {/* ── Navigation ──────────────────────── */}
        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = location.pathname === item.to;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => typeof onClose === 'function' && onClose()}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        active
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-6 h-6 rounded-md ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className="flex-1">{item.label}</span>
                      
                      {item.badge && (
                        <span className="flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── User + Logout ────────────────────── */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${isAdmin ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-500 capitalize font-medium">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={() => typeof logout === 'function' && logout()}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100"
          >
            <HiOutlineLogout className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
