// routes/dealRoutes.js
const express = require('express');
const router = express.Router();
const dealController = require('../controllers/dealController');
const { upload } = require('../middleware/upload');

router.post('/upload', upload.array('files'), dealController.uploadDeals);
router.get('/', dealController.getAllDeals);
router.get('/:dealId', dealController.getDeal);
router.post('/:dealId/ask', dealController.askQuestion);
router.post('/compare', dealController.compareDeals);

module.exports = router;
