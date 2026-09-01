const express = require('express');
const router = express.Router();
const {
  getCustomers,
  createCustomer,
  updateCustomer,
  getLeads,
  createLead,
  updateLeadStatus,
  getSalesOrders,
  createSalesOrder,
  updateSalesOrderStatus,
} = require('../controllers/salesController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

// Customers
router.route('/customers')
  .get(getCustomers)
  .post(authorize('Super Admin', 'Admin', 'Sales Manager', 'Sales Employee'), createCustomer);

router.put('/customers/:id', authorize('Super Admin', 'Admin', 'Sales Manager'), updateCustomer);

// CRM Leads
router.route('/leads')
  .get(getLeads)
  .post(createLead);

router.put('/leads/:id/status', updateLeadStatus);

// Sales Orders
router.route('/orders')
  .get(getSalesOrders)
  .post(authorize('Super Admin', 'Admin', 'Sales Manager', 'Sales Employee'), createSalesOrder);

router.put('/orders/:id/status', authorize('Super Admin', 'Admin', 'Sales Manager', 'Inventory Manager'), updateSalesOrderStatus);

module.exports = router;
