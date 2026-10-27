const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const { logger } = require("./logging");

/**
 * Global Security Middleware Configuration
 * Comprehensive protection for production and development
 */

// Account lockout tracking (In-memory)
const accountAttempts = new Map();
const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Account lockout middleware logic
 */
const accountLockout = (req, res, next) => {
  const identifier = req.ip + (req.body?.email || "");
  const attempts = accountAttempts.get(identifier);

  if (attempts && attempts.count >= LOCKOUT_ATTEMPTS) {
    const timeLeft = attempts.lockedUntil - Date.now();
    if (timeLeft > 0) {
      logger.warn("Account lockout active:", {
        identifier,
        ip: req.ip,
        timeLeft: Math.round(timeLeft / 1000),
      });

      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${Math.ceil(timeLeft / 60000)} minutes.`,
        code: "ACCOUNT_LOCKED",
        retryAfter: Math.ceil(timeLeft / 1000),
      });
    } else {
      accountAttempts.delete(identifier);
    }
  }

  req.trackFailedLogin = () => {
    const current = accountAttempts.get(identifier) || { count: 0 };
    current.count += 1;
    if (current.count >= LOCKOUT_ATTEMPTS) {
      current.lockedUntil = Date.now() + LOCKOUT_DURATION;
      logger.warn("Account locked due to failed attempts:", { identifier, ip: req.ip });
    }
    accountAttempts.set(identifier, current);
  };

  req.resetLoginAttempts = () => {
    accountAttempts.delete(identifier);
  };

  next();
};

const setupSecurity = (app) => {
  // Trust proxy for rate limiting behind load balancers
  app.set("trust proxy", 1);

  // Helmet for security headers
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:", "data:", "fonts.googleapis.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:", "blob:", "*.openstreetmap.org", "*.tile.openstreetmap.org"],
          connectSrc: ["'self'", "https://*.openstreetmap.org", "https://overpass-api.de", "https://router.project-osrm.org", "ws://localhost:*", "http://localhost:*", "https://trips-planner.onrender.com", "wss://trips-planner.onrender.com"],
          fontSrc: ["'self'", "https:", "data:", "fonts.gstatic.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'", "data:", "https:"],
          frameSrc: ["'self'"],
        },
      },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );

  // Data sanitization
  app.use(mongoSanitize());
  app.use(xss());
  app.use(hpp({ whitelist: ["sort", "page", "limit"] }));

  // Helper for creating rate limits
  const createLimit = (windowMs, max, message) =>
    rateLimit({
      windowMs,
      max,
      message: { success: false, message, code: "RATE_LIMIT_EXCEEDED" },
      standardHeaders: true,
      legacyHeaders: false,
    });

  // Apply rate limits
  app.use("/api/", createLimit(15 * 60 * 1000, 500, "Too many requests."));
  app.use("/api/auth/login", createLimit(15 * 60 * 1000, 10, "Too many login attempts."));
  app.use("/api/auth/register", createLimit(60 * 60 * 1000, 5, "Too many registration attempts."));
  app.use("/api/ai/", createLimit(60 * 60 * 1000, 50, "AI limit reached for this hour."));

  // Account lockout for login
  app.use("/api/auth/login", accountLockout);

  // Remove fingerprinting
  app.use((req, res, next) => {
    res.removeHeader("X-Powered-By");
    next();
  });

  logger.info("Security system initialized");
};

module.exports = setupSecurity;
