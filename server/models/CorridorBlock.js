const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/pgDb');

const CorridorBlock = sequelize.define('CorridorBlock', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sectionId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'section_id'
  },
  sectionName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'section_name'
  },
  fromStation: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'from_station'
  },
  toStation: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'to_station'
  },
  lineType: {
    type: DataTypes.ENUM('single', 'double', 'triple', 'quadruple'),
    defaultValue: 'double',
    field: 'line_type'
  },
  trafficDensity: {
    type: DataTypes.ENUM('high', 'medium', 'low'),
    defaultValue: 'medium',
    field: 'traffic_density'
  },
  zone: {
    type: DataTypes.STRING(100),
    defaultValue: 'Northern Railway'
  },
  division: {
    type: DataTypes.STRING(100),
    defaultValue: 'Delhi'
  },
  totalKm: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    field: 'total_km'
  },
  electrified: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'corridor_blocks',
  timestamps: true,
  underscored: true
});

// Available time windows (stored separately for flexibility)
const BlockWindow = sequelize.define('BlockWindow', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sectionId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'section_id'
  },
  dayOfWeek: {
    type: DataTypes.INTEGER, // 0=Sunday, 6=Saturday
    allowNull: false,
    field: 'day_of_week'
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'start_time'
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'end_time'
  },
  windowType: {
    type: DataTypes.ENUM('night', 'day', 'mixed'),
    defaultValue: 'night',
    field: 'window_type'
  },
  maxDurationMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 240,
    field: 'max_duration_minutes'
  },
  tttReference: {
    type: DataTypes.STRING(100),
    defaultValue: '',
    field: 'ttt_reference'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'block_windows',
  timestamps: true,
  underscored: true
});

// Traffic data (time-series)
const TrafficData = sequelize.define('TrafficData', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sectionId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'section_id'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  hour: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  passengerTrains: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'passenger_trains'
  },
  goodsTrains: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'goods_trains'
  },
  totalTrains: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_trains'
  }
}, {
  tableName: 'traffic_data',
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['section_id', 'date', 'hour'] }
  ]
});

// Associations
CorridorBlock.hasMany(BlockWindow, { foreignKey: 'section_id', sourceKey: 'sectionId', as: 'windows' });
BlockWindow.belongsTo(CorridorBlock, { foreignKey: 'section_id', targetKey: 'sectionId', as: 'corridor' });

module.exports = { CorridorBlock, BlockWindow, TrafficData };
