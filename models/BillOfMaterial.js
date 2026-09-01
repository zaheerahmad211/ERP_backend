const mongoose = require('mongoose');

const bomComponentSchema = new mongoose.Schema({
  component: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01,
  },
  unitCost: {
    type: Number,
    required: true,
    min: 0,
  },
  totalCost: {
    type: Number,
    required: true,
  },
});

const billOfMaterialSchema = new mongoose.Schema(
  {
    bomNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    finishedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    components: [bomComponentSchema],
    totalCost: {
      type: Number,
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Draft', 'Archived'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BillOfMaterial', billOfMaterialSchema);
