const mongoose = require("mongoose");

const connectDB = async () => {
  // Already connected
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // Connection is currently being established
  if (mongoose.connection.readyState === 2) {
    return;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined");
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });

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