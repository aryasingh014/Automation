// ============================================
// History Page — Historical Grant Corpus
// ============================================

import { useState, useEffect } from 'react';
import { api } from '../services/api'; 
import toast from 'react-hot-toast';
import { HiOutlineDatabase, HiOutlineCloudUpload, HiOutlineTrash } from 'react-icons/hi';
import AnimatedWrapper from '../components/AnimatedWrapper';
import Card from '../components/Card';

const History = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', grantor: '', amount: '', yearAwarded: 2024, content: '', keywords: '' });

  useEffect(() => { fetchRecords(); }, []);

  const fetchRecords = async () => {
    try {
      const res = await api.get('/historical');
      setRecords(res.data.data);
    } catch (err) { toast.error('Failed to load corpus'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/historical', {
        ...form,
        keywords: form.keywords.split(',').map(k => k.trim())
      });
      toast.success('Added to Knowledge Base');
      setShowModal(false);
      fetchRecords();
    } catch (err) { toast.error('Failed to add record'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove from Knowledge Base?')) return;
    try {
      await api.delete(`/historical/${id}`);
      toast.success('Removed');
      fetchRecords();
    } catch (err) { toast.error('Failed to delete'); }
  };

  return (
    <AnimatedWrapper>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Historical Corpus</h1>
          <p className="page-subtitle">AI Knowledge Base of past winning grants</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <HiOutlineCloudUpload className="w-5 h-5" />
          Add Winning Grant
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {records.map(rec => (
          <Card key={rec.id} className="relative group">
            <button 
              onClick={() => handleDelete(rec.id)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <HiOutlineTrash className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <HiOutlineDatabase className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{rec.title}</h3>
                <p className="text-sm text-gray-500">{rec.grantor} • {rec.yearAwarded}</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-gray-900">${rec.amount.toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-3 bg-gray-50 p-2 rounded">
                {rec.content}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {rec.keywords?.map(k => (
                <span key={k} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase tracking-wider">{k}</span>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 italic">Add Successful Application</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500">Grant Title</label>
                  <input required className="w-full p-3 bg-gray-50 border-none rounded-xl" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500">Granting Agency</label>
                  <input required className="w-full p-3 bg-gray-50 border-none rounded-xl" value={form.grantor} onChange={e => setForm({...form, grantor: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500">Award Amount ($)</label>
                  <input type="number" required className="w-full p-3 bg-gray-50 border-none rounded-xl" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500">Year Awarded</label>
                  <input type="number" required className="w-full p-3 bg-gray-50 border-none rounded-xl" value={form.yearAwarded} onChange={e => setForm({...form, yearAwarded: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-500">Proposal Text / Snippet</label>
                <textarea required rows="6" className="w-full p-3 bg-gray-50 border-none rounded-xl resize-none" value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-500">Keywords (Comma separated)</label>
                <input placeholder="e.g. infrastructure, solar, safety" className="w-full p-3 bg-gray-50 border-none rounded-xl" value={form.keywords} onChange={e => setForm({...form, keywords: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 font-bold bg-gray-900 text-white rounded-xl shadow-lg ring-offset-2 hover:ring-2 ring-gray-900 transition-all">Save to Corpus</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AnimatedWrapper>
  );
};

export default History;
