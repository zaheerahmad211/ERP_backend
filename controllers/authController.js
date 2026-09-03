const User = require('../models/User');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const generateToken = require('../utils/generateToken');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../middleware/auditLogger');

const ensureEmployeeProfile = async (user) => {
  if (user.role !== 'Employee') return null;

  const existingEmployee = await Employee.findOne({
    $or: [{ user: user._id }, { email: user.email }],
  });
  if (existingEmployee) {
    if (!existingEmployee.user || existingEmployee.profilePhoto !== user.avatar) {
      existingEmployee.user = user._id;
      existingEmployee.profilePhoto = user.avatar;
      await existingEmployee.save();
    }
    return existingEmployee;
  }

  const nameParts = user.name.trim().split(/\s+/);
  const firstName = nameParts.shift() || user.name;
  const lastName = nameParts.join(' ') || firstName;
  const department = await Department.findOneAndUpdate(
    { code: 'GEN' },
    { name: 'General', code: 'GEN', description: 'Default employee department' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return Employee.create({
    employeeId: `EMP-${user._id.toString().slice(-6).toUpperCase()}`,
    user: user._id,
    firstName,
    lastName,
    email: user.email,
    phone: user.phone || '',
    department: department._id,
    designation: 'Employee',
    salary: 0,
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public / Admin
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return errorResponse(res, 'User with this email already exists', [], 400);
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'Employee',
    });

    await ensureEmployeeProfile(user);

    const token = generateToken(user._id, user.role);

    await logAudit({
      req,
      user,
      action: 'CREATE',
      moduleName: 'Authentication',
      recordId: user._id.toString(),
      newData: { name: user.name, email: user.email, role: user.role },
    });

    return successResponse(
      res,
      'User registered successfully',
      {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        token,
      },
      211
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Please provide email and password', [], 400);
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return errorResponse(res, 'Invalid email or password', [], 401);
    }

    if (user.status !== 'Active') {
      return errorResponse(res, `Account is ${user.status.toLowerCase()}. Contact administrator.`, [], 403);
    }

    await ensureEmployeeProfile(user);

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id, user.role);

    await logAudit({
      req,
      user,
      action: 'LOGIN',
      moduleName: 'Authentication',
      recordId: user._id.toString(),
    });

    return successResponse(res, 'Login successful', {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      avatar: user.avatar,
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    await ensureEmployeeProfile(user);
    return successResponse(res, 'User profile retrieved', user);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return errorResponse(res, 'User not found', [], 404);

    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;
    if (req.body.avatar) user.avatar = req.body.avatar;

    const updatedUser = await user.save();
    if (updatedUser.role === 'Employee') {
      await Employee.findOneAndUpdate(
        { user: updatedUser._id },
        { profilePhoto: updatedUser.avatar },
        { new: true }
      );
    }
    return successResponse(res, 'Profile updated successfully', updatedUser);
  } catch (error) {
    next(error);
  }
};

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.matchPassword(currentPassword))) {
      return errorResponse(res, 'Current password is incorrect', [], 400);
    }

    user.password = newPassword;
    await user.save();

    return successResponse(res, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
};
