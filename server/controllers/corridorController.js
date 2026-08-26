const { CorridorBlock, BlockWindow, TrafficData } = require('../models/CorridorBlock');

// Fallback Indian Railways sections
const FALLBACK_SECTIONS = [
  { sectionId: 'NDLS-GZB', sectionName: 'New Delhi - Ghaziabad', fromStation: 'New Delhi', toStation: 'Ghaziabad', lineType: 'quadruple', trafficDensity: 'high', totalKm: 32, electrified: true },
  { sectionId: 'GZB-CNB', sectionName: 'Ghaziabad - Kanpur', fromStation: 'Ghaziabad', toStation: 'Kanpur Central', lineType: 'double', trafficDensity: 'high', totalKm: 440, electrified: true },
  { sectionId: 'CNB-ALD', sectionName: 'Kanpur - Prayagraj', fromStation: 'Kanpur Central', toStation: 'Prayagraj Jn', lineType: 'double', trafficDensity: 'medium', totalKm: 198, electrified: true },
  { sectionId: 'ALD-MGS', sectionName: 'Prayagraj - Mughal Sarai', fromStation: 'Prayagraj Jn', toStation: 'Pt. Deen Dayal Upadhyaya Jn', lineType: 'double', trafficDensity: 'high', totalKm: 128, electrified: true },
  { sectionId: 'DDN-HW', sectionName: 'Dehradun - Haridwar', fromStation: 'Dehradun', toStation: 'Haridwar', lineType: 'single', trafficDensity: 'medium', totalKm: 52, electrified: true },
  { sectionId: 'HW-RK', sectionName: 'Haridwar - Roorkee', fromStation: 'Haridwar', toStation: 'Roorkee', lineType: 'single', trafficDensity: 'low', totalKm: 30, electrified: true },
  { sectionId: 'NDLS-NZM', sectionName: 'New Delhi - Hazrat Nizamuddin', fromStation: 'New Delhi', toStation: 'H. Nizamuddin', lineType: 'quadruple', trafficDensity: 'high', totalKm: 8, electrified: true },
  { sectionId: 'NZM-MTJ', sectionName: 'Nizamuddin - Mathura', fromStation: 'H. Nizamuddin', toStation: 'Mathura Jn', lineType: 'double', trafficDensity: 'high', totalKm: 141, electrified: true },
  { sectionId: 'MTJ-AGC', sectionName: 'Mathura - Agra', fromStation: 'Mathura Jn', toStation: 'Agra Cantt', lineType: 'double', trafficDensity: 'medium', totalKm: 54, electrified: true },
  { sectionId: 'LKO-BSB', sectionName: 'Lucknow - Varanasi', fromStation: 'Lucknow NR', toStation: 'Varanasi Jn', lineType: 'double', trafficDensity: 'medium', totalKm: 286, electrified: true },
  { sectionId: 'AMB-UMB', sectionName: 'Ambala - Chandigarh', fromStation: 'Ambala Cantt', toStation: 'Chandigarh', lineType: 'double', trafficDensity: 'medium', totalKm: 46, electrified: true },
  { sectionId: 'DLI-RWL', sectionName: 'Delhi - Rewari', fromStation: 'Delhi Jn', toStation: 'Rewari', lineType: 'double', trafficDensity: 'low', totalKm: 82, electrified: true },
];

const generateFallbackWindows = () => {
  const windows = [];
  for (const s of FALLBACK_SECTIONS) {
    for (let day = 0; day <= 6; day++) {
      windows.push({
        sectionId: s.sectionId,
        dayOfWeek: day,
        startTime: '00:30:00',
        endTime: '04:30:00',
        windowType: 'night',
        maxDurationMinutes: 240,
        tttReference: `TTT-${s.sectionId}-${day}`,
        isActive: true,
      });
    }
  }
  return windows;
};

// GET /api/corridors
exports.getCorridors = async (req, res) => {
  try {
    const corridors = await CorridorBlock.findAll({
      include: [{ model: BlockWindow, as: 'windows', where: { isActive: true }, required: false }],
      order: [['sectionId', 'ASC']]
    });
    res.json({ success: true, data: corridors });
  } catch (error) {
    // Fallback to in-memory corridors
    res.json({ success: true, data: FALLBACK_SECTIONS.map(s => ({ ...s, windows: generateFallbackWindows().filter(w => w.sectionId === s.sectionId) })) });
  }
};

// GET /api/corridors/:sectionId
exports.getCorridor = async (req, res) => {
  try {
    const corridor = await CorridorBlock.findOne({
      where: { sectionId: req.params.sectionId },
      include: [{ model: BlockWindow, as: 'windows' }]
    });
    if (!corridor) {
      const fallback = FALLBACK_SECTIONS.find(s => s.sectionId === req.params.sectionId);
      if (!fallback) return res.status(404).json({ success: false, message: 'Corridor not found' });
      return res.json({ success: true, data: { ...fallback, windows: generateFallbackWindows().filter(w => w.sectionId === fallback.sectionId) } });
    }
    res.json({ success: true, data: corridor });
  } catch (error) {
    const fallback = FALLBACK_SECTIONS.find(s => s.sectionId === req.params.sectionId);
    if (!fallback) return res.status(404).json({ success: false, message: 'Corridor not found' });
    res.json({ success: true, data: { ...fallback, windows: generateFallbackWindows().filter(w => w.sectionId === fallback.sectionId) } });
  }
};

// GET /api/corridors/:sectionId/traffic
exports.getTrafficData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { sectionId: req.params.sectionId };

    if (startDate && endDate) {
      const { Op } = require('sequelize');
      where.date = { [Op.between]: [startDate, endDate] };
    }

    const traffic = await TrafficData.findAll({
      where,
      order: [['date', 'ASC'], ['hour', 'ASC']]
    });
    res.json({ success: true, data: traffic });
  } catch (error) {
    // Fallback mock traffic
    const traffic = Array.from({ length: 24 }, (_, h) => ({
      sectionId: req.params.sectionId,
      date: new Date().toISOString().split('T')[0],
      hour: h,
      passengerTrains: (h >= 6 && h <= 20) ? Math.floor(Math.random() * 6) + 2 : 1,
      goodsTrains: (h < 6 || h > 20) ? Math.floor(Math.random() * 4) + 2 : 1,
      totalTrains: 5
    }));
    res.json({ success: true, data: traffic });
  }
};

// GET /api/corridors/windows/all
exports.getAllWindows = async (req, res) => {
  try {
    const windows = await BlockWindow.findAll({
      where: { isActive: true },
      order: [['sectionId', 'ASC'], ['dayOfWeek', 'ASC'], ['startTime', 'ASC']]
    });
    res.json({ success: true, data: windows });
  } catch (error) {
    res.json({ success: true, data: generateFallbackWindows() });
  }
};
