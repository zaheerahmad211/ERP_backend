const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const User = require("./models/User");

const createHRManager = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = "hr@example.com";

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("HR Manager already exists.");
      process.exit(0);
    }

    const user = await User.create({
      name: "Sarah Jenkins",
      email: email,
      password: "Admin@123",
      role: "HR Manager",
      status: "Active",
      permissions: [],
    });

    console.log("HR MANAGER CREATED");
    console.log("Email:", user.email);
    console.log("Password: Admin@123");
    console.log("Role:", user.role);

    process.exit(0);
  } catch (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  }
};

createHRManager();