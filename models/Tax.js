const mongoose = require('mongoose');

const taxSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ['Percentage', 'Fixed'],
      default: 'Percentage',
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tax', taxSchema);
