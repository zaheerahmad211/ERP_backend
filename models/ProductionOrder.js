const mongoose = require('mongoose');

const productionOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    bom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BillOfMaterial',
      required: true,
    },
    finishedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    targetQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    producedQuantity: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    completionDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['Planned', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Planned',
    },
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProductionOrder', productionOrderSchema);
