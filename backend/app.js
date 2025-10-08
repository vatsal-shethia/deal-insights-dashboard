// backend/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const dealRoutes = require('./routes/dealRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Routes
app.use('/api/deals', dealRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const cache = require('./utils/cache');
  res.status(200).json({ 
    status: 'OK',
    dealsCount: cache.getAllDeals().length,
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(400).json({ error: error.message || 'Unknown error' });
});

module.exports = app;
