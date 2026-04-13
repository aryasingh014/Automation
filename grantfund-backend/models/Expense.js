const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  grantId: { type: String, required: true },
  fundId: { type: String, required: true },
  submittedBy: { type: String, required: true },
  description: {
    type: String,
    required: [true, 'Expense description is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  receipt: { type: String, default: null },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  reviewedBy: { type: String, default: null },
  reviewNote: { type: String, default: '' },
  reviewedAt: { type: Date, default: null }
}, {
  timestamps: true
});

expenseSchema.virtual('grant', {
  ref: 'Grant',
  localField: 'grantId',
  foreignField: 'id',
  justOne: true
});

expenseSchema.virtual('fund', {
  ref: 'Fund',
  localField: 'fundId',
  foreignField: 'id',
  justOne: true
});

expenseSchema.virtual('submitter', {
  ref: 'User',
  localField: 'submittedBy',
  foreignField: 'id',
  justOne: true
});

expenseSchema.virtual('reviewer', {
  ref: 'User',
  localField: 'reviewedBy',
  foreignField: 'id',
  justOne: true
});

expenseSchema.set('toObject', { virtuals: true });
expenseSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Expense', expenseSchema);
