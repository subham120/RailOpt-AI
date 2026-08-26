const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const scheduleController = require('../controllers/scheduleController');

router.get('/stats', protect, scheduleController.getScheduleStats);
router.get('/', protect, scheduleController.getSchedules);
router.post('/generate', protect, requireRole('admin', 'control_office'), scheduleController.generateSchedule);
router.put('/:id/approve', protect, requireRole('admin', 'control_office'), scheduleController.approveSchedule);
router.put('/:id/reject', protect, requireRole('admin', 'control_office'), scheduleController.rejectSchedule);
router.put('/:id/override', protect, requireRole('admin', 'control_office'), scheduleController.overrideSchedule);

module.exports = router;
