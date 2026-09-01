const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'Acme Enterprise Solutions',
    },
    companyEmail: {
      type: String,
      default: 'contact@acme-erp.com',
    },
    companyPhone: {
      type: String,
      default: '+1 (555) 019-2834',
    },
    companyAddress: {
      type: String,
      default: '100 Enterprise Way, Suite 500, Tech Park',
    },
    companyLogo: {
      type: String,
      default: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
    },
    currency: {
      type: String,
      default: 'USD',
    },
    currencySymbol: {
      type: String,
      default: '$',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    dateFormat: {
      type: String,
      default: 'YYYY-MM-DD',
    },
    defaultTaxRate: {
      type: Number,
      default: 10,
    },
    invoicePrefix: {
      type: String,
      default: 'INV-',
    },
    purchasePrefix: {
      type: String,
      default: 'PO-',
    },
    salesOrderPrefix: {
      type: String,
      default: 'SO-',
    },
    enableEmailNotifications: {
      type: Boolean,
      default: true,
    },
    lowStockThresholdGlobal: {
      type: Number,
      default: 10,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
