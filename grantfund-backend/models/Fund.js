const mongoose = require('mongoose');

const fundSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  grantId: { type: String, required: true },
  category: {
    type: String,
    enum: ['travel', 'equipment', 'salary', 'supplies', 'other'],
    required: [true, 'Fund category is required']
  },
  allocatedAmount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  spentAmount: {
    type: Number,
    default: 0,
    min: [0, 'Spent amount cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

fundSchema.virtual('remainingAmount').get(function() {
  return this.allocatedAmount - this.spentAmount;
});

module.exports = mongoose.model('Fund', fundSchema);
