import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { protect, adminOnly, AuthRequest } from '../middleware/authMiddleware.js';

const router = express.Router();

const isDbReady = () => mongoose.connection.readyState === 1;

/** Embed role + email so the auth middleware can reconstruct a user without a DB round-trip */
const generateToken = (id: string, role: string, email: string) => {
  return jwt.sign(
    { id, role, email },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '30d' }
  );
};

router.post('/register', async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ message: 'Database unavailable. Registration is not possible in limited mode.' });
  }
  try {
    const { email, password, name, department } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(password)) {
      console.log(`[Auth] Registration failed: Password strength (no number) for ${email}`);
      return res.status(400).json({ message: 'Password must contain at least one number' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      if (userExists.status === 'approved') {
        console.log(`[Auth] Registration failed: User ${email} already exists and is approved`);
        return res.status(400).json({ message: 'User already exists and is already approved. Please login.' });
      }

      console.log(`[Auth] Re-registering user ${email} (Previous status: ${userExists.status})`);
      
      // Update existing user record and reset to pending
      userExists.name = name;
      userExists.password = password; // Pre-save middleware will hash it
      userExists.department = department;
      userExists.status = 'pending';
      userExists.rejectionReason = undefined;
      userExists.rejectedAt = undefined;
      userExists.rejectedBy = undefined;
      userExists.isActive = false;
      userExists.requestedAt = new Date();
      
      await userExists.save();

      return res.status(201).json({
        message: 'Registration successful! Your account is pending approval. An admin will review your request.',
        status: 'pending'
      });
    }

    console.log(`[Auth] Creating new user: ${email}`);

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
  if (!isDbReady()) {
    return res.status(503).json({ message: 'Database unavailable. Login is not possible in limited mode.' });
  }
  try {
    const { email, password } = req.body;
    
    const query: any = {
      $or: [
        { email: email },
        { name: email },
        ...(mongoose.Types.ObjectId.isValid(email) ? [{ _id: email }] : [])
      ]
    };

    const user: any = await User.findOne(query);

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
      token: generateToken(user._id.toString(), user.role, user.email),
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

    const { Notification } = await import('../models/Telemetry.js');
    if (Notification) {
      await Notification.create({
        type: 'email',
        recipient: user.name || 'User',
        recipientEmail: user.email,
        message: `Your account has been approved by the admin. You can now log in to the platform.`,
        subject: 'Account Approved',
        status: 'sent',
        sentAt: new Date()
      });
    }

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

router.get('/my-notifications', protect, async (req: AuthRequest, res) => {
  try {
    const { Notification } = await import('../models/Telemetry.js');
    if (!Notification) {
      return res.json([]);
    }
    const notifications = await Notification.find({ recipientEmail: req.user.email })
      .sort({ sentAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error: any) {
    console.error('[Auth] Failed to fetch notifications:', error);
    res.json([]);
  }
});

export default router;
