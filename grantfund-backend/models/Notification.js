const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: { type: String, required: true },
  message: {
    type: String,
    required: [true, 'Notification message is required']
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'error'],
    default: 'info'
  },
  read: { type: Boolean, default: false },
  link: { type: String, default: null }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
