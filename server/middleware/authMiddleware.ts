import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

export interface AuthRequest extends Request {
  user?: any;
}

/** Returns true when mongoose has an active connection */
const isDbReady = () => mongoose.connection.readyState === 1;

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.headers.authorization?.startsWith('Bearer')) {
    console.warn('[Auth] No token provided in headers');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token = req.headers.authorization.split(' ')[1];
    console.log('[Auth] Verifying token...');
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    if (isDbReady()) {
      // Normal path: look up the user from MongoDB
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        console.warn(`[Auth] User not found for ID: ${decoded.id}`);
        return res.status(401).json({ message: 'User not found' });
      }
    } else {
      // DB-unavailable fallback: synthesise user from the JWT payload
      console.warn('[Auth] MongoDB unavailable — using JWT payload as user identity (limited mode)');
      req.user = {
        _id: decoded.id,
        email: decoded.email || 'unknown',
        name: decoded.name || 'User',
        role: decoded.role || 'user',
        status: 'approved',
      };
    }

    next();
  } catch (error: any) {
    console.error('[Auth] Token verification failed:', error.message);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const adminOnly = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};
