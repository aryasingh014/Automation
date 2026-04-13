const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Logistics', 'Consulting', 'Equipment', 'Construction', 'Other'],
    default: 'Other'
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Pending'],
    default: 'Pending'
  },
  contactPerson: String,
  phone: String,
  portalUrl: {
    type: String,
    trim: true
  },
  portalCredentials: {
    username: String,
    password: String // In production, this would be encrypted
  },
  autoSyncEnabled: {
    type: Boolean,
    default: false
  },
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

module.exports = mongoose.model('Vendor', vendorSchema);
