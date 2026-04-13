const mongoose = require('mongoose');

const grantDeadlineSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  grantId: { type: String, required: true },
  title: { type: String, required: true },
  date: { type: Date, required: true },
  completed: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('GrantDeadline', grantDeadlineSchema);
