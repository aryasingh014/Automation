// ============================================
// Grants Page — List + Create + Detail
// ============================================

import { useState, useEffect, Component } from 'react';
import { grantAPI, fundAPI, scraperAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePlus, HiOutlineX, HiOutlineDocumentText, HiOutlineFilter, HiOutlineSortAscending } from 'react-icons/hi';
import AnimatedWrapper from '../components/AnimatedWrapper';
import FormInput from '../components/FormInput';
import useGrantStore from '../store/useGrantStore';
import GrantCard from '../components/GrantCard';
import GrantModal from '../components/GrantModal';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() { 
    if (this.state.hasError) return this.props.fallback(this.state.error); 
    return this.props.children; 
  }
}

const Grants = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState(null);
  const [form, setForm] = useState({ title: '', agency: '', amount: '', startDate: '', endDate: '', purpose: '' });
  const [submitting, setSubmitting] = useState(false);

  // Zustand state
  const { 
    grants, setGrants, search, setSearch, statusFilter, setStatusFilter, 
    agencyFilter, setAgencyFilter, 
    sortBy, setSortBy, getFilteredSortedGrants 
  } = useGrantStore();

  useEffect(() => { fetchGrants(); }, []);

  const fetchGrants = async () => {
    try {
      const res = await grantAPI.getAll();
      setGrants(res.data.data);
    } catch (err) {
      toast.error('Failed to load grants');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await grantAPI.create(form);
      toast.success('Grant created successfully');
      setShowCreateModal(false);
      setForm({ title: '', agency: '', amount: '', startDate: '', endDate: '', purpose: '' });
      fetchGrants();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create grant');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGrants = getFilteredSortedGrants();
  
  // Extract unique agencies for filter dropdown
  const uniqueAgencies = ['All', ...new Set(grants.map(g => g.agency).filter(Boolean))];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  }

  return (
    <AnimatedWrapper>
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title text-gray-900 font-black">Find Grants</h1>
          <p className="page-subtitle text-gray-500 font-medium">Discover and manage funding opportunities matching your criteria</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center justify-center gap-2 shadow-primary-500/25">
            <HiOutlinePlus className="w-5 h-5" /> New Grant
          </button>
        )}
        {isAdmin && (
          <button 
          onClick={async () => {
            toast.loading('Syncing grants from TxDOT...', { id: 'sync' });
            try {
              const res = await scraperAPI.sync();
              toast.success(res.data.message || 'Sync initiated', { id: 'sync' });
              setTimeout(() => fetchGrants(), 3000);
            } catch (error) {
              toast.error('Failed to sync', { id: 'sync' });
            }
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 bg-slate-100 border border-slate-300 text-slate-800 hover:bg-slate-200 shadow-sm"
        >
          <HiOutlineDocumentText className="w-4 h-4" />
          Sync from TxDOT
        </button>
        )}
      </div>

      {/* ── Advanced Smart Filters ─────────────── */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 mb-8 mt-2">
        
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
          {/* Main Search */}
          <div className="flex-1">
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5 block">Search keywords</label>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, agency, or purpose..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-surface-200 text-sm font-medium text-gray-800 bg-surface-50 focus:bg-white focus:outline-none focus:border-primary-500 shadow-sm transition-colors"
              />
            </div>
          </div>

          {/* Status Chips */}
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5 block">Status</label>
            <div className="flex items-center gap-1.5 bg-surface-50 p-1.5 rounded-xl border border-surface-200 overflow-x-auto">
              {['All', 'Active', 'Completed', 'Draft', 'Expired'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${statusFilter === s ? 'bg-white text-primary-700 shadow-sm border border-surface-200' : 'text-gray-500 hover:text-gray-900 hover:bg-surface-100'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-surface-100">
          {/* Agency Filter */}
          <div>
            <label className="text-[10px] flex items-center gap-1 uppercase font-bold text-gray-400 tracking-wider mb-1.5"><HiOutlineFilter /> Agency</label>
            <select value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm font-medium text-gray-800 focus:outline-none focus:border-primary-500 transition-colors appearance-none">
              {uniqueAgencies.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="text-[10px] flex items-center gap-1 uppercase font-bold text-gray-400 tracking-wider mb-1.5"><HiOutlineSortAscending /> Sort By</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm font-medium text-gray-800 focus:outline-none focus:border-primary-500 transition-colors appearance-none">
              <option value="recent">Recently Added First</option>
              <option value="amount">Highest Amount First</option>
              <option value="deadline">Closing Soonest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Grants Grid ─────────────────────── */}
      <ErrorBoundary fallback={(err) => (
        <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-2xl">
          <h3 className="font-bold">Render Crash Occurred:</h3>
          <p className="font-mono text-sm mt-2 whitespace-pre-wrap">{err.message}</p>
        </div>
      )}>
        {(grants || []).length === 0 && !loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiOutlineDocumentText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="font-black text-gray-900 text-xl">No grants in Database</p>
            <p className="text-gray-500 text-sm mt-1 font-medium">Wait for the scraper to run, or add a grant manually.</p>
          </motion.div>
        ) : filteredGrants.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiOutlineDocumentText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="font-black text-gray-900 text-xl">No grants currently match</p>
            <p className="text-gray-500 text-sm mt-1 font-medium">Try adjusting your filters or search keywords to find what you're looking for.</p>
            <button onClick={() => { setSearch(''); setStatusFilter('All'); setAgencyFilter('All'); setSortBy('recent'); }} className="mt-6 text-sm font-bold text-primary-600 hover:text-primary-800">
              Clear all filters
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {filteredGrants.map((grant, i) => (
              <GrantCard 
                key={grant._id || grant.id} 
                grant={grant} 
                index={i} 
                onClick={() => setSelectedGrant(grant)} 
              />
            ))}
          </div>
        )}
      </ErrorBoundary>

      {/* Grant Details AI Presentation Modal */}
      <GrantModal grant={selectedGrant} onClose={() => setSelectedGrant(null)} />

      {/* Legacy Create Grant Modal (kept simple for admin entry if needed) */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] w-full max-w-xl max-h-[90vh] overflow-y-auto relative z-10 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Add Bare Grant</h2>
                <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-100"><HiOutlineX /></button>
              </div>
              <form onSubmit={handleCreate}>
                <FormInput label="Title" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required />
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Agency" value={form.agency} onChange={e => setForm(p => ({...p, agency: e.target.value}))} required />
                  <FormInput label="Amount" type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Start Date" type="date" value={form.startDate} onChange={e => setForm(p => ({...p, startDate: e.target.value}))} required />
                  <FormInput label="End Date" type="date" value={form.endDate} onChange={e => setForm(p => ({...p, endDate: e.target.value}))} required />
                </div>
                <div className="mb-6 relative mt-4">
                  <textarea 
                    value={form.purpose} onChange={e => setForm(p => ({...p, purpose: e.target.value}))} 
                    className="w-full px-4 pt-4 pb-2 border-2 border-surface-200 rounded-xl" required placeholder="Description..."
                  />
                </div>
                <button type="submit" disabled={submitting} className="btn-primary w-full py-3">{submitting ? 'Creating...' : 'Submit'}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </AnimatedWrapper>
  );
};

export default Grants;

