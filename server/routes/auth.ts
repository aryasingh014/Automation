import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect, adminOnly, AuthRequest } from '../middleware/authMiddleware.js';

const router = express.Router();

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, department } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      if (userExists.status === 'pending') {
        return res.status(400).json({ message: 'Registration pending approval. Please wait for admin to review.' });
      }
      if (userExists.status === 'rejected') {
        return res.status(400).json({ message: `Registration rejected. Reason: ${userExists.rejectionReason || 'No reason provided'}` });
      }
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ 
      email, 
      password, 
      name,
      department,
      role: 'user',
      status: 'pending',
      isActive: false
    });

    res.status(201).json({
      message: 'Registration successful! Your account is pending approval. An admin will review your request.',
      status: 'pending'
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user: any = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ 
        status: 'pending',
        message: 'Your account is pending approval. Please wait for admin to review your request.' 
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ 
        status: 'rejected',
        message: `Your account was rejected. Reason: ${user.rejectionReason || 'No reason provided'}` 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        status: 'inactive',
        message: 'Your account has been deactivated. Please contact admin.' 
      });
    }

    res.json({
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      token: generateToken(user._id.toString()),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/me', protect, async (req: AuthRequest, res) => {
  if (req.user) {
    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status,
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

router.get('/admin/users', protect, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { status, role } = req.query;
    const filter: any = {};
    
    if (status) filter.status = status;
    if (role) filter.role = role;

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/admin/pending-count', protect, adminOnly, async (req: AuthRequest, res) => {
  try {
    const count = await User.countDocuments({ status: 'pending' });
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/admin/approve/:userId', protect, adminOnly, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = 'approved';
    user.isActive = true;
    user.approvedAt = new Date();
    user.approvedBy = req.user._id as any;
    await user.save();

    res.json({ message: 'User approved successfully', user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/admin/reject/:userId', protect, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = 'rejected';
    user.rejectedAt = new Date();
    user.rejectedBy = req.user._id as any;
    user.rejectionReason = reason || 'No reason provided';
    await user.save();

    res.json({ message: 'User rejected', user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/admin/users/:userId', protect, adminOnly, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/admin/users/:userId/role', protect, adminOnly, async (req: AuthRequest, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.json({ message: 'User role updated', user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/seed-admin', async (req, res) => {
  try {
    const { email, secret } = req.body;
    
    if (secret !== 'make_me_admin_2024') {
      return res.status(403).json({ message: 'Invalid secret' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = 'admin';
    user.status = 'approved';
    user.isActive = true;
    user.approvedAt = new Date();
    await user.save();

    res.json({ message: 'User is now admin', user: { email: user.email, role: user.role } });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
