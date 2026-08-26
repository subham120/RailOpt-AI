const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

router.get('/dashboard-stats', protect, reportController.getDashboardStats);
router.get('/downtime', protect, reportController.getDowntimeReport);
router.get('/utilization', protect, reportController.getUtilizationReport);
router.get('/audit-log', protect, requireRole('admin', 'control_office'), reportController.getAuditLog);
router.get('/export', protect, reportController.exportReport);

module.exports = router;
