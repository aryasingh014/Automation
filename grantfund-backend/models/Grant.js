const mongoose = require('mongoose');

const grantSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true
  },
  title: {
    type: String,
    required: [true, 'Grant title is required'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  agency: {
    type: String,
    required: [true, 'Funding agency is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  purpose: {
    type: String,
    required: [true, 'Purpose is required']
  },
  currency: {
    type: String,
    default: 'USD'
  },
  summary: {
    type: String,
    default: null
  },
  highlights: {
    type: [String],
    default: []
  },
  eligibilityShort: {
    type: [String],
    default: []
  },
  previousRecipientsFormatted: {
    type: [String],
    default: []
  },
  uiMeta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  contractFile: {
    type: String,
    default: null
  },
  sourceUrl: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Expired', 'Draft'],
    default: 'Active'
  },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

grantSchema.virtual('deadlines', {
  ref: 'GrantDeadline',
  localField: 'id',
  foreignField: 'grantId'
});

grantSchema.virtual('funds', {
  ref: 'Fund',
  localField: 'id',
  foreignField: 'grantId'
});

grantSchema.virtual('assignedTo', {
  ref: 'GrantAssignment',
  localField: 'id',
  foreignField: 'grantId'
});

module.exports = mongoose.model('Grant', grantSchema);
