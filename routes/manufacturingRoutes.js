const express = require('express');
const router = express.Router();
const {
  getBOMs,
  createBOM,
  getProductionOrders,
  createProductionOrder,
  updateProductionStatus,
} = require('../controllers/manufacturingController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.route('/bom')
  .get(getBOMs)
  .post(authorize('Super Admin', 'Admin', 'Production Manager'), createBOM);

router.route('/orders')
  .get(getProductionOrders)
  .post(authorize('Super Admin', 'Admin', 'Production Manager'), createProductionOrder);

router.put('/orders/:id/status', authorize('Super Admin', 'Admin', 'Production Manager'), updateProductionStatus);

module.exports = router;
