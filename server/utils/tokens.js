const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { logger } = require("../middleware/logging");

/**
 * Enterprise-grade JWT Token Management
 * Implements dual-token system with access and refresh tokens
 */

class TokenManager {
  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY || "15m";
    this.refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || "7d";

    if (!this.accessTokenSecret || !this.refreshTokenSecret) {
      throw new Error("JWT secrets not configured properly");
    }
  }

  /**
   * Generate Access Token (Short-lived, 15 minutes)
   * Stored in memory on frontend
   */
  generateAccessToken(payload) {
    try {
      const tokenPayload = {
        id: payload.id || payload.userId,
        email: payload.email,
        role: payload.role,
        isEmailVerified: payload.isEmailVerified,
        tokenType: "access",
        iat: Math.floor(Date.now() / 1000),
      };

      return jwt.sign(tokenPayload, this.accessTokenSecret, {
        expiresIn: this.accessTokenExpiry,
        issuer: "ai-trip-planner",
        audience: "ai-trip-planner-client",
        algorithm: "HS256",
      });
    } catch (error) {
      logger.error("Error generating access token:", error);
      throw new Error("Failed to generate access token");
    }
  }

  /**
   * Generate Refresh Token (Long-lived, 7 days)
   * Stored in HttpOnly cookie
   */
  generateRefreshToken(payload) {
    try {
      const tokenPayload = {
        id: payload.id || payload.userId,
        tokenType: "refresh",
        jti: crypto.randomBytes(16).toString("hex"), // Unique token ID
        iat: Math.floor(Date.now() / 1000),
      };

      return jwt.sign(tokenPayload, this.refreshTokenSecret, {
        expiresIn: this.refreshTokenExpiry,
        issuer: "ai-trip-planner",
        audience: "ai-trip-planner-client",
        algorithm: "HS256",
      });
    } catch (error) {
      logger.error("Error generating refresh token:", error);
      throw new Error("Failed to generate refresh token");
    }
  }

  /**
   * Verify Access Token
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: "ai-trip-planner",
        audience: "ai-trip-planner-client",
        algorithms: ["HS256"],
      });

      if (decoded.tokenType !== "access") {
        throw new Error("Invalid token type");
      }

      return decoded;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Access token expired");
      } else if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid access token");
      } else {
        throw error;
      }
    }
  }

  /**
   * Verify Refresh Token
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: "ai-trip-planner",
        audience: "ai-trip-planner-client",
        algorithms: ["HS256"],
      });

      if (decoded.tokenType !== "refresh") {
        throw new Error("Invalid token type");
      }

      return decoded;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Refresh token expired");
      } else if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid refresh token");
      } else {
        throw error;
      }
    }
  }

  /**
   * Generate Token Pair (Access + Refresh)
   */
  generateTokenPair(user) {
    const payload = {
      id: user._id || user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.parseExpiry(this.accessTokenExpiry),
      refreshTokenExpiresIn: this.parseExpiry(this.refreshTokenExpiry),
    };
  }

  /**
   * Hash refresh token for database storage
   */
  hashRefreshToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Generate secure random token for email verification/password reset
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Hash token for database storage
   */
  hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Parse expiry string to seconds
   */
  parseExpiry(expiryString) {
    const match = expiryString.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const [, amount, unit] = match;
    const multipliers = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return parseInt(amount) * (multipliers[unit] || 60);
  }

  /**
   * Get cookie options for refresh token
   */
  getRefreshTokenCookieOptions() {
    const maxAge = this.parseExpiry(this.refreshTokenExpiry) * 1000; // Convert to milliseconds

    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge,
      path: "/",
      domain: undefined, // Let the browser handle the domain automatically for cross-site
    };
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Blacklist token (for logout functionality)
   */
  async blacklistToken(token) {
    // In production, you might want to use Redis for token blacklisting
    // For now, we'll rely on refresh token rotation and database tracking
    try {
      const decoded = this.verifyAccessToken(token);
      logger.info("Token blacklisted:", {
        userId: decoded.id,
        jti: decoded.jti,
      });
      return true;
    } catch (error) {
      logger.warn("Attempted to blacklist invalid token:", error.message);
      return false;
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token) {
    // Implementation depends on your blacklisting strategy
    // For now, return false as we're using refresh token rotation
    return false;
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      logger.error("Error decoding token:", error);
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded.exp ? new Date(decoded.exp * 1000) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token expires soon (within 5 minutes)
   */
  shouldRefreshToken(token) {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;

    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return expiration <= fiveMinutesFromNow;
  }

  /**
   * Validate token structure
   */
  isValidTokenStructure(token) {
    if (!token || typeof token !== "string") return false;

    // JWT tokens have 3 parts separated by dots
    const parts = token.split(".");
    return parts.length === 3;
  }

  /**
   * Get device fingerprint from request
   */
  getDeviceFingerprint(req) {
    const userAgent = req.get("User-Agent") || "unknown";
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const acceptLanguage = req.get("Accept-Language") || "unknown";

    // Create a simple device fingerprint
    const fingerprint = crypto
      .createHash("md5")
      .update(`${userAgent}-${acceptLanguage}`)
      .digest("hex")
      .substring(0, 16);

    return {
      fingerprint,
      userAgent: userAgent.substring(0, 255), // Limit length
      ip,
      device: this.parseUserAgent(userAgent),
    };
  }

  /**
   * Parse user agent to extract device info
   */
  parseUserAgent(userAgent) {
    if (!userAgent) return "unknown";

    // Simple user agent parsing
    if (
      userAgent.includes("Mobile") ||
      userAgent.includes("Android") ||
      userAgent.includes("iPhone")
    ) {
      return "mobile";
    } else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
      return "tablet";
    } else {
      return "desktop";
    }
  }
}

// Export singleton instance
module.exports = new TokenManager();
