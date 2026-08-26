const MaintenanceTask = require('../models/MaintenanceTask');
const { CorridorBlock, BlockWindow, TrafficData } = require('../models/CorridorBlock');
const AuditLog = require('../models/AuditLog');

// Railway sections — realistic Indian Railways data
const SECTIONS = [
  { sectionId: 'NDLS-GZB', sectionName: 'New Delhi - Ghaziabad', from: 'New Delhi', to: 'Ghaziabad', km: 32, line: 'quadruple', traffic: 'high' },
  { sectionId: 'GZB-CNB', sectionName: 'Ghaziabad - Kanpur', from: 'Ghaziabad', to: 'Kanpur Central', km: 440, line: 'double', traffic: 'high' },
  { sectionId: 'CNB-ALD', sectionName: 'Kanpur - Prayagraj', from: 'Kanpur Central', to: 'Prayagraj Jn', km: 198, line: 'double', traffic: 'medium' },
  { sectionId: 'ALD-MGS', sectionName: 'Prayagraj - Mughal Sarai', from: 'Prayagraj Jn', to: 'Pt. Deen Dayal Upadhyaya Jn', km: 128, line: 'double', traffic: 'high' },
  { sectionId: 'DDN-HW', sectionName: 'Dehradun - Haridwar', from: 'Dehradun', to: 'Haridwar', km: 52, line: 'single', traffic: 'medium' },
  { sectionId: 'HW-RK', sectionName: 'Haridwar - Roorkee', from: 'Haridwar', to: 'Roorkee', km: 30, line: 'single', traffic: 'low' },
  { sectionId: 'NDLS-NZM', sectionName: 'New Delhi - Hazrat Nizamuddin', from: 'New Delhi', to: 'H. Nizamuddin', km: 8, line: 'quadruple', traffic: 'high' },
  { sectionId: 'NZM-MTJ', sectionName: 'Nizamuddin - Mathura', from: 'H. Nizamuddin', to: 'Mathura Jn', km: 141, line: 'double', traffic: 'high' },
  { sectionId: 'MTJ-AGC', sectionName: 'Mathura - Agra', from: 'Mathura Jn', to: 'Agra Cantt', km: 54, line: 'double', traffic: 'medium' },
  { sectionId: 'LKO-BSB', sectionName: 'Lucknow - Varanasi', from: 'Lucknow NR', to: 'Varanasi Jn', km: 286, line: 'double', traffic: 'medium' },
  { sectionId: 'AMB-UMB', sectionName: 'Ambala - Umballa', from: 'Ambala Cantt', to: 'Chandigarh', km: 46, line: 'double', traffic: 'medium' },
  { sectionId: 'DLI-RWL', sectionName: 'Delhi - Rewari', from: 'Delhi Jn', to: 'Rewari', km: 82, line: 'double', traffic: 'low' },
];

const TMS_DEFECTS = [
  { type: 'Rail fracture', safety: 1.0, dept: 'Engineering' },
  { type: 'Track geometry defect', safety: 0.8, dept: 'Engineering' },
  { type: 'Weld failure', safety: 0.9, dept: 'Engineering' },
  { type: 'Ballast deficiency', safety: 0.5, dept: 'Engineering' },
  { type: 'Sleeper renewal due', safety: 0.4, dept: 'Engineering' },
  { type: 'Rail wear beyond limit', safety: 0.7, dept: 'Engineering' },
  { type: 'Bridge inspection overdue', safety: 0.6, dept: 'Engineering' },
  { type: 'Level crossing defect', safety: 0.8, dept: 'Engineering' },
];

const SMMS_DEFECTS = [
  { type: 'Signal lamp failure', safety: 1.0, dept: 'Signal & Telecom' },
  { type: 'Point machine malfunction', safety: 0.9, dept: 'Signal & Telecom' },
  { type: 'Track circuit failure', safety: 1.0, dept: 'Signal & Telecom' },
  { type: 'Relay room inspection due', safety: 0.5, dept: 'Signal & Telecom' },
  { type: 'Axle counter fault', safety: 0.8, dept: 'Signal & Telecom' },
  { type: 'Telecom cable degradation', safety: 0.3, dept: 'Signal & Telecom' },
  { type: 'Interlocking test overdue', safety: 0.7, dept: 'Signal & Telecom' },
];

const TDMS_DEFECTS = [
  { type: 'OHE wire sag', safety: 0.9, dept: 'Traction Distribution' },
  { type: 'Catenary mast damage', safety: 0.8, dept: 'Traction Distribution' },
  { type: 'Insulator flashover', safety: 1.0, dept: 'Traction Distribution' },
  { type: 'Contact wire wear', safety: 0.7, dept: 'Traction Distribution' },
  { type: 'Pantograph strip inspection', safety: 0.5, dept: 'Traction Distribution' },
  { type: 'Return conductor defect', safety: 0.6, dept: 'Traction Distribution' },
  { type: 'Power supply interruption', safety: 1.0, dept: 'Traction Distribution' },
];

// POST /api/mock/seed
exports.seedMockData = async (req, res) => {
  try {
    const { taskCount = 80, clearExisting = true } = req.body || {};

    // Clear existing tasks
    if (clearExisting) {
      await MaintenanceTask.deleteMany({});
    }

    // Try seeding corridors in PostgreSQL (optional if PG service is running)
    try {
      if (clearExisting) {
        await CorridorBlock.destroy({ where: {}, truncate: true, cascade: true });
        await BlockWindow.destroy({ where: {}, truncate: true });
        await TrafficData.destroy({ where: {}, truncate: true });
      }

      for (const section of SECTIONS) {
        await CorridorBlock.create({
          sectionId: section.sectionId,
          sectionName: section.sectionName,
          fromStation: section.from,
          toStation: section.to,
          lineType: section.line,
          trafficDensity: section.traffic,
          totalKm: section.km,
          electrified: true
        });

        const windowConfigs = [
          { day: 1, start: '00:30:00', end: '04:30:00', type: 'night', max: 240 },
          { day: 2, start: '00:30:00', end: '04:30:00', type: 'night', max: 240 },
          { day: 3, start: '00:30:00', end: '04:30:00', type: 'night', max: 240 },
          { day: 4, start: '11:00:00', end: '14:00:00', type: 'day', max: 180 },
          { day: 5, start: '00:30:00', end: '04:30:00', type: 'night', max: 240 },
          { day: 6, start: '00:30:00', end: '05:00:00', type: 'night', max: 270 },
          { day: 0, start: '01:00:00', end: '06:00:00', type: 'night', max: 300 },
        ];

        const windowCount = section.traffic === 'high' ? 4 : section.traffic === 'medium' ? 5 : 7;
        for (let i = 0; i < windowCount; i++) {
          const wc = windowConfigs[i];
          await BlockWindow.create({
            sectionId: section.sectionId,
            dayOfWeek: wc.day,
            startTime: wc.start,
            endTime: wc.end,
            windowType: wc.type,
            maxDurationMinutes: wc.max,
            tttReference: `TTT-${section.sectionId}-${wc.day}`,
            isActive: true
          });
        }

        // Generate traffic data (last 30 days)
        const today = new Date();
        for (let d = 0; d < 30; d++) {
          const date = new Date(today);
          date.setDate(date.getDate() - d);
          const dateStr = date.toISOString().split('T')[0];

          for (let h = 0; h < 24; h++) {
            const baseTraffic = section.traffic === 'high' ? 8 : section.traffic === 'medium' ? 4 : 2;
            // Peak hours: 6-10, 16-22
            const peakMultiplier = (h >= 6 && h <= 10) || (h >= 16 && h <= 22) ? 2 : 0.5;
            const passenger = Math.floor(baseTraffic * peakMultiplier * (0.7 + Math.random() * 0.6));
            const goods = h < 6 || h > 22 ? Math.floor(baseTraffic * 0.8 * (0.5 + Math.random() * 0.5)) : Math.floor(baseTraffic * 0.2);

            await TrafficData.create({
              sectionId: section.sectionId,
              date: dateStr,
              hour: h,
              passengerTrains: passenger,
              goodsTrains: goods,
              totalTrains: passenger + goods
            });
          }
        }
      }
    } catch (pgErr) {
      console.warn('[INFO] PostgreSQL not active - proceeding with MongoDB & in-memory corridors:', pgErr.message);
    }

    // Seed maintenance tasks
    const allDefects = [
      ...TMS_DEFECTS.map(d => ({ ...d, source: 'TMS' })),
      ...SMMS_DEFECTS.map(d => ({ ...d, source: 'SMMS' })),
      ...TDMS_DEFECTS.map(d => ({ ...d, source: 'TDMS' })),
    ];

    const criticalities = ['critical', 'high', 'medium', 'low'];
    const tasks = [];

    for (let i = 0; i < taskCount; i++) {
      const defect = allDefects[Math.floor(Math.random() * allDefects.length)];
      const section = SECTIONS[Math.floor(Math.random() * SECTIONS.length)];
      const reportedDate = new Date();
      reportedDate.setDate(reportedDate.getDate() - Math.floor(Math.random() * 30));

      const dueDate = new Date(reportedDate);
      const urgencyDays = defect.safety > 0.8 ? 3 : defect.safety > 0.5 ? 7 : 14;
      dueDate.setDate(dueDate.getDate() + urgencyDays + Math.floor(Math.random() * 7));

      const critIdx = defect.safety > 0.9 ? 0 : defect.safety > 0.7 ? Math.random() > 0.5 ? 0 : 1 : defect.safety > 0.4 ? Math.random() > 0.5 ? 1 : 2 : Math.random() > 0.5 ? 2 : 3;

      tasks.push({
        taskId: `${defect.source}-${String(i + 1).padStart(4, '0')}`,
        sourceSystem: defect.source,
        department: defect.dept,
        sectionId: section.sectionId,
        sectionName: section.sectionName,
        defectType: defect.type,
        defectDescription: `${defect.type} detected on ${section.sectionName} section. Requires block for maintenance.`,
        criticality: criticalities[critIdx],
        reportedDate,
        dueDate,
        estimatedDuration: 30 + Math.floor(Math.random() * 210), // 30-240 min
        status: 'pending',
        recurrenceCount: Math.floor(Math.random() * 5),
        lastOccurrence: Math.random() > 0.5 ? new Date(reportedDate.getTime() - Math.random() * 90 * 86400000) : null
      });
    }

    await MaintenanceTask.insertMany(tasks);

    await AuditLog.create({
      action: 'data_seeded',
      userName: 'System',
      targetType: 'system',
      details: `Seeded ${taskCount} maintenance tasks across ${SECTIONS.length} sections with corridor blocks, windows, and traffic data`
    });

    res.json({
      success: true,
      message: `Seeded ${taskCount} tasks, ${SECTIONS.length} corridors, block windows, and 30 days of traffic data`,
      data: {
        tasks: taskCount,
        corridors: SECTIONS.length,
        sections: SECTIONS.map(s => s.sectionId)
      }
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/mock/ingest — simulate pulling from external TMS/SMMS/TDMS
exports.ingestExternalData = async (req, res) => {
  try {
    const { source = 'TMS', count = 10 } = req.body;

    const defectMap = { TMS: TMS_DEFECTS, SMMS: SMMS_DEFECTS, TDMS: TDMS_DEFECTS };
    const defects = defectMap[source] || TMS_DEFECTS;

    const tasks = [];
    for (let i = 0; i < count; i++) {
      const defect = defects[Math.floor(Math.random() * defects.length)];
      const section = SECTIONS[Math.floor(Math.random() * SECTIONS.length)];
      const reportedDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3 + Math.floor(Math.random() * 10));

      tasks.push({
        taskId: `${source}-ING-${Date.now()}-${i}`,
        sourceSystem: source,
        department: defect.dept,
        sectionId: section.sectionId,
        sectionName: section.sectionName,
        defectType: defect.type,
        defectDescription: `[Ingested] ${defect.type} on ${section.sectionName}`,
        criticality: defect.safety > 0.8 ? 'high' : 'medium',
        reportedDate,
        dueDate,
        estimatedDuration: 60 + Math.floor(Math.random() * 120),
        status: 'pending'
      });
    }

    const created = await MaintenanceTask.insertMany(tasks);

    res.json({
      success: true,
      message: `Ingested ${created.length} tasks from ${source}`,
      data: created
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
