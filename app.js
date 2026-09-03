const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

dotenv.config();

const app = express();

// =====================================================
// CORS CONFIGURATION
// =====================================================

const allowedOrigins = [
  // Local development
  "http://localhost:5173",
  "http://127.0.0.1:5173",

  // Current Vercel frontend
  "https://erp-frontend-5v4zppz8w-zaheers-projects-7e59edf9.vercel.app",

  // Previous Vercel frontend
  "https://erp-frontend-659b8b5ut-zaheers-projects-7e59edf9.vercel.app",

  // Main Vercel frontend
  "https://erp-frontend-jade-alpha.vercel.app",

  // Environment variable
  process.env.CLIENT_URL,
].filter(Boolean);

console.log("[CORS] Allowed origins:", allowedOrigins);

// =====================================================
// SECURITY
// =====================================================

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// =====================================================
// CORS
// =====================================================

const corsOptions = {
  origin: function (origin, callback) {
    // Postman / Thunder Client / server-to-server
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("[CORS] Blocked origin:", origin);

    return callback(
      new Error(`Not allowed by CORS: ${origin}`)
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
    "Accept",
    "Origin",
    "X-Requested-With",
  ],

  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// =====================================================
// BODY PARSER
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
// LOGGING
// =====================================================

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// =====================================================
// ROOT ROUTE
// =====================================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "MERN ERP System Backend is running",
    version: "1.0.0",
    environment:
      process.env.NODE_ENV || "development",
  });
});

// =====================================================
// HEALTH CHECK
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
// API ROUTES
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
  "/api/employee",
  require("./routes/employeeRoutes")
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
// 404 HANDLER
// =====================================================

const {
  notFound,
  errorHandler,
} = require("./middleware/errorMiddleware");

app.use(notFound);

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(errorHandler);

// =====================================================
// EXPORT
// =====================================================

module.exports = app;