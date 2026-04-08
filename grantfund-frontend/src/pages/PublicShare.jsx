import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { HiOutlineCollection, HiOutlineDocumentText, HiOutlineCheckCircle } from 'react-icons/hi';
import AnimatedWrapper from '../components/AnimatedWrapper';

const PublicShare = () => {
  const { shareId } = useParams();
  const [grant, setGrant] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPublicData();
  }, [shareId]);

  const fetchPublicData = async () => {
    try {
      setLoading(true);
      // Extracts grantId from shareId (format: grantId-hex)
      const grantId = shareId.split('-')[0];
      
      const res = await axios.get(`http://localhost:5000/api/grants/public/${grantId}`);
      setGrant(res.data.data.grant);
      setDocuments(res.data.data.documents);
    } catch (err) {
      setError('This share link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-10">
      <div className="text-center animate-pulse">
        <h2 className="text-2xl font-black text-gray-900 mb-2">Validating Compliance Package...</h2>
        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">GMS Secure Public Gateway</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-10">
      <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md text-center">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-black text-gray-900 mb-4">{error}</h2>
        <p className="text-sm text-gray-500 mb-6">Please contact the grant administrator for a new access token.</p>
        <button onClick={() => window.location.href = '/'} className="btn-primary w-full">Return Home</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <AnimatedWrapper>
          <div className="mb-12 text-center">
            <span className="badge-success mb-4 px-4 py-1.5 rounded-full text-[10px] uppercase font-black tracking-widest">Official Compliance Package</span>
            <h1 className="text-4xl font-black text-gray-900 mb-2">{grant.title}</h1>
            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest italic">{grant.agency}</p>
          </div>

          <div className="bg-gray-900 text-white rounded-[2rem] p-10 shadow-2xl mb-12 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <HiOutlineCollection className="w-32 h-32" />
            </div>
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
              <span className="text-primary-400">✨</span> Strategic Intelligence Report
            </h2>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <p className="text-lg leading-relaxed text-primary-50 italic">
                "{grant.complianceIntelligenceReport || 'No intelligence report generated for this package.'}"
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-surface-200">
            <h2 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
              <HiOutlineCollection className="text-primary-500" /> Verified Documentation
            </h2>
            
            <div className="grid gap-4">
              {documents.map(doc => (
                <div key={doc.id} className="p-6 rounded-2xl border border-surface-100 bg-surface-50 flex items-center justify-between hover:bg-white hover:shadow-md transition-all group">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:bg-primary-50 transition-colors">
                      <HiOutlineDocumentText className="w-8 h-8 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-base">{doc.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 uppercase font-black">{doc.vendor?.name}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="text-[10px] text-green-600 uppercase font-black flex items-center gap-1">
                          <HiOutlineCheckCircle className="w-3 h-3" /> Authenticated
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="text-[10px] font-black uppercase text-primary-600 hover:text-primary-700 underline tracking-widest">
                    View Verified Original
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 text-center opacity-40">
            <p className="text-xs font-bold uppercase tracking-tighter">Powered by GMS Grant Autonomy Engine • Secure Document Vault</p>
          </div>
        </AnimatedWrapper>
      </div>
    </div>
  );
};

export default PublicShare;
