const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const mockDataController = require('../controllers/mockDataController');

router.post('/seed', protect, requireRole('admin'), mockDataController.seedMockData);
router.post('/ingest', protect, requireRole('admin'), mockDataController.ingestExternalData);

module.exports = router;
