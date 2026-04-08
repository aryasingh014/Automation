// ============================================
// Global Chatbot Controller
// Powered by Grok (xAI)
// ============================================

const SYSTEM_PROMPT = `You are GrantHub Assistant, an enterprise-level AI consultant for the Grant Management System (GMS).
Role: Provide clear, professional, and actionable assistance to users.

FORMATTING RULES:
1. NO MARKDOWN: Never use bold (**) or asterisks (*) for bullet points.
2. PROFESSIONAL STRUCTURE: Use formal section headers in ALL CAPS.
3. LISTS: Use numbered lists (1., 2., 3.) instead of bullets.
4. TONE: Maintain a professional, enterprise-level, and helpful tone.
5. ACCURACY: Be concise and accurate. If data is unavailable, guide the user to the correct app module.`;

/**
 * @route   POST /api/chatbot/ask
 * @desc    Get response from global chatbot (Grok)
 * @access  Public (no auth required for global help)
 */
const Groq = require('groq-sdk');

/**
 * @route   POST /api/chatbot/ask
 * @desc    Get response from global chatbot (Groq)
 * @access  Public (no auth required for global help)
 */
const askChatbot = async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    // Build messages from history + current message
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...((history || []).map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: String(h.content)
      }))),
      { role: 'user', content: message.trim() }
    ];

    console.log('🤖 [Chatbot] Using Groq SDK (Llama 3.3)...');
    
    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || "";

    return res.json({
      success: true,
      response: responseText,
      model: 'llama-3.3-70b-versatile'
    });

  } catch (error) {
    console.error('Chatbot Error:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred in the AI service',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/chatbot/health
 * @desc    Check chatbot service health
 * @access  Public
 */
const checkChatbotHealth = async (req, res, next) => {
  return res.json({
    success: true,
    message: 'Groq (Llama 3.3) service is configured and ready',
    model: 'llama-3.3-70b-versatile',
    configured: true
  });
};

module.exports = { askChatbot, checkChatbotHealth };