const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: { type: String, required: true },
  action: {
    type: String,
    enum: [
      'CREATE_GRANT', 'UPDATE_GRANT', 'DELETE_GRANT',
      'CREATE_FUND', 'UPDATE_FUND',
      'SUBMIT_EXPENSE', 'APPROVE_EXPENSE', 'REJECT_EXPENSE',
      'USER_LOGIN', 'USER_REGISTER',
      'ADD_HISTORICAL', 'DELETE_HISTORICAL', 'SYNC_VENDOR'
    ],
    required: true
  },
  entity: {
    type: String,
    enum: ['Grant', 'Fund', 'Expense', 'User', 'HistoricalGrant', 'Vendor'],
    required: true
  },
  entityId: { type: String, required: true },
  details: { type: String, default: '' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

auditLogSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: 'id',
  justOne: true
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
