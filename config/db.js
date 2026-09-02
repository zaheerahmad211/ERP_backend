const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Reuse existing MongoDB connection
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    // Make sure MONGO_URI exists
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(
      `[MongoDB] Connected: ${conn.connection.host} / ${conn.connection.name}`
    );

    return conn.connection;
  } catch (error) {
    console.error(`[MongoDB Error] ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;