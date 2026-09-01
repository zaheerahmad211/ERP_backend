const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    userName: {
      type: String,
      default: 'System / Guest',
    },
    userRole: {
      type: String,
      default: 'N/A',
    },
    action: {
      type: String,
      required: true,
      enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'READ', 'EXPORT'],
    },
    module: {
      type: String,
      required: true,
    },
    recordId: {
      type: String,
      default: null,
    },
    oldData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ action: 1, module: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
