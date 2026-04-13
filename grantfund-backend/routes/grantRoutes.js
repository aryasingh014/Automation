// ============================================
// Grant Routes
// ============================================

const express = require('express');
const router = express.Router();
const { createGrant, getGrants, getGrant, updateGrant, deleteGrant, getPublicGrant } = require('../controllers/grantController');
const { protect, authorize } = require('../middleware/auth');
const { uploadContract } = require('../middleware/upload');

// Public routes
router.get('/public/:id', getPublicGrant);

// All other routes are protected
router.use(protect);

router.route('/')
  .get(getGrants)
  .post(authorize('admin'), uploadContract.single('contractFile'), createGrant);

router.route('/:id')
  .get(getGrant)
  .put(authorize('admin'), uploadContract.single('contractFile'), updateGrant)
  .delete(authorize('admin'), deleteGrant);

module.exports = router;
