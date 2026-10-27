const winston = require("winston");
const morgan = require("morgan");

// Winston logger configuration - CONSOLE ONLY
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "ai-trip-planner" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Production logging with external service (Logtail/Datadog) remains as is
if (process.env.NODE_ENV === "production" && process.env.LOGTAIL_TOKEN) {
  const { Logtail } = require("@logtail/node");
  const { LogtailTransport } = require("@logtail/winston");

  const logtail = new Logtail(process.env.LOGTAIL_TOKEN);

  logger.add(
    new LogtailTransport(logtail, {
      level: "info",
    })
  );
}

// Morgan HTTP request logging
const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";

const morganLogger = morgan(morganFormat, {
  stream: {
    write: (message) => {
      logger.info(message.trim(), { type: "http" });
    },
  },
  skip: (req, res) => {
    // Skip logging for health check endpoints
    return req.url === "/api/health" || req.url === "/favicon.ico";
  },
});

// Custom error logging middleware
const errorLogger = (err, req, res, next) => {
  const errorInfo = {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
    body: req.body,
    params: req.params,
    query: req.query,
  };

  // Log user ID if available
  if (req.user) {
    errorInfo.userId = req.user.id;
  }

  logger.error("Unhandled error:", errorInfo);
  next(err);
};

// Request/Response logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
    };

    if (req.user) {
      logData.userId = req.user.id;
    }

    // Log slow requests
    if (duration > 1000) {
      logger.warn("Slow request detected:", logData);
    } else {
      logger.info("Request completed:", logData);
    }
  });

  next();
};

// Database operation logging
const dbLogger = {
  logQuery: (collection, operation, query, duration) => {
    logger.info("Database operation:", {
      collection,
      operation,
      query: JSON.stringify(query),
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  },

  logSlowQuery: (collection, operation, query, duration) => {
    logger.warn("Slow database query:", {
      collection,
      operation,
      query: JSON.stringify(query),
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  },
};

// AI request logging
const aiLogger = {
  logRequest: (model, prompt, tokens, duration, cost) => {
    logger.info("AI request:", {
      model,
      promptLength: prompt.length,
      tokens,
      duration: `${duration}ms`,
      estimatedCost: cost,
      timestamp: new Date().toISOString(),
    });
  },

  logError: (model, prompt, error) => {
    logger.error("AI request failed:", {
      model,
      promptLength: prompt.length,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  },
};

module.exports = {
  logger,
  morganLogger,
  errorLogger,
  requestLogger,
  dbLogger,
  aiLogger,
};
