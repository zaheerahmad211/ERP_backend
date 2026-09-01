const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    customerId: {
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
    company: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: 'USA',
    },
    taxNumber: {
      type: String,
      default: '',
    },
    creditLimit: {
      type: Number,
      default: 10000,
    },
    outstandingBalance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Blocked'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

customerSchema.index({ name: 'text', company: 'text', email: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
