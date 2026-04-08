import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { complianceAPI, grantAPI, aiAPI } from '../services/api';
import { HiOutlineBadgeCheck, HiOutlineClock, HiOutlineDocumentSearch, HiOutlineExclamationCircle, HiOutlinePlus, HiOutlineSparkles } from 'react-icons/hi';
import AnimatedWrapper from '../components/AnimatedWrapper';
import toast from 'react-hot-toast';

const Compliance = () => {
  const { grantId } = useParams();
  const [checkpoints, setCheckpoints] = useState([]);
  const [grant, setGrant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', status: 'Open' });

  useEffect(() => {
    if (grantId) {
      fetchData();
    }
  }, [grantId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cpRes, gRes] = await Promise.all([
        complianceAPI.getCheckpoints(grantId),
        grantAPI.getOne(grantId)
      ]);
      setCheckpoints(cpRes.data.data);
      setGrant(gRes.data.data);
    } catch (err) {
      toast.error('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCheckpoint = async (e) => {
    e.preventDefault();
    try {
      await complianceAPI.createCheckpoint({ ...form, grantId });
      toast.success('Checkpoint added successfully');
      setShowAddModal(false);
      setForm({ title: '', description: '', dueDate: '', status: 'Open' });
      fetchData();
    } catch (err) {
      toast.error('Failed to add checkpoint');
    }
  };

  const handleAnalyzeCompliance = async () => {
    setAnalyzing(true);
    const toastId = toast.loading('AI is analyzing the grant to find compliance requirements...');
    try {
      const res = await aiAPI.analyzeCompliance({ grantId });
      toast.success(`Successfully added ${res.data.count} compliance checkpoints!`, { id: toastId });
      fetchData(); // reload
    } catch (err) {
      toast.error('Failed to analyze compliance requirements', { id: toastId });
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Loading compliance data...</div>;
  if (!grant) return <div className="p-10 text-center">Grant not found</div>;

  const completedCount = checkpoints.filter(c => c.status === 'Completed').length;
  const progress = checkpoints.length > 0 ? (completedCount / checkpoints.length) * 100 : 0;

  return (
    <AnimatedWrapper>
      <div className="page-header">
        <h1 className="page-title">Compliance Framework</h1>
        <p className="page-subtitle">Tracking checkpoints and requirements for {grant.title}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="card flex items-center gap-4 bg-primary-50 border-primary-100">
          <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white shadow-lg">
            <HiOutlineBadgeCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">{progress.toFixed(0)}%</p>
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Overall Compliance</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg">
            <HiOutlineClock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">{checkpoints.length - completedCount}</p>
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Open Checkpoints</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-surface-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-xl font-black text-gray-900">Compliance Checkpoints</h2>
          <div className="flex gap-3">
            <button 
              onClick={handleAnalyzeCompliance} 
              disabled={analyzing}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-2 hover:bg-indigo-100 transition-colors border border-indigo-100 disabled:opacity-50"
            >
              <HiOutlineSparkles className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} /> 
              {analyzing ? 'Analyzing...' : 'Analyze Requirements'}
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-xs flex items-center gap-2">
              <HiOutlinePlus className="w-4 h-4" /> Add Checkpoint
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {checkpoints.length > 0 ? checkpoints.map(cp => (
            <div key={cp.id} className="p-6 rounded-2xl border border-surface-200 hover:border-primary-300 transition-all bg-surface-50">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{cp.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{cp.description}</p>
                  <div className="flex items-center gap-4 mt-4 text-xs font-bold text-gray-400">
                    <span className="flex items-center gap-1"><HiOutlineClock /> Due: {new Date(cp.dueDate).toLocaleDateString()}</span>
                    <span className={`px-2 py-0.5 rounded-md uppercase tracking-tighter ${
                      cp.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                      cp.status === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-surface-200 text-gray-600'
                    }`}>
                      {cp.status}
                    </span>
                  </div>
                </div>
                <button className="p-2 rounded-xl bg-white border border-surface-200 shadow-sm hover:text-primary-600">
                  <HiOutlineDocumentSearch className="w-5 h-5" />
                </button>
              </div>
            </div>
          )) : (
            <div className="text-center py-20 bg-surface-50 rounded-2xl border-2 border-dashed border-surface-200">
              <HiOutlineExclamationCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-bold">No compliance checkpoints defined</p>
              <p className="text-xs text-gray-400 mt-1">Start by adding the first checkpoint for this grant.</p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md relative z-10 p-8">
            <h2 className="text-xl font-black mb-6">Add New Checkpoint</h2>
            <form onSubmit={handleAddCheckpoint} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Title</label>
                <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-field w-full px-4 py-3 rounded-xl border border-surface-200" placeholder="e.g. Initial Progress Report" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field w-full px-4 py-3 rounded-xl border border-surface-200" placeholder="Details of what is required" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Due Date</label>
                <input required type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="input-field w-full px-4 py-3 rounded-xl border border-surface-200" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input-field w-full px-4 py-3 rounded-xl border border-surface-200">
                  <option value="Open">Open</option>
                  <option value="In-Progress">In-Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full py-3 mt-4">Save Checkpoint</button>
            </form>
          </div>
        </div>
      )}
    </AnimatedWrapper>
  );
};

export default Compliance;
