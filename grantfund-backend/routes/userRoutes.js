// ============================================
// User Routes
// ============================================

const express = require('express');
const router = express.Router();
const { getUsers, assignUserToGrant } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', authorize('admin'), getUsers);
router.put('/:grantId/assign', authorize('admin'), assignUserToGrant);

module.exports = router;
