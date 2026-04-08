const { Grant, Fund, Expense, AuditLog, User, GrantAssignment } = require('../models');

/**
 * @route   GET /api/dashboard/summary
 * @desc    Get dashboard summary — role-aware
 * @access  Private
 */
const getSummary = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.id;

    if (isAdmin) {
      // ── ADMIN: see all data ────────────────────────────────────────
      const totalGrants = await Grant.countDocuments();
      const activeGrants = await Grant.countDocuments({ status: 'Active' });

      const fundAgg = await Fund.aggregate([
        {
          $group: {
            _id: null,
            totalAllocated: { $sum: '$allocatedAmount' },
            totalSpent: { $sum: '$spentAmount' }
          }
        }
      ]);
      const totalAllocated = fundAgg.length > 0 ? fundAgg[0].totalAllocated : 0;
      const totalSpent = fundAgg.length > 0 ? fundAgg[0].totalSpent : 0;

      const expenseAgg = await Expense.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total: { $sum: '$amount' }
          }
        }
      ]);
      const expenseStats = { pending: { count: 0, total: 0 }, approved: { count: 0, total: 0 }, rejected: { count: 0, total: 0 } };
      expenseAgg.forEach(item => {
        const statusKey = item._id.toLowerCase();
        if (expenseStats[statusKey]) {
          expenseStats[statusKey] = { count: item.count, total: item.total };
        }
      });

      const fundByCategory = await Fund.aggregate([
        {
          $group: {
            _id: '$category',
            allocated: { $sum: '$allocatedAmount' },
            spent: { $sum: '$spentAmount' }
          }
        },
        { $sort: { allocated: -1 } }
      ]);

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const monthlySpending = await Expense.aggregate([
        {
          $match: {
            status: 'Approved',
            createdAt: { $gte: sixMonthsAgo }
          }
        },
        {
          $project: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            amount: 1
          }
        },
        {
          $group: {
            _id: { year: '$year', month: '$month' },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      const recentActivities = await AuditLog.find()
        .populate('user', 'id name')
        .sort({ createdAt: -1 })
        .limit(10);
      
      const recentActivitiesMapped = recentActivities.map(a => {
        const json = a.toObject();
        json.userId = json.user;
        delete json.user;
        return json;
      });

      // Grant summary with fund totals
      const grants = await Grant.find()
        .populate('funds')
        .sort({ createdAt: -1 });
      
      const grantSummary = grants.map(g => {
        const json = g.toObject();
        const totalAlloc = (json.funds || []).reduce((s, f) => s + f.allocatedAmount, 0);
        const totalSp = (json.funds || []).reduce((s, f) => s + f.spentAmount, 0);
        return {
          _id: json.id,
          title: json.title,
          amount: json.amount,
          status: json.status,
          totalAllocated: totalAlloc,
          totalSpent: totalSp
        };
      }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

      return res.json({
        success: true,
        role: 'admin',
        data: {
          overview: { 
            totalGrants, 
            activeGrants, 
            totalAllocated, 
            totalSpent, 
            remainingFunds: totalAllocated - totalSpent, 
            utilizationRate: totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(1) : 0 
          },
          expenseStats,
          fundByCategory,
          monthlySpending: monthlySpending,
          recentActivities: recentActivitiesMapped,
          grantSummary
        }
      });

    } else {
      // ── SUBRECIPIENT: see only their assigned grants/expenses ──────
      const assignments = await GrantAssignment.find({ userId });
      const grantIds = assignments.map(a => a.grantId);

      const totalGrants = grantIds.length;
      const activeGrantsCount = await Grant.countDocuments({ id: { $in: grantIds }, status: 'Active' });

      const fundAgg = await Fund.aggregate([
        { $match: { grantId: { $in: grantIds } } },
        {
          $group: {
            _id: null,
            totalAllocated: { $sum: '$allocatedAmount' },
            totalSpent: { $sum: '$spentAmount' }
          }
        }
      ]);
      const totalAllocated = fundAgg.length > 0 ? fundAgg[0].totalAllocated : 0;
      const totalSpent = fundAgg.length > 0 ? fundAgg[0].totalSpent : 0;

      const expenseAgg = await Expense.aggregate([
        { $match: { submittedBy: userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total: { $sum: '$amount' }
          }
        }
      ]);
      const expenseStats = { pending: { count: 0, total: 0 }, approved: { count: 0, total: 0 }, rejected: { count: 0, total: 0 } };
      expenseAgg.forEach(item => {
        const statusKey = item._id.toLowerCase();
        if (expenseStats[statusKey]) {
          expenseStats[statusKey] = { count: item.count, total: item.total };
        }
      });

      const fundByCategory = await Fund.aggregate([
        { $match: { grantId: { $in: grantIds } } },
        {
          $group: {
            _id: '$category',
            allocated: { $sum: '$allocatedAmount' },
            spent: { $sum: '$spentAmount' }
          }
        },
        { $sort: { allocated: -1 } }
      ]);

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const monthlySpending = await Expense.aggregate([
        {
          $match: {
            submittedBy: userId,
            status: 'Approved',
            createdAt: { $gte: sixMonthsAgo }
          }
        },
        {
          $project: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            amount: 1
          }
        },
        {
          $group: {
            _id: { year: '$year', month: '$month' },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      const grants = await Grant.find({ id: { $in: grantIds } })
        .populate('funds')
        .sort({ createdAt: -1 });
      
      const grantSummary = grants.map(g => {
        const json = g.toObject();
        const totalAlloc = (json.funds || []).reduce((s, f) => s + f.allocatedAmount, 0);
        const totalSp = (json.funds || []).reduce((s, f) => s + f.spentAmount, 0);
        return {
          _id: json.id,
          title: json.title,
          amount: json.amount,
          status: json.status,
          totalAllocated: totalAlloc,
          totalSpent: totalSp
        };
      }).sort((a, b) => b.totalSpent - a.totalSpent);

      const recentActivities = await AuditLog.find({ userId })
        .populate('user', 'id name')
        .sort({ createdAt: -1 })
        .limit(5);
      
      const recentActivitiesMapped = recentActivities.map(a => {
        const json = a.toObject();
        json.userId = json.user;
        delete json.user;
        return json;
      });

      return res.json({
        success: true,
        role: 'subrecipient',
        data: {
          overview: {
            totalGrants,
            activeGrants: activeGrantsCount,
            totalAllocated,
            totalSpent,
            remainingFunds: totalAllocated - totalSpent,
            utilizationRate: totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(1) : 0
          },
          expenseStats,
          fundByCategory,
          monthlySpending,
          recentActivities: recentActivitiesMapped,
          grantSummary
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { getSummary };
