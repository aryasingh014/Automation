import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Users, Check, XCircle, Clock, Trash2, UserPlus, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface User {
  _id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  department?: string;
  createdAt: string;
  rejectionReason?: string;
}

interface OnboardingRequest {
  _id: string;
  appName: string;
  tier: string;
  owner: string;
  environment: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  rejectionReason?: string;
}

interface UserManagementPanelProps {
  onClose: () => void;
}

type TabId = 'pending' | 'approved' | 'rejected' | 'onboarding';

export default function UserManagementPanel({ onClose }: UserManagementPanelProps) {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [onboardingRequests, setOnboardingRequests] = useState<OnboardingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('pending');
  const [pendingOnboardingCount, setPendingOnboardingCount] = useState(0);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'onboarding') {
      fetchOnboardingRequests();
    } else {
      fetchUsers();
    }
    fetchPendingCounts();
  }, [activeTab]);

  const fetchPendingCounts = async () => {
    try {
      const usersRes = await fetch('/api/auth/admin/pending-count', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersRes.json();
      
      const onboardingRes = await fetch('/api/onboarding/pending-count', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const onboardingData = await onboardingRes.json();
      
      setPendingOnboardingCount(onboardingData.count || 0);
    } catch (error) {
      console.error('Failed to fetch counts:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/admin/users?status=${activeTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
    setLoading(false);
  };

  const fetchOnboardingRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/onboarding/requests?status=pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOnboardingRequests(data);
      }
    } catch (error) {
      console.error('Failed to fetch onboarding requests:', error);
    }
    setLoading(false);
  };

  const handleApprove = async (userId: string) => {
    setProcessingId(userId);
    try {
      const res = await fetch(`/api/auth/admin/approve/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('User approved successfully');
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to approve user');
      }
    } catch (error) {
      toast.error('Failed to approve user');
    }
    setProcessingId(null);
  };

  const handleReject = async (userId: string) => {
    setProcessingId(userId);
    try {
      const res = await fetch(`/api/auth/admin/reject/${userId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Not authorized' })
      });
      if (res.ok) {
        toast.success('User rejected');
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to reject user');
      }
    } catch (error) {
      toast.error('Failed to reject user');
    }
    setProcessingId(null);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    setProcessingId(userId);
    try {
      const res = await fetch(`/api/auth/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to delete user');
      }
    } catch (error) {
      toast.error('Failed to delete user');
    }
    setProcessingId(null);
  };

  const handleApproveOnboarding = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/onboarding/approve/${requestId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Onboarding approved!');
        fetchOnboardingRequests();
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to approve');
      }
    } catch (error) {
      toast.error('Failed to approve');
    }
    setProcessingId(null);
  };

  const handleRejectOnboarding = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/onboarding/reject/${requestId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Not approved' })
      });
      if (res.ok) {
        toast.success('Onboarding rejected');
        fetchOnboardingRequests();
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to reject');
      }
    } catch (error) {
      toast.error('Failed to reject');
    }
    setProcessingId(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-bg-main/80 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl h-[85vh] bg-bg-surface border border-border-main rounded-2xl shadow-2xl flex overflow-hidden"
      >
        <div className="w-64 bg-bg-main border-r border-border-main flex flex-col">
          <div className="p-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users size={20} /> User Management
            </h2>
          </div>
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className={cn(
                "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                activeTab === 'pending' ? "bg-inverse-bg text-inverse-text font-medium" : "text-text-secondary hover:bg-border-main hover:text-text-main"
              )}
            >
              <Clock size={16} /> Pending Requests
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={cn(
                "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                activeTab === 'approved' ? "bg-inverse-bg text-inverse-text font-medium" : "text-text-secondary hover:bg-border-main hover:text-text-main"
              )}
            >
              <UserPlus size={16} /> Approved Users
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={cn(
                "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                activeTab === 'rejected' ? "bg-inverse-bg text-inverse-text font-medium" : "text-text-secondary hover:bg-border-main hover:text-text-main"
              )}
            >
              <XCircle size={16} /> Rejected Users
            </button>
            <button
              onClick={() => setActiveTab('onboarding')}
              className={cn(
                "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                activeTab === 'onboarding' ? "bg-inverse-bg text-inverse-text font-medium" : "text-text-secondary hover:bg-border-main hover:text-text-main"
              )}
            >
              <FolderKanban size={16} /> Onboarding
              {pendingOnboardingCount > 0 && (
                <span className="ml-auto w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingOnboardingCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-bg-surface relative">
          <div className="absolute top-4 right-4 z-10">
            <button onClick={onClose} className="p-2 hover:bg-border-main rounded-full transition-colors text-text-muted">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl">
              {activeTab === 'onboarding' ? (
                <>
                  <h3 className="text-2xl font-bold mb-6">Onboarding Requests</h3>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : onboardingRequests.length === 0 ? (
                    <div className="p-12 text-center border border-border-main rounded-xl">
                      <p className="text-text-muted">No pending onboarding requests</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {onboardingRequests.map((req) => (
                        <div 
                          key={req._id}
                          className="p-4 border border-border-main rounded-xl bg-bg-main/50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{req.appName}</span>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded",
                                  req.status === 'approved' ? "bg-green-500/10 text-green-500" :
                                  "bg-amber-500/10 text-amber-500"
                                )}>
                                  {req.status}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-500">
                                  {req.tier}
                                </span>
                              </div>
                              <p className="text-sm text-text-muted mt-1">Owner: {req.owner}</p>
                              <p className="text-xs text-text-muted">Environment: {req.environment}</p>
                              <p className="text-xs text-text-muted">Requested: {formatDate(req.requestedAt)}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              {req.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApproveOnboarding(req._id)}
                                    disabled={processingId === req._id}
                                    className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50"
                                    title="Approve"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleRejectOnboarding(req._id)}
                                    disabled={processingId === req._id}
                                    className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                                    title="Reject"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold mb-6">
                    {activeTab === 'pending' ? 'Pending Requests' : 
                     activeTab === 'approved' ? 'Approved Users' : 'Rejected Requests'}
                  </h3>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                      ) : users.length === 0 ? (
                        <div className="p-12 text-center border border-border-main rounded-xl">
                          <p className="text-text-muted">
                            {activeTab === 'pending' ? 'No pending requests' : 
                             activeTab === 'approved' ? 'No approved users' : 'No rejected requests'}
                          </p>
                        </div>
                  ) : (
                    <div className="space-y-3">
                      {users.map((user) => (
                        <div 
                          key={user._id}
                          className="p-4 border border-border-main rounded-xl bg-bg-main/50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{user.name || 'No name'}</span>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded",
                                  user.status === 'approved' ? "bg-green-500/10 text-green-500" :
                                  user.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                                  "bg-red-500/10 text-red-500"
                                )}>
                                  {user.status}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-500">
                                  {user.role}
                                </span>
                              </div>
                              <p className="text-sm text-text-muted mt-1">{user.email}</p>
                              {user.department && (
                                <p className="text-xs text-text-muted">Department: {user.department}</p>
                              )}
                              <p className="text-xs text-text-muted mt-1">
                                Requested: {formatDate(user.createdAt)}
                              </p>
                              {user.rejectionReason && (
                                <p className="text-xs text-red-500 mt-1">Reason: {user.rejectionReason}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {activeTab === 'pending' ? (
                                <>
                                  <button
                                    onClick={() => handleApprove(user._id)}
                                    disabled={processingId === user._id}
                                    className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50"
                                    title="Approve"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleReject(user._id)}
                                    disabled={processingId === user._id}
                                    className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                                    title="Reject"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </>
                              ) : activeTab === 'rejected' ? (
                                <>
                                  <button
                                    onClick={() => handleApprove(user._id)}
                                    disabled={processingId === user._id}
                                    className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50"
                                    title="Restore User"
                                  >
                                    <UserPlus size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(user._id)}
                                    disabled={processingId === user._id}
                                    className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                                    title="Delete User"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleDelete(user._id)}
                                  disabled={processingId === user._id}
                                  className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                                  title="Delete User"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}