// ============================================
// HistoricalGrant Model — Past Winning Apps
// ============================================

const mongoose = require('mongoose');

const HistoricalGrantSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  grantor: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  yearAwarded: {
    type: Number,
    required: true
  },
  content: {
    type: String,
    required: true // The full text of the successful proposal
  },
  keywords: {
    type: [String],
    default: []
  },
  addedBy: {
    type: String,
    required: true // User ID who uploaded this
  }
}, {
  timestamps: true
});

// Index for keyword/title searching
HistoricalGrantSchema.index({ title: 'text', grantor: 'text', content: 'text' });

module.exports = mongoose.model('HistoricalGrant', HistoricalGrantSchema);
