```js
const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

dotenv.config();

const app = express();

// =====================================================
// Security
// =====================================================

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// =====================================================
// CORS
// =====================================================

const allowedOrigins = [
  // Production frontend
  "https://erp-frontend-659b8b5ut-zaheers-projects-7e59edf9.vercel.app",

  // Optional environment-based frontend URL
  process.env.CLIENT_URL,

  // Local development
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an Origin header
      // (Postman, server-to-server requests, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error(`CORS blocked: ${origin}`);

      return callback(
        new Error(`CORS blocked for origin: ${origin}`)
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],

    optionsSuccessStatus: 204,
  })
);

// =====================================================
// Explicit OPTIONS / Preflight Handling
// =====================================================

app.options("*", cors());

// =====================================================
// Body Parser
// =====================================================

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// =====================================================
// Logging
// =====================================================

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// =====================================================
// Static Files
// =====================================================

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// =====================================================
// Root Route
// =====================================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "MERN ERP System Backend is running",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// =====================================================
// Health Check
// =====================================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    system: "MERN ERP System Backend",
    timestamp: new Date().toISOString(),
  });
});

// =====================================================
// API Routes
// =====================================================

app.use(
  "/api/auth",
  require("./routes/authRoutes")
);

app.use(
  "/api/users",
  require("./routes/userRoutes")
);

app.use(
  "/api/hr",
  require("./routes/hrRoutes")
);

app.use(
  "/api/products",
  require("./routes/productRoutes")
);

app.use(
  "/api/purchasing",
  require("./routes/purchasingRoutes")
);

app.use(
  "/api/sales",
  require("./routes/salesRoutes")
);

app.use(
  "/api/finance",
  require("./routes/financeRoutes")
);

app.use(
  "/api/manufacturing",
  require("./routes/manufacturingRoutes")
);

app.use(
  "/api/projects",
  require("./routes/projectRoutes")
);

app.use(
  "/api/assets",
  require("./routes/assetRoutes")
);

app.use(
  "/api/system",
  require("./routes/systemRoutes")
);

// =====================================================
// 404 Handler
// =====================================================

const {
  notFound,
  errorHandler,
} = require("./middleware/errorMiddleware");

app.use(notFound);

// =====================================================
// Global Error Handler
// =====================================================

app.use(errorHandler);

// =====================================================
// Export Express App
// =====================================================

module.exports = app;
```
