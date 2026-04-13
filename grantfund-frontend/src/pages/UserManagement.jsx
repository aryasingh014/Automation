// ============================================
// UserManagement Page — Premium Admin Design
// ============================================

import { useState, useEffect } from 'react';
import { userAPI, grantAPI } from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, FileText, Plus, X, CheckCircle, Search,
  ShieldCheck, User, Mail, ChevronRight, BadgeCheck,
  Building2, DollarSign, Loader2, Eye, CheckSquare
} from 'lucide-react';
import AnimatedWrapper from '../components/AnimatedWrapper';
import Card from '../components/Card';

const formatCurrency = (v) => {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v || 0}`;
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assignModal, setAssignModal] = useState(null);
  const [assigning, setAssigning] = useState(null); // grantId being toggled
  const [tab, setTab] = useState('subrecipients'); // 'subrecipients' | 'admins'

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [usersRes, grantsRes] = await Promise.all([
        userAPI.getAll(),
        grantAPI.getAll(),
      ]);
      setUsers(usersRes.data.data);
      setGrants(grantsRes.data.data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const isAssigned = (grant, userId) =>
    grant.assignedTo?.some(u => (u._id || u) === userId);

  const toggleAssign = async (grant, userId) => {
    const action = isAssigned(grant, userId) ? 'unassign' : 'assign';
    setAssigning(grant._id);
    try {
      await userAPI.assignToGrant(grant._id, userId, action);
      toast.success(`Grant ${action}ed`);
      fetchData();
    } catch {
      toast.error('Failed to update assignment');
    } finally {
      setAssigning(null);
    }
  };

  const subrecipients = users.filter(u => u.role === 'subrecipient');
  const admins = users.filter(u => u.role === 'admin');
  const displayList = tab === 'subrecipients' ? subrecipients : admins;

  const filtered = displayList.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const userAssignedGrants = assignModal
    ? grants.filter(g => isAssigned(g, assignModal._id))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatedWrapper>

      {/* ── Page Header ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Users className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">User Management</h1>
          </div>
          <p className="text-sm text-gray-500 font-medium ml-10">
            Assign grants to subrecipients — they'll only see what's assigned to them.
          </p>
        </div>
        <div className="flex items-center gap-2 ml-10 sm:ml-0">
          <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-100 px-3 py-1.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-xs font-bold text-violet-700">Live Assignments</span>
          </div>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Total Users', value: users.length,
            icon: Users,
            gradient: 'from-violet-500 to-indigo-600',
            bg: 'from-violet-50 to-indigo-50',
            sub: `${admins.length} admins`
          },
          {
            label: 'Subrecipients', value: subrecipients.length,
            icon: User,
            gradient: 'from-blue-500 to-cyan-500',
            bg: 'from-blue-50 to-cyan-50',
            sub: 'External users'
          },
          {
            label: 'Active Grants', value: grants.filter(g => g.status === 'Active').length,
            icon: FileText,
            gradient: 'from-emerald-500 to-teal-600',
            bg: 'from-emerald-50 to-teal-50',
            sub: `${grants.length} total`
          },
          {
            label: 'Total Budget', value: formatCurrency(grants.reduce((s, g) => s + (g.amount || 0), 0)),
            icon: DollarSign,
            gradient: 'from-amber-400 to-orange-500',
            bg: 'from-amber-50 to-orange-50',
            isCurrency: true,
            sub: 'Across all grants'
          },
        ].map((s, i) => (
          <Card key={i} delay={i * 0.07} className="group hover:-translate-y-0.5 overflow-hidden relative">
            <div className={`absolute inset-0 bg-gradient-to-br ${s.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl`} />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-md`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">{s.label}</p>
              <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Main Grid ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left: User List ──────────────────────── */}
        <div className="lg:col-span-2">
          <Card delay={0.2} className="!p-0 overflow-hidden">

            {/* Card top bar */}
            <div className="px-5 pt-5 pb-4 border-b border-surface-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">Users</h2>
                <div className="flex items-center bg-surface-100 p-0.5 rounded-lg text-xs font-bold">
                  {['subrecipients', 'admins'].map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      className={`px-2.5 py-1 rounded-md capitalize transition-all ${tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                      {t === 'subrecipients' ? `External (${subrecipients.length})` : `Admin (${admins.length})`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-surface-200 text-sm text-gray-700 bg-surface-50 focus:bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                />
              </div>
            </div>

            {/* User list */}
            <div className="divide-y divide-surface-50 max-h-[520px] overflow-y-auto">
              <AnimatePresence>
                {filtered.map((u, i) => {
                  const active = assignModal?._id === u._id;
                  const assignedCount = u.assignedGrantCount || 0;
                  const avatarGrad = tab === 'subrecipients'
                    ? 'from-blue-400 to-cyan-500'
                    : 'from-violet-500 to-indigo-600';

                  return (
                    <motion.button
                      key={u._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => tab === 'subrecipients' && setAssignModal(active ? null : u)}
                      className={`w-full flex items-center gap-3.5 px-5 py-4 text-left transition-all ${
                        active
                          ? 'bg-primary-50'
                          : 'hover:bg-surface-50'
                      } ${tab === 'admins' ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white font-extrabold text-sm shadow-sm`}>
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900 truncate">{u.name}</p>
                          {tab === 'admins' && (
                            <span className="text-[10px] font-extrabold bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3" /> Admin
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        </div>
                      </div>

                      {/* Grant count / Arrow */}
                      {tab === 'subrecipients' && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <p className={`text-base font-extrabold ${assignedCount > 0 ? 'text-primary-600' : 'text-gray-300'}`}>{assignedCount}</p>
                            <p className="text-[10px] text-gray-400 font-medium">grants</p>
                          </div>
                          <ChevronRight className={`w-4 h-4 transition-transform ${active ? 'rotate-90 text-primary-500' : 'text-gray-300'}`} />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </AnimatePresence>

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Search className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm font-medium">No users found</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Assignment Panel ─────────────── */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {assignModal ? (
              <motion.div key="panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
                <Card delay={0} className="!p-0 overflow-hidden">

                  {/* Panel header */}
                  <div className="px-6 pt-5 pb-4 border-b border-surface-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                          {assignModal.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="text-base font-extrabold text-gray-900">{assignModal.name}</h2>
                          <p className="text-xs text-gray-400">{assignModal.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {userAssignedGrants.length > 0 && (
                          <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            {userAssignedGrants.length} assigned
                          </span>
                        )}
                        <button onClick={() => setAssignModal(null)} className="w-8 h-8 rounded-xl bg-surface-100 flex items-center justify-center text-gray-400 hover:bg-surface-200 hover:text-gray-600 transition-all">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Assigned summary pills */}
                    {userAssignedGrants.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {userAssignedGrants.map(g => (
                          <span key={g._id} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold truncate max-w-[160px]">
                            ✓ {g.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Grant list */}
                  <div className="divide-y divide-surface-50 max-h-[480px] overflow-y-auto">
                    {grants.map((grant, i) => {
                      const assigned = isAssigned(grant, assignModal._id);
                      const util = grant.totalAllocated > 0
                        ? ((grant.totalSpent / grant.totalAllocated) * 100)
                        : 0;
                      const isLoading = assigning === grant._id;

                      const statusMap = {
                        Active: 'bg-blue-50 text-blue-700 border-blue-100',
                        Completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                        Draft: 'bg-amber-50 text-amber-700 border-amber-100',
                        Expired: 'bg-red-50 text-red-600 border-red-100',
                      };

                      return (
                        <motion.div
                          key={grant._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                          className={`flex items-center gap-4 px-6 py-4 transition-all ${assigned ? 'bg-emerald-50/60' : 'hover:bg-surface-50/60'}`}
                        >
                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow-sm ${
                            assigned ? 'bg-gradient-to-br from-emerald-400 to-teal-600' : 'bg-gradient-to-br from-primary-500 to-indigo-600'
                          }`}>
                            {assigned ? <CheckCircle className="w-5 h-5" /> : grant.title?.charAt(0)}
                          </div>

                          {/* Grant info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{grant.title}</p>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${statusMap[grant.status] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                {grant.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="text-xs text-gray-400 truncate">{grant.agency}</span>
                              <span className="text-gray-200 mx-1">|</span>
                              <span className="text-xs font-bold text-gray-500">{formatCurrency(grant.amount)}</span>
                            </div>
                            {/* Utilization bar */}
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden max-w-[120px]">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(util, 100)}%` }}
                                  transition={{ duration: 0.8, delay: i * 0.04 }}
                                  className={`h-full rounded-full ${util > 80 ? 'bg-red-400' : util > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                />
                              </div>
                              <span className="text-[11px] text-gray-400 font-medium">{util.toFixed(0)}% used</span>
                            </div>
                          </div>

                          {/* Toggle button */}
                          <button
                            onClick={() => toggleAssign(grant, assignModal._id)}
                            disabled={!!assigning}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex-shrink-0 min-w-[100px] justify-center ${
                              isLoading
                                ? 'bg-surface-100 text-gray-400 cursor-not-allowed'
                                : assigned
                                  ? 'bg-white border-2 border-emerald-200 text-emerald-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                                  : 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md shadow-primary-500/25 hover:shadow-lg hover:shadow-primary-500/30 hover:-translate-y-0.5'
                            }`}
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : assigned ? (
                              <><CheckCircle className="w-3.5 h-3.5" /> Assigned</>
                            ) : (
                              <><Plus className="w-3.5 h-3.5" /> Assign</>
                            )}
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card delay={0.25} className="flex flex-col items-center justify-center min-h-[400px] text-center border-2 border-dashed border-surface-200 !bg-surface-50/50">
                  <div className="w-20 h-20 rounded-3xl bg-white border border-surface-200 shadow-sm flex items-center justify-center mb-5">
                    <Users className="w-9 h-9 text-gray-300" />
                  </div>
                  <h3 className="text-base font-extrabold text-gray-800">Select a Subrecipient</h3>
                  <p className="text-sm text-gray-400 mt-1.5 max-w-xs leading-relaxed">
                    Click any user in the left panel to view and manage their grant assignments.
                    Only assigned grants appear in their portal.
                  </p>
                  <div className="flex items-center gap-4 mt-6">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl bg-white border border-surface-200 flex items-center justify-center shadow-sm text-indigo-500">
                        <Eye className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-400">View assignments</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl bg-white border border-surface-200 flex items-center justify-center shadow-sm text-indigo-500">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-400">Assign grants</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl bg-white border border-surface-200 flex items-center justify-center shadow-sm text-emerald-500">
                        <CheckSquare className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-400">Unassign grants</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </AnimatedWrapper>
  );
};

export default UserManagement;
