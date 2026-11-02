require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { router: adminRouter, seedInitialData } = require('./admin');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/al_zahoor_gas_center';
const DB_NAME = process.env.DB_NAME || 'al_zahoor_gas_center';

// ============================================================================
// 1. MONGODB CONNECTION WITH SERVERLESS CACHING (VERCEL COMPATIBLE)
// ============================================================================

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      dbName: DB_NAME,
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false
    };

    console.log(`Connecting to MongoDB...`);
    cached.promise = mongoose.connect(MONGODB_URI, opts).then(async (m) => {
      console.log('MongoDB connection established successfully.');
      try {
        await seedInitialData();
      } catch (seedErr) {
        console.error('Initial seeding notice:', seedErr.message);
      }
      return m;
    }).catch((err) => {
      cached.promise = null;
      console.error('MongoDB connection error:', err.message);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// ============================================================================
// 2. MIDDLEWARE CONFIGURATION
// ============================================================================

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate Limiting on Login Route
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 login requests per window
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth/login', loginLimiter);

// Health check endpoint (always accessible)
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  res.json({
    status: 'ONLINE',
    business: 'Al Zahoor Gas Center',
    version: '1.0.0',
    database: states[dbState] || 'Unknown',
    timestamp: new Date().toISOString()
  });
});

// Ensure DB is connected for all subsequent business API requests
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: 'Database service unavailable. Please verify MONGODB_URI in your environment configuration.',
      error: err.message
    });
  }
});

// Mount Admin and Business APIs
app.use('/api', adminRouter);

// Serve Frontend Static Files
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Fallback to index.html for Single Page Dashboard Experience
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.'
  });
});

// ============================================================================
// 3. SERVER INITIALIZATION & VERCEL EXPORT
// ============================================================================

// If running directly as main module (e.g. node index.js or npm start)
if (require.main === module) {
  connectDB().catch(err => {
    console.warn('Initial MongoDB connection attempt deferred:', err.message);
  });

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  AL ZAHOOR GAS CENTER - LPG Shop Management System `);
    console.log(`  Server running on http://localhost:${PORT}        `);
    console.log(`====================================================`);
  });
}

// Export for Vercel Serverless Function
module.exports = app;
