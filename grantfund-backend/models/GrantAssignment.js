const mongoose = require('mongoose');

const grantAssignmentSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  grantId: { type: String, required: true },
  userId: { type: String, required: true }
}, {
  timestamps: true
});

grantAssignmentSchema.index({ grantId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('GrantAssignment', grantAssignmentSchema);
