import express from 'express';
import mongoose from 'mongoose';
import LlmUsage from '../models/LlmUsage.js';
import LlmConfig from '../models/LlmConfig.js';
import { protect, adminOnly, AuthRequest } from '../middleware/authMiddleware.js';

const router = express.Router();

const isDbReady = () => mongoose.connection.readyState === 1;

// Log usage - Protected but accessible by any logged-in user
router.post('/usage', protect, async (req: AuthRequest, res) => {
  if (!isDbReady()) return res.status(503).json({ message: 'DB Unavailable' });
  
  try {
    const { provider, model, inputTokens, outputTokens, cost } = req.body;
    
    if (!provider || !model) {
      return res.status(400).json({ message: 'Provider and model are required' });
    }

    const usage = await LlmUsage.create({
      userId: req.user._id,
      userName: req.user.name || 'Unknown User',
      email: req.user.email || 'unknown@example.com',
      provider,
      model,
      inputTokens: parseInt(inputTokens) || 0,
      outputTokens: parseInt(outputTokens) || 0,
      cost: parseFloat(cost) || 0,
      timestamp: new Date()
    });

    res.status(201).json(usage);
  } catch (error: any) {
    console.error('[LLM] Usage tracking error:', error.message, 'Data:', req.body);
    res.status(500).json({ message: error.message });
  }
});

// Get provider comparison stats - Admin only
router.get('/providers', protect, adminOnly, async (req, res) => {
  try {
    const stats = await LlmUsage.aggregate([
      {
        $group: {
          _id: { provider: '$provider', model: '$model' },
          totalRequests: { $sum: 1 },
          totalInputTokens: { $sum: '$inputTokens' },
          totalOutputTokens: { $sum: '$outputTokens' },
          totalCost: { $sum: '$cost' },
          lastUsed: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          _id: 0,
          provider: '$_id.provider',
          model: '$_id.model',
          totalRequests: 1,
          totalInputTokens: 1,
          totalOutputTokens: 1,
          totalCost: 1,
          lastUsed: 1
        }
      }
    ]);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get per-user usage stats - Admin only
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const stats = await LlmUsage.aggregate([
      {
        $group: {
          _id: { userId: '$userId', model: '$model', provider: '$provider' },
          userName: { $first: '$userName' },
          email: { $first: '$email' },
          requests: { $sum: 1 },
          inputTokens: { $sum: '$inputTokens' },
          outputTokens: { $sum: '$outputTokens' },
          cost: { $sum: '$cost' },
          lastUsed: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          _id: 0,
          userId: '$_id.userId',
          provider: '$_id.provider',
          model: '$_id.model',
          userName: 1,
          email: 1,
          requests: 1,
          inputTokens: 1,
          outputTokens: 1,
          cost: 1,
          lastUsed: 1
        }
      }
    ]);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get/Update pricing & limits - Admin only
router.get('/pricing', protect, adminOnly, async (req, res) => {
  try {
    const configs = await LlmConfig.find();
    res.json(configs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/pricing', protect, adminOnly, async (req, res) => {
  try {
    const { provider, model, inputCost, outputCost, tokenLimit, rateLimit } = req.body;
    
    // Upsert pricing config
    const config = await LlmConfig.findOneAndUpdate(
      { provider, model },
      { inputCost, outputCost, tokenLimit, rateLimit },
      { upsert: true, returnDocument: 'after' }
    );
    
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Check if quota allows a request
router.get('/check-quota/:provider/:model', protect, async (req, res) => {
  try {
    const { provider, model } = req.params;
    
    // 1. Get Config
    const config = await LlmConfig.findOne({ provider, model });
    if (!config || config.tokenLimit === 0) {
      return res.json({ allowed: true });
    }

    // 2. Get Current Usage (aggregated for this provider/model)
    const usage = await LlmUsage.aggregate([
      { $match: { provider, model } },
      { $group: { _id: null, totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } } } }
    ]);

    const currentTokens = usage.length > 0 ? usage[0].totalTokens : 0;

    if (currentTokens >= config.tokenLimit) {
      return res.json({ 
        allowed: false, 
        reason: `Monthly token limit (${config.tokenLimit}) for ${provider} ${model} has been reached.`,
        current: currentTokens,
        limit: config.tokenLimit
      });
    }

    res.json({ allowed: true, current: currentTokens, limit: config.tokenLimit });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
