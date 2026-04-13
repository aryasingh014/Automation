const express = require('express');
const router = express.Router();
const { suggestGrants, saveProposal, suggestContextual, generateFullProposal, analyzeComplianceRequirements, getSavedProposals } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/ai...
 */
router.post('/suggest', protect, suggestGrants);
router.post('/suggest-contextual', protect, suggestContextual);
router.post('/save-proposal', protect, saveProposal);
router.get('/proposals', protect, getSavedProposals);
router.post('/generate-full', protect, generateFullProposal);
router.post('/analyze-compliance', protect, analyzeComplianceRequirements);

module.exports = router;
