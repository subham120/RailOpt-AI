const mongoose = require('mongoose');

const maintenanceTaskSchema = new mongoose.Schema({
  taskId: {
    type: String,
    required: true,
    unique: true
  },
  sourceSystem: {
    type: String,
    enum: ['TMS', 'SMMS', 'TDMS'],
    required: true
  },
  department: {
    type: String,
    enum: ['Engineering', 'Traction Distribution', 'Signal & Telecom'],
    required: true
  },
  sectionId: {
    type: String,
    required: true
  },
  sectionName: {
    type: String,
    required: true
  },
  blockId: {
    type: String,
    default: ''
  },
  defectType: {
    type: String,
    required: true
  },
  defectDescription: {
    type: String,
    default: ''
  },
  criticality: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  reportedDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: true,
    min: 15,
    max: 480
  },
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'approved', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  // AI Scoring fields
  criticalityScore: {
    type: Number,
    default: null,
    min: 0,
    max: 1
  },
  scoreBreakdown: {
    safety: { type: Number, default: null },
    overdue: { type: Number, default: null },
    traffic: { type: Number, default: null },
    recurrence: { type: Number, default: null }
  },
  urgencyTier: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low', null],
    default: null
  },
  // Historical data
  recurrenceCount: {
    type: Number,
    default: 0
  },
  lastOccurrence: {
    type: Date,
    default: null
  },
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for common queries
maintenanceTaskSchema.index({ department: 1, status: 1 });
maintenanceTaskSchema.index({ sectionId: 1 });
maintenanceTaskSchema.index({ criticality: 1 });
maintenanceTaskSchema.index({ dueDate: 1 });

module.exports = mongoose.model('MaintenanceTask', maintenanceTaskSchema);
