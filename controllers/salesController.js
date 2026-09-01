const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const SalesOrder = require('../models/SalesOrder');
const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const Invoice = require('../models/Invoice');
const { successResponse, errorResponse, paginateResponse } = require('../utils/apiResponse');
const { logAudit } = require('../middleware/auditLogger');

// ==========================================
// CUSTOMERS
// ==========================================
const getCustomers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const { search, status } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.status = status;

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);

    return paginateResponse(res, 'Customers retrieved successfully', customers, page, limit, total);
  } catch (error) {
    next(error);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    const { name, company, email, phone, address, city, country, taxNumber, creditLimit } = req.body;

    const count = await Customer.countDocuments();
    const customerId = `CUST-${(count + 1001).toString()}`;

    const customer = await Customer.create({
      customerId,
      name,
      company,
      email,
      phone,
      address,
      city,
      country,
      taxNumber,
      creditLimit: creditLimit || 10000,
    });

    await logAudit({
      req,
      action: 'CREATE',
      moduleName: 'CRM / Customers',
      recordId: customer._id.toString(),
      newData: { customerId, name, email },
    });

    return successResponse(res, 'Customer created successfully', customer, 201);
  } catch (error) {
    next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!customer) return errorResponse(res, 'Customer not found', [], 404);
    return successResponse(res, 'Customer updated', customer);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CRM LEADS & PIPELINE
// ==========================================
const getLeads = async (req, res, next) => {
  try {
    const leads = await Lead.find().populate('assignedTo', 'name email').sort({ createdAt: -1 });
    return successResponse(res, 'Leads retrieved', leads);
  } catch (error) {
    next(error);
  }
};

const createLead = async (req, res, next) => {
  try {
    const { title, customerName, company, email, phone, source, estimatedValue, followUpDate, notes } = req.body;
    const lead = await Lead.create({
      title,
      customerName,
      company,
      email,
      phone,
      source,
      estimatedValue: estimatedValue || 0,
      followUpDate,
      assignedTo: req.user._id,
      notes,
    });
    return successResponse(res, 'Lead created successfully', lead, 201);
  } catch (error) {
    next(error);
  }
};

const updateLeadStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const lead = await Lead.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!lead) return errorResponse(res, 'Lead not found', [], 404);
    return successResponse(res, 'Lead status updated', lead);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SALES ORDERS
// ==========================================
const getSalesOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const { orderStatus, customer } = req.query;

    const query = {};
    if (orderStatus) query.orderStatus = orderStatus;
    if (customer) query.customer = customer;

    const total = await SalesOrder.countDocuments(query);
    const orders = await SalesOrder.find(query)
      .populate('customer', 'name company email phone customerId')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return paginateResponse(res, 'Sales orders retrieved', orders, page, limit, total);
  } catch (error) {
    next(error);
  }
};

const createSalesOrder = async (req, res, next) => {
  try {
    const { customer, items, discountAmount, notes } = req.body;

    // Validate Stock for items
    for (const item of items) {
      const prod = await Product.findById(item.product);
      if (!prod) {
        return errorResponse(res, `Product ID ${item.product} not found`, [], 400);
      }
      if (prod.stockQuantity < item.quantity) {
        return errorResponse(
          res,
          `Insufficient stock for '${prod.name}'. Available: ${prod.stockQuantity}, Requested: ${item.quantity}`,
          [],
          400
        );
      }
    }

    const count = await SalesOrder.countDocuments();
    const orderNumber = `SO-${(count + 1001).toString()}`;

    let subtotal = 0;
    let taxAmount = 0;

    const processedItems = items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const lineTax = (lineTotal * (item.tax || 0)) / 100;
      subtotal += lineTotal;
      taxAmount += lineTax;
      return {
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        tax: item.tax || 0,
        total: lineTotal + lineTax - (item.discount || 0),
      };
    });

    const totalAmount = subtotal + taxAmount - (discountAmount || 0);

    const salesOrder = await SalesOrder.create({
      orderNumber,
      customer,
      items: processedItems,
      subtotal,
      taxAmount,
      discountAmount: discountAmount || 0,
      totalAmount,
      orderStatus: 'Pending',
      createdBy: req.user._id,
      notes,
    });

    await logAudit({
      req,
      action: 'CREATE',
      moduleName: 'Sales Orders',
      recordId: salesOrder._id.toString(),
      newData: { orderNumber, totalAmount },
    });

    return successResponse(res, 'Sales order created successfully', salesOrder, 201);
  } catch (error) {
    next(error);
  }
};

const updateSalesOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus } = req.body;
    const salesOrder = await SalesOrder.findById(req.params.id).populate('items.product');
    if (!salesOrder) return errorResponse(res, 'Sales order not found', [], 404);

    const prevStatus = salesOrder.orderStatus;
    salesOrder.orderStatus = orderStatus;
    await salesOrder.save();

    // If order status changed to Completed, reduce stock & auto-create invoice!
    if (orderStatus === 'Completed' && prevStatus !== 'Completed') {
      for (const item of salesOrder.items) {
        const prod = await Product.findById(item.product._id || item.product);
        if (prod) {
          const prevStock = prod.stockQuantity;
          prod.stockQuantity = Math.max(0, prod.stockQuantity - item.quantity);
          await prod.save();

          await InventoryTransaction.create({
            product: prod._id,
            warehouse: prod.warehouse || null,
            type: 'OUT',
            quantity: item.quantity,
            previousStock: prevStock,
            currentStock: prod.stockQuantity,
            reference: salesOrder.orderNumber,
            notes: `Fulfillment of Sales Order ${salesOrder.orderNumber}`,
            user: req.user._id,
          });
        }
      }

      // Auto-generate invoice
      const invCount = await Invoice.countDocuments();
      const invoiceNumber = `INV-${(invCount + 1001).toString()}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const invoice = await Invoice.create({
        invoiceNumber,
        customer: salesOrder.customer,
        salesOrder: salesOrder._id,
        dueDate,
        items: salesOrder.items.map((i) => ({
          product: i.product._id || i.product,
          description: i.product.name || 'Sales Item',
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          tax: i.tax,
          total: i.total,
        })),
        subtotal: salesOrder.subtotal,
        taxAmount: salesOrder.taxAmount,
        discountAmount: salesOrder.discountAmount,
        totalAmount: salesOrder.totalAmount,
        balanceDue: salesOrder.totalAmount,
        status: 'Sent',
      });

      // Update customer balance
      const customer = await Customer.findById(salesOrder.customer);
      if (customer) {
        customer.outstandingBalance += salesOrder.totalAmount;
        await customer.save();
      }
    }

    await logAudit({
      req,
      action: 'UPDATE',
      moduleName: 'Sales Orders',
      recordId: salesOrder._id.toString(),
      newData: { orderNumber: salesOrder.orderNumber, status: orderStatus },
    });

    return successResponse(res, `Sales Order status updated to '${orderStatus}'`, salesOrder);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
  getLeads,
  createLead,
  updateLeadStatus,
  getSalesOrders,
  createSalesOrder,
  updateSalesOrderStatus,
};
