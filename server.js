const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const connectDB = require("./config/db");

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
  });

// =====================================================
// LOCAL DEVELOPMENT
// =====================================================

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(
      `[ERP Server] Server running on port ${PORT}`
    );

    console.log(
      `[ERP Server] Health: http://localhost:${PORT}/api/health`
    );
  });
}

// =====================================================
// VERCEL SERVERLESS EXPORT
// =====================================================

module.exports = app;