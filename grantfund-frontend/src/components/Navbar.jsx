import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { HiOutlineMenu, HiOutlineLogout, HiOutlineGlobeAlt } from 'react-icons/hi';

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine Page Title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('grants')) return 'Grants';
    if (path.includes('expenses')) return 'Expenses';
    if (path.includes('approvals')) return 'Approvals';
    if (path.includes('reports')) return 'Reports';
    return 'Dashboard';
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.01)]">
      <div className="flex justify-between items-center h-20 px-4 sm:px-6 lg:px-8">
        
        {/* Left: Hamburger (Mobile) + Page Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => typeof onMenuClick === 'function' && onMenuClick()}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-surface-100 focus:outline-none"
          >
            <HiOutlineMenu className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight hidden sm:block">
            {getPageTitle()}
          </h2>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Help Button */}
          <Link
            to="/help"
            className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
            title="Open Help & Support"
          >
            <HiOutlineGlobeAlt className="w-5 h-5" />
          </Link>
          
          <NotificationBell />
          
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 focus:outline-none p-1 rounded-full hover:bg-surface-50 transition-colors"
            >
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-gray-700 leading-tight">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center text-primary-700 font-bold text-sm shadow-sm transition-transform hover:scale-105">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-surface-200 py-1 z-50 overflow-hidden"
                >
                  <div className="px-4 py-2 border-b border-surface-100 mb-1 md:hidden">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm font-medium text-gray-600 hover:bg-surface-100 hover:text-gray-900 transition-colors flex items-center gap-2"
                  >
                    <HiOutlineLogout className="w-4 h-4" />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
