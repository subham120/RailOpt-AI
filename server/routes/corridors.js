const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const corridorController = require('../controllers/corridorController');

router.get('/windows/all', protect, corridorController.getAllWindows);
router.get('/', protect, corridorController.getCorridors);
router.get('/:sectionId', protect, corridorController.getCorridor);
router.get('/:sectionId/traffic', protect, corridorController.getTrafficData);

module.exports = router;
