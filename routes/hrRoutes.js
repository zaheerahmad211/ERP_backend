const express = require('express');
const router = express.Router();
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getAttendance,
  markAttendance,
  getLeaves,
  applyLeave,
  updateLeaveStatus,
  getPayrolls,
  generatePayroll,
} = require('../controllers/hrController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

// Employees
router.route('/employees')
  .get(getEmployees)
  .post(authorize('Super Admin', 'Admin', 'HR Manager'), createEmployee);

router.route('/employees/:id')
  .get(getEmployeeById)
  .put(authorize('Super Admin', 'Admin', 'HR Manager'), updateEmployee)
  .delete(authorize('Super Admin', 'Admin', 'HR Manager'), deleteEmployee);

// Departments
router.route('/departments')
  .get(getDepartments)
  .post(authorize('Super Admin', 'Admin', 'HR Manager'), createDepartment);

router.route('/departments/:id')
  .put(authorize('Super Admin', 'Admin', 'HR Manager'), updateDepartment)
  .delete(authorize('Super Admin', 'Admin', 'HR Manager'), deleteDepartment);

// Attendance
router.route('/attendance')
  .get(getAttendance)
  .post(markAttendance);

// Leave
router.route('/leave')
  .get(getLeaves)
  .post(applyLeave);

router.put('/leave/:id/status', authorize('Super Admin', 'Admin', 'HR Manager'), updateLeaveStatus);

// Payroll
router.route('/payroll')
  .get(authorize('Super Admin', 'Admin', 'HR Manager', 'Accountant'), getPayrolls)
  .post(authorize('Super Admin', 'Admin', 'HR Manager', 'Accountant'), generatePayroll);

module.exports = router;
