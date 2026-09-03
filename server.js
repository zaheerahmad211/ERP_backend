const dotenv = require("dotenv");

dotenv.config();

const app = require("./app");
const connectDB = require("./config/db");

// =====================================================
// MONGODB CONNECTION CACHE
// =====================================================

let dbPromise = null;

const connectDatabase = async () => {
  if (!dbPromise) {
    dbPromise = connectDB().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }

  return dbPromise;
};

// =====================================================
// VERCEL SERVERLESS HANDLER
// =====================================================

const handler = async (req, res) => {
  try {
    await connectDatabase();

    return app(req, res);
  } catch (error) {
    console.error(
      "[ERP Server] Database connection error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
};

// =====================================================
// LOCAL DEVELOPMENT
// =====================================================

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  connectDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(
          `[ERP Server] Running on http://localhost:${PORT}`
        );

        console.log(
          `[ERP Server] Health: http://localhost:${PORT}/api/health`
        );
      });
    })
    .catch((error) => {
      console.error(
        "[ERP Server] Startup failed:",
        error.message
      );
    });
}

// =====================================================
// VERCEL EXPORT
// =====================================================

module.exports = handler;