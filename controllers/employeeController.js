const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const getEmployee = (req) => Employee.findOne({ user: req.user._id });

const dayBounds = (value = new Date()) => {
  const date = new Date(value);
  const start = new Date(date.setHours(0, 0, 0, 0));
  const end = new Date(date.setHours(23, 59, 59, 999));
  return { start, end };
};

const monthBounds = (value = new Date()) => {
  const date = new Date(value);
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
  };
};

const getWeekendDates = (start, end) => {
  const weekends = [];
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    if ([0, 6].includes(date.getDay())) weekends.push(new Date(date));
  }
  return weekends;
};

const getEmployeeDashboard = async (req, res, next) => {
  try {
    const employee = await getEmployee(req);
    if (!employee) return errorResponse(res, 'Employee profile not found', [], 404);

    const today = dayBounds();
    const month = monthBounds();
    const [todayAttendance, monthAttendance, pendingLeaves, approvedAnnual, announcements] = await Promise.all([
      Attendance.findOne({ employee: employee._id, date: { $gte: today.start, $lte: today.end } }),
      Attendance.find({ employee: employee._id, date: { $gte: month.start, $lte: month.end } }).sort({ date: 1 }),
      Leave.countDocuments({ employee: employee._id, status: 'Pending' }),
      Leave.aggregate([
        { $match: { employee: employee._id, leaveType: 'Annual', status: 'Approved', startDate: { $gte: new Date(new Date().getFullYear(), 0, 1) } } },
        { $group: { _id: null, days: { $sum: '$totalDays' } } },
      ]),
      Notification.find({ user: req.user._id, type: 'info' }).sort({ createdAt: -1 }).limit(5),
    ]);

    const workedDays = monthAttendance.filter((record) => ['Present', 'Late', 'Half Day'].includes(record.status)).length;
    const absentDays = monthAttendance.filter((record) => record.status === 'Absent').length;
    const leaveBalance = Math.max(0, 20 - (approvedAnnual[0]?.days || 0));

    return successResponse(res, 'Employee dashboard loaded', {
      employee,
      today: todayAttendance,
      monthAttendance,
      summary: { workedDays, absentDays, leaveBalance, pendingLeaves },
      announcements,
      weekends: getWeekendDates(month.start, month.end),
      holidays: [],
    });
  } catch (error) {
    next(error);
  }
};

const getAttendanceHistory = async (req, res, next) => {
  try {
    const employee = await getEmployee(req);
    if (!employee) return errorResponse(res, 'Employee profile not found', [], 404);
    const bounds = monthBounds(req.query.month ? new Date(`${req.query.month}-01`) : new Date());
    const records = await Attendance.find({ employee: employee._id, date: { $gte: bounds.start, $lte: bounds.end } }).sort({ date: -1 });
    return successResponse(res, 'Attendance history retrieved', records);
  } catch (error) {
    next(error);
  }
};

const checkIn = async (req, res, next) => {
  try {
    const employee = await getEmployee(req);
    if (!employee) return errorResponse(res, 'Employee profile not found', [], 404);
    const { start, end } = dayBounds();
    const existing = await Attendance.findOne({ employee: employee._id, date: { $gte: start, $lte: end } });
    if (existing?.checkIn) return errorResponse(res, 'You have already checked in today', [], 400);
    const now = new Date();
    const checkInTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const status = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15) ? 'Late' : 'Present';
    const attendance = existing || new Attendance({ employee: employee._id, date: start });
    attendance.checkIn = checkInTime;
    attendance.status = status;
    await attendance.save();
    return successResponse(res, 'Checked in successfully', attendance);
  } catch (error) {
    next(error);
  }
};

const checkOut = async (req, res, next) => {
  try {
    const employee = await getEmployee(req);
    if (!employee) return errorResponse(res, 'Employee profile not found', [], 404);
    const { start, end } = dayBounds();
    const attendance = await Attendance.findOne({ employee: employee._id, date: { $gte: start, $lte: end } });
    if (!attendance?.checkIn) return errorResponse(res, 'Check in before checking out', [], 400);
    if (attendance.checkOut) return errorResponse(res, 'You have already checked out today', [], 400);
    const now = new Date();
    attendance.checkOut = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const [inHour, inMinute] = attendance.checkIn.replace(/ AM| PM/, '').split(':').map(Number);
    const checkInDate = new Date(start);
    checkInDate.setHours(inHour + (attendance.checkIn.includes('PM') && inHour !== 12 ? 12 : 0), inMinute);
    attendance.workingHours = Math.max(0, Number(((now - checkInDate) / 3600000).toFixed(2)));
    await attendance.save();
    return successResponse(res, 'Checked out successfully', attendance);
  } catch (error) {
    next(error);
  }
};

const requestCorrection = async (req, res, next) => {
  try {
    const employee = await getEmployee(req);
    if (!employee) return errorResponse(res, 'Employee profile not found', [], 404);
    const attendance = await Attendance.findOne({ _id: req.params.id, employee: employee._id });
    if (!attendance) return errorResponse(res, 'Attendance record not found', [], 404);
    if (!req.body.request) return errorResponse(res, 'Please provide a correction request', [], 400);
    attendance.correctionRequest = req.body.request;
    attendance.correctionStatus = 'Pending';
    attendance.correctionRequestedAt = new Date();
    await attendance.save();
    return successResponse(res, 'Attendance correction requested', attendance);
  } catch (error) {
    next(error);
  }
};

module.exports = { getEmployeeDashboard, getAttendanceHistory, checkIn, checkOut, requestCorrection };