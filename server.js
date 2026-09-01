const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

// Load environment variables
dotenv.config();

// Database Connection
const connectDB = require("./config/db");

const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// ===============================
// Security & Middleware
// ===============================

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ===============================
// Static Files
// ===============================

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// ===============================
// Health Check
// ===============================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    system: "MERN ERP System Backend",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ===============================
// API Routes
// ===============================

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/hr", require("./routes/hrRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/purchasing", require("./routes/purchasingRoutes"));
app.use("/api/sales", require("./routes/salesRoutes"));
app.use("/api/finance", require("./routes/financeRoutes"));
app.use("/api/manufacturing", require("./routes/manufacturingRoutes"));
app.use("/api/projects", require("./routes/projectRoutes"));
app.use("/api/assets", require("./routes/assetRoutes"));
app.use("/api/system", require("./routes/systemRoutes"));

// ===============================
// Error Handling
// ===============================

app.use(notFound);
app.use(errorHandler);

// ===============================
// MongoDB Connection
// ===============================

connectDB();

// ===============================
// Export App for Vercel
// ===============================

module.exports = app;