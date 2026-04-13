const mongoose = require('mongoose');

const complianceCheckpointSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true
  },
  grantId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  dueDate: Date,
  status: {
    type: String,
    enum: ['Open', 'In-Progress', 'Completed', 'Critical'],
    default: 'Open'
  },
  requiredDocuments: [String] // List of document types required
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

complianceCheckpointSchema.virtual('grant', {
  ref: 'Grant',
  localField: 'grantId',
  foreignField: 'id',
  justOne: true
});

module.exports = mongoose.model('ComplianceCheckpoint', complianceCheckpointSchema);
