import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { complianceAPI, grantAPI } from '../services/api';
import { HiOutlineCheck, HiOutlineCollection, HiOutlineDocumentText, HiOutlineFolderOpen, HiOutlineShare } from 'react-icons/hi';
import AnimatedWrapper from '../components/AnimatedWrapper';
import toast from 'react-hot-toast';

const PackageReview = () => {
  const { grantId } = useParams();
  const [grant, setGrant] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [consolidating, setConsolidating] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (grantId) fetchData();
  }, [grantId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [gRes, dRes] = await Promise.all([
        grantAPI.getOne(grantId),
        complianceAPI.getDocuments(grantId)
      ]);
      setGrant(gRes.data.data);
      setDocuments(dRes.data.data);
    } catch (err) {
      toast.error('Failed to load package data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (docId) => {
    try {
      await complianceAPI.reviewDocument(docId, { status: 'Approved' });
      toast.success('Document approved in package');
      fetchData();
    } catch (err) {
      toast.error('Approval failed');
    }
  };

  const handleConsolidate = async () => {
    try {
      setConsolidating(true);
      const res = await api.post(`/compliance/consolidate/${grantId}`);
      toast.success('Intelligence consolidation complete');
      fetchData();
    } catch (err) {
      toast.error('Consolidation failed');
    } finally {
      setConsolidating(false);
    }
  };

  const handleShare = async () => {
    try {
      setSharing(true);
      const res = await api.post(`/compliance/share/${grantId}`);
      toast.success('Public share link generated');
      fetchData();
    } catch (err) {
      toast.error('Sharing failed');
    } finally {
      setSharing(false);
    }
  };

  const handleSubmitPackage = async () => {
    const approvedCount = documents.filter(d => d.status === 'Approved').length;
    if (approvedCount === 0) {
      toast.error('Please approve at least one document before submitting');
      return;
    }
    toast.success('Package submitted successfully!');
  };

  if (loading) return <div className="p-10 text-center">Loading package data...</div>;
  if (!grant) return <div className="p-10 text-center">Grant not found</div>;

  return (
    <AnimatedWrapper>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Compliance Package Consolidation</h1>
          <p className="page-subtitle">Reviewing collected documentation for {grant.title}</p>
        </div>
        <button onClick={handleSubmitPackage} className="btn-primary flex items-center gap-2">
          <HiOutlineShare className="w-5 h-5" /> Submit Full Package
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-surface-200 shadow-sm">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <HiOutlineCollection className="text-primary-500" /> Collected Documents
            </h2>
            
            <div className="space-y-4">
              {documents.length > 0 ? documents.map(doc => (
                <div key={doc.id} className="p-5 rounded-2xl border border-surface-100 bg-surface-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <HiOutlineDocumentText className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">{doc.title}</h4>
                      <p className="text-[10px] text-gray-500 uppercase font-black">{doc.vendor?.name} • Received {new Date(doc.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.status !== 'Approved' ? (
                      <button onClick={() => handleApprove(doc.id)} className="btn-success text-xs py-2 px-4 flex items-center gap-1">
                        <HiOutlineCheck className="w-4 h-4" /> Approve
                      </button>
                    ) : (
                      <span className="badge-success text-[10px]">Approved</span>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 opacity-50">
                  <HiOutlineFolderOpen className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm font-bold">No documents received yet</p>
                </div>
              )}
            </div>
          </div>
          {grant.complianceIntelligenceReport && (
            <div className="bg-primary-900 text-white rounded-3xl p-8 border border-primary-800 shadow-lg mt-8">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                <span className="text-primary-400">✨</span> AI Strategic Intelligence
              </h2>
              <p className="text-sm leading-relaxed text-primary-100 italic">
                "{grant.complianceIntelligenceReport}"
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card bg-gray-900 text-white">
            <h3 className="text-sm font-black uppercase tracking-widest mb-4">Package Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Total Items</span>
                <span className="font-bold">{documents.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Approved</span>
                <span className="font-bold">{documents.filter(d => d.status === 'Approved').length}</span>
              </div>
              
              <div className="pt-6 space-y-3">
                <button 
                  onClick={handleConsolidate} 
                  disabled={consolidating || documents.filter(d => d.status === 'Approved').length === 0}
                  className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30"
                >
                  {consolidating ? 'Consolidating...' : 'Generate AI Intelligence'}
                </button>
                
                <button 
                  onClick={handleShare}
                  disabled={sharing || !grant.complianceIntelligenceReport}
                  className="w-full py-4 rounded-2xl bg-primary-500 hover:bg-primary-600 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30"
                >
                  {sharing ? 'Sharing...' : 'Generate Share Link'}
                </button>

                {grant.publicShareLink && (
                  <div className="p-4 bg-primary-950/50 rounded-2xl border border-primary-800/50 mt-4">
                    <p className="text-[10px] font-bold text-primary-400 uppercase mb-2">Public Share Link</p>
                    <input readOnly value={grant.publicShareLink} className="w-full bg-transparent text-[10px] text-gray-300 border-none p-0 focus:ring-0 truncate" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AnimatedWrapper>
  );
};

export default PackageReview;
