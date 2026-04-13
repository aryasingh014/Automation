// ============================================
// Scraper Routes
// ============================================

const express = require('express');
const { triggerSync } = require('../controllers/scraperController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Only Admins can manually trigger a scrape
router.post('/sync', protect, authorize('admin'), triggerSync);

module.exports = router;
