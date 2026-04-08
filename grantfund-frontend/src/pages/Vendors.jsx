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
  const [form, setForm] = useState({ name: '', email: '', category: 'Consulting', contactPerson: '', phone: '' });
  const [documentForm, setDocumentForm] = useState({ grantId: '', title: '' });

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
      setForm({ name: '', email: '', category: 'Consulting', contactPerson: '', phone: '' });
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

  const openDocumentModal = (vendor) => {
    setSelectedVendor(vendor);
    setShowDocumentModal(true);
  };

  if (loading) return <div className="p-10 text-center">Loading vendors...</div>;

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map(vendor => (
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

            <button onClick={() => openDocumentModal(vendor)} className="w-full py-2.5 rounded-xl border border-surface-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-surface-50 transition-colors">
              <HiOutlineDocumentAdd className="w-4 h-4" /> Request Documents
            </button>
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
