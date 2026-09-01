const express = require('express');
const router = express.Router();
const {
  getInvoices,
  createInvoice,
  getPayments,
  recordPayment,
  getExpenses,
  createExpense,
  getAccounts,
  createAccount,
  getJournalEntries,
  getTaxes,
  createTax,
} = require('../controllers/financeController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

// Invoices
router.route('/invoices')
  .get(getInvoices)
  .post(authorize('Super Admin', 'Admin', 'Accountant', 'Sales Manager'), createInvoice);

// Payments
router.route('/payments')
  .get(getPayments)
  .post(authorize('Super Admin', 'Admin', 'Accountant'), recordPayment);

// Expenses
router.route('/expenses')
  .get(getExpenses)
  .post(createExpense);

// Chart of Accounts & General Ledger
router.route('/accounts')
  .get(getAccounts)
  .post(authorize('Super Admin', 'Admin', 'Accountant'), createAccount);

router.get('/journal', authorize('Super Admin', 'Admin', 'Accountant'), getJournalEntries);

// Taxes
router.route('/taxes')
  .get(getTaxes)
  .post(authorize('Super Admin', 'Admin', 'Accountant'), createTax);

module.exports = router;
