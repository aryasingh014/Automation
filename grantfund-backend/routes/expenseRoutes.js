// ============================================
// Expense Routes
// ============================================

const express = require('express');
const router = express.Router();
const { submitExpense, getExpenses, approveRejectExpense } = require('../controllers/expenseController');
const { protect, authorize } = require('../middleware/auth');
const { uploadReceipt } = require('../middleware/upload');

router.use(protect);

router.route('/')
  .get(getExpenses)
  .post(uploadReceipt.single('receipt'), submitExpense);

router.patch('/:id', authorize('admin'), approveRejectExpense);

module.exports = router;
