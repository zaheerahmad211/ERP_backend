const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    type: {
      type: String,
      enum: ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    currentStock: {
      type: Number,
      required: true,
    },
    reference: {
      type: String,
      default: '', // e.g. PO-1001, SO-2004, Transfer #45
    },
    notes: {
      type: String,
      default: '',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

inventoryTransactionSchema.index({ product: 1, warehouse: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
