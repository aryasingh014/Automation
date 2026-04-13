import express from 'express';
import OnboardingRequest from '../models/OnboardingRequest.js';
import { protect, adminOnly, AuthRequest } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/request', protect, async (req: AuthRequest, res) => {
  try {
    const { appName, tier, owner, environment } = req.body;
    
    if (!appName || !tier || !owner || !environment) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const request = await OnboardingRequest.create({
      appName,
      tier,
      owner,
      environment,
      status: 'pending',
      requestedBy: req.user._id
    });

    res.status(201).json({
      message: 'Onboarding request submitted. Pending admin approval.',
      request
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/requests', protect, async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    const filter: any = {};
    
    if (status) filter.status = status;

    const requests = await OnboardingRequest.find(filter)
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/pending-count', protect, async (req: AuthRequest, res) => {
  try {
    const count = await OnboardingRequest.countDocuments({ status: 'pending' });
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/approve/:id', protect, adminOnly, async (req: AuthRequest, res) => {
  try {
    const request = await OnboardingRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    request.status = 'approved';
    request.approvedAt = new Date();
    request.approvedBy = req.user._id as any;
    await request.save();

    res.json({ message: 'Onboarding approved', request });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reject/:id', protect, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    const request = await OnboardingRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    request.status = 'rejected';
    request.rejectedAt = new Date();
    request.rejectedBy = req.user._id as any;
    request.rejectionReason = reason || 'No reason provided';
    await request.save();

    res.json({ message: 'Onboarding rejected', request });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req: AuthRequest, res) => {
  try {
    const request = await OnboardingRequest.findByIdAndDelete(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    res.json({ message: 'Request deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;