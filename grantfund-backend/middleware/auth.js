// ============================================
// Auth Middleware — JWT verification & RBAC
// ============================================

const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Protect routes — verifies JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for Bearer token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — no token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request
    req.user = await User.findOne({ id: decoded.id });

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — user not found'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — invalid token'
    });
  }
};

/**
 * Authorize specific roles
 * Usage: authorize('admin') or authorize('admin', 'subrecipient')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
