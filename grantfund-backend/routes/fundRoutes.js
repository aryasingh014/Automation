// ============================================
// Fund Routes
// ============================================

const express = require('express');
const router = express.Router();
const { createFund, getFundsByGrant, updateFund } = require('../controllers/fundController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/', authorize('admin'), createFund);
router.get('/:grantId', getFundsByGrant);
router.put('/:id', authorize('admin'), updateFund);

module.exports = router;
