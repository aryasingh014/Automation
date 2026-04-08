// ============================================
// Global Chatbot Routes
// ============================================

const express = require('express');
const router = express.Router();
const { askChatbot, checkChatbotHealth } = require('../controllers/chatbotController');

// Public routes - no authentication required for global chatbot
router.post('/ask', askChatbot);
router.get('/health', checkChatbotHealth);

module.exports = router;