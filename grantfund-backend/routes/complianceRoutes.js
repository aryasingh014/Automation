const express = require('express');
const router = express.Router();
const { 
  getVendors, createVendor, getCheckpoints, createCheckpoint, 
  requestVendorDocument, getVendorDocuments, approveDocument 
} = require('../controllers/complianceController');
const { protect, authorize } = require('../middleware/auth');

// Vendor Routes
router.get('/vendors', protect, getVendors);
router.post('/vendors', protect, authorize('admin'), createVendor);

// Compliance Checkpoint Routes
router.get('/checkpoints/:grantId', protect, getCheckpoints);
router.post('/checkpoints', protect, authorize('admin'), createCheckpoint);

// Vendor Document Routes
router.get('/documents/:grantId', protect, getVendorDocuments);
router.post('/documents/request', protect, authorize('admin'), requestVendorDocument);
router.post('/documents/submit', protect, require('../middleware/upload').uploadContract.single('file'), require('../controllers/complianceController').submitVendorDocument);
router.patch('/documents/:documentId', protect, authorize('admin'), approveDocument);
router.post('/sync-vendor', protect, authorize('admin'), require('../controllers/automationController').triggerVendorSync);
router.post('/consolidate/:grantId', protect, authorize('admin'), require('../controllers/complianceController').consolidatePackage);
router.post('/share/:grantId', protect, authorize('admin'), require('../controllers/complianceController').sharePackage);

module.exports = router;
