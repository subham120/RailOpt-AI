const mongoose = require('mongoose');

const blockScheduleSchema = new mongoose.Schema({
  scheduleId: {
    type: String,
    required: true,
    unique: true
  },
  taskIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaintenanceTask'
  }],
  taskIdStrings: [String], // Original task ID strings for reference
  sectionId: {
    type: String,
    required: true
  },
  sectionName: {
    type: String,
    required: true
  },
  assignedWindow: {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    dayOfWeek: { type: Number },
    date: { type: Date }
  },
  departments: [{
    type: String,
    enum: ['Engineering', 'Traction Distribution', 'Signal & Telecom']
  }],
  status: {
    type: String,
    enum: ['proposed', 'approved', 'rejected', 'executed', 'cancelled'],
    default: 'proposed'
  },
  planType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'weekly'
  },
  weekNumber: {
    type: Number,
    default: null
  },
  monthYear: {
    type: String, // e.g., "2024-08"
    default: null
  },
  isMultiDepartment: {
    type: Boolean,
    default: false
  },
  optimizerScore: {
    type: Number,
    default: 0
  },
  totalDurationMinutes: {
    type: Number,
    default: 0
  },
  // Approval fields
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvalDate: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  overrideReason: {
    type: String,
    default: ''
  },
  isOverridden: {
    type: Boolean,
    default: false
  },
  // Original AI recommendation (preserved even if overridden)
  aiRecommendation: {
    originalWindow: {
      start: Date,
      end: Date
    },
    originalScore: Number,
    reasoning: String
  }
}, {
  timestamps: true
});

blockScheduleSchema.index({ sectionId: 1, 'assignedWindow.start': 1 });
blockScheduleSchema.index({ status: 1 });
blockScheduleSchema.index({ planType: 1, weekNumber: 1 });

module.exports = mongoose.model('BlockSchedule', blockScheduleSchema);
