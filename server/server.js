const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
require("dotenv").config();

// Import middleware
const security = require("./middleware/security");
const {
  logger,
  morganLogger,
  errorLogger,
  requestLogger,
} = require("./middleware/logging");

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  logger.info("User connected:", { socketId: socket.id });

  socket.on("join-trip", (tripId) => {
    socket.join(`trip-${tripId}`);
    logger.info("User joined trip room:", { socketId: socket.id, tripId });
  });

  socket.on("leave-trip", (tripId) => {
    socket.leave(`trip-${tripId}`);
    logger.info("User left trip room:", { socketId: socket.id, tripId });
  });

  socket.on("trip-update", (data) => {
    socket.to(`trip-${data.tripId}`).emit("trip-updated", data);
    logger.info("Trip update broadcasted:", {
      tripId: data.tripId,
      type: data.type,
    });
  });

  socket.on("disconnect", () => {
    logger.info("User disconnected:", { socketId: socket.id });
  });
});

// Make io available to routes
app.set("io", io);

// HTTP request logging
app.use(morganLogger);
app.use(requestLogger);

// Security middleware
security(app);

// Compression middleware
app.use(compression());

// Import routes
const authRoutes = require("./routes/authNew");
const userRoutes = require("./routes/users");
const tripRoutes = require("./routes/trips");
const mapRoutes = require("./routes/maps");
const aiRoutes = require("./routes/ai");

// Enhanced CORS configuration
const corsOptions = {
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200,
};

if (process.env.NODE_ENV === "production" && process.env.ALLOWED_ORIGINS) {
  corsOptions.origin = process.env.ALLOWED_ORIGINS.split(",").map((origin) =>
    origin.trim()
  );
  console.log("Allowed Origins:", corsOptions.origin);
}

app.use(cors(corsOptions));

// Body parsing middleware with enhanced security
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser()); // Parse cookies for refresh tokens

// Trust proxy - enable for both development and production
// This is required for rate limiting to work properly with X-Forwarded-For headers
app.set("trust proxy", 1);

// Static files with security headers
app.use(
  "/uploads",
  express.static("uploads", {
    setHeaders: (res, path) => {
      res.set("X-Content-Type-Options", "nosniff");
      res.set("Cache-Control", "public, max-age=31536000");
    },
  })
);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "AI Trip Planner API is running",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV,
  });
});

// API routes with specific rate limiting
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/maps", mapRoutes);
app.use("/api/ai", aiRoutes);

// Enhanced error handling middleware
app.use(errorLogger);
app.use((err, req, res, next) => {
  const errorId =
    Date.now().toString(36) + Math.random().toString(36).substr(2);

  logger.error("Application error:", {
    errorId,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user?.id,
  });

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: Object.values(err.errors).map((e) => e.message),
      errorId,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      errorId,
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Duplicate field value",
      errorId,
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      errorId,
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
      errorId,
    });
  }

  // Default error response
  res.status(err.statusCode || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    errorId,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));
}

// 404 handler
app.use("*", (req, res) => {
  // Return 404 for API routes or if not in production
  if (
    req.originalUrl.startsWith("/api") ||
    process.env.NODE_ENV !== "production"
  ) {
    logger.warn("Route not found:", {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });

    return res.status(404).json({
      success: false,
      message: "Route not found",
      path: req.originalUrl,
    });
  }

  // Serve React app for all other routes in production
  res.sendFile(path.resolve(__dirname, "../client/build", "index.html"));
});

// MongoDB connection with enhanced options
const connectDB = async () => {
  try {
    const mongoOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };

    const mongoURI = process.env.MONGODB_URI_PROD || process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error("MongoDB URI not configured");
    }

    const conn = await mongoose.connect(mongoURI, mongoOptions);

    logger.info("MongoDB connected successfully:", {
      host: conn.connection.host,
      database: conn.connection.name,
      readyState: conn.connection.readyState,
    });

    // MongoDB event listeners
    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
    });
  } catch (error) {
    logger.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully`);

  try {
    // Close server
    server.close(() => {
      logger.info("HTTP server closed");
    });

    // Close Socket.IO
    io.close(() => {
      logger.info("Socket.IO server closed");
    });

    // Close MongoDB connection
    await mongoose.connection.close();
    logger.info("MongoDB connection closed");

    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Only shutdown in production, log in development
  if (process.env.NODE_ENV === "production") {
    gracefulShutdown("unhandledRejection");
  }
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB (optional for development)
    try {
      await connectDB();
    } catch (mongoError) {
      logger.warn("MongoDB connection failed:", mongoError.message);
      if (process.env.NODE_ENV === "production") {
        throw mongoError; // Fail in production if MongoDB is not available
      }
    }

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 API: http://localhost:${PORT}/api`);
      console.log(`✅ Health: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle startup
startServer().catch((error) => {
  logger.error("Startup error:", error);
  process.exit(1);
});

module.exports = app;
