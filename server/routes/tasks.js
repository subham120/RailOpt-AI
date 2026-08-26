const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const taskController = require('../controllers/taskController');

router.get('/stats/summary', protect, taskController.getTaskStats);
router.post('/prioritize', protect, taskController.prioritizeTasks);
router.get('/', protect, taskController.getTasks);
router.get('/:id', protect, taskController.getTask);
router.post('/', protect, taskController.createTask);
router.put('/:id', protect, taskController.updateTask);
router.delete('/:id', protect, taskController.deleteTask);

module.exports = router;
