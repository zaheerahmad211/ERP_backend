const express = require('express');
const router = express.Router();
const {
  getDashboardData,
  getNotifications,
  markNotificationRead,
  getAuditLogs,
  deleteAuditLog,
  getSettings,
  updateSettings,
} = require('../controllers/systemController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/dashboard', authorize('Super Admin', 'Admin'), getDashboardData);
router.get('/notifications', getNotifications);
router.put('/notifications/read-all', markNotificationRead);

router.get('/audit-logs', authorize('Super Admin', 'Admin'), getAuditLogs);
router.delete('/audit-logs/:id', authorize('Super Admin', 'Admin'), deleteAuditLog);

router.route('/settings')
  .get(authorize('Super Admin', 'Admin'), getSettings)
  .put(authorize('Super Admin', 'Admin'), updateSettings);

module.exports = router;
