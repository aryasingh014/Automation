// ============================================
// HistoricalGrant Controller — Managing past wins
// ============================================

const { HistoricalGrant, AuditLog } = require('../models');
const crypto = require('crypto');

/**
 * @route   GET /api/historical
 * @desc    Get all historical corpus entries
 * @access  Private
 */
const getAllHistorical = async (req, res, next) => {
  try {
    const records = await HistoricalGrant.find().sort({ yearAwarded: -1 });
    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/historical
 * @desc    Create new historical entry
 * @access  Private/Admin
 */
const createHistorical = async (req, res, next) => {
  try {
    const { title, grantor, amount, yearAwarded, content, keywords } = req.body;
    
    const record = await HistoricalGrant.create({
      id: crypto.randomUUID(),
      title,
      grantor,
      amount,
      yearAwarded,
      content,
      keywords,
      addedBy: req.user.id
    });

    await AuditLog.create({
      id: crypto.randomUUID(),
      userId: req.user.id,
      action: 'ADD_HISTORICAL',
      entity: 'HistoricalGrant',
      entityId: record.id,
      details: `Added historical grant "${title}"`
    });

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/historical/:id
 * @desc    Delete entry
 * @access  Private/Admin
 */
const deleteHistorical = async (req, res, next) => {
  try {
    const record = await HistoricalGrant.findOneAndDelete({ id: req.params.id });
    if (!record) return res.status(404).json({ success: false, message: 'Not found' });

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllHistorical,
  createHistorical,
  deleteHistorical
};
