const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined");
    }

    if (mongoose.connection.readyState === 1) {
      console.log("[MongoDB] Already connected");
      return;
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("[MongoDB] Connected successfully");
  } catch (error) {
    console.error(
      "[MongoDB] Connection failed:",
      error.message
    );

    throw error;
  }
};

module.exports = connectDB;