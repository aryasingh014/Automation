import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiOutlineChevronLeft, 
  HiOutlineSave, 
  HiOutlineSparkles,
  HiOutlineClipboardList,
  HiOutlineCurrencyDollar,
  HiOutlineGlobe
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import SuggestionSidebar from '../components/SuggestionSidebar';
import AnimatedWrapper from '../components/AnimatedWrapper';

const ProposalDraft = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const generatedDraft = location.state?.proposal;

  const grantId = searchParams.get('grantId');
  const [grant, setGrant] = useState(null);
  const [activeSection, setActiveSection] = useState('executive-summary');
  const [proposal, setProposal] = useState({
    title: generatedDraft?.title || '',
    'executive-summary': generatedDraft?.content?.executiveSummary || '',
    'budget-narrative': generatedDraft?.content?.budgetNarrative || '',
    'project-description': generatedDraft?.content?.projectDescription || '',
    'impact': generatedDraft?.content?.impact || '',
    'implementation-plan': generatedDraft?.content?.implementationPlan || ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!grantId) {
      toast.error('No Grant ID provided');
      navigate('/grants');
      return;
    }
    fetchGrant();
  }, [grantId]);

  const fetchGrant = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/grants/${grantId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setGrant(data.data);
        if (!generatedDraft) {
          setProposal(p => ({ ...p, title: `Draft Proposal for ${data.data.title}` }));
        }
      }
    } catch (err) {
      toast.error('Failed to load grant details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/ai/save-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          grantId,
          title: proposal.title,
          content: proposal
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Proposal draft saved!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error('Failed to save proposal');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'executive-summary', label: 'Executive Summary', icon: <HiOutlineSparkles /> },
    { id: 'project-description', label: 'Project Description', icon: <HiOutlineGlobe /> },
    { id: 'budget-narrative', label: 'Budget Narrative', icon: <HiOutlineCurrencyDollar /> },
    { id: 'impact', label: 'Community Impact', icon: <HiOutlineClipboardList /> },
    { id: 'implementation-plan', label: 'Implementation Plan', icon: <HiOutlineClipboardList /> }
  ];

  if (loading) return <div className="p-8 text-center font-bold">Loading Editor...</div>;

  return (
    <AnimatedWrapper>
      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
              <HiOutlineChevronLeft className="w-5 h-5 text-slate-500" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none mb-1">Interactive Proposal Draft</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{grant?.title}</p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <HiOutlineSave className="w-5 h-5" /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>

        <div className="flex-1 flex bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-64 bg-slate-50 border-r border-slate-200 p-6 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Sections</label>
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeSection === s.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : 'text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
                }`}
              >
                <span className={activeSection === s.id ? 'text-white' : 'text-slate-400'}>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex flex-col p-8 overflow-y-auto">
            <input 
              value={proposal.title}
              onChange={(e) => setProposal(p => ({ ...p, title: e.target.value }))}
              placeholder="Proposal Title..."
              className="text-2xl font-black text-slate-900 border-none focus:ring-0 mb-8 w-full p-0 placeholder-slate-200"
            />
            
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Drafting Section: {sections.find(s => s.id === activeSection)?.label}
            </label>
            <textarea
              value={proposal[activeSection]}
              onChange={(e) => setProposal(p => ({ ...p, [activeSection]: e.target.value }))}
              placeholder={`Start writing your ${sections.find(s => s.id === activeSection)?.label.toLowerCase()}...`}
              className="flex-1 w-full bg-slate-50/50 rounded-2xl p-6 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white transition-all text-slate-700 leading-relaxed outline-none resize-none"
            />
          </div>

          {/* Suggestion Sidebar */}
          <SuggestionSidebar 
            section={activeSection} 
            content={proposal[activeSection]} 
            grantId={grantId}
            onAccept={(text) => setProposal(p => ({ ...p, [activeSection]: p[activeSection] + '\n' + text }))}
          />
        </div>
      </div>
    </AnimatedWrapper>
  );
};

export default ProposalDraft;
