// ============================================
// Historical Routes
// ============================================

const express = require('express');
const router = express.Router();
const { getAllHistorical, createHistorical, deleteHistorical } = require('../controllers/historicalController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getAllHistorical)
  .post(authorize('admin'), createHistorical);

router.route('/:id')
  .delete(authorize('admin'), deleteHistorical);

module.exports = router;
