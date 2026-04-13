const { Expense, Fund, Grant, Notification, AuditLog, User } = require('../models');
const crypto = require('crypto');

/**
 * @route   POST /api/expenses
 * @desc    Submit a new expense
 * @access  Private
 */
const submitExpense = async (req, res, next) => {
  try {
    const { grantId, fundId, amount, description } = req.body;

    // 1. Validate grant exists and is active
    const grant = await Grant.findOne({ id: grantId });
    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant not found'
      });
    }

    const now = new Date();
    if (now < grant.startDate || now > grant.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Grant is not within its active period'
      });
    }

    if (grant.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: `Grant is ${grant.status}. Only active grants accept expenses.`
      });
    }

    // 2. Validate fund exists and belongs to this grant
    const fund = await Fund.findOne({ id: fundId });
    if (!fund || fund.grantId !== grantId) {
      return res.status(404).json({
        success: false,
        message: 'Fund not found for this grant'
      });
    }

    // 3. Validate expense doesn't exceed remaining budget
    const remaining = fund.allocatedAmount - fund.spentAmount;
    if (amount > remaining) {
      return res.status(400).json({
        success: false,
        message: `Expense exceeds remaining fund balance. Available: $${remaining.toFixed(2)}`,
        overspending: true
      });
    }

    // 4. Create expense
    const expenseData = {
      id: crypto.randomUUID(),
      grantId,
      fundId,
      submittedBy: req.user.id,
      amount,
      description
    };

    // Handle receipt upload
    if (req.file) {
      expenseData.receipt = req.file.path;
    }

    const expense = await Expense.create(expenseData);

    // 5. Notify all admins
    const admins = await User.find({ role: 'admin' });
    const notifications = admins.map(admin => ({
      id: crypto.randomUUID(),
      userId: admin.id,
      message: `New expense of $${amount} submitted by ${req.user.name} for grant "${grant.title}"`,
      type: 'info',
      link: `/expenses`
    }));
    await Notification.insertMany(notifications);

    // 6. Audit log
    await AuditLog.create({
      id: crypto.randomUUID(),
      userId: req.user.id,
      action: 'SUBMIT_EXPENSE',
      entity: 'Expense',
      entityId: expense.id,
      details: `Expense of $${amount} submitted for "${grant.title}" — ${fund.category}`
    });

    res.status(201).json({
      success: true,
      message: 'Expense submitted successfully',
      data: expense
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/expenses
 * @desc    Get all expenses (admin sees all, subrecipient sees own)
 * @access  Private
 */
const getExpenses = async (req, res, next) => {
  try {
    const filter = {};

    // Subrecipients only see their own expenses
    if (req.user.role === 'subrecipient') {
      filter.submittedBy = req.user.id;
    }

    // Optional filters
    if (req.query.grantId) filter.grantId = req.query.grantId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.fundId) filter.fundId = req.query.fundId;

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate);
    }

    const expenses = await Expense.find(filter)
      .populate('grant')
      .populate('fund')
      .populate('submitter')
      .populate('reviewer')
      .sort({ createdAt: -1 });

    // Remap the association keys to match the original API response shape
    const mapped = expenses.map(e => {
      const json = e.toObject();
      json.grantId = json.grant;
      json.fundId = json.fund;
      json.submittedBy = json.submitter;
      json.reviewedBy = json.reviewer;
      delete json.grant;
      delete json.fund;
      delete json.submitter;
      delete json.reviewer;
      return json;
    });

    res.json({
      success: true,
      count: mapped.length,
      data: mapped
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/expenses/:id
 * @desc    Approve or reject an expense
 * @access  Private/Admin
 */
const approveRejectExpense = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either Approved or Rejected'
      });
    }

    const expense = await Expense.findOne({ id: req.params.id });
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    if (expense.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Expense has already been ${expense.status.toLowerCase()}`
      });
    }

    // If approving, update the fund's spent amount
    if (status === 'Approved') {
      const fund = await Fund.findOne({ id: expense.fundId });
      if (!fund) {
        return res.status(404).json({
          success: false,
          message: 'Associated fund not found'
        });
      }

      // Double-check budget
      const remaining = fund.allocatedAmount - fund.spentAmount;
      if (expense.amount > remaining) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve — expense exceeds remaining budget ($${remaining.toFixed(2)})`,
          overspending: true
        });
      }

      // Update spent amount
      fund.spentAmount += expense.amount;
      await fund.save();

      // Check if overspending threshold reached (>80%)
      const usagePercent = (fund.spentAmount / fund.allocatedAmount) * 100;
      if (usagePercent >= 80) {
        const admins = await User.find({ role: 'admin' });
        const warningNotifications = admins.map(admin => ({
          id: crypto.randomUUID(),
          userId: admin.id,
          message: `⚠️ Fund "${fund.category}" is at ${usagePercent.toFixed(1)}% usage for associated grant`,
          type: 'warning'
        }));
        await Notification.insertMany(warningNotifications);
      }
    }

    // Update expense status
    const updatedExpense = await Expense.findOneAndUpdate(
      { id: req.params.id },
      {
        status,
        reviewedBy: req.user.id,
        reviewNote: reviewNote || '',
        reviewedAt: new Date()
      },
      { new: true }
    );

    // Notify the submitter
    await Notification.create({
      id: crypto.randomUUID(),
      userId: expense.submittedBy,
      message: `Your expense of $${expense.amount} has been ${status.toLowerCase()}${reviewNote ? `: ${reviewNote}` : ''}`,
      type: status === 'Approved' ? 'success' : 'error',
      link: '/expenses'
    });

    // Audit log
    await AuditLog.create({
      id: crypto.randomUUID(),
      userId: req.user.id,
      action: status === 'Approved' ? 'APPROVE_EXPENSE' : 'REJECT_EXPENSE',
      entity: 'Expense',
      entityId: expense.id,
      details: `Expense of $${expense.amount} ${status.toLowerCase()} by ${req.user.name}`
    });

    res.json({
      success: true,
      message: `Expense ${status.toLowerCase()} successfully`,
      data: updatedExpense
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitExpense, getExpenses, approveRejectExpense };
