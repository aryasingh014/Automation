// ============================================
// Model Index — Central registry
// ============================================

const User = require('./User');
const Grant = require('./Grant');
const GrantDeadline = require('./GrantDeadline');
const GrantAssignment = require('./GrantAssignment');
const Fund = require('./Fund');
const Expense = require('./Expense');
const Notification = require('./Notification');
const AuditLog = require('./AuditLog');
const Proposal = require('./Proposal');
const Vendor = require('./Vendor');
const ComplianceCheckpoint = require('./ComplianceCheckpoint');
const VendorDocument = require('./VendorDocument');
const HistoricalGrant = require('./HistoricalGrant');

module.exports = {
  User,
  Grant,
  GrantDeadline,
  GrantAssignment,
  Fund,
  Expense,
  Notification,
  AuditLog,
  Proposal,
  Vendor,
  ComplianceCheckpoint,
  VendorDocument,
  HistoricalGrant
};
