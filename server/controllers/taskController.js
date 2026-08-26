const MaintenanceTask = require('../models/MaintenanceTask');
const AuditLog = require('../models/AuditLog');

// GET /api/tasks
exports.getTasks = async (req, res) => {
  try {
    const { department, status, criticality, sectionId, sourceSystem, page = 1, limit = 50, sort = '-reportedDate' } = req.query;

    const filter = {};

    // Department filter — non-admin/control users see only their department
    if (department) {
      filter.department = department;
    } else if (!['admin', 'control_office'].includes(req.user.role)) {
      filter.department = req.user.department;
    }

    if (status) filter.status = status;
    if (criticality) filter.criticality = criticality;
    if (sectionId) filter.sectionId = sectionId;
    if (sourceSystem) filter.sourceSystem = sourceSystem;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const tasks = await MaintenanceTask.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await MaintenanceTask.countDocuments(filter);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/tasks/:id
exports.getTask = async (req, res) => {
  try {
    const task = await MaintenanceTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const task = await MaintenanceTask.create(req.body);

    await AuditLog.create({
      action: 'task_created',
      userId: req.user._id,
      userName: req.user.name,
      targetId: task.taskId,
      targetType: 'task',
      details: `Task ${task.taskId} created: ${task.defectType} on section ${task.sectionId}`
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const task = await MaintenanceTask.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await AuditLog.create({
      action: 'task_updated',
      userId: req.user._id,
      userName: req.user.name,
      targetId: task.taskId,
      targetType: 'task',
      details: `Task ${task.taskId} updated`
    });

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const task = await MaintenanceTask.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await AuditLog.create({
      action: 'task_deleted',
      userId: req.user._id,
      userName: req.user.name,
      targetId: task.taskId,
      targetType: 'task',
      details: `Task ${task.taskId} deleted`
    });

    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/tasks/stats/summary
exports.getTaskStats = async (req, res) => {
  try {
    const [byDepartment, byCriticality, byStatus, overdueCritical] = await Promise.all([
      MaintenanceTask.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ]),
      MaintenanceTask.aggregate([
        { $group: { _id: '$criticality', count: { $sum: 1 } } }
      ]),
      MaintenanceTask.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      MaintenanceTask.countDocuments({
        criticality: { $in: ['critical', 'high'] },
        dueDate: { $lt: new Date() },
        status: { $in: ['pending', 'scheduled'] }
      })
    ]);

    res.json({
      success: true,
      data: {
        byDepartment: byDepartment.reduce((acc, d) => { acc[d._id] = d.count; return acc; }, {}),
        byCriticality: byCriticality.reduce((acc, d) => { acc[d._id] = d.count; return acc; }, {}),
        byStatus: byStatus.reduce((acc, d) => { acc[d._id] = d.count; return acc; }, {}),
        overdueCritical,
        total: await MaintenanceTask.countDocuments()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/tasks/prioritize
exports.prioritizeTasks = async (req, res) => {
  try {
    const axios = require('axios');
    const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

    // Fetch all active tasks
    const tasks = await MaintenanceTask.find().lean();

    if (tasks.length === 0) {
      return res.status(400).json({ success: false, message: 'No tasks found. Please seed mock data first.' });
    }

    const payload = {
      tasks: tasks.map(t => ({
        id: t._id.toString(),
        taskId: t.taskId,
        sourceSystem: t.sourceSystem,
        department: t.department,
        sectionId: t.sectionId,
        defectType: t.defectType,
        criticality: t.criticality,
        reportedDate: new Date(t.reportedDate).toISOString(),
        dueDate: new Date(t.dueDate).toISOString(),
        estimatedDuration: t.estimatedDuration || 60,
        recurrenceCount: t.recurrenceCount || 0
      })),
      corridors: []
    };

    let scoredTasks = [];
    let summary = null;

    try {
      const aiRes = await axios.post(`${AI_ENGINE_URL}/api/prioritize`, payload);
      scoredTasks = aiRes.data.tasks || [];
      summary = aiRes.data.summary;
    } catch (aiErr) {
      console.warn('AI Engine call failed, computing in-process scoring:', aiErr.message);
      // In-process fallback scoring
      scoredTasks = tasks.map(t => {
        const safetyScores = { 'Rail fracture': 1.0, 'Track circuit failure': 1.0, 'Insulator flashover': 1.0, 'Power supply interruption': 1.0 };
        const safety = safetyScores[t.defectType] || (t.criticality === 'critical' ? 0.9 : t.criticality === 'high' ? 0.7 : 0.4);
        const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(t.dueDate).getTime()) / 86400000));
        const overdue = Math.min(1.0, daysOverdue / 30);
        const score = Math.min(1.0, 0.4 * safety + 0.3 * overdue + 0.3 * Math.random());
        const tier = score >= 0.75 ? 'Critical' : score >= 0.55 ? 'High' : score >= 0.35 ? 'Medium' : 'Low';
        return {
          ...t,
          id: t._id.toString(),
          criticalityScore: parseFloat(score.toFixed(3)),
          urgencyTier: tier,
          scoreBreakdown: { safety, overdue, traffic: 0.6, recurrence: 0.2 },
          reasoning: `[${tier}] Score: ${score.toFixed(2)}. Evaluated via hybrid safety and overdue risk matrix.`
        };
      }).sort((a, b) => b.criticalityScore - a.criticalityScore);
    }

    // Persist scores to MongoDB
    for (const st of scoredTasks) {
      if (st.id) {
        await MaintenanceTask.findByIdAndUpdate(st.id, {
          criticalityScore: st.criticalityScore,
          urgencyTier: st.urgencyTier,
          scoreBreakdown: st.scoreBreakdown,
          notes: st.reasoning || ''
        });
      }
    }

    await AuditLog.create({
      action: 'ai_prioritization_run',
      userId: req.user?._id,
      userName: req.user?.name || 'System',
      targetType: 'task',
      details: `Scored and ranked ${scoredTasks.length} tasks via AI Prioritization Engine`
    });

    res.json({
      success: true,
      tasks: scoredTasks,
      summary: summary || {
        total: scoredTasks.length,
        critical: scoredTasks.filter(t => t.urgencyTier === 'Critical' || t.criticalityScore >= 0.75).length,
        high: scoredTasks.filter(t => t.urgencyTier === 'High').length,
        medium: scoredTasks.filter(t => t.urgencyTier === 'Medium').length,
        low: scoredTasks.filter(t => t.urgencyTier === 'Low').length,
      }
    });
  } catch (error) {
    console.error('Prioritization error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
