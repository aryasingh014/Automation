const { Fund, Grant, AuditLog } = require('../models');
const crypto = require('crypto');

/**
 * @route   POST /api/funds
 * @desc    Allocate a fund to a grant
 * @access  Private/Admin
 */
const createFund = async (req, res, next) => {
  try {
    const { grantId, category, allocatedAmount } = req.body;

    // Verify grant exists
    const grant = await Grant.findOne({ id: grantId });
    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant not found'
      });
    }

    // Check total allocation doesn't exceed grant amount
    const existingFunds = await Fund.find({ grantId });
    const currentAllocation = existingFunds.reduce((sum, f) => sum + f.allocatedAmount, 0);

    if (currentAllocation + allocatedAmount > grant.amount) {
      return res.status(400).json({
        success: false,
        message: `Allocation exceeds grant budget. Available: $${(grant.amount - currentAllocation).toFixed(2)}`
      });
    }

    const fund = await Fund.create({ id: crypto.randomUUID(), grantId, category, allocatedAmount });

    // Audit log
    await AuditLog.create({
      id: crypto.randomUUID(),
      userId: req.user.id,
      action: 'CREATE_FUND',
      entity: 'Fund',
      entityId: fund.id,
      details: `Fund allocated: $${allocatedAmount} for ${category} under grant "${grant.title}"`
    });

    res.status(201).json({
      success: true,
      message: 'Fund allocated successfully',
      data: fund
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/funds/:grantId
 * @desc    Get all funds for a grant
 * @access  Private
 */
const getFundsByGrant = async (req, res, next) => {
  try {
    const funds = await Fund.find({ grantId: req.params.grantId })
      .sort({ category: 1 });

    const totalAllocated = funds.reduce((sum, f) => sum + f.allocatedAmount, 0);
    const totalSpent = funds.reduce((sum, f) => sum + f.spentAmount, 0);

    res.json({
      success: true,
      count: funds.length,
      summary: {
        totalAllocated,
        totalSpent,
        remaining: totalAllocated - totalSpent
      },
      data: funds
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/funds/:id
 * @desc    Update a fund allocation
 * @access  Private/Admin
 */
const updateFund = async (req, res, next) => {
  try {
    const fund = await Fund.findOne({ id: req.params.id });
    if (!fund) {
      return res.status(404).json({
        success: false,
        message: 'Fund not found'
      });
    }

    // If updating allocatedAmount, validate against grant
    if (req.body.allocatedAmount) {
      const grant = await Grant.findOne({ id: fund.grantId });
      const otherFunds = await Fund.find({
        grantId: fund.grantId,
        id: { $ne: fund.id }
      });
      const otherAllocation = otherFunds.reduce((sum, f) => sum + f.allocatedAmount, 0);

      if (otherAllocation + req.body.allocatedAmount > grant.amount) {
        return res.status(400).json({
          success: false,
          message: `Allocation exceeds grant budget. Available: $${(grant.amount - otherAllocation).toFixed(2)}`
        });
      }
    }

    const updatedFund = await Fund.findOneAndUpdate(
       { id: req.params.id },
       req.body,
       { new: true, runValidators: true }
    );

    // Audit log
    await AuditLog.create({
      id: crypto.randomUUID(),
      userId: req.user.id,
      action: 'UPDATE_FUND',
      entity: 'Fund',
      entityId: fund.id,
      details: `Fund ${fund.category} updated`
    });

    res.json({
      success: true,
      message: 'Fund updated successfully',
      data: updatedFund
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createFund, getFundsByGrant, updateFund };
