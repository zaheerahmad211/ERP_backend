const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/productController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

// Products
router.route('/products')
  .get(getProducts)
  .post(authorize('Super Admin', 'Admin', 'Inventory Manager', 'Purchase Manager'), createProduct);

router.route('/products/:id')
  .get(getProductById)
  .put(authorize('Super Admin', 'Admin', 'Inventory Manager'), updateProduct)
  .delete(authorize('Super Admin', 'Admin', 'Inventory Manager'), deleteProduct);

// Categories
router.route('/categories')
  .get(getCategories)
  .post(authorize('Super Admin', 'Admin', 'Inventory Manager'), createCategory);

// Warehouses
router.route('/warehouses')
  .get(getWarehouses)
  .post(authorize('Super Admin', 'Admin', 'Inventory Manager'), createWarehouse);

// Inventory Transfers & Ledger
router.post('/inventory/transfer', authorize('Super Admin', 'Admin', 'Inventory Manager'), transferStock);
router.get('/inventory/ledger', getInventoryLedger);

module.exports = router;
