// backend/server.js (simplified entry)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dealRoutes = require('./routes/dealRoutes');
const errorHandler = require('./middleware/errorHandler');
const { uploadsDir } = require('./middleware/upload');
const { dealsCache } = require('./data/storage');

const app = express();
const PORT = process.env.PORT || 5000;

// Global middleware
app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api/deals', dealRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    dealsCount: dealsCache.get('allDeals')?.length || 0,
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Uploads directory: ${uploadsDir}`);
  console.log(`Gemini API Key configured: ${!!process.env.GEMINI_API_KEY}`);
  console.log(`Deals in memory: ${dealsCache.size}`);
});
