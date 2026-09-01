const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const { successResponse, errorResponse, paginateResponse } = require('../utils/apiResponse');
const { logAudit } = require('../middleware/auditLogger');

// ==========================================
// EMPLOYEES
// ==========================================
const getEmployees = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const { search, department, status } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (department) query.department = department;
    if (status) query.status = status;

    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .populate('department', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return paginateResponse(res, 'Employees retrieved successfully', employees, page, limit, total);
  } catch (error) {
    next(error);
  }
};

const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('department', 'name code location');
    if (!employee) return errorResponse(res, 'Employee not found', [], 404);
    return successResponse(res, 'Employee details retrieved', employee);
  } catch (error) {
    next(error);
  }
};

const createEmployee = async (req, res, next) => {
  try {
    const {
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      gender,
      dateOfBirth,
      address,
      department,
      designation,
      joiningDate,
      employmentType,
      salary,
      bankInfo,
      emergencyContact,
    } = req.body;

    const existingEmp = await Employee.findOne({ $or: [{ email }, { employeeId }] });
    if (existingEmp) {
      return errorResponse(res, 'Employee with this Email or Employee ID already exists', [], 400);
    }

    const employee = await Employee.create({
      employeeId: employeeId || `EMP-${Date.now().toString().slice(-4)}`,
      firstName,
      lastName,
      email,
      phone,
      gender,
      dateOfBirth,
      address,
      department,
      designation,
      joiningDate,
      employmentType,
      salary,
      bankInfo,
      emergencyContact,
    });

    await logAudit({
      req,
      action: 'CREATE',
      moduleName: 'HR Management',
      recordId: employee._id.toString(),
      newData: { name: `${firstName} ${lastName}`, email, designation },
    });

    return successResponse(res, 'Employee created successfully', employee, 201);
  } catch (error) {
    next(error);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('department', 'name');

    if (!employee) return errorResponse(res, 'Employee not found', [], 404);

    await logAudit({
      req,
      action: 'UPDATE',
      moduleName: 'HR Management',
      recordId: employee._id.toString(),
    });

    return successResponse(res, 'Employee updated successfully', employee);
  } catch (error) {
    next(error);
  }
};

const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return errorResponse(res, 'Employee not found', [], 404);

    await logAudit({
      req,
      action: 'DELETE',
      moduleName: 'HR Management',
      recordId: req.params.id,
    });

    return successResponse(res, 'Employee record removed');
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DEPARTMENTS
// ==========================================
const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find().populate('manager', 'name email');
    
    // Attach employee counts per department
    const deptsWithCount = await Promise.all(
      departments.map(async (dept) => {
        const employeeCount = await Employee.countDocuments({ department: dept._id });
        return { ...dept.toObject(), employeeCount };
      })
    );

    return successResponse(res, 'Departments retrieved successfully', deptsWithCount);
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description, manager, location } = req.body;
    const dept = await Department.create({ name, code, description, manager, location });
    return successResponse(res, 'Department created successfully', dept, 201);
  } catch (error) {
    next(error);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!dept) return errorResponse(res, 'Department not found', [], 404);
    return successResponse(res, 'Department updated successfully', dept);
  } catch (error) {
    next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    await Department.findByIdAndDelete(req.params.id);
    return successResponse(res, 'Department deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ATTENDANCE
// ==========================================
const getAttendance = async (req, res, next) => {
  try {
    const { date, employeeId } = req.query;
    const query = {};
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }
    if (employeeId) query.employee = employeeId;

    const records = await Attendance.find(query).populate('employee', 'firstName lastName employeeId designation');
    return successResponse(res, 'Attendance records retrieved', records);
  } catch (error) {
    next(error);
  }
};

const markAttendance = async (req, res, next) => {
  try {
    const { employeeId, date, checkIn, checkOut, status, workingHours, remarks } = req.body;
    const recordDate = date ? new Date(date) : new Date();

    const startOfDay = new Date(recordDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(recordDate.setHours(23, 59, 59, 999));

    let attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (attendance) {
      attendance.checkIn = checkIn || attendance.checkIn;
      attendance.checkOut = checkOut || attendance.checkOut;
      attendance.status = status || attendance.status;
      attendance.workingHours = workingHours !== undefined ? workingHours : attendance.workingHours;
      attendance.remarks = remarks || attendance.remarks;
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        employee: employeeId,
        date: startOfDay,
        checkIn: checkIn || '09:00 AM',
        checkOut: checkOut || '05:00 PM',
        status: status || 'Present',
        workingHours: workingHours || 8,
        remarks,
      });
    }

    return successResponse(res, 'Attendance recorded successfully', attendance);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// LEAVE MANAGEMENT
// ==========================================
const getLeaves = async (req, res, next) => {
  try {
    const { status, employeeId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (employeeId) query.employee = employeeId;

    const leaves = await Leave.find(query)
      .populate('employee', 'firstName lastName employeeId designation')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    return successResponse(res, 'Leave applications retrieved', leaves);
  } catch (error) {
    next(error);
  }
};

const applyLeave = async (req, res, next) => {
  try {
    const { employee, leaveType, startDate, endDate, reason } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    const leave = await Leave.create({
      employee,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      status: 'Pending',
    });

    return successResponse(res, 'Leave application submitted successfully', leave, 201);
  } catch (error) {
    next(error);
  }
};

const updateLeaveStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) return errorResponse(res, 'Leave request not found', [], 404);

    leave.status = status;
    leave.remarks = remarks || leave.remarks;
    leave.approvedBy = req.user._id;
    leave.approvedAt = new Date();

    await leave.save();

    await logAudit({
      req,
      action: status === 'Approved' ? 'APPROVE' : 'REJECT',
      moduleName: 'Leave Management',
      recordId: leave._id.toString(),
    });

    return successResponse(res, `Leave request ${status.toLowerCase()}`, leave);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PAYROLL MANAGEMENT
// ==========================================
const getPayrolls = async (req, res, next) => {
  try {
    const { month, year, employeeId, status } = req.query;
    const query = {};
    if (month) query.month = parseInt(month, 10);
    if (year) query.year = parseInt(year, 10);
    if (employeeId) query.employee = employeeId;
    if (status) query.status = status;

    const payrolls = await Payroll.find(query)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId designation bankInfo',
        populate: { path: 'department', select: 'name' },
      })
      .sort({ year: -1, month: -1 });

    return successResponse(res, 'Payroll records retrieved', payrolls);
  } catch (error) {
    next(error);
  }
};

const generatePayroll = async (req, res, next) => {
  try {
    const { employeeId, month, year, basicSalary, allowances, bonus, overtime, tax, deductions, loans } = req.body;

    const emp = await Employee.findById(employeeId);
    if (!emp) return errorResponse(res, 'Employee not found', [], 404);

    const basic = basicSalary !== undefined ? Number(basicSalary) : emp.salary;
    const allow = Number(allowances || 0);
    const bon = Number(bonus || 0);
    const ot = Number(overtime || 0);

    const grossSalary = basic + allow + bon + ot;

    const t = Number(tax || 0);
    const ded = Number(deductions || 0);
    const ln = Number(loans || 0);

    const netSalary = grossSalary - t - ded - ln;

    const payroll = await Payroll.findOneAndUpdate(
      { employee: employeeId, month, year },
      {
        employee: employeeId,
        month,
        year,
        basicSalary: basic,
        allowances: allow,
        bonus: bon,
        overtime: ot,
        grossSalary,
        tax: t,
        deductions: ded,
        loans: ln,
        netSalary,
        status: 'Processed',
        paymentDate: new Date(),
      },
      { upsert: true, new: true }
    ).populate('employee', 'firstName lastName employeeId designation');

    await logAudit({
      req,
      action: 'CREATE',
      moduleName: 'Payroll Management',
      recordId: payroll._id.toString(),
      newData: { employee: emp.firstName, month, year, netSalary },
    });

    return successResponse(res, 'Payroll generated successfully', payroll);
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
