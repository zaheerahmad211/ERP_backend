const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Already connected
    if (mongoose.connection.readyState === 1) {
      console.log("[MongoDB] Already connected");
      return mongoose.connection;
    }

    // Connection is currently being established
    if (mongoose.connection.readyState === 2) {
      console.log("[MongoDB] Connection already in progress");
      return mongoose.connection;
    }

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    const connection = await mongoose.connect(
      process.env.MONGO_URI,
      {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 1,
      }
    );

    console.log(
      `[MongoDB] Connected successfully: ${connection.connection.host}`
    );

    return connection.connection;
  } catch (error) {
    console.error(
      "[MongoDB] Connection failed:",
      error.message
    );

    throw error;
  }
};

// =====================================================
// MONGOOSE CONNECTION EVENTS
// =====================================================

mongoose.connection.on("connected", () => {
  console.log("[MongoDB] Mongoose connected");
});

mongoose.connection.on("error", (error) => {
  console.error(
    "[MongoDB] Mongoose error:",
    error.message
  );
});

mongoose.connection.on("disconnected", () => {
  console.log("[MongoDB] Mongoose disconnected");
});

module.exports = connectDB;