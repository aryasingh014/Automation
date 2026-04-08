import { useState, useEffect } from 'react';
import { complianceAPI, grantAPI } from '../services/api';
import { HiOutlineMail, HiOutlinePhone, HiOutlinePlus, HiOutlineUserCircle, HiOutlineIdentification, HiOutlineDocumentAdd } from 'react-icons/hi';
import AnimatedWrapper from '../components/AnimatedWrapper';
import toast from 'react-hot-toast';

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', category: 'Consulting', contactPerson: '', phone: '', portalUrl: '', username: '', password: '' });
  const [syncing, setSyncing] = useState({});
  const [documentForm, setDocumentForm] = useState({ grantId: '', title: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  useEffect(() => {
    fetchVendors();
    fetchGrants();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await complianceAPI.getVendors();
      setVendors(res.data.data);
    } catch (err) {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const fetchGrants = async () => {
    try {
      const res = await grantAPI.getAll();
      setGrants(res.data.data || []);
    } catch (err) {
      console.error('Failed to load grants');
    }
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    try {
      await complianceAPI.createVendor(form);
      toast.success('Vendor added successfully');
      setShowAddModal(false);
      setForm({ name: '', email: '', category: 'Consulting', contactPerson: '', phone: '', portalUrl: '', username: '', password: '' });
      fetchVendors();
    } catch (err) {
      toast.error('Failed to add vendor');
    }
  };

  const handleRequestDocument = async (e) => {
    e.preventDefault();
    if (!documentForm.grantId || !documentForm.title) {
      toast.error('Please select a grant and enter document title');
      return;
    }
    try {
      await complianceAPI.requestDocument({
        vendorId: selectedVendor.id,
        grantId: documentForm.grantId,
        checkpointId: null,
        title: documentForm.title
      });
      toast.success('Document request sent successfully');
      setShowDocumentModal(false);
      setDocumentForm({ grantId: '', title: '' });
      setSelectedVendor(null);
    } catch (err) {
      toast.error('Failed to send document request');
    }
  };

  const handleAutoSync = async (vendor) => {
    try {
      setSyncing(prev => ({ ...prev, [vendor.id]: true }));
      await api.post('/compliance/sync-vendor', {
        vendorId: vendor.id,
        documentType: 'Insurance Certificate'
      });
      toast.success('Autonomous collection complete');
    } catch (err) {
      toast.error('Auto-sync failed: Portal unreachable');
    } finally {
      setSyncing(prev => ({ ...prev, [vendor.id]: false }));
    }
  };

  const openDocumentModal = (vendor) => {
    setSelectedVendor(vendor);
    setShowDocumentModal(true);
  };

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          v.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || v.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="p-10 text-center text-gray-400 font-bold">Loading vendors...</div>;

  return (
    <AnimatedWrapper>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Vendor Management</h1>
          <p className="page-subtitle">Manage external partners and document requests</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" /> Add Vendor
        </button>
      </div>

      <div className="mb-8 flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-surface-100 shadow-sm">
        <div className="relative flex-1 w-full">
          <input 
            type="text" 
            placeholder="Search vendors by name or email..." 
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>
        <select 
          className="input-field md:w-48"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          <option>Logistics</option>
          <option>Consulting</option>
          <option>Equipment</option>
          <option>Construction</option>
          <option>Other</option>
        </select>
        <div className="text-[10px] font-black uppercase text-gray-400 px-2 whitespace-nowrap">
          {filteredVendors.length} Result{filteredVendors.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map(vendor => (
          <div key={vendor.id} className="card hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center text-primary-600">
                <HiOutlineUserCircle className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 leading-tight">{vendor.name}</h3>
                <span className="text-[10px] uppercase font-bold text-primary-500 bg-primary-50 px-2 py-0.5 rounded-md">{vendor.category}</span>
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <HiOutlineMail className="w-4 h-4" /> {vendor.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <HiOutlinePhone className="w-4 h-4" /> {vendor.phone || 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <HiOutlineIdentification className="w-4 h-4" /> Contact: {vendor.contactPerson || 'N/A'}
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                disabled={syncing[vendor.id]}
                onClick={() => handleAutoSync(vendor)} 
                className={`flex-1 py-2.5 rounded-xl border border-primary-100 bg-primary-50/50 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary-100 transition-all ${syncing[vendor.id] ? 'animate-pulse' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full ${vendor.portalUrl ? 'bg-green-500' : 'bg-gray-300'}`} />
                {syncing[vendor.id] ? 'Syncing...' : 'Auto-Sync'}
              </button>
              <button onClick={() => openDocumentModal(vendor)} className="flex-1 py-2.5 rounded-xl border border-surface-200 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-surface-50 transition-colors">
                <HiOutlineDocumentAdd className="w-4 h-4" /> Request
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md relative z-10 p-8">
            <h2 className="text-xl font-black mb-6">Register New Vendor</h2>
            <form onSubmit={handleAddVendor} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Company Name</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" placeholder="e.g. Acme Logistics" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Primary Email</label>
                <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" placeholder="contact@acme.com" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Category</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input-field">
                  <option>Logistics</option>
                  <option>Consulting</option>
                  <option>Equipment</option>
                  <option>Construction</option>
                  <option>Other</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full py-3 mt-4">Add Vendor</button>
            </form>
          </div>
        </div>
      )}

      {/* Request Document Modal */}
      {showDocumentModal && selectedVendor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => { setShowDocumentModal(false); setSelectedVendor(null); }} />
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md relative z-10 p-8">
            <h2 className="text-xl font-black mb-2">Request Document</h2>
            <p className="text-sm text-gray-500 mb-6">From: <span className="font-semibold">{selectedVendor.name}</span></p>
            <form onSubmit={handleRequestDocument} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Select Grant</label>
                <select 
                  required
                  value={documentForm.grantId} 
                  onChange={e => setDocumentForm({...documentForm, grantId: e.target.value})} 
                  className="input-field"
                >
                  <option value="">-- Select Grant --</option>
                  {grants.map(grant => (
                    <option key={grant.id} value={grant.id}>{grant.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Document Title</label>
                <input 
                  required 
                  value={documentForm.title} 
                  onChange={e => setDocumentForm({...documentForm, title: e.target.value})} 
                  className="input-field" 
                  placeholder="e.g. Insurance Certificate" 
                />
              </div>
              <button type="submit" className="btn-primary w-full py-3 mt-4">Send Request</button>
            </form>
          </div>
        </div>
      )}
    </AnimatedWrapper>
  );
};

export default Vendors;
