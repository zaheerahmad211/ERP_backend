const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return errorResponse(res, 'Not authorized, token missing', [], 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_jwt_secret');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return errorResponse(res, 'User associated with this token no longer exists', [], 401);
    }

    if (user.status !== 'Active') {
      return errorResponse(res, `Account is ${user.status.toLowerCase()}. Access denied.`, [], 403);
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 'Not authorized, token validation failed', [error.message], 401);
  }
};

module.exports = { protect };
