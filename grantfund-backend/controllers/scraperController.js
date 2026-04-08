// ============================================
// Scraper Controller — Triggers the Python Sync
// ============================================

const { runPythonScraper } = require('../services/scraperService');

/**
 * @route   POST /api/scraper/sync
 * @desc    Manually trigger the TxDOT Web Scraper to sync new grants
 * @access  Private/Admin
 */
const triggerSync = async (req, res, next) => {
  try {
    // We launch the scraper asynchronously and respond immediately
    // so the frontend doesn't timeout during a long crawl.
    
    runPythonScraper()
      .then(() => {
        console.log('✅ Manual Scraper Sync Completed.');
      })
      .catch((err) => {
        console.error('❌ Manual Scraper Sync Error:', err);
      });

    res.json({
      success: true,
      message: 'Scraper sync process has been initiated in the background'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { triggerSync };
