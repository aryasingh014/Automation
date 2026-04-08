// ============================================
// complianceController.js — Adding automation trigger
// ============================================

const { Vendor, VendorDocument, AuditLog } = require('../models');
const { runPortalSync } = require('../services/automationService');
const crypto = require('crypto');

/**
 * @route   POST /api/compliance/sync-vendor
 * @desc    Trigger autonomous document collection for a vendor
 * @access  Private/Admin
 */
const triggerVendorSync = async (req, res, next) => {
  try {
    const { vendorId, documentType } = req.body;
    const vendor = await Vendor.findOne({ id: vendorId });
    
    if (!vendor || !vendor.portalUrl) {
      return res.status(400).json({ success: false, message: 'Vendor portal URL not configured' });
    }

    // Process sync in background (or await for demo)
    const doc = await runPortalSync(vendor, documentType || 'Standard Compliance Doc');

    await AuditLog.create({
      id: crypto.randomUUID(),
      userId: req.user.id,
      action: 'VENDOR_AUTO_SYNC',
      entity: 'VendorDocument',
      entityId: doc.id,
      details: `Triggered autonomous collection of ${documentType} from ${vendor.name}`
    });

    res.json({
      success: true,
      message: 'Autonomous collection complete',
      data: doc
    });

  } catch (error) {
    next(error);
  }
};

module.exports = { triggerVendorSync };
