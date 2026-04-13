const { Grant, Fund, AuditLog, GrantDeadline, GrantAssignment, User } = require('../models');
const crypto = require('crypto');

/**
 * @route   POST /api/grants
 * @desc    Create a new grant
 * @access  Private/Admin
 */
const createGrant = async (req, res, next) => {
  try {
    const { deadlines, assignedTo, ...grantFields } = req.body;
    grantFields.createdBy = req.user.id;
    grantFields.id = grantFields.id || uuidv4();

    // Handle contract file if uploaded
    if (req.file) {
      grantFields.contractFile = req.file.path;
    }

    const grant = await Grant.create(grantFields);

    // Create deadlines if provided
    if (deadlines && Array.isArray(deadlines)) {
      const deadlineRows = deadlines.map(d => ({
        id: crypto.randomUUID(),
        grantId: grant.id,
        title: d.title,
        date: d.date,
        completed: d.completed || false
      }));
      await GrantDeadline.insertMany(deadlineRows);
    }

    // Create assignments if provided
    if (assignedTo && Array.isArray(assignedTo)) {
      const assignmentRows = assignedTo.map(userId => ({
        id: crypto.randomUUID(),
        grantId: grant.id,
        userId
      }));
      await GrantAssignment.insertMany(assignmentRows);
    }

    // Reload with associations
    const fullGrant = await Grant.findOne({ id: grant.id })
      .populate('deadlines');
    
    // Manual lookup for assignedTo users since it's a many-to-many via GrantAssignment
    const assignments = await GrantAssignment.find({ grantId: grant.id });
    const userIds = assignments.map(a => a.userId);
    const assignedToUsers = await User.find({ id: { $in: userIds } }).select('id name email');

    // Audit log
    await AuditLog.create({
      id: crypto.randomUUID(),
      userId: req.user.id,
      action: 'CREATE_GRANT',
      entity: 'Grant',
      entityId: grant.id,
      details: `Grant "${grant.title}" created with amount $${grant.amount}`
    });

    res.status(201).json({
      success: true,
      message: 'Grant created successfully',
      data: {
        ...fullGrant.toObject(),
        assignedTo: assignedToUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/grants
 * @desc    Get all grants
 * @access  Private
 */
const getGrants = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'subrecipient') {
      // Subrecipients only see grants assigned to them
      const assignments = await GrantAssignment.find({ userId: req.user.id });
      const grantIds = assignments.map(a => a.grantId);
      query.id = { $in: grantIds };
    }

    const grants = await Grant.find(query)
      .populate('deadlines')
      .sort({ createdAt: -1 });

    // For each grant, get creator and assigned users + fund summary
    const grantsWithDetails = await Promise.all(
      grants.map(async (grant) => {
        const creator = await User.findOne({ id: grant.createdBy }).select('id name email');
        
        const assignments = await GrantAssignment.find({ grantId: grant.id });
        const userIds = assignments.map(a => a.userId);
        const assignedToUsers = await User.find({ id: { $in: userIds } }).select('id name email');

        const funds = await Fund.find({ grantId: grant.id });
        const totalAllocated = funds.reduce((sum, f) => sum + f.allocatedAmount, 0);
        const totalSpent = funds.reduce((sum, f) => sum + f.spentAmount, 0);

        return {
          ...grant.toObject(),
          creator,
          assignedTo: assignedToUsers,
          totalAllocated,
          totalSpent,
          remainingBudget: totalAllocated - totalSpent,
          fundCount: funds.length
        };
      })
    );

    res.json({
      success: true,
      count: grantsWithDetails.length,
      data: grantsWithDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/grants/:id
 * @desc    Get single grant with details
 * @access  Private
 */
const getGrant = async (req, res, next) => {
  try {
    const grant = await Grant.findOne({ id: req.params.id })
      .populate('deadlines');

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant not found'
      });
    }

    // Authorization check for subrecipients
    if (req.user.role === 'subrecipient') {
      const isAssigned = await GrantAssignment.findOne({ grantId: grant.id, userId: req.user.id });
      if (!isAssigned) {
        return res.status(403).json({ success: false, message: 'Not authorized for this grant' });
      }
    }

    const creator = await User.findOne({ id: grant.createdBy }).select('id name email');
    
    const assignments = await GrantAssignment.find({ grantId: grant.id });
    const userIds = assignments.map(a => a.userId);
    const assignedToUsers = await User.find({ id: { $in: userIds } }).select('id name email');

    // Get associated funds
    const funds = await Fund.find({ grantId: grant.id });
    const totalAllocated = funds.reduce((sum, f) => sum + f.allocatedAmount, 0);
    const totalSpent = funds.reduce((sum, f) => sum + f.spentAmount, 0);

    res.json({
      success: true,
      data: {
        ...grant.toObject(),
        creator,
        assignedTo: assignedToUsers,
        funds,
        totalAllocated,
        totalSpent,
        remainingBudget: totalAllocated - totalSpent
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/grants/:id
 * @desc    Update a grant
 * @access  Private/Admin
 */
const updateGrant = async (req, res, next) => {
  try {
    const { deadlines, assignedTo, ...updateFields } = req.body;

    // Handle contract file if uploaded
    if (req.file) {
      updateFields.contractFile = req.file.path;
    }

    const grant = await Grant.findOneAndUpdate(
      { id: req.params.id },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant not found'
      });
    }

    // Update deadlines if provided
    if (deadlines && Array.isArray(deadlines)) {
      await GrantDeadline.deleteMany({ grantId: grant.id });
      const deadlineRows = deadlines.map(d => ({
        id: crypto.randomUUID(),
        grantId: grant.id,
        title: d.title,
        date: d.date,
        completed: d.completed || false
      }));
      await GrantDeadline.insertMany(deadlineRows);
    }

    // Update assignments if provided
    if (assignedTo && Array.isArray(assignedTo)) {
      await GrantAssignment.deleteMany({ grantId: grant.id });
      const assignmentRows = assignedTo.map(userId => ({
        id: crypto.randomUUID(),
        grantId: grant.id,
        userId
      }));
      await GrantAssignment.insertMany(assignmentRows);
    }

    // Reload with associations
    const fullGrant = await Grant.findOne({ id: grant.id })
      .populate('deadlines');
    
    const assignments = await GrantAssignment.find({ grantId: grant.id });
    const userIds = assignments.map(a => a.userId);
    const assignedToUsers = await User.find({ id: { $in: userIds } }).select('id name email');

    // Audit log
    await AuditLog.create({
      id: crypto.randomUUID(),
      userId: req.user.id,
      action: 'UPDATE_GRANT',
      entity: 'Grant',
      entityId: grant.id,
      details: `Grant "${grant.title}" updated`
    });

    res.json({
      success: true,
      message: 'Grant updated successfully',
      data: {
        ...fullGrant.toObject(),
        assignedTo: assignedToUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/grants/:id
 * @desc    Delete a grant
 * @access  Private/Admin
 */
const deleteGrant = async (req, res, next) => {
  try {
    const grant = await Grant.findOne({ id: req.params.id });

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant not found'
      });
    }

    const grantTitle = grant.title;
    const grantId = grant.id;

    // Delete associated records
    await GrantDeadline.deleteMany({ grantId });
    await GrantAssignment.deleteMany({ grantId });
    await Fund.deleteMany({ grantId });
    await Grant.deleteOne({ id: grantId });

    // Audit log
    await AuditLog.create({
      id: uuidv4(),
      userId: req.user.id,
      action: 'DELETE_GRANT',
      entity: 'Grant',
      entityId: grantId,
      details: `Grant "${grantTitle}" deleted`
    });

    res.json({
      success: true,
      message: 'Grant deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getPublicGrant = async (req, res, next) => {
  try {
    const grant = await Grant.findOne({ id: req.params.id })
      .select('title agency summary complianceIntelligenceReport publicShareLink');

    if (!grant) {
      return res.status(404).json({ success: false, message: 'Public package not found' });
    }

    const documents = await require('../models').VendorDocument.find({ 
      grantId: grant.id, 
      status: 'Approved' 
    }).populate('vendor', 'name');

    res.json({
      success: true,
      data: {
        grant,
        documents
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createGrant, getGrants, getGrant, updateGrant, deleteGrant, getPublicGrant };
