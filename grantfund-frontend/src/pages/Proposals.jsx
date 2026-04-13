// ============================================
// Proposals Page — List of saved proposal drafts
// ============================================

import { useState, useEffect } from 'react';
import { aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineDocumentText, HiOutlinePencilAlt } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import AnimatedWrapper from '../components/AnimatedWrapper';
import Card from '../components/Card';

const Proposals = () => {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const res = await aiAPI.getProposals();
      setProposals(res.data.data);
    } catch (err) {
      toast.error('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AnimatedWrapper>
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title text-gray-900 font-bold">My Saved Proposals</h1>
          <p className="page-subtitle">{proposals.length} saved drafts</p>
        </div>
      </div>

      {proposals.length > 0 ? (
        <Card className="p-0 overflow-hidden shadow-sm" delay={0.2} noPadding>
          <div className="table-container border-0 rounded-none shadow-none">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="bg-surface-50 pl-6 border-b border-surface-200">Proposal Title</th>
                  <th className="bg-surface-50 border-b border-surface-200">Grant Opportunity</th>
                  <th className="bg-surface-50 border-b border-surface-200">Status</th>
                  <th className="bg-surface-50 border-b border-surface-200">Last Modified</th>
                  <th className="bg-surface-50 pr-6 border-b border-surface-200 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {proposals.map(prop => (
                  <tr key={prop.id} className="hover:bg-primary-50/30 transition-colors">
                    <td className="pl-6 py-4">
                      <p className="font-semibold text-gray-900">{prop.title}</p>
                    </td>
                    <td className="py-4 text-sm text-gray-600 font-medium max-w-[250px] truncate">
                      {prop.grant?.title || 'Unknown Grant'}
                    </td>
                    <td className="py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold capitalize">
                        {prop.status || 'Draft'}
                      </span>
                    </td>
                    <td className="py-4 text-xs font-medium text-gray-500">
                      {fmt(prop.updatedAt)}
                    </td>
                    <td className="pr-6 py-4 text-right">
                      <Link 
                        to={`/proposal-draft?grantId=${prop.grantId}`} 
                        state={{ proposal: prop }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 text-primary-600 font-semibold text-xs hover:bg-primary-50 transition-colors"
                      >
                        <HiOutlinePencilAlt className="w-4 h-4" />
                        Resume Edit
                      </Link>
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
            <HiOutlineDocumentText className="w-8 h-8" />
          </div>
          <p className="text-xl font-bold text-gray-900">No saved proposals</p>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">Use the AI Grant Assistant inside a Grant Opportunity to write and save your first proposal!</p>
        </motion.div>
      )}
    </AnimatedWrapper>
  );
};

export default Proposals;
