import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { HiOutlineX, HiOutlineOfficeBuilding, HiOutlineLink, HiOutlineCheckCircle, HiOutlinePlus, HiOutlineSparkles, HiOutlineCurrencyDollar, HiOutlineClock, HiOutlinePencilAlt, HiOutlineChip, HiOutlineBadgeCheck, HiOutlineCollection } from 'react-icons/hi';

import { formatGrantAmount } from '../utils/formatters';
import { fundAPI, aiAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import FormInput from './FormInput';

const GrantModal = ({ grant, onClose }) => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [funds, setFunds] = useState([]);
  const [showFundForm, setShowFundForm] = useState(false);
  const [fundForm, setFundForm] = useState({ category: 'salary', allocatedAmount: '' });
  const [loadingFunds, setLoadingFunds] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (grant) {
      fetchFunds();
    } else {
      setShowFundForm(false);
    }
  }, [grant]);

  const fetchFunds = async () => {
    try {
      setLoadingFunds(true);
      const res = await fundAPI.getByGrant(grant.id || grant._id);
      setFunds(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFunds(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const toastId = toast.loading('AI is writing your autonomous proposal...');
    try {
      const res = await aiAPI.generateFullProposal({ grantId: grant.id || grant._id });
      toast.success('Proposal generated successfully!', { id: toastId });
      onClose();
      navigate(`/proposal-draft?grantId=${grant.id || grant._id}`, { state: { proposal: res.data.data } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate proposal', { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateFund = async (e) => {
    e.preventDefault();
    try {
      await fundAPI.create({
        grantId: grant.id || grant._id,
        category: fundForm.category,
        allocatedAmount: Number(fundForm.allocatedAmount)
      });
      toast.success('Fund allocated successfully');
      setShowFundForm(false);
      setFundForm({ category: 'salary', allocatedAmount: '' });
      fetchFunds();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to allocate fund');
    }
  };

  if (!grant) return null;

  const { formatted, symbol } = formatGrantAmount({ amount: grant.amount, currency: grant.currency || 'USD' });
  const start = new Date(grant.startDate);
  const end = new Date(grant.endDate);
  const now = new Date();
  
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  let progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  if (totalDuration <= 0) progress = 100;

  const eligibility = grant.eligibilityShort && grant.eligibilityShort.length > 0 ? grant.eligibilityShort : ['Check full purpose for eligibility specifics'];
  const recipients = grant.previousRecipientsFormatted || [];
  const highlights = grant.highlights || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
          onClick={onClose} 
        />
        
        <motion.div 
          layoutId={`grant-${grant.id || grant._id}`}
          initial={{ opacity: 0, y: 60, scale: 0.96 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }} 
          exit={{ opacity: 0, y: 60, scale: 0.96 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-surface-50 rounded-3xl shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col relative z-10 border border-white/20"
        >
          {/* Header Banner - Premium glass/gradient */}
          <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-600 px-8 py-8 relative overflow-hidden flex-shrink-0 text-white">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full border-[30px] border-white/5 opacity-50 blur-xl"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full border-[20px] border-white/5 opacity-50 blur-lg"></div>
            
            <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 hover:scale-105 transition-all z-10">
              <HiOutlineX className="w-5 h-5" />
            </button>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
              <div className="max-w-2xl">
                <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 shadow-sm">
                  {grant.uiMeta?.category || 'General Grant'}
                </span>
                <h2 className="text-3xl md:text-4xl font-black leading-tight mb-3 drop-shadow-md">{grant.title}</h2>
                <div className="flex items-center gap-2 text-primary-100 font-medium">
                  <HiOutlineOfficeBuilding className="w-5 h-5" /> 
                  <span className="text-sm">{grant.agency}</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="text-left md:text-right bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-lg">
                  <p className="text-[10px] font-black text-primary-200 uppercase tracking-widest mb-1">Funding Available</p>
                  {grant.amount > 0 ? (
                    <p className="text-3xl font-black drop-shadow-md">{formatted}</p>
                  ) : (
                    <p className="text-xl font-bold drop-shadow-md text-white/80 italic">TBD / Varies</p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link 
                    to={`/proposal-draft?grantId=${grant.id || grant._id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold rounded-2xl hover:bg-white/20 transition-all font-sans"
                  >
                    <HiOutlinePencilAlt className="w-5 h-5" /> Manual Draft
                  </Link>
                  
                  <button 
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-white text-primary-700 font-bold rounded-2xl shadow-xl hover:bg-primary-50 hover:-translate-y-1 transition-all disabled:opacity-70 disabled:transform-none"
                  >
                    {generating ? (
                      <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                    ) : (
                      <HiOutlineChip className="w-5 h-5" />
                    )}
                    Auto-Generate
                  </button>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link 
                    to={`/compliance/${grant.id || grant._id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-50 text-primary-700 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-primary-100 transition-all border border-primary-200"
                  >
                    <HiOutlineBadgeCheck className="w-4 h-4" /> Compliance Tracking
                  </Link>
                  <Link 
                    to={`/package-review/${grant.id || grant._id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-emerald-100 transition-all border border-emerald-200"
                  >
                    <HiOutlineCollection className="w-4 h-4" /> Review Package
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-8 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column (Main Details & Allocations) */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-8">
                
                {/* Timeline Progress Bar */}
                <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <HiOutlineClock className="w-5 h-5 text-primary-500" /> Grant Timeline
                  </h3>
                  <div className="relative pt-1">
                    <div className="overflow-hidden h-4 mb-3 text-xs flex rounded-full bg-surface-100 border border-surface-200 inset-shadow">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all ${progress >= 100 ? 'bg-red-500' : 'bg-gradient-to-r from-primary-400 to-primary-600'}`}>
                      </motion.div>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-gray-500">
                      <span>{start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}</span>
                      <span>{end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}</span>
                    </div>
                  </div>
                </div>

                {/* AI Highlights if any */}
                {highlights.length > 0 && (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-3xl border border-indigo-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><HiOutlineSparkles className="w-24 h-24 text-indigo-500" /></div>
                    <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                      <HiOutlineSparkles className="text-indigo-500 w-5 h-5" /> AI Analysis
                    </h3>
                    <ul className="space-y-3 relative z-10">
                      {highlights.map((h, i) => (
                        <li key={i} className="flex gap-3 text-indigo-900/80 text-sm font-medium">
                          <span className="text-indigo-500 font-bold mt-0.5">•</span> {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Purpose Document */}
                <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Full Purpose</h3>
                  <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{grant.purpose}</p>
                </div>

                {/* 🔥 Restored Fund Allocations 🔥 */}
                <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                      <HiOutlineCurrencyDollar className="w-5 h-5 text-emerald-500" /> Fund Allocations
                    </h3>
                    {isAdmin && (
                      <button onClick={() => setShowFundForm(!showFundForm)} className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all shadow-sm ${showFundForm ? 'bg-surface-100 text-gray-600 hover:bg-surface-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'}`}>
                        {showFundForm ? <HiOutlineX className="w-4 h-4" /> : <HiOutlinePlus className="w-4 h-4" />}
                        {showFundForm ? 'Close' : 'Allocate'}
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {showFundForm && (
                      <motion.form 
                        initial={{ opacity: 0, height: 0, scale: 0.98 }} 
                        animate={{ opacity: 1, height: 'auto', scale: 1 }} 
                        exit={{ opacity: 0, height: 0, scale: 0.98 }} 
                        onSubmit={handleCreateFund} 
                        className="mb-6 p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 overflow-hidden"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div className="relative">
                            <label className="absolute -top-2 left-3 bg-transparent text-[10px] font-black uppercase text-emerald-700 px-1 z-10">Category</label>
                            <select value={fundForm.category} onChange={e => setFundForm(p => ({...p, category: e.target.value}))} className="w-full px-4 py-3.5 rounded-xl border-2 border-emerald-200 bg-white text-gray-800 text-sm focus:outline-none focus:border-emerald-500 font-bold appearance-none">
                              <option value="salary">Salary & Wages</option>
                              <option value="equipment">Equipment & Tech</option>
                              <option value="travel">Travel & Conferences</option>
                              <option value="supplies">General Supplies</option>
                              <option value="other">Other Expenses</option>
                            </select>
                          </div>
                          <FormInput label={`Amount To Allocate (${symbol})`} type="number" min="1" value={fundForm.allocatedAmount} onChange={e => setFundForm(p => ({...p, allocatedAmount: e.target.value}))} required />
                        </div>
                        <div className="flex justify-end">
                          <button type="submit" className="bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm">
                            Confirm Allocation
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Funds table */}
                  {loadingFunds ? (
                    <div className="py-8 text-center"><div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div></div>
                  ) : funds.length > 0 ? (
                    <div className="overflow-x-auto rounded-2xl border border-surface-200">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr>
                            <th className="bg-surface-50 text-[10px] font-black uppercase tracking-widest text-gray-400 p-4 border-b border-surface-200">Category</th>
                            <th className="bg-surface-50 text-[10px] font-black uppercase tracking-widest text-gray-400 p-4 border-b border-surface-200">Allocated</th>
                            <th className="bg-surface-50 text-[10px] font-black uppercase tracking-widest text-gray-400 p-4 border-b border-surface-200">Spent</th>
                            <th className="bg-surface-50 text-[10px] font-black uppercase tracking-widest text-gray-400 p-4 border-b border-surface-200 whitespace-nowrap">Usage %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {funds.map(fund => {
                            const usage = (fund.spentAmount / fund.allocatedAmount) * 100;
                            return (
                              <tr key={fund._id} className="hover:bg-surface-50 transition-colors border-b border-surface-100 last:border-0">
                                <td className="p-4">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-surface-100 text-gray-700 capitalize border border-surface-200">
                                    {fund.category}
                                  </span>
                                </td>
                                <td className="p-4 font-bold text-gray-800 text-sm">
                                  {formatGrantAmount({ amount: fund.allocatedAmount, currency: grant.currency || 'USD' }).formatted}
                                </td>
                                <td className="p-4 font-bold text-gray-600 text-sm">
                                  {formatGrantAmount({ amount: fund.spentAmount, currency: grant.currency || 'USD' }).formatted}
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-16 bg-surface-200 rounded-full h-1.5 overflow-hidden">
                                      <div className={`h-full rounded-full ${usage > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(usage, 100)}%` }} />
                                    </div>
                                    <span className={`text-[10px] font-black ${usage > 80 ? 'text-red-500' : 'text-gray-500'}`}>{usage.toFixed(0)}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-surface-50 border-2 border-dashed border-surface-200 rounded-2xl p-8 text-center flex flex-col items-center">
                      <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                        <HiOutlineCurrencyDollar className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">No funds allocated</p>
                      <p className="text-xs text-gray-500 mt-1">Administrators can start allocating budgets above.</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column (Meta & Lists) */}
              <div className="lg:col-span-5 xl:col-span-4 space-y-6">
                
                {/* Eligibility */}
                <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <h3 className="text-sm font-black text-emerald-900 uppercase tracking-widest mb-4">Eligibility Criteria</h3>
                  <ul className="space-y-4">
                    {eligibility.map((req, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm font-medium text-emerald-800">
                        <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Previous Recipients */}
                <div className="bg-white p-6 rounded-3xl border border-surface-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Previous Recipients</h3>
                  {recipients.length > 0 ? (
                    <div className="space-y-3">
                      {recipients.map((rec, i) => (
                        <div key={i} className="bg-surface-50 p-3 rounded-xl border border-surface-100 text-sm text-gray-700 font-bold flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary-300"></div> {rec}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-surface-50 rounded-2xl border border-dashed border-surface-200">
                      <p className="text-xs font-bold text-gray-400">No previous recipients available</p>
                    </div>
                  )}
                </div>

                <a href={grant.sourceUrl || "https://www.txdot.gov/business/grants-and-funding.html"} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gray-900 text-white font-bold hover:bg-gray-800 hover:-translate-y-1 transition-all shadow-xl shadow-gray-900/20">
                  <HiOutlineLink className="w-5 h-5" /> Visit Original Source Page
                </a>
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GrantModal;
