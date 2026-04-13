// ============================================
// Expenses Page — List and Submit Expenses
// ============================================

import { useState, useEffect } from 'react';
import { expenseAPI, grantAPI, fundAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePlus, HiOutlineX, HiOutlineUpload, HiOutlineReceiptTax, HiOutlineDocumentDownload } from 'react-icons/hi';
import AnimatedWrapper from '../components/AnimatedWrapper';
import Card from '../components/Card';
import FormInput from '../components/FormInput';

const Expenses = () => {
  const { isAdmin } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [grants, setGrants] = useState([]);
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ grantId: '', fundId: '', amount: '', description: '' });
  const [receiptFile, setReceiptFile] = useState(null);

  useEffect(() => { fetchExpenses(); fetchGrants(); }, []);

  const fetchExpenses = async () => {
    try { const res = await expenseAPI.getAll(); setExpenses(res.data.data); }
    catch { toast.error('Failed to load expenses'); }
    finally { setLoading(false); }
  };

  const fetchGrants = async () => {
    try { const res = await grantAPI.getAll(); setGrants(res.data.data.filter(g => g.status === 'Active')); }
    catch { /* silent */ }
  };

  const handleGrantChange = async (grantId) => {
    setForm(p => ({ ...p, grantId, fundId: '' }));
    if (grantId) {
      try { const res = await fundAPI.getByGrant(grantId); setFunds(res.data.data); }
      catch { setFunds([]); }
    } else setFunds([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('grantId', form.grantId); fd.append('fundId', form.fundId);
      fd.append('amount', form.amount); fd.append('description', form.description);
      if (receiptFile) fd.append('receipt', receiptFile);
      await expenseAPI.submit(fd);
      toast.success('Expense submitted successfully'); 
      setShowModal(false);
      setForm({ grantId: '', fundId: '', amount: '', description: '' }); 
      setReceiptFile(null); 
      fetchExpenses();
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to submit expense'); 
    }
    finally { setSubmitting(false); }
  };

  const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtC = (v) => `$${Number(v).toLocaleString()}`;
  
  const badge = (s) => {
    const map = { Approved: 'bg-emerald-100 text-emerald-700', Rejected: 'bg-red-100 text-red-700', Pending: 'bg-amber-100 text-amber-700' };
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${map[s] || 'bg-gray-100 text-gray-700'}`}>{s}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <AnimatedWrapper>
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title text-gray-900 font-bold">Expenses</h1>
          <p className="page-subtitle">{expenses.length} total recorded expenses</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center justify-center gap-2">
          <HiOutlinePlus className="w-5 h-5" /> Submit Expense
        </button>
      </div>

      {expenses.length > 0 ? (
        <Card className="p-0 overflow-hidden" delay={0.2} noPadding>
          <div className="table-container border-0 rounded-none shadow-none">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="bg-surface-50 pl-6 border-b border-surface-200">Description</th>
                  <th className="bg-surface-50 border-b border-surface-200">Grant</th>
                  <th className="bg-surface-50 border-b border-surface-200">Category</th>
                  <th className="bg-surface-50 border-b border-surface-200">Amount</th>
                  <th className="bg-surface-50 border-b border-surface-200">Status</th>
                  <th className="bg-surface-50 border-b border-surface-200">By</th>
                  <th className="bg-surface-50 border-b border-surface-200">Date</th>
                  <th className="bg-surface-50 pr-6 border-b border-surface-200 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {expenses.map(exp => (
                  <tr key={exp._id} className="hover:bg-primary-50/30 transition-colors">
                    <td className="pl-6 py-4">
                      <p className="font-semibold text-gray-900 max-w-[200px] truncate">{exp.description}</p>
                    </td>
                    <td className="py-4 text-sm text-gray-600 font-medium">{exp.grantId?.title || 'N/A'}</td>
                    <td className="py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-surface-100 text-xs font-semibold text-gray-700 capitalize">
                        {exp.fundId?.category || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 font-bold text-gray-900">{fmtC(exp.amount)}</td>
                    <td className="py-4">{badge(exp.status)}</td>
                    <td className="py-4 text-sm text-gray-600">{exp.submittedBy?.name || 'N/A'}</td>
                    <td className="py-4 text-xs font-medium text-gray-500">{fmt(exp.createdAt)}</td>
                    <td className="pr-6 py-4 text-right">
                      {exp.receipt ? (
                        <a href={exp.receipt} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors" title="View Receipt">
                          <HiOutlineDocumentDownload className="w-5 h-5" />
                        </a>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white/50 backdrop-blur-lg rounded-3xl border border-dashed border-white/60 shadow-sm">
          <div className="w-16 h-16 bg-white shadow-sm text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <HiOutlineReceiptTax className="w-8 h-8" />
          </div>
          <p className="text-xl font-bold text-gray-900">No expenses yet</p>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">Submit your first expense to track spending against your active grants.</p>
        </motion.div>
      )}

      {/* Submit Expense Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white/80 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] w-full max-w-lg overflow-hidden relative z-10"
            >
              <div className="bg-white/50 px-6 py-5 border-b border-white/40 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Submit Application Expense</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Log spending against an allocated fund category.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-100 text-gray-500 hover:bg-surface-200 transition-colors">
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div className="relative mb-5">
                    <label className="absolute -top-2 left-3 bg-white text-xs font-bold text-primary-600 px-1 z-10">Grant</label>
                    <select value={form.grantId} onChange={e => handleGrantChange(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-surface-200 bg-white text-gray-800 text-sm focus:outline-none focus:border-primary-500 focus:bg-primary-50/10 transition-all font-medium appearance-none" required>
                      <option value="" disabled>Select a grant</option>
                      {grants.map(g => <option key={g.id || g._id} value={g.id || g._id}>{g.title}</option>)}
                    </select>
                  </div>

                  <div className="relative mb-5">
                    <label className="absolute -top-2 left-3 bg-white text-xs font-bold text-primary-600 px-1 z-10">Fund Category</label>
                    <select value={form.fundId} onChange={e => setForm(p => ({...p, fundId: e.target.value}))} className="w-full px-4 py-3 rounded-xl border-2 border-surface-200 bg-white text-gray-800 text-sm focus:outline-none focus:border-primary-500 focus:bg-primary-50/10 transition-all font-medium appearance-none disabled:bg-surface-100 disabled:text-gray-400" required disabled={!form.grantId}>
                      <option value="" disabled>Select fund allocation</option>
                      {funds.map(f => <option key={f.id || f._id} value={f.id || f._id}>{f.category} — Avail: ${(f.allocatedAmount - f.spentAmount).toLocaleString()}</option>)}
                    </select>
                  </div>

                  <FormInput label="Amount ($)" type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} required />
                  
                  <div className="relative mb-5">
                    <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className="w-full px-4 pt-4 pb-2 text-sm text-gray-800 bg-white border-2 border-surface-200 rounded-xl focus:outline-none focus:border-primary-500 focus:bg-primary-50/10 transition-colors resize-none h-24 peer" required placeholder=" " />
                    <label className="absolute left-4 top-3 text-sm text-gray-400 pointer-events-none transition-all peer-focus:-top-2 peer-focus:text-xs peer-focus:text-primary-600 peer-focus:bg-white peer-focus:px-1 peer-valid:-top-2 peer-valid:text-xs peer-valid:text-gray-500 peer-valid:bg-white peer-valid:px-1">
                      Expense Description
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 px-1">Receipt Upload (Optional)</label>
                    <label htmlFor="receiptInput" className={`flex flex-col items-center justify-center w-full h-28 border-2 ${receiptFile ? 'border-primary-400 bg-primary-50/30' : 'border-surface-300 border-dashed bg-surface-50'} rounded-2xl cursor-pointer hover:bg-surface-100 hover:border-primary-400 transition-colors`}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <HiOutlineUpload className={`w-8 h-8 mb-2 ${receiptFile ? 'text-primary-500' : 'text-gray-400'}`} />
                        <p className={`text-sm font-semibold ${receiptFile ? 'text-primary-600' : 'text-gray-500'}`}>
                          {receiptFile ? receiptFile.name : 'Click to upload receipt'}
                        </p>
                        {!receiptFile && <p className="text-xs text-gray-400 mt-1">PDF, JPG or PNG</p>}
                      </div>
                      <input id="receiptInput" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setReceiptFile(e.target.files[0])} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 mt-4 border-t border-surface-100">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-3 text-base">Cancel</button>
                  <button type="submit" disabled={submitting || (!form.grantId || !form.fundId)} className="btn-primary flex-1 py-3 text-base shadow-primary-500/20">
                    {submitting ? 'Submitting...' : 'Submit Expense'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatedWrapper>
  );
};

export default Expenses;

