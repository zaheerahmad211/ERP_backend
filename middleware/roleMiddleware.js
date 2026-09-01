const { errorResponse } = require('../utils/apiResponse');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'User authentication required', [], 401);
    }

    // Super Admin and Admin bypass specific role checks
    if (req.user.role === 'Super Admin' || req.user.role === 'Admin') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Role '${req.user.role}' is not authorized to access this resource`,
        [],
        403
      );
    }

    next();
  };
};

module.exports = { authorize };
