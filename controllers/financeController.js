const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Account = require('../models/Account');
const JournalEntry = require('../models/JournalEntry');
const Tax = require('../models/Tax');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const { successResponse, errorResponse, paginateResponse } = require('../utils/apiResponse');
const { logAudit } = require('../middleware/auditLogger');
const syncEmployeeUserLinks = require('../utils/syncEmployeeUsers');

// ==========================================
// INVOICES
// ==========================================
const getInvoices = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const { status, customer } = req.query;

    const query = {};
    if (status) query.status = status;
    if (customer) query.customer = customer;

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate('customer', 'name company email customerId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return paginateResponse(res, 'Invoices retrieved successfully', invoices, page, limit, total);
  } catch (error) {
    next(error);
  }
};

const createInvoice = async (req, res, next) => {
  try {
    const { customer, dueDate, items, discountAmount, notes } = req.body;

    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-${(count + 1001).toString()}`;

    let subtotal = 0;
    let taxAmount = 0;

    const processedItems = items.map((i) => {
      const total = i.quantity * i.unitPrice;
      const tax = (total * (i.tax || 0)) / 100;
      subtotal += total;
      taxAmount += tax;
      return {
        product: i.product || null,
        description: i.description || 'Service/Item',
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        tax: i.tax || 0,
        total: total + tax,
      };
    });

    const totalAmount = subtotal + taxAmount - (discountAmount || 0);

    const invoice = await Invoice.create({
      invoiceNumber,
      customer,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: processedItems,
      subtotal,
      taxAmount,
      discountAmount: discountAmount || 0,
      totalAmount,
      paidAmount: 0,
      balanceDue: totalAmount,
      status: 'Sent',
      notes,
    });

    const cust = await Customer.findById(customer);
    if (cust) {
      cust.outstandingBalance += totalAmount;
      await cust.save();
    }

    await logAudit({
      req,
      action: 'CREATE',
      moduleName: 'Finance / Invoices',
      recordId: invoice._id.toString(),
      newData: { invoiceNumber, totalAmount },
    });

    return successResponse(res, 'Invoice created successfully', invoice, 201);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PAYMENTS & JOURNAL ENTRIES
// ==========================================
const getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find()
      .populate('customer', 'name company')
      .populate('supplier', 'name company')
      .populate('invoice', 'invoiceNumber')
      .sort({ createdAt: -1 });

    return successResponse(res, 'Payments retrieved', payments);
  } catch (error) {
    next(error);
  }
};

const recordPayment = async (req, res, next) => {
  try {
    const { type, customer, supplier, invoiceId, amount, paymentMethod, reference, notes } = req.body;

    const count = await Payment.countDocuments();
    const paymentNumber = `PAY-${(count + 1001).toString()}`;

    const payment = await Payment.create({
      paymentNumber,
      type: type || 'Customer Received',
      customer: customer || null,
      supplier: supplier || null,
      invoice: invoiceId || null,
      amount,
      paymentMethod: paymentMethod || 'Bank Transfer',
      reference: reference || '',
      notes: notes || '',
      createdBy: req.user._id,
    });

    // Update Invoice status and balance if attached
    if (invoiceId) {
      const inv = await Invoice.findById(invoiceId);
      if (inv) {
        inv.paidAmount += amount;
        inv.balanceDue = Math.max(0, inv.totalAmount - inv.paidAmount);
        inv.status = inv.balanceDue === 0 ? 'Paid' : 'Partially Paid';
        await inv.save();

        if (inv.customer) {
          const cust = await Customer.findById(inv.customer);
          if (cust) {
            cust.outstandingBalance = Math.max(0, cust.outstandingBalance - amount);
            await cust.save();
          }
        }
      }
    }

    // Auto-create Double Entry Journal Record in General Ledger!
    const jCount = await JournalEntry.countDocuments();
    const entryNumber = `JE-${(jCount + 1001).toString()}`;

    let cashAccount = await Account.findOne({ code: '1010' });
    let arAccount = await Account.findOne({ code: '1100' });

    if (cashAccount && arAccount) {
      await JournalEntry.create({
        entryNumber,
        description: `Payment ${paymentNumber} received`,
        reference: paymentNumber,
        lines: [
          { account: cashAccount._id, type: 'Debit', amount, description: 'Bank / Cash Received' },
          { account: arAccount._id, type: 'Credit', amount, description: 'Accounts Receivable Cleared' },
        ],
        totalDebit: amount,
        totalCredit: amount,
        createdBy: req.user._id,
      });

      cashAccount.balance += amount;
      arAccount.balance = Math.max(0, arAccount.balance - amount);
      await cashAccount.save();
      await arAccount.save();
    }

    await logAudit({
      req,
      action: 'CREATE',
      moduleName: 'Finance / Payments',
      recordId: payment._id.toString(),
      newData: { paymentNumber, amount, method: paymentMethod },
    });

    return successResponse(res, 'Payment recorded and posted to ledger successfully', payment, 201);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EXPENSES
// ==========================================
const getExpenses = async (req, res, next) => {
  try {
    await syncEmployeeUserLinks();
    const expenses = await Expense.find()
      .populate({ path: 'employee', select: 'firstName lastName profilePhoto', populate: { path: 'user', select: 'name avatar' } })
      .populate('department', 'name')
      .sort({ createdAt: -1 });

    return successResponse(res, 'Expenses retrieved', expenses);
  } catch (error) {
    next(error);
  }
};

const createExpense = async (req, res, next) => {
  try {
    const { title, category, amount, date, employee, department, paymentMethod, notes } = req.body;

    const count = await Expense.countDocuments();
    const expenseNumber = `EXP-${(count + 1001).toString()}`;

    const expense = await Expense.create({
      expenseNumber,
      title,
      category,
      amount,
      date: date || new Date(),
      employee: employee || null,
      department: department || null,
      paymentMethod: paymentMethod || 'Bank Transfer',
      status: 'Approved',
      approvedBy: req.user._id,
      notes,
    });

    await logAudit({
      req,
      action: 'CREATE',
      moduleName: 'Finance / Expenses',
      recordId: expense._id.toString(),
      newData: { expenseNumber, title, amount },
    });

    return successResponse(res, 'Expense recorded successfully', expense, 201);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CHART OF ACCOUNTS & GENERAL LEDGER
// ==========================================
const getAccounts = async (req, res, next) => {
  try {
    const accounts = await Account.find().sort({ code: 1 });
    return successResponse(res, 'Chart of accounts retrieved', accounts);
  } catch (error) {
    next(error);
  }
};

const createAccount = async (req, res, next) => {
  try {
    const { code, name, type, balance, description } = req.body;
    const account = await Account.create({ code, name, type, balance: balance || 0, description });
    return successResponse(res, 'Account created', account, 201);
  } catch (error) {
    next(error);
  }
};

const getJournalEntries = async (req, res, next) => {
  try {
    const entries = await JournalEntry.find()
      .populate('lines.account', 'code name type')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    return successResponse(res, 'General ledger journal entries retrieved', entries);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// TAX MANAGEMENT
// ==========================================
const getTaxes = async (req, res, next) => {
  try {
    const taxes = await Tax.find().sort({ name: 1 });
    return successResponse(res, 'Taxes list retrieved', taxes);
  } catch (error) {
    next(error);
  }
};

const createTax = async (req, res, next) => {
  try {
    const { name, code, rate, type, description } = req.body;
    const tax = await Tax.create({ name, code, rate, type: type || 'Percentage', description });
    return successResponse(res, 'Tax rate created', tax, 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
