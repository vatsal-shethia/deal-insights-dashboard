const express = require('express');
const router = express.Router();

const upload = require('../utils/multerConfig');
const dealController = require('../controllers/dealController');

// Upload and analyze deals
router.post('/upload', upload.array('files'), dealController.uploadDeals);

// Get all deals
router.get('/', dealController.getAllDeals);

// Get specific deal
router.get('/:dealId', dealController.getDealById);

// Q&A for a deal
router.post('/:dealId/ask', dealController.askDeal);

// Compare deals
router.post('/compare', dealController.compareDeals);

module.exports = router;
