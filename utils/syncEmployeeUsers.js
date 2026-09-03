const Employee = require('../models/Employee');
const User = require('../models/User');

const syncEmployeeUserLinks = async () => {
  const unlinkedEmployees = await Employee.find({ user: null }).select('_id email');
  await Promise.all(unlinkedEmployees.map(async (employee) => {
    const user = await User.findOne({ email: employee.email }).select('_id avatar name');
    if (!user) return;
    await Employee.updateOne(
      { _id: employee._id, user: null },
      { user: user._id, profilePhoto: user.avatar }
    );
  }));
};

module.exports = syncEmployeeUserLinks;