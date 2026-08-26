const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'schedule_created', 'schedule_approved', 'schedule_rejected',
      'schedule_overridden', 'schedule_executed', 'schedule_cancelled',
      'task_created', 'task_updated', 'task_deleted',
      'request_submitted', 'request_approved', 'request_rejected',
      'data_seeded', 'ai_prioritization_run', 'ai_optimization_run',
      'user_login', 'user_logout', 'manual_override'
    ]
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userName: {
    type: String,
    default: 'System'
  },
  targetId: {
    type: String,
    default: ''
  },
  targetType: {
    type: String,
    enum: ['schedule', 'task', 'request', 'system', 'user'],
    default: 'system'
  },
  details: {
    type: String,
    default: ''
  },
  overrideReason: {
    type: String,
    default: ''
  },
  aiRecommendation: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ userId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
