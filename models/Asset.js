const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    assetId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Computers', 'Vehicles', 'Furniture', 'Machinery', 'Real Estate', 'Other'],
      required: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currentValue: {
      type: Number,
      required: true,
      min: 0,
    },
    location: {
      type: String,
      default: 'Main Office',
    },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    status: {
      type: String,
      enum: ['Active', 'In Maintenance', 'Disposed', 'Scrapped'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Asset', assetSchema);
