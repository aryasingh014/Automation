const { User, Grant, GrantAssignment } = require('../models');
const crypto = require('crypto');

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    // Enrich subrecipients with assigned grant count
    const enriched = await Promise.all(users.map(async (u) => {
      const assignedCount = await GrantAssignment.countDocuments({ userId: u.id });
      return { ...u.toObject(), assignedGrantCount: assignedCount };
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/users/:grantId/assign
 * @desc    Assign/Unassign a user to a grant
 * @access  Private/Admin
 */
const assignUserToGrant = async (req, res, next) => {
  try {
    const { grantId } = req.params;
    const { userId, action } = req.body; // action: 'assign' | 'unassign'

    const grant = await Grant.findOne({ id: grantId });
    if (!grant) return res.status(404).json({ success: false, message: 'Grant not found' });

    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (action === 'assign') {
      // Create assignment if it doesn't exist
      await GrantAssignment.findOneAndUpdate(
        { grantId, userId },
        { id: crypto.randomUUID(), grantId, userId },
        { upsert: true, new: true }
      );
    } else {
      await GrantAssignment.deleteOne({ grantId, userId });
    }

    // Get updated grant with assigned users
    const assignments = await GrantAssignment.find({ grantId });
    const userIds = assignments.map(a => a.userId);
    const assignedToUsers = await User.find({ id: { $in: userIds } }).select('id name email');

    res.json({ 
      success: true, 
      message: `User ${action}ed successfully`, 
      data: {
        ...grant.toObject(),
        assignedTo: assignedToUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, assignUserToGrant };
