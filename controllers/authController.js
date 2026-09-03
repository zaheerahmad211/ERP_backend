const User = require('../models/User');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const generateToken = require('../utils/generateToken');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../middleware/auditLogger');
const upload = require('../middleware/upload');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

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
    await Employee.findOneAndUpdate({ user: updatedUser._id }, { profilePhoto: updatedUser.avatar });
    return successResponse(res, 'Profile updated successfully', updatedUser);
  } catch (error) {
    next(error);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return errorResponse(res, 'Please select an image file', [], 400);
    const user = await User.findById(req.user._id);
    if (!user) return errorResponse(res, 'User not found', [], 404);

    user.avatar = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const updatedUser = await user.save();
    await Employee.findOneAndUpdate({ user: updatedUser._id }, { profilePhoto: updatedUser.avatar });
    return successResponse(res, 'Profile picture uploaded successfully', updatedUser);
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

const forgotPassword = async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const genericResponse = 'If an account exists for that email, password reset instructions have been prepared.';
    if (!email) return errorResponse(res, 'Please provide your email address.', [], 400);

    const user = await User.findOne({ email });
    if (!user) return successResponse(res, genericResponse);

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;
    const hasEmailConfig = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'].every((key) => process.env[key]);
    if (hasEmailConfig) {
      await sendEmail({
        to: user.email,
        subject: 'Reset your ERP password',
        text: `Use this link to reset your ERP password. It expires in 15 minutes: ${resetUrl}`,
        html: `<p>Use the link below to reset your ERP password. It expires in 15 minutes.</p><p><a href="${resetUrl}">Reset password</a></p>`,
      });
    } else if (process.env.NODE_ENV === 'production') {
      return errorResponse(res, 'Password reset email service is not configured. Please contact an administrator.', [], 503);
    }

    if (process.env.NODE_ENV !== 'production') {
      return successResponse(res, genericResponse, { resetUrl });
    }
    return successResponse(res, genericResponse);
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpires');
    if (!user) return errorResponse(res, 'Reset link is invalid or expired.', [], 400);
    if (!req.body.password || req.body.password.length < 6) return errorResponse(res, 'Password must be at least 6 characters.', [], 400);

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return successResponse(res, 'Password reset successfully. You can now sign in.');
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
  ensureEmployeeProfile,
  uploadAvatar,
  avatarUploadMiddleware: upload.single('avatar'),
  forgotPassword,
  resetPassword,
};
