const { errorResponse } = require('../utils/apiResponse');

const hasPermission = (permissionKey) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'User authentication required', [], 401);
    }

    // Super Admin and Admin bypass permission checks
    if (req.user.role === 'Super Admin' || req.user.role === 'Admin') {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    if (!userPermissions.includes(permissionKey) && !userPermissions.includes('*')) {
      return errorResponse(
        res,
        `Permission '${permissionKey}' required to perform this operation`,
        [],
        403
      );
    }

    next();
  };
};

module.exports = { hasPermission };
