const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const User = require("./models/User");

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to MongoDB Atlas");

    const existingAdmin = await User.findOne({
      email: "admin@example.com",
    });

    if (existingAdmin) {
      console.log("Admin user already exists.");
      process.exit(0);
    }

    const adminUser = await User.create({
      name: "System Admin",
      email: "admin@example.com",
      password: "Admin@123",
      role: "Super Admin",
      status: "Active",
      permissions: ["*"],
    });

    console.log("=================================");
    console.log("ADMIN CREATED SUCCESSFULLY");
    console.log("=================================");
    console.log("Email: admin@example.com");
    console.log("Password: Admin@123");
    console.log("Role: Super Admin");
    console.log("=================================");

    process.exit(0);
  } catch (error) {
    console.error("Failed to create admin:", error.message);
    process.exit(1);
  }
};

createAdmin();