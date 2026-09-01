const Product = require('../models/Product');
const Category = require('../models/Category');
const Warehouse = require('../models/Warehouse');
const InventoryTransaction = require('../models/InventoryTransaction');
const { successResponse, errorResponse, paginateResponse } = require('../utils/apiResponse');
const { logAudit } = require('../middleware/auditLogger');

// ==========================================
// PRODUCTS
// ==========================================
const getProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const { search, category, warehouse, lowStock } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (warehouse) query.warehouse = warehouse;
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stockQuantity', '$minimumStock'] };
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('warehouse', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return paginateResponse(res, 'Products retrieved successfully', products, page, limit, total);
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('warehouse', 'name location');
    if (!product) return errorResponse(res, 'Product not found', [], 404);
    return successResponse(res, 'Product details retrieved', product);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const {
      sku,
      name,
      description,
      category,
      brand,
      unit,
      purchasePrice,
      sellingPrice,
      taxRate,
      stockQuantity,
      minimumStock,
      warehouse,
      image,
    } = req.body;

    const existingSKU = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingSKU) {
      return errorResponse(res, `Product SKU '${sku}' already exists`, [], 400);
    }

    const product = await Product.create({
      sku: sku.toUpperCase(),
      name,
      description,
      category,
      brand,
      unit,
      purchasePrice,
      sellingPrice,
      taxRate,
      stockQuantity: stockQuantity || 0,
      minimumStock: minimumStock || 10,
      warehouse,
      image,
    });

    if (stockQuantity && stockQuantity > 0 && warehouse) {
      await InventoryTransaction.create({
        product: product._id,
        warehouse,
        type: 'IN',
        quantity: stockQuantity,
        previousStock: 0,
        currentStock: stockQuantity,
        reference: 'Initial Stock',
        notes: 'Initial inventory creation',
        user: req.user._id,
      });
    }

    await logAudit({
      req,
      action: 'CREATE',
      moduleName: 'Product Management',
      recordId: product._id.toString(),
      newData: { name: product.name, sku: product.sku, stock: product.stockQuantity },
    });

    return successResponse(res, 'Product created successfully', product, 201);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return errorResponse(res, 'Product not found', [], 404);

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('category', 'name')
      .populate('warehouse', 'name');

    await logAudit({
      req,
      action: 'UPDATE',
      moduleName: 'Product Management',
      recordId: product._id.toString(),
    });

    return successResponse(res, 'Product updated successfully', updatedProduct);
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return errorResponse(res, 'Product not found', [], 404);

    await logAudit({
      req,
      action: 'DELETE',
      moduleName: 'Product Management',
      recordId: req.params.id,
    });

    return successResponse(res, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CATEGORIES
// ==========================================
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().populate('parentCategory', 'name');
    return successResponse(res, 'Categories retrieved', categories);
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, parentCategory, description } = req.body;
    const category = await Category.create({ name, parentCategory: parentCategory || null, description });
    return successResponse(res, 'Category created', category, 201);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// WAREHOUSES & STOCK TRANSFERS
// ==========================================
const getWarehouses = async (req, res, next) => {
  try {
    const warehouses = await Warehouse.find().populate('manager', 'name email');
    return successResponse(res, 'Warehouses retrieved', warehouses);
  } catch (error) {
    next(error);
  }
};

const createWarehouse = async (req, res, next) => {
  try {
    const { name, code, location, manager, capacity } = req.body;
    const warehouse = await Warehouse.create({ name, code, location, manager, capacity });
    return successResponse(res, 'Warehouse created', warehouse, 201);
  } catch (error) {
    next(error);
  }
};

const transferStock = async (req, res, next) => {
  try {
    const { productId, fromWarehouseId, toWarehouseId, quantity, notes } = req.body;

    const product = await Product.findById(productId);
    if (!product) return errorResponse(res, 'Product not found', [], 404);

    if (product.stockQuantity < quantity) {
      return errorResponse(res, `Insufficient stock. Current stock is ${product.stockQuantity}`, [], 400);
    }

    // Create Transfer Inventory Transaction
    await InventoryTransaction.create({
      product: product._id,
      warehouse: fromWarehouseId,
      type: 'TRANSFER',
      quantity,
      previousStock: product.stockQuantity,
      currentStock: product.stockQuantity - quantity,
      reference: `Transfer to WH #${toWarehouseId}`,
      notes: notes || 'Stock Transfer',
      user: req.user._id,
    });

    await logAudit({
      req,
      action: 'UPDATE',
      moduleName: 'Inventory Management',
      recordId: product._id.toString(),
      newData: { transferred: quantity, from: fromWarehouseId, to: toWarehouseId },
    });

    return successResponse(res, 'Stock transferred successfully');
  } catch (error) {
    next(error);
  }
};

const getInventoryLedger = async (req, res, next) => {
  try {
    const { productId } = req.query;
    const query = {};
    if (productId) query.product = productId;

    const transactions = await InventoryTransaction.find(query)
      .populate('product', 'name sku')
      .populate('warehouse', 'name code')
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    return successResponse(res, 'Inventory transaction ledger retrieved', transactions);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  getWarehouses,
  createWarehouse,
  transferStock,
  getInventoryLedger,
};
