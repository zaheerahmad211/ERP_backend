const User = require('../models/User');
const Role = require('../models/Role');
const { successResponse, errorResponse, paginateResponse } = require('../utils/apiResponse');
const { logAudit } = require('../middleware/auditLogger');

// @desc    Get all users (with search, filter, pagination)
// @route   GET /api/users
// @access  Private (Admin)
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const { search, role, status } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) query.role = role;
    if (status) query.status = status;

    const total = await User.countDocuments(query);
    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);

    return paginateResponse(res, 'Users retrieved successfully', users, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return errorResponse(res, 'User not found', [], 404);
    return successResponse(res, 'User details retrieved', user);
  } catch (error) {
    next(error);
  }
};

// @desc    Create user by Admin
// @route   POST /api/users
// @access  Private (Admin)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, permissions, status } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'User with this email already exists', [], 400);
    }

    const user = await User.create({
      name,
      email,
      password: password || 'Default@123',
      phone,
      role: role || 'Employee',
      permissions: permissions || [],
      status: status || 'Active',
    });

    await logAudit({
      req,
      action: 'CREATE',
      moduleName: 'User Management',
      recordId: user._id.toString(),
      newData: { name: user.name, email: user.email, role: user.role },
    });

    return successResponse(res, 'User created successfully', user, 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return errorResponse(res, 'User not found', [], 404);

    const oldData = { name: user.name, role: user.role, status: user.status };

    user.name = req.body.name || user.name;
    user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
    user.role = req.body.role || user.role;
    user.status = req.body.status || user.status;
    if (req.body.permissions) user.permissions = req.body.permissions;

    const updatedUser = await user.save();

    await logAudit({
      req,
      action: 'UPDATE',
      moduleName: 'User Management',
      recordId: user._id.toString(),
      oldData,
      newData: { name: updatedUser.name, role: updatedUser.role, status: updatedUser.status },
    });

    return successResponse(res, 'User updated successfully', updatedUser);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/Deactivate user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return errorResponse(res, 'User not found', [], 404);

    await user.deleteOne();

    await logAudit({
      req,
      action: 'DELETE',
      moduleName: 'User Management',
      recordId: req.params.id,
      oldData: { name: user.name, email: user.email },
    });

    return successResponse(res, 'User removed successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get roles list
// @route   GET /api/users/roles
// @access  Private
const getRoles = async (req, res, next) => {
  try {
    const roles = await Role.find();
    return successResponse(res, 'Roles retrieved', roles);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
};
