const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true
  },
  grantId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: mongoose.Schema.Types.Mixed, // Stores sections like intro, budget, impact
    default: {}
  },
  status: {
    type: String,
    enum: ['Draft', 'Review', 'Submitted', 'Approved', 'Rejected'],
    default: 'Draft'
  },
  isHistorical: {
    type: Boolean,
    default: false
  },
  outcomeNotes: {
    type: String,
    default: null
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

proposalSchema.virtual('grant', {
  ref: 'Grant',
  localField: 'grantId',
  foreignField: 'id',
  justOne: true
});

proposalSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: 'id',
  justOne: true
});

module.exports = mongoose.model('Proposal', proposalSchema);
