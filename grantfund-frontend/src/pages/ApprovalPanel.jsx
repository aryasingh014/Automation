// Approval Panel — Admin only
import { useState, useEffect } from 'react';
import { expenseAPI } from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineCheck, HiOutlineX, HiOutlineClipboardCheck } from 'react-icons/hi';

const ApprovalPanel = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewNote, setReviewNote] = useState('');
  const [processing, setProcessing] = useState(null);

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    try {
      const res = await expenseAPI.getAll({ status: 'Pending' });
      setExpenses(res.data.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleReview = async (id, status) => {
    setProcessing(id);
    try {
      await expenseAPI.review(id, { status, reviewNote });
      toast.success(`Expense ${status.toLowerCase()}`);
      setReviewNote('');
      fetchPending();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setProcessing(null); }
  };

  const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtC = (v) => `$${Number(v).toLocaleString()}`;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Approval Panel</h1>
        <p className="page-subtitle">{expenses.length} pending expenses</p>
      </div>

      {expenses.length > 0 ? (
        <div className="space-y-4">
          {expenses.map(exp => (
            <div key={exp.id || exp._id} className="card">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">{exp.description}</h3>
                    <span className="badge-pending">Pending</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-gray-500">Amount:</span> <span className="font-semibold text-gray-900 ml-1">{fmtC(exp.amount)}</span></div>
                    <div><span className="text-gray-500">Grant:</span> <span className="text-gray-700 ml-1">{exp.grantId?.title || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Category:</span> <span className="text-gray-700 capitalize ml-1">{exp.fundId?.category || 'N/A'}</span></div>
                    <div><span className="text-gray-500">By:</span> <span className="text-gray-700 ml-1">{exp.submittedBy?.name}</span></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Submitted {fmt(exp.createdAt)}</p>
                  {exp.receipt && (
                    <a href={exp.receipt} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-xs font-medium mt-1 inline-block">View Receipt →</a>
                  )}
                </div>

                <div className="flex flex-col gap-2 lg:w-64">
                  <input
                    type="text"
                    placeholder="Review note (optional)"
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                    className="input-field text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(exp.id || exp._id, 'Approved')}
                      disabled={processing === (exp.id || exp._id)}
                      className="btn-success flex-1 text-xs flex items-center justify-center gap-1"
                    >
                      <HiOutlineCheck className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleReview(exp.id || exp._id, 'Rejected')}
                      disabled={processing === (exp.id || exp._id)}
                      className="btn-danger flex-1 text-xs flex items-center justify-center gap-1"
                    >
                      <HiOutlineX className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <HiOutlineClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">All caught up!</p>
          <p className="text-sm">No pending expenses to review</p>
        </div>
      )}
    </div>
  );
};

export default ApprovalPanel;
