const mongoose = require('mongoose');

const journalLineSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  type: {
    type: String,
    enum: ['Debit', 'Credit'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    default: '',
  },
});

const journalEntrySchema = new mongoose.Schema(
  {
    entryNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
      default: '',
    },
    lines: [journalLineSchema],
    totalDebit: {
      type: Number,
      required: true,
    },
    totalCredit: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Posted', 'Void'],
      default: 'Posted',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
