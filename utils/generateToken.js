const jwt = require('jsonwebtoken');

const generateToken = (userId, role = 'Employee') => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'fallback_jwt_secret',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

module.exports = generateToken;
