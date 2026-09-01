const AuditLog = require('../models/AuditLog');

const logAudit = async ({
  req,
  user,
  action,
  moduleName,
  recordId = null,
  oldData = null,
  newData = null,
}) => {
  try {
    const activeUser = user || (req && req.user);
    const ipAddress = req ? req.ip || req.connection?.remoteAddress || '127.0.0.1' : '127.0.0.1';
    const userAgent = req ? req.headers['user-agent'] || '' : '';

    await AuditLog.create({
      user: activeUser ? activeUser._id : null,
      userName: activeUser ? activeUser.name : 'System',
      userRole: activeUser ? activeUser.role : 'System',
      action,
      module: moduleName,
      recordId,
      oldData,
      newData,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error(`[Audit Log Fail] ${error.message}`);
  }
};

module.exports = { logAudit };
