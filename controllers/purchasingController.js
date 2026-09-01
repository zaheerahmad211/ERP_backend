const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const { successResponse, errorResponse, paginateResponse } = require('../utils/apiResponse');
const { logAudit } = require('../middleware/auditLogger');

// ==========================================
// SUPPLIERS
// ==========================================
const getSuppliers = async (req, res, next) => {
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
      ];
    }
    if (status) query.status = status;

    const total = await Supplier.countDocuments(query);
    const suppliers = await Supplier.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);

    return paginateResponse(res, 'Suppliers retrieved successfully', suppliers, page, limit, total);
  } catch (error) {
    next(error);
  }
};

const createSupplier = async (req, res, next) => {
  try {
    const { name, company, email, phone, address, taxNumber, paymentTerms, bankInfo } = req.body;
    const supplier = await Supplier.create({
      name,
      company,
      email,
      phone,
      address,
      taxNumber,
      paymentTerms,
      bankInfo,
    });

    await logAudit({
      req,
      action: 'CREATE',
      moduleName: 'Supplier Management',
      recordId: supplier._id.toString(),
      newData: { name, company },
    });

    return successResponse(res, 'Supplier created successfully', supplier, 201);
  } catch (error) {
    next(error);
  }
};

const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supplier) return errorResponse(res, 'Supplier not found', [], 404);
    return successResponse(res, 'Supplier updated', supplier);
  } catch (error) {
    next(error);
  }
};

const deleteSupplier = async (req, res, next) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id);
    return successResponse(res, 'Supplier deleted');
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PURCHASE ORDERS
// ==========================================
const getPurchaseOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const { status, supplier } = req.query;

    const query = {};
    if (status) query.status = status;
    if (supplier) query.supplier = supplier;

    const total = await PurchaseOrder.countDocuments(query);
    const pos = await PurchaseOrder.find(query)
      .populate('supplier', 'name company email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return paginateResponse(res, 'Purchase orders retrieved', pos, page, limit, total);
  } catch (error) {
    next(error);
  }
};

const createPurchaseOrder = async (req, res, next) => {
  try {
    const { supplier, expectedDeliveryDate, items, discount, notes } = req.body;

    const count = await PurchaseOrder.countDocuments();
    const poNumber = `PO-${(count + 1001).toString()}`;

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
        tax: item.tax || 0,
        total: lineTotal + lineTax,
      };
    });

    const totalAmount = subtotal + taxAmount - (discount || 0);

    const po = await PurchaseOrder.create({
      poNumber,
      supplier,
      expectedDeliveryDate,
      items: processedItems,
      subtotal,
      taxAmount,
      discount: discount || 0,
      totalAmount,
      status: 'Pending Approval',
      createdBy: req.user._id,
      notes,
    });

    await logAudit({
      req,
      action: 'CREATE',
      moduleName: 'Purchase Orders',
      recordId: po._id.toString(),
      newData: { poNumber, totalAmount },
    });

    return successResponse(res, 'Purchase order created successfully', po, 201);
  } catch (error) {
    next(error);
  }
};

// Update PO Status (e.g. Approve or Receive Goods)
const updatePOStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const po = await PurchaseOrder.findById(req.params.id).populate('items.product');
    if (!po) return errorResponse(res, 'Purchase order not found', [], 404);

    const previousStatus = po.status;
    po.status = status;
    await po.save();

    // If PO is marked as 'Received' for the first time, auto-increment inventory stock!
    if (status === 'Received' && previousStatus !== 'Received') {
      for (const item of po.items) {
        const product = await Product.findById(item.product._id || item.product);
        if (product) {
          const prevStock = product.stockQuantity;
          product.stockQuantity += item.quantity;
          await product.save();

          // Create Stock IN inventory transaction
          await InventoryTransaction.create({
            product: product._id,
            warehouse: product.warehouse || req.user.warehouse || null,
            type: 'IN',
            quantity: item.quantity,
            previousStock: prevStock,
            currentStock: product.stockQuantity,
            reference: po.poNumber,
            notes: `Received via Purchase Order ${po.poNumber}`,
            user: req.user._id,
          });
        }
      }

      // Update supplier balance
      const supplier = await Supplier.findById(po.supplier);
      if (supplier) {
        supplier.outstandingBalance += po.totalAmount;
        await supplier.save();
      }
    }

    await logAudit({
      req,
      action: 'UPDATE',
      moduleName: 'Purchase Orders',
      recordId: po._id.toString(),
      newData: { poNumber: po.poNumber, status },
    });

    return successResponse(res, `Purchase Order status updated to '${status}'`, po);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getPurchaseOrders,
  createPurchaseOrder,
  updatePOStatus,
};
