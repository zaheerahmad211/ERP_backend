const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema(
  {
    maintenanceNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    maintenanceType: {
      type: String,
      enum: ['Routine', 'Repair', 'Inspection', 'Upgrade'],
      default: 'Routine',
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    completionDate: {
      type: Date,
      default: null,
    },
    cost: {
      type: Number,
      default: 0,
    },
    technician: {
      type: String,
      default: 'Internal IT / Maintenance',
    },
    status: {
      type: String,
      enum: ['Requested', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Requested',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Maintenance', maintenanceSchema);
