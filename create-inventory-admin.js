const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const User = require("./models/User");

const createInventoryManager = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = "inventory@example.com";

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("Inventory Manager already exists.");
      process.exit(0);
    }

    const user = await User.create({
      name: "Marcus Brody",
      email: email,
      password: "Admin@123",
      role: "Inventory Manager",
      status: "Active",
      permissions: [],
    });

    console.log("INVENTORY MANAGER CREATED");
    console.log("Email:", user.email);
    console.log("Password: Admin@123");
    console.log("Role:", user.role);

    process.exit(0);
  } catch (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  }
};

createInventoryManager();