const express = require('express');
const router = express.Router();
const {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getPurchaseOrders,
  createPurchaseOrder,
  updatePOStatus,
} = require('../controllers/purchasingController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

// Suppliers
router.route('/suppliers')
  .get(getSuppliers)
  .post(authorize('Super Admin', 'Admin', 'Purchase Manager', 'Inventory Manager'), createSupplier);

router.route('/suppliers/:id')
  .put(authorize('Super Admin', 'Admin', 'Purchase Manager'), updateSupplier)
  .delete(authorize('Super Admin', 'Admin', 'Purchase Manager'), deleteSupplier);

// Purchase Orders
router.route('/orders')
  .get(getPurchaseOrders)
  .post(authorize('Super Admin', 'Admin', 'Purchase Manager'), createPurchaseOrder);

router.put('/orders/:id/status', authorize('Super Admin', 'Admin', 'Purchase Manager', 'Inventory Manager'), updatePOStatus);

module.exports = router;
