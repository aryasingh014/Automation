// ============================================
// Error Handler Middleware
// ============================================

/**
 * Custom error response class
 */
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for dev
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map(e => e.message);
    error = new ErrorResponse(messages.join(', '), 400);
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const fields = err.errors.map(e => e.path);
    error = new ErrorResponse(`Duplicate value for field: ${fields.join(', ')}`, 400);
  }

  // Sequelize database error (e.g. invalid UUID)
  if (err.name === 'SequelizeDatabaseError') {
    if (err.message && err.message.includes('invalid input syntax for type uuid')) {
      error = new ErrorResponse('Resource not found', 404);
    } else {
      error = new ErrorResponse('Database error', 500);
    }
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    error = new ErrorResponse('Referenced resource not found', 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new ErrorResponse('Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new ErrorResponse('Token expired', 401);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error'
  });
};

module.exports = { ErrorResponse, errorHandler };
