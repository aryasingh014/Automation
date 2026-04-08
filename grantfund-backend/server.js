// ============================================
// server.js — Main Entry Point
// Grant & Fund Management System
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Import database
const connectDB = require('./config/database');

// Import models (this registers all associations)
require('./models');

// Import routes
const authRoutes = require('./routes/authRoutes');
const grantRoutes = require('./routes/grantRoutes');
const fundRoutes = require('./routes/fundRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const userRoutes = require('./routes/userRoutes');
const scraperRoutes = require('./routes/scraperRoutes');
const aiRoutes = require('./routes/aiRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const complianceRoutes = require('./routes/complianceRoutes');

// Import Scraper cron service
const cron = require('node-cron');
const { runPythonScraper } = require('./services/scraperService');

// Schedule Scraper to run every day at Midnight (00:00)
cron.schedule('0 0 * * *', () => {
  console.log('⏰ [Cron] Running daily TxDOT scraper sync...');
  runPythonScraper().catch(err => console.error('Cron Scraper Error:', err));
});

// Import error handler
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ── Middleware ──────────────────────────────────────────
// 1. CORS - MUST BE FIRST for preflight
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin.includes('trycloudflare.com') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// 2. Helmet - Relaxed for Tunnels
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  contentSecurityPolicy: false,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (fallback for local uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/grants', grantRoutes);
app.use('/api/funds', fundRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/historical', require('./routes/historicalRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global Error Handler ───────────────────────────────
app.use(errorHandler);

// ── Database Connection & Server Start ─────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
  });
});

module.exports = app;
