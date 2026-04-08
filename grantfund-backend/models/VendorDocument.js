const mongoose = require('mongoose');

const vendorDocumentSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true
  },
  vendorId: {
    type: String,
    required: true
  },
  grantId: {
    type: String,
    required: true
  },
  checkpointId: {
    type: String
  },
  title: {
    type: String,
    required: true
  },
  fileUrl: String,
  fileName: String,
  status: {
    type: String,
    enum: ['Requested', 'Received', 'Approved', 'Rejected'],
    default: 'Requested'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  receivedDate: Date,
  reviewNote: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

vendorDocumentSchema.virtual('vendor', {
  ref: 'Vendor',
  localField: 'vendorId',
  foreignField: 'id',
  justOne: true
});

vendorDocumentSchema.virtual('grant', {
  ref: 'Grant',
  localField: 'grantId',
  foreignField: 'id',
  justOne: true
});

module.exports = mongoose.model('VendorDocument', vendorDocumentSchema);
