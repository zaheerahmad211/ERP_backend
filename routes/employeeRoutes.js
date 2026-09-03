const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  getEmployeeDashboard,
  getAttendanceHistory,
  checkIn,
  checkOut,
  requestCorrection,
} = require('../controllers/employeeController');

router.use(protect, authorize('Employee'));
router.get('/dashboard', getEmployeeDashboard);
router.get('/attendance', getAttendanceHistory);
router.post('/attendance/check-in', checkIn);
router.post('/attendance/check-out', checkOut);
router.post('/attendance/:id/correction', requestCorrection);

module.exports = router;