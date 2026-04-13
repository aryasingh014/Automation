import mongoose from 'mongoose';

const OnboardingRequestSchema = new mongoose.Schema({
  appName: {
    type: String,
    required: true
  },
  tier: {
    type: String,
    enum: ['T1', 'T2', 'T3'],
    required: true
  },
  owner: {
    type: String,
    required: true
  },
  environment: {
    type: String,
    enum: ['Production', 'Staging', 'Development'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: String
}, { timestamps: true });

export default mongoose.model('OnboardingRequest', OnboardingRequestSchema);