const dotenv = require("dotenv");
const app = require("./app");
const connectDB = require("./config/db");

dotenv.config();

// =====================================================
// DATABASE CONNECTION
// =====================================================

connectDB()
  .then(() => {
    console.log("[ERP Server] MongoDB connected successfully");
  })
  .catch((error) => {
    console.error(
      "[ERP Server] MongoDB connection failed:",
      error.message
    );

    process.exit(1);
  });

// =====================================================
// LOCAL DEVELOPMENT SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(
      `[ERP Server] Server running in ${
        process.env.NODE_ENV || "development"
      } mode on port ${PORT}`
    );

    console.log(
      `[ERP Server] Local URL: http://localhost:${PORT}`
    );

    console.log(
      `[ERP Server] Health URL: http://localhost:${PORT}/api/health`
    );
  });
}

// =====================================================
// VERCEL / SERVERLESS EXPORT
// =====================================================

module.exports = app;