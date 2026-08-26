const axios = require('axios');
const BlockSchedule = require('../models/BlockSchedule');
const MaintenanceTask = require('../models/MaintenanceTask');
const AuditLog = require('../models/AuditLog');
const { CorridorBlock, BlockWindow } = require('../models/CorridorBlock');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

// GET /api/schedules
exports.getSchedules = async (req, res) => {
  try {
    const { planType, status, sectionId, weekNumber, monthYear, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (planType) filter.planType = planType;
    if (status) filter.status = status;
    if (sectionId) filter.sectionId = sectionId;
    if (weekNumber) filter.weekNumber = parseInt(weekNumber);
    if (monthYear) filter.monthYear = monthYear;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const schedules = await BlockSchedule.find(filter)
      .populate('taskIds', 'taskId defectType department sectionName criticality estimatedDuration')
      .populate('approvedBy', 'name role')
      .sort({ 'assignedWindow.start': 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await BlockSchedule.countDocuments(filter);

    res.json({
      success: true,
      data: schedules,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/schedules/generate — triggers AI optimization
exports.generateSchedule = async (req, res) => {
  try {
    const { planType = 'weekly', targetDate } = req.body;

    // Fetch pending tasks
    const tasks = await MaintenanceTask.find({ status: { $in: ['pending', 'scheduled'] } }).lean();

    // Fetch corridor windows from PostgreSQL or fallback
    let windows = [];
    let corridors = [];
    try {
      windows = await BlockWindow.findAll({ where: { isActive: true }, raw: true });
      corridors = await CorridorBlock.findAll({ raw: true });
    } catch (pgErr) {
      const FALLBACK_SECTIONS = [
        { sectionId: 'NDLS-GZB', sectionName: 'New Delhi - Ghaziabad', trafficDensity: 'high' },
        { sectionId: 'GZB-CNB', sectionName: 'Ghaziabad - Kanpur', trafficDensity: 'high' },
        { sectionId: 'CNB-ALD', sectionName: 'Kanpur - Prayagraj', trafficDensity: 'medium' },
        { sectionId: 'ALD-MGS', sectionName: 'Prayagraj - Mughal Sarai', trafficDensity: 'high' },
        { sectionId: 'DDN-HW', sectionName: 'Dehradun - Haridwar', trafficDensity: 'medium' },
        { sectionId: 'HW-RK', sectionName: 'Haridwar - Roorkee', trafficDensity: 'low' },
        { sectionId: 'NDLS-NZM', sectionName: 'New Delhi - Hazrat Nizamuddin', trafficDensity: 'high' },
        { sectionId: 'NZM-MTJ', sectionName: 'Nizamuddin - Mathura', trafficDensity: 'high' },
        { sectionId: 'MTJ-AGC', sectionName: 'Mathura - Agra', trafficDensity: 'medium' },
        { sectionId: 'LKO-BSB', sectionName: 'Lucknow - Varanasi', trafficDensity: 'medium' },
        { sectionId: 'AMB-UMB', sectionName: 'Ambala - Chandigarh', trafficDensity: 'medium' },
        { sectionId: 'DLI-RWL', sectionName: 'Delhi - Rewari', trafficDensity: 'low' },
      ];
      corridors = FALLBACK_SECTIONS;
      for (const s of FALLBACK_SECTIONS) {
        for (let day = 0; day <= 6; day++) {
          windows.push({
            sectionId: s.sectionId,
            dayOfWeek: day,
            startTime: '00:30:00',
            endTime: '04:30:00',
            maxDurationMinutes: 240,
          });
        }
      }
    }

    if (tasks.length === 0) {
      return res.status(400).json({ success: false, message: 'No pending tasks to schedule' });
    }

    // Call AI engine for prioritization first
    let prioritizedTasks = tasks;
    try {
      const prioResponse = await axios.post(`${AI_ENGINE_URL}/api/prioritize`, {
        tasks: tasks.map(t => ({
          id: t._id.toString(),
          taskId: t.taskId,
          sourceSystem: t.sourceSystem,
          department: t.department,
          sectionId: t.sectionId,
          defectType: t.defectType,
          criticality: t.criticality,
          reportedDate: t.reportedDate,
          dueDate: t.dueDate,
          estimatedDuration: t.estimatedDuration,
          recurrenceCount: t.recurrenceCount || 0
        })),
        corridors: corridors.map(c => ({
          sectionId: c.sectionId,
          trafficDensity: c.trafficDensity
        }))
      });
      prioritizedTasks = prioResponse.data.tasks || tasks;
    } catch (aiError) {
      console.warn('AI prioritization unavailable, using raw tasks:', aiError.message);
    }

    // Call AI engine for optimization
    let schedules = [];
    try {
      const optResponse = await axios.post(`${AI_ENGINE_URL}/api/optimize`, {
        tasks: prioritizedTasks,
        windows: windows.map(w => ({
          sectionId: w.section_id || w.sectionId,
          dayOfWeek: w.day_of_week || w.dayOfWeek,
          startTime: w.start_time || w.startTime,
          endTime: w.end_time || w.endTime,
          maxDurationMinutes: w.max_duration_minutes || w.maxDurationMinutes
        })),
        corridors: corridors.map(c => ({
          sectionId: c.section_id || c.sectionId,
          sectionName: c.section_name || c.sectionName,
          trafficDensity: c.traffic_density || c.trafficDensity
        })),
        planType,
        targetDate: targetDate || new Date().toLocaleDateString('en-CA') + 'T00:00:00'
      });
      schedules = optResponse.data.schedules || [];
    } catch (aiError) {
      console.error('AI optimizer error details:', aiError.response?.data || aiError.message);
      // Fallback: simple round-robin assignment
      schedules = generateFallbackSchedule(prioritizedTasks, windows, corridors, planType);
    }

    // Clear previous unapproved/proposed schedules for this plan horizon to avoid duplicate accumulation
    await BlockSchedule.deleteMany({ planType, status: 'proposed' });

    // Save generated schedules
    const savedSchedules = [];
    for (const sched of schedules) {
      const now = new Date();
      const weekNum = getWeekNumber(now);

      const blockSchedule = await BlockSchedule.create({
        scheduleId: `BLK-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        taskIds: sched.taskIds || [],
        taskIdStrings: sched.taskIdStrings || [],
        sectionId: sched.sectionId,
        sectionName: sched.sectionName || sched.sectionId,
        assignedWindow: sched.assignedWindow,
        departments: sched.departments || [],
        status: 'proposed',
        planType,
        weekNumber: weekNum,
        monthYear: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        isMultiDepartment: (sched.departments || []).length > 1,
        optimizerScore: sched.optimizerScore || 0,
        totalDurationMinutes: sched.totalDurationMinutes || 0,
        aiRecommendation: {
          originalWindow: sched.assignedWindow,
          originalScore: sched.optimizerScore || 0,
          reasoning: sched.reasoning || 'AI-optimized schedule'
        }
      });
      savedSchedules.push(blockSchedule);
    }

    // Update task statuses
    for (const sched of savedSchedules) {
      if (sched.taskIds.length > 0) {
        await MaintenanceTask.updateMany(
          { _id: { $in: sched.taskIds } },
          { status: 'scheduled' }
        );
      }
    }

    await AuditLog.create({
      action: 'ai_optimization_run',
      userId: req.user._id,
      userName: req.user.name,
      targetType: 'schedule',
      details: `Generated ${savedSchedules.length} ${planType} block schedules`
    });

    res.json({ success: true, data: savedSchedules, count: savedSchedules.length });
  } catch (error) {
    console.error('Schedule generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/schedules/:id/approve
exports.approveSchedule = async (req, res) => {
  try {
    const schedule = await BlockSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    schedule.status = 'approved';
    schedule.approvedBy = req.user._id;
    schedule.approvalDate = new Date();
    await schedule.save();

    // Update task statuses
    await MaintenanceTask.updateMany(
      { _id: { $in: schedule.taskIds } },
      { status: 'approved' }
    );

    await AuditLog.create({
      action: 'schedule_approved',
      userId: req.user._id,
      userName: req.user.name,
      targetId: schedule.scheduleId,
      targetType: 'schedule',
      details: `Schedule ${schedule.scheduleId} approved for section ${schedule.sectionId}`
    });

    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/schedules/:id/reject
exports.rejectSchedule = async (req, res) => {
  try {
    const { reason } = req.body;
    const schedule = await BlockSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    schedule.status = 'rejected';
    schedule.rejectionReason = reason || '';
    await schedule.save();

    // Revert tasks to pending
    await MaintenanceTask.updateMany(
      { _id: { $in: schedule.taskIds } },
      { status: 'pending' }
    );

    await AuditLog.create({
      action: 'schedule_rejected',
      userId: req.user._id,
      userName: req.user.name,
      targetId: schedule.scheduleId,
      targetType: 'schedule',
      details: `Schedule ${schedule.scheduleId} rejected. Reason: ${reason}`
    });

    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/schedules/:id/override
exports.overrideSchedule = async (req, res) => {
  try {
    const { assignedWindow, reason } = req.body;
    const schedule = await BlockSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    // Check for conflicts
    const conflicts = await BlockSchedule.find({
      _id: { $ne: schedule._id },
      sectionId: schedule.sectionId,
      status: { $in: ['proposed', 'approved'] },
      'assignedWindow.start': { $lt: new Date(assignedWindow.end) },
      'assignedWindow.end': { $gt: new Date(assignedWindow.start) }
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Override creates scheduling conflict',
        conflicts: conflicts.map(c => ({
          scheduleId: c.scheduleId,
          sectionId: c.sectionId,
          window: c.assignedWindow
        }))
      });
    }

    schedule.assignedWindow = assignedWindow;
    schedule.isOverridden = true;
    schedule.overrideReason = reason || '';
    schedule.status = 'approved';
    schedule.approvedBy = req.user._id;
    schedule.approvalDate = new Date();
    await schedule.save();

    await AuditLog.create({
      action: 'schedule_overridden',
      userId: req.user._id,
      userName: req.user.name,
      targetId: schedule.scheduleId,
      targetType: 'schedule',
      details: `Schedule ${schedule.scheduleId} manually overridden. Reason: ${reason}`,
      overrideReason: reason,
      aiRecommendation: JSON.stringify(schedule.aiRecommendation)
    });

    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/schedules/stats
exports.getScheduleStats = async (req, res) => {
  try {
    const [byStatus, byPlanType, totalMinutes] = await Promise.all([
      BlockSchedule.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      BlockSchedule.aggregate([{ $group: { _id: '$planType', count: { $sum: 1 } } }]),
      BlockSchedule.aggregate([{
        $match: { status: { $in: ['approved', 'executed'] } }
      }, {
        $group: { _id: null, total: { $sum: '$totalDurationMinutes' } }
      }])
    ]);

    res.json({
      success: true,
      data: {
        byStatus: byStatus.reduce((a, d) => { a[d._id] = d.count; return a; }, {}),
        byPlanType: byPlanType.reduce((a, d) => { a[d._id] = d.count; return a; }, {}),
        totalDowntimeMinutes: totalMinutes[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: Get ISO week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Helper: Fallback schedule when AI engine is unavailable
function generateFallbackSchedule(tasks, windows, corridors, planType) {
  const sectionTasks = {};
  for (const task of tasks) {
    const sid = task.sectionId || task.section_id;
    if (!sectionTasks[sid]) sectionTasks[sid] = [];
    sectionTasks[sid].push(task);
  }

  const schedules = [];
  const now = new Date();

  for (const [sectionId, sectionTaskList] of Object.entries(sectionTasks)) {
    const sectionWindows = windows.filter(w => (w.section_id || w.sectionId) === sectionId);
    if (sectionWindows.length === 0) continue;

    const corridor = corridors.find(c => (c.section_id || c.sectionId) === sectionId);
    const windowObj = sectionWindows[0];

    // Create a schedule entry grouping tasks on this section
    const depts = [...new Set(sectionTaskList.map(t => t.department))];
    const totalDuration = sectionTaskList.reduce((s, t) => s + (t.estimatedDuration || 60), 0);

    const startHour = parseInt((windowObj.start_time || windowObj.startTime || '02:00').split(':')[0]);
    const schedDate = new Date(now);
    schedDate.setDate(schedDate.getDate() + 1);
    schedDate.setHours(startHour, 0, 0, 0);

    const endDate = new Date(schedDate.getTime() + Math.min(totalDuration, 240) * 60000);

    schedules.push({
      taskIds: sectionTaskList.map(t => t._id || t.id),
      taskIdStrings: sectionTaskList.map(t => t.taskId),
      sectionId,
      sectionName: corridor ? (corridor.section_name || corridor.sectionName) : sectionId,
      assignedWindow: { start: schedDate, end: endDate },
      departments: depts,
      optimizerScore: 0.5,
      totalDurationMinutes: Math.min(totalDuration, 240),
      reasoning: 'Fallback schedule (AI engine unavailable)'
    });
  }

  return schedules;
}
