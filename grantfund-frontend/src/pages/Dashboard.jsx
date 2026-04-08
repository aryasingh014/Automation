// ============================================
// Dashboard Page — Enhanced with More Charts
// ============================================

import { useState, useEffect } from 'react';
import { dashboardAPI, scraperAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  HiOutlineDocumentText, HiOutlineTrendingUp,
  HiOutlineExclamationCircle, HiOutlinePlus, HiOutlineChartBar,
  HiOutlineCheckCircle, HiOutlineClock, HiOutlineFire,
  HiOutlineArrowSmRight, HiOutlineStar
} from 'react-icons/hi';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Link } from 'react-router-dom';
import AnimatedWrapper from '../components/AnimatedWrapper';
import Card from '../components/Card';

// ─── CountUp ─────────────────────────────────────
const CountUp = ({ to, prefix = '', suffix = '', duration = 1.5, className }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    let val = latest;
    let formatted = '';
    if (val >= 1000000) formatted = `${(val / 1000000).toFixed(1)}M`;
    else if (val >= 1000) formatted = `${(val / 1000).toFixed(1)}K`;
    else formatted = Math.round(val).toString();
    return `${prefix}${formatted}${suffix}`;
  });
  useEffect(() => {
    const controls = animate(count, to, { duration, ease: 'easeOut' });
    return controls.stop;
  }, [count, to, duration]);
  return <motion.span className={className}>{rounded}</motion.span>;
};

// ─── Radial Progress ─────────────────────────────
const RadialProgress = ({ value, size = 80, strokeWidth = 8, color = '#6366f1', label, sublabel }) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const progress = circ - (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={strokeWidth} stroke="#e2e8f0" fill="none" />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} strokeWidth={strokeWidth} fill="none"
            stroke={color} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: progress }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-extrabold text-gray-900">{value}%</span>
        </div>
      </div>
      {label && <p className="text-xs font-bold text-gray-700 text-center">{label}</p>}
      {sublabel && <p className="text-[10px] text-gray-400 text-center">{sublabel}</p>}
    </div>
  );
};

// ─── Custom Tooltip ───────────────────────────────
const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-surface-200 rounded-2xl px-4 py-3 shadow-xl">
      <p className="text-xs font-bold text-gray-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-extrabold" style={{ color: p.color || p.fill || '#6366f1' }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

import { useAuth } from '../context/AuthContext';

// ─── Main ─────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const res = await dashboardAPI.getSummary();
      setData(res.data.data);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  const handleScraperSync = async () => {
    toast.loading('Starting TxDOT sync...', { id: 'sync' });
    try {
      const res = await scraperAPI.sync();
      toast.success(res.data.message || 'Sync initiated successfully', { id: 'sync' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to trigger sync', { id: 'sync' });
    }
  };

  const fmtC = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val?.toFixed(0) || 0}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin shadow-lg" />
          <p className="text-sm text-gray-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { overview, expenseStats, fundByCategory, monthlySpending, recentActivities, grantSummary } = data;

  const stats = [
    {
      title: 'Total Grants', rawNumber: overview.totalGrants, isMoney: false,
      subtitle: `${overview.activeGrants} active`,
      icon: HiOutlineDocumentText, gradient: 'from-blue-800 to-blue-900',
      bg: 'bg-white shadow-sm border border-gray-200', trend: '+2 this month', trendUp: true
    },
    {
      title: 'Funds Allocated', rawNumber: overview.totalAllocated, isMoney: true,
      subtitle: `${overview.utilizationRate}% utilized`,
      icon: HiOutlineStar, gradient: 'from-slate-700 to-slate-800',
      bg: 'bg-white shadow-sm border border-gray-200', trend: '$120K added', trendUp: true
    },
    {
      title: 'Total Spent', rawNumber: overview.totalSpent, isMoney: true,
      subtitle: `${fmtC(overview.remainingFunds)} remaining`,
      icon: HiOutlineTrendingUp, gradient: 'from-slate-700 to-slate-800',
      bg: 'bg-white shadow-sm border border-gray-200', trend: '+18% vs last month', trendUp: true
    },
    {
      title: 'Pending Approvals', rawNumber: expenseStats.pending.count, isMoney: false,
      subtitle: fmtC(expenseStats.pending.total),
      icon: HiOutlineExclamationCircle, gradient: 'from-amber-700 to-amber-800',
      bg: 'bg-white shadow-sm border border-gray-200', trend: 'Needs action', trendUp: false
    }
  ];

  const categoryData = fundByCategory.map(item => ({
    name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
    allocated: item.allocated,
    spent: item.spent,
    remaining: item.allocated - item.spent,
  }));

  const expensePieData = [
    { name: 'Approved', value: expenseStats.approved.total, color: '#0f766e', light: '#ccfbf1' },
    { name: 'Pending', value: expenseStats.pending.total, color: '#b45309', light: '#fef3c7' },
    { name: 'Rejected', value: expenseStats.rejected.total, color: '#b91c1c', light: '#fee2e2' },
  ].filter(item => item.value > 0);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const spendingTrendData = monthlySpending.map(m => ({
    name: monthNames[m._id.month - 1],
    amount: m.total,
    count: m.count,
  }));

  const radarData = fundByCategory.slice(0, 5).map(item => ({
    category: item._id.charAt(0).toUpperCase() + item._id.slice(1),
    utilization: item.allocated > 0 ? Math.round((item.spent / item.allocated) * 100) : 0,
  }));

  return (
    <AnimatedWrapper>
      <div className="pt-2 pb-10">

        {/* ── Page Header ─────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {greeting}, {firstName}! 👋
              <span className="hidden sm:inline-block ml-3 text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full align-middle whitespace-nowrap shadow-sm border border-primary-100">Live Dashboard</span>
            </h1>
            <p className="text-sm text-gray-500 mt-2 font-medium">Here's what's happening with your grants and funding today.</p>
          </div>
          <div className="flex items-center gap-2">
            {['overview', 'analytics'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${activeTab === tab ? 'bg-primary-600 text-white shadow-sm' : 'bg-surface-100 text-gray-500 hover:bg-surface-200'}`}>
                {tab}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Stat Cards ──────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {stats.map((stat, i) => (
            <Card key={i} delay={i * 0.08} className="group cursor-pointer overflow-hidden relative hover:-translate-y-1">
              {/* Subtle background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl`} />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${stat.trendUp ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                    {stat.trendUp ? '↑' : '!'} {stat.trend}
                  </span>
                </div>
                <CountUp
                  to={stat.rawNumber}
                  prefix={stat.isMoney ? '$' : ''}
                  className="text-3xl font-extrabold text-gray-900 tracking-tight block"
                />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">{stat.title}</p>
                <p className="text-xs text-gray-500 font-medium mt-1">{stat.subtitle}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Quick Actions ───────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-wrap items-center gap-3 mb-10">
          {[
            { to: '/grants', label: 'Create Grant', icon: HiOutlinePlus, color: 'bg-blue-800 text-white hover:bg-blue-900 shadow-sm' },
            { to: '/expenses', label: 'Add Expense', icon: HiOutlinePlus, color: 'bg-slate-800 text-white hover:bg-slate-900 shadow-sm' },
            { to: '/approvals', label: 'Review Approvals', icon: HiOutlineCheckCircle, color: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm' },
            { to: '/reports', label: 'View Reports', icon: HiOutlineChartBar, color: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm' },
          ].map(btn => (
            <Link key={btn.to} to={btn.to}>
              <button className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${btn.color}`}>
                <btn.icon className="w-4 h-4" />
                {btn.label}
              </button>
            </Link>
          ))}
          
          <button 
            onClick={handleScraperSync}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 bg-slate-100 border border-slate-300 text-slate-800 hover:bg-slate-200 shadow-sm ml-auto"
          >
            <HiOutlineDocumentText className="w-4 h-4" />
            Sync TxDOT Grants
          </button>
        </motion.div>

        {/* ── SVG Gradients ───────────────────── */}
        <svg style={{ height: 0, width: 0, position: 'absolute' }}>
          <defs>
            <linearGradient id="gradAllocated" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e40af" /><stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="gradSpent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b" /><stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e40af" stopOpacity={0.15} /><stop offset="100%" stopColor="#1e40af" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>

        {/* ── Main Content Grid ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column (2/3) */}
          <div className="lg:col-span-2 space-y-6">

            {/* 1. Budget vs Spending */}
            <Card delay={0.3} className="border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-sm bg-blue-800 block" />
                  Budget vs Spending
                </h3>
                <span className="text-xs text-gray-400 font-medium">By Category</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categoryData} barGap={6} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={fmtC} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip formatter={fmtC} />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="allocated" name="Allocated" fill="url(#gradAllocated)" radius={[6, 6, 0, 0]} animationDuration={1400} />
                  <Bar dataKey="spent" name="Spent" fill="url(#gradSpent)" radius={[6, 6, 0, 0]} animationDuration={1400} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* 2. Monthly Spending Area Chart */}
            <Card delay={0.4} className="border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-sm bg-blue-800 block" />
                  Spending Trend
                </h3>
                <span className="text-xs border border-gray-200 text-gray-600 font-bold px-2 py-1 rounded-sm">Last 6 months</span>
              </div>
              {spendingTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={spendingTrendData}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1e40af" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#1e40af" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={fmtC} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip formatter={fmtC} />} />
                    <Area type="monotone" dataKey="amount" name="Total Spent" stroke="#1e40af" strokeWidth={3}
                      fill="url(#areaGrad)" dot={{ r: 4, fill: '#1e40af', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#1e3a8a', strokeWidth: 0 }} animationDuration={2000} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-44 text-gray-400 text-sm gap-2">
                  <HiOutlineChartBar className="w-8 h-8 opacity-20" />
                  Looks like you haven't recorded any spending yet! 📊
                </div>
              )}
            </Card>

            {/* 3. Grant Health Table */}
            {grantSummary?.length > 0 && (
              <Card delay={0.5} className="overflow-hidden border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-1.5 h-5 rounded-sm bg-blue-800 block" />
                    Grant Health
                  </h3>
                  <Link to="/grants" className="text-xs text-blue-800 font-semibold hover:text-blue-900 flex items-center gap-1">
                    View all <HiOutlineArrowSmRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {grantSummary.map((g, i) => {
                    const util = g.totalAllocated > 0 ? (g.totalSpent / g.totalAllocated) * 100 : 0;
                    const health = util < 60 ? { label: 'Healthy', color: 'text-teal-800 bg-teal-50 border-teal-200', bar: 'from-teal-600 to-teal-700' }
                      : util < 85 ? { label: 'On Track', color: 'text-amber-800 bg-amber-50 border-amber-200', bar: 'from-amber-600 to-amber-700' }
                      : { label: 'Critical', color: 'text-red-800 bg-red-50 border-red-200', bar: 'from-red-600 to-red-700' };
                    return (
                      <motion.div key={g._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                        className="flex items-center gap-4 p-3 rounded-2xl hover:bg-surface-50 border border-transparent hover:border-surface-100 transition-all group">
                        <div className="w-8 h-8 rounded-sm bg-slate-800 flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0">
                          {g.title.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{g.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-gray-100 overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(util, 100)}%` }} transition={{ duration: 1, delay: i * 0.1 }}
                                className={`h-full bg-gradient-to-r ${health.bar}`} />
                            </div>
                            <span className="text-xs font-bold text-gray-500 w-10 text-right flex-shrink-0">{util.toFixed(0)}%</span>
                          </div>
                        </div>
                        <span className={`text-[11px] font-extrabold px-2 py-1 rounded-lg border ${health.color} flex-shrink-0`}>{health.label}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Right column (1/3) */}
          <div className="space-y-6">

            {/* 4. Expense Status Donut */}
            <Card delay={0.35} className="border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-sm bg-blue-800 block" />
                  Expense Status
                </h3>
              </div>
              {expensePieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80}
                        paddingAngle={4} dataKey="value" stroke="none" animationDuration={1500}>
                        {expensePieData.map((item, i) => (
                          <Cell key={i} fill={item.color} style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.08))' }} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => fmtC(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {expensePieData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-semibold text-gray-600">{item.name}</span>
                        </div>
                        <span className="text-xs font-extrabold text-gray-900">{fmtC(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm gap-2 text-center px-4">
                  <span className="text-2xl">✨</span>
                  <p>No expenses to review right now. You're all caught up!</p>
                </div>
              )}
            </Card>

            {/* 5. Radial Utilization Meters */}
            {radarData.length > 0 && (
              <Card delay={0.45} className="border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-1.5 h-5 rounded-sm bg-blue-800 block" />
                    Category Utilization
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {radarData.slice(0, 4).map((item, i) => {
                    const colors = ['#1e40af', '#0f766e', '#b45309', '#b91c1c'];
                    return (
                      <RadialProgress key={i} value={item.utilization} color={colors[i]} size={72} strokeWidth={7}
                        label={item.category} sublabel={`${item.utilization}% used`} />
                    );
                  })}
                </div>
              </Card>
            )}

            {/* 6. Recent Activity */}
            <Card delay={0.55} className="overflow-hidden border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-sm bg-slate-800 block" />
                  Activity Stream
                </h3>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
              </div>
              <div className="relative border-l-2 border-gray-100 ml-3 space-y-5 pb-2">
                {recentActivities?.length > 0 ? recentActivities.slice(0, 5).map((activity, i) => {
                  const isApprove = activity.action?.includes('APPROVE');
                  const isReject = activity.action?.includes('REJECT');
                  const dotColor = isApprove ? 'bg-teal-700' : isReject ? 'bg-red-700' : 'bg-slate-500';
                  const Icon = isApprove ? HiOutlineCheckCircle : isReject ? HiOutlineExclamationCircle : HiOutlineClock;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="relative pl-6 group">
                      <div className={`absolute -left-[11px] top-1.5 w-5 h-5 rounded-full ${dotColor} border-2 border-white shadow-sm flex items-center justify-center`}>
                        <Icon className="w-2.5 h-2.5 text-white" />
                      </div>
                      <div className="bg-surface-50/80 hover:bg-white hover:shadow-sm p-3 rounded-xl border border-surface-100 transition-all -mt-1">
                        <p className="text-sm font-semibold text-gray-800 leading-tight group-hover:text-primary-600 transition-colors">{activity.details}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-700 font-bold">
                              {activity.userId?.name?.charAt(0) || 'U'}
                            </div>
                            {activity.userId?.name?.split(' ')[0] || 'Unknown'}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                }) : (
                  <div className="text-sm text-gray-400 pl-6 py-4 flex flex-col gap-1">
                    <span className="text-xl">🍃</span>
                    It's quiet in here... No recent activity to show!
                  </div>
                )}
              </div>
            </Card>

            {/* 7. Expense Counts */}
            <Card delay={0.6} className="!p-5 border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Expense Breakdown</h3>
              {[
                { label: 'Approved', count: expenseStats.approved.count, amount: expenseStats.approved.total, color: '#0f766e' },
                { label: 'Pending', count: expenseStats.pending.count, amount: expenseStats.pending.total, color: '#b45309' },
                { label: 'Rejected', count: expenseStats.rejected.count, amount: expenseStats.rejected.total, color: '#b91c1c' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-surface-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
                    <span className="text-sm font-semibold text-gray-700">{row.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-gray-900">{row.count}</span>
                    <span className="text-xs text-gray-400 ml-2">{fmtC(row.amount)}</span>
                  </div>
                </div>
              ))}
            </Card>

          </div>
        </div>
      </div>
    </AnimatedWrapper>
  );
};

export default Dashboard;
