const app = require("../app");
const connectDB = require("../config/db");

let isConnected = false;

module.exports = async (req, res) => {
  try {
    if (req.method === 'OPTIONS' || req.url === '/api/health' || req.url === '/health') {
      return app(req, res);
    }

    if (!isConnected) {
      await connectDB();
      isConnected = true;
    }

    return app(req, res);
  } catch (error) {
    console.error("[Vercel] Database connection error:", error);
    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
};