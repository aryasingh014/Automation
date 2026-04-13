import { motion } from 'framer-motion';
import { HiOutlineOfficeBuilding, HiOutlineClock, HiOutlineCurrencyDollar, HiOutlineChevronRight } from 'react-icons/hi';
import { formatGrantAmount } from '../utils/formatters';

const GrantCard = ({ grant, index, onClick }) => {
  const { formatted } = formatGrantAmount({ amount: grant.amount, currency: grant.currency || 'USD' });
  
  const endDate = new Date(grant.endDate);
  const now = new Date();
  const timeDiff = endDate - now;
  const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  const isClosingSoon = daysLeft > 0 && daysLeft <= 7;
  const isHighValue = grant.amount > 500000;
  const isExpired = daysLeft < 0 || grant.status === 'Expired';
  
  const statusColorMap = {
    Active: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    Completed: 'bg-blue-500/10 text-blue-600 border-blue-200',
    Draft: 'bg-slate-500/10 text-slate-600 border-slate-200',
    Expired: 'bg-red-500/10 text-red-600 border-red-200'
  };
  const badgeClasses = statusColorMap[grant.status] || statusColorMap.Active;
  const summaryText = grant.summary || grant.purpose?.substring(0, 80) + '...';

  return (
    <motion.div
      layout
      layoutId={`grant-${grant.id || grant._id}`}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25, delay: index * 0.05 }}
      whileHover={{ y: -8, scale: 1.01 }}
      onClick={onClick}
      className={`group relative bg-white/80 backdrop-blur-xl rounded-3xl p-6 cursor-pointer flex flex-col h-full border ${isClosingSoon ? 'border-amber-400/50 shadow-[0_8px_30px_rgb(251,191,36,0.15)]' : 'border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'} hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-primary-200 transition-all duration-300 overflow-hidden`}
    >
      {/* Decorative glass accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-400/10 to-purple-400/10 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>

      <div className="flex gap-2 mb-4 relative z-10">
        <span className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${badgeClasses}`}>
          {grant.status}
        </span>
        {isClosingSoon && !isExpired && (
          <span className="bg-amber-500/10 text-amber-600 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
            <HiOutlineClock className="w-3.5 h-3.5" /> Closing Soon
          </span>
        )}
        {isHighValue && (
          <span className="bg-fuchsia-500/10 text-fuchsia-600 border border-fuchsia-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
            <HiOutlineCurrencyDollar className="w-3.5 h-3.5" /> Premium
          </span>
        )}
      </div>

      <h3 className="text-xl font-bold text-gray-900 leading-tight line-clamp-2 pr-4 mb-2 group-hover:text-primary-600 transition-colors">{grant.title}</h3>
      
      <p className="text-sm font-semibold text-primary-600 flex items-center gap-1.5 mb-4">
        <HiOutlineOfficeBuilding className="w-4 h-4" /> {grant.agency}
      </p>

      <div className="bg-surface-50/50 rounded-2xl p-4 mb-6 flex-1 border border-surface-100 group-hover:bg-primary-50/30 group-hover:border-primary-100 transition-colors">
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
          {summaryText}
        </p>
      </div>

      <div className="flex items-end justify-between mt-auto">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1 shadow-sm">Available Funds</span>
          {grant.amount > 0 ? (
            <span className="text-2xl font-black text-gray-900 tracking-tight">{formatted}</span>
          ) : (
            <span className="text-lg font-bold text-gray-500 tracking-tight italic">TBD / Varies</span>
          )}
        </div>
        <div className="w-10 h-10 rounded-full bg-primary-50 group-hover:bg-primary-500 flex items-center justify-center transition-colors">
          <HiOutlineChevronRight className="w-5 h-5 text-primary-500 group-hover:text-white transition-colors" />
        </div>
      </div>
    </motion.div>
  );
};

export default GrantCard;
