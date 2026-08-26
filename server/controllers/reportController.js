const BlockSchedule = require('../models/BlockSchedule');
const MaintenanceTask = require('../models/MaintenanceTask');
const AuditLog = require('../models/AuditLog');
const { CorridorBlock } = require('../models/CorridorBlock');
const XLSX = require('xlsx');

const formatDuration = (totalMinutes) => {
  if (!totalMinutes || isNaN(totalMinutes)) return '0min';
  const mins = Math.round(Number(totalMinutes));
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (remMins === 0) return `${hrs}hr`;
  return `${hrs}hr ${remMins}min`;
};

// GET /api/reports/downtime
exports.getDowntimeReport = async (req, res) => {
  try {
    const schedules = await BlockSchedule.find().lean();

    let corridors = [];
    try {
      corridors = await CorridorBlock.findAll({ raw: true });
    } catch (pgErr) {
      corridors = [];
    }

    // Calculate downtime per section
    const sectionDowntime = {};
    for (const s of schedules) {
      const sid = s.sectionId;
      if (!sectionDowntime[sid]) {
        const corridor = corridors.find(c => (c.section_id || c.sectionId) === sid);
        sectionDowntime[sid] = {
          sectionId: sid,
          sectionName: s.sectionName || sid,
          totalDowntimeMinutes: 0,
          approvedDowntimeMinutes: 0,
          proposedDowntimeMinutes: 0,
          blockCount: 0,
          trafficDensity: corridor ? (corridor.traffic_density || corridor.trafficDensity) : 'high'
        };
      }
      sectionDowntime[sid].totalDowntimeMinutes += s.totalDurationMinutes || 0;
      if (['approved', 'executed'].includes(s.status)) {
        sectionDowntime[sid].approvedDowntimeMinutes += s.totalDurationMinutes || 0;
      } else if (s.status === 'proposed') {
        sectionDowntime[sid].proposedDowntimeMinutes += s.totalDurationMinutes || 0;
      }
      sectionDowntime[sid].blockCount += 1;
    }

    // Calculate availability (assume 24h * 7 days = 10080 minutes per week)
    const weeklyMinutes = 10080;
    const report = Object.values(sectionDowntime).map(s => ({
      ...s,
      totalDowntimeHours: (s.totalDowntimeMinutes / 60).toFixed(1),
      availability: (((weeklyMinutes - s.totalDowntimeMinutes) / weeklyMinutes) * 100).toFixed(1)
    }));

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/utilization
exports.getUtilizationReport = async (req, res) => {
  try {
    const schedules = await BlockSchedule.find().lean();

    let totalDowntimeMinutes = 0;
    const byStatus = { proposed: 0, approved: 0, rejected: 0, executed: 0 };
    let multiDeptBlocks = 0;

    for (const s of schedules) {
      if (s.status && byStatus[s.status] !== undefined) {
        byStatus[s.status] += 1;
      }
      totalDowntimeMinutes += s.totalDurationMinutes || 0;
      if (s.isMultiDepartment) {
        multiDeptBlocks += 1;
      }
    }

    // Group by planType
    const weeklyData = {};
    for (const s of schedules) {
      const key = `${s.planType || 'weekly'}`;
      if (!weeklyData[key]) {
        weeklyData[key] = { period: key.toUpperCase(), proposed: 0, approved: 0, rejected: 0, executed: 0, totalMinutes: 0 };
      }
      if (s.status) weeklyData[key][s.status] = (weeklyData[key][s.status] || 0) + 1;
      weeklyData[key].totalMinutes += s.totalDurationMinutes || 0;
    }

    // Department utilization
    const deptUtil = {};
    for (const s of schedules) {
      for (const dept of (s.departments || [])) {
        if (!deptUtil[dept]) deptUtil[dept] = { department: dept, blockCount: 0, totalMinutes: 0 };
        deptUtil[dept].blockCount += 1;
        deptUtil[dept].totalMinutes += s.totalDurationMinutes || 0;
      }
    }

    // Section utilization
    const sectionUtil = {};
    for (const s of schedules) {
      const sid = s.sectionId;
      if (!sectionUtil[sid]) sectionUtil[sid] = { sectionId: sid, sectionName: s.sectionName || sid, blockCount: 0, totalMinutes: 0 };
      sectionUtil[sid].blockCount += 1;
      sectionUtil[sid].totalMinutes += s.totalDurationMinutes || 0;
    }

    res.json({
      success: true,
      data: {
        totalDowntimeMinutes,
        totalBlocks: schedules.length,
        byStatus,
        multiDeptBlocks,
        weekly: Object.values(weeklyData),
        departmentUtilization: Object.values(deptUtil),
        sectionUtilization: Object.values(sectionUtil)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/audit-log
exports.getAuditLog = async (req, res) => {
  try {
    const { action, page = 1, limit = 50, startDate, endDate } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AuditLog.countDocuments(filter);

    res.json({
      success: true,
      data: logs,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/export
exports.exportReport = async (req, res) => {
  try {
    const { type = 'schedules', format = 'xlsx', planType, department, sectionId, status } = req.query;
    let data = [];

    if (type === 'schedules') {
      const filter = {};
      if (planType && planType !== 'all') filter.planType = planType;
      if (department) filter.departments = department;
      if (sectionId) filter.sectionId = sectionId;
      if (status) filter.status = status;

      const schedules = await BlockSchedule.find(filter).sort({ 'assignedWindow.start': 1 }).lean();
      data = schedules.map(s => ({
        'Schedule ID': s.scheduleId,
        'Section Code': s.sectionId,
        'Corridor Name': s.sectionName || s.sectionId,
        'Plan Horizon': (s.planType || 'weekly').toUpperCase(),
        'Start Time': s.assignedWindow?.start ? new Date(s.assignedWindow.start).toLocaleString('en-IN') : '',
        'End Time': s.assignedWindow?.end ? new Date(s.assignedWindow.end).toLocaleString('en-IN') : '',
        'Duration': formatDuration(s.totalDurationMinutes),
        'Departments': (s.departments || []).join(' + '),
        'Multi-Dept Coordinated': s.isMultiDepartment ? 'Yes' : 'No',
        'Status': (s.status || 'proposed').toUpperCase(),
        'CP-SAT Score': s.optimizerScore ? `${Math.round(s.optimizerScore * 100)}%` : 'N/A'
      }));
    } else if (type === 'tasks') {
      const filter = {};
      if (department) filter.department = department;
      if (sectionId) filter.sectionId = sectionId;
      if (status) filter.status = status;

      const tasks = await MaintenanceTask.find(filter).sort({ reportedDate: -1 }).lean();
      data = tasks.map(t => ({
        'Task ID': t.taskId,
        'Source System': t.sourceSystem,
        'Department': t.department,
        'Section Code': t.sectionId,
        'Corridor Name': t.sectionName || t.sectionId,
        'Defect Type': t.defectType,
        'Criticality': (t.criticality || '').toUpperCase(),
        'Duration': formatDuration(t.estimatedDuration),
        'Reported Date': t.reportedDate ? new Date(t.reportedDate).toLocaleDateString('en-IN') : 'N/A',
        'Due Date': t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN') : 'N/A',
        'Status': (t.status || 'pending').toUpperCase(),
        'AI Score': t.criticalityScore ? `${Math.round(t.criticalityScore * 100)}%` : 'N/A',
        'Urgency Tier': t.urgencyTier || 'N/A'
      }));
    }

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, type === 'schedules' ? 'Block Schedules' : 'Maintenance Tasks');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=railopt_${type}_report.xlsx`);
      res.send(buffer);
    } else {
      res.json({ success: true, data, count: data.length });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/dashboard-stats
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalTasks,
      pendingTasks,
      scheduledBlocks,
      approvedBlocks,
      overdueCritical,
      tasksByDept,
      criticalityCounts,
      recentSchedules
    ] = await Promise.all([
      MaintenanceTask.countDocuments(),
      MaintenanceTask.countDocuments({ status: 'pending' }),
      BlockSchedule.countDocuments({ status: 'proposed' }),
      BlockSchedule.countDocuments({ status: 'approved' }),
      MaintenanceTask.countDocuments({
        criticality: { $in: ['critical', 'high'] },
        dueDate: { $lt: new Date() },
        status: { $in: ['pending', 'scheduled'] }
      }),
      MaintenanceTask.aggregate([
        {
          $group: {
            _id: '$department',
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } }
          }
        }
      ]),
      MaintenanceTask.aggregate([
        {
          $group: {
            _id: '$criticality',
            count: { $sum: 1 }
          }
        }
      ]),
      BlockSchedule.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    // Format tasksByDept with guaranteed entries for all 3 departments
    const defaultDepts = {
      'Engineering': 0,
      'Traction Distribution': 0,
      'Signal & Telecom': 0
    };

    const deptBreakdown = { ...defaultDepts };
    const pendingDeptBreakdown = { ...defaultDepts };

    tasksByDept.forEach(d => {
      if (d._id) {
        deptBreakdown[d._id] = d.total || 0;
        pendingDeptBreakdown[d._id] = d.pending || 0;
      }
    });

    // Format real criticality distribution
    const criticalityBreakdown = { critical: 0, high: 0, medium: 0, low: 0 };
    (criticalityCounts || []).forEach(c => {
      if (c._id && criticalityBreakdown[c._id] !== undefined) {
        criticalityBreakdown[c._id] = c.count;
      }
    });

    // Calculate asset availability & 7-day trend from real schedules
    const approvedSchedules = await BlockSchedule.find({ status: { $in: ['approved', 'executed', 'proposed'] } }).lean();
    const totalDowntime = approvedSchedules.reduce((s, b) => s + (b.totalDurationMinutes || 0), 0);
    let corridorCount = 12;
    try {
      corridorCount = await CorridorBlock.count() || 12;
    } catch (pgErr) {
      corridorCount = 12;
    }
    const weeklyCapacity = corridorCount * 10080; // minutes per week per corridor
    const availability = weeklyCapacity > 0 ? (((weeklyCapacity - totalDowntime) / weeklyCapacity) * 100).toFixed(1) : 99.5;

    // Real 7-day availability trend
    const today = new Date();
    const availabilityTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayBlocks = approvedSchedules.filter(s => {
        const start = s.assignedWindow?.start ? new Date(s.assignedWindow.start) : null;
        return start && start >= dayStart && start <= dayEnd;
      });
      
      const dayDowntime = dayBlocks.reduce((acc, b) => acc + (b.totalDurationMinutes || 0), 0);
      const dayCapacity = corridorCount * 1440; // minutes per day
      const dayAvail = dayCapacity > 0 ? (((dayCapacity - dayDowntime) / dayCapacity) * 100) : 98.0;
      
      availabilityTrend.push({
        date: dateStr,
        availability: parseFloat(Math.min(Math.max(dayAvail, 90.0), 100.0).toFixed(1))
      });
    }

    res.json({
      success: true,
      data: {
        totalTasks,
        pendingTasks,
        scheduledBlocks,
        approvedBlocks,
        overdueCritical,
        assetAvailability: parseFloat(availability),
        tasksByDept: pendingTasks > 0 ? pendingDeptBreakdown : deptBreakdown,
        allTasksByDept: deptBreakdown,
        pendingTasksByDept: pendingDeptBreakdown,
        criticalityDistribution: criticalityBreakdown,
        availabilityTrend,
        recentSchedules
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
