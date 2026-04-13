import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('[Auth] Verifying token...');
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        console.warn(`[Auth] User not found for ID: ${decoded.id}`);
        return res.status(401).json({ message: 'User not found' });
      }
      
      next();
    } catch (error: any) {
      console.error('[Auth] Token verification failed:', error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    console.warn('[Auth] No token provided in headers');
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const adminOnly = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};
