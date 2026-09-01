const express = require('express');
const router = express.Router();
const {
  getDashboardData,
  getNotifications,
  markNotificationRead,
  getAuditLogs,
  getSettings,
  updateSettings,
} = require('../controllers/systemController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/dashboard', getDashboardData);
router.get('/notifications', getNotifications);
router.put('/notifications/read-all', markNotificationRead);

router.get('/audit-logs', authorize('Super Admin', 'Admin'), getAuditLogs);

router.route('/settings')
  .get(getSettings)
  .put(authorize('Super Admin', 'Admin'), updateSettings);

module.exports = router;
