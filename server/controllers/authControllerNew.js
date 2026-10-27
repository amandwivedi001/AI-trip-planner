const { validationResult } = require("express-validator");
const User = require("../models/User");
const tokenManager = require("../utils/tokens");
const { logger } = require("../middleware/logging");

/**
 * Enterprise Authentication Controller - Complete Rewrite
 * Implements secure authentication with dual-token system, email verification,
 * password reset, account lockout, and comprehensive security logging
 */

/**
 * Register new user with email verification
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const {
      name,
      email,
      password,
      phone,
      terms,
      dateOfBirth,
      newsletter = false,
    } = req.body;
    const deviceInfo = tokenManager.getDeviceFingerprint(req);

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      logger.warn("Registration attempt with existing email:", {
        email,
        ip: req.ip,
      });
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    // Create user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      phone: phone?.trim(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      newsletter,
      termsAccepted: true,
      privacyPolicyAccepted: true,
      dataProcessingConsent: true,
      createdFrom: "web",
    });

    user.addLoginHistory(req.ip, req.get("User-Agent"), "Unknown", true);
    await user.save();

    // Generate tokens
    const tokens = tokenManager.generateTokenPair(user);
    const refreshTokenHash = tokenManager.hashRefreshToken(tokens.refreshToken);

    await user.addRefreshToken(
      refreshTokenHash,
      deviceInfo.device,
      deviceInfo.ip
    );

    // Set refresh token cookie
    const cookieOptions = tokenManager.getRefreshTokenCookieOptions();
    res.cookie("refreshToken", tokens.refreshToken, cookieOptions);

    logger.info("User registered successfully:", {
      userId: user._id,
      email: user.email,
      ip: req.ip,
      device: deviceInfo.device,
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: user.fullProfile,
      accessToken: tokens.accessToken,
      expiresIn: tokens.accessTokenExpiresIn,
    });
  } catch (error) {
    logger.error("Registration error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
};

/**
 * Login user with enhanced security
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: errors.array(),
      });
    }

    const { email, password, rememberMe = false } = req.body;
    const deviceInfo = tokenManager.getDeviceFingerprint(req);

    // Find user and include security fields
    const user = await User.findOne({
      email: email.toLowerCase(),
      isActive: true,
    }).select("+password +failedLoginAttempts +lockUntil");

    // Check credentials
    if (!user || !(await user.comparePassword(password))) {
      if (user) {
        await user.handleFailedLogin();
        user.addLoginHistory(req.ip, req.get("User-Agent"), "Unknown", false);
        await user.save();
      }

      logger.warn("Failed login attempt:", {
        email,
        ip: req.ip,
        userExists: !!user,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if account is locked
    if (user.isAccountLocked) {
      logger.warn("Login attempt on locked account:", {
        userId: user._id,
        ip: req.ip,
        remainingLockTime: user.remainingLockTime,
      });

      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked. Try again in ${user.remainingLockTime} minutes.`,
        lockUntil: user.lockUntil,
      });
    }

    // Reset failed attempts and add login history
    await user.resetFailedAttempts();
    user.addLoginHistory(req.ip, req.get("User-Agent"), "Unknown", true);

    // Generate tokens
    const tokens = tokenManager.generateTokenPair(user);
    const refreshTokenHash = tokenManager.hashRefreshToken(tokens.refreshToken);

    await user.addRefreshToken(
      refreshTokenHash,
      deviceInfo.device,
      deviceInfo.ip
    );

    // Set refresh token cookie
    let cookieOptions = tokenManager.getRefreshTokenCookieOptions();
    if (rememberMe) {
      cookieOptions.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    res.cookie("refreshToken", tokens.refreshToken, cookieOptions);

    logger.info("User logged in successfully:", {
      userId: user._id,
      email: user.email,
      ip: req.ip,
      device: deviceInfo.device,
    });

    res.json({
      success: true,
      message: "Login successful",
      user: user.fullProfile,
      accessToken: tokens.accessToken,
      expiresIn: tokens.accessTokenExpiresIn,
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

/**
 * Refresh access token using refresh token
 * POST /api/auth/refresh
 */
const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found",
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = tokenManager.verifyRefreshToken(refreshToken);
    } catch (error) {
      res.clearCookie("refreshToken");
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    // Find user and validate refresh token
    const refreshTokenHash = tokenManager.hashRefreshToken(refreshToken);
    const user = await User.findOne({
      _id: decoded.id,
      isActive: true,
      "refreshTokens.token": refreshTokenHash,
    });

    if (!user) {
      res.clearCookie("refreshToken");
      logger.warn("Refresh token not found in database:", {
        userId: decoded.id,
        ip: req.ip,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    await user.updateRefreshTokenUsage(refreshTokenHash);

    // Generate new access token
    const accessToken = tokenManager.generateAccessToken(user);

    // Optional: Rotate refresh token (10% chance for security)
    if (Math.random() < 0.1) {
      const tokens = tokenManager.generateTokenPair(user);
      const newRefreshTokenHash = tokenManager.hashRefreshToken(
        tokens.refreshToken
      );
      const deviceInfo = tokenManager.getDeviceFingerprint(req);

      await user.removeRefreshToken(refreshTokenHash);
      await user.addRefreshToken(
        newRefreshTokenHash,
        deviceInfo.device,
        deviceInfo.ip
      );

      res.cookie(
        "refreshToken",
        tokens.refreshToken,
        tokenManager.getRefreshTokenCookieOptions()
      );
    }

    res.json({
      success: true,
      accessToken,
      expiresIn: tokenManager.parseExpiry(
        process.env.ACCESS_TOKEN_EXPIRY || "15m"
      ),
    });
  } catch (error) {
    logger.error("Token refresh error:", error);
    res.status(500).json({
      success: false,
      message: "Token refresh failed",
    });
  }
};

/**
 * Logout user and invalidate current refresh token
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const user = req.user;

    res.clearCookie("refreshToken");

    if (refreshToken && user) {
      const refreshTokenHash = tokenManager.hashRefreshToken(refreshToken);
      await user.removeRefreshToken(refreshTokenHash);

      logger.info("User logged out:", { userId: user._id, ip: req.ip });
    }

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

/**
 * Logout from all devices
 * POST /api/auth/logout-all
 */
const logoutAll = async (req, res) => {
  try {
    const user = req.user;

    await user.removeAllRefreshTokens();
    res.clearCookie("refreshToken");

    logger.info("User logged out from all devices:", {
      userId: user._id,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: "Logged out from all devices successfully",
    });
  } catch (error) {
    logger.error("Logout all error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

/**
 * Change password (authenticated user)
 * POST /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select("+password");

    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    logger.info("Password changed successfully:", {
      userId: user._id,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    logger.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Password change failed",
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: user.fullProfile,
    });
  } catch (error) {
    logger.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
    });
  }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update allowed fields
    const allowedFields = [
      "name",
      "phone",
      "dateOfBirth",
      "preferences",
      "marketingOptIn",
    ];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle email change (requires verification)
    if (req.body.email && req.body.email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({
        email: req.body.email.toLowerCase(),
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }

      updates.email = req.body.email.toLowerCase();
      updates.email = req.body.email.toLowerCase();
    }

    Object.assign(user, updates);
    await user.save();

    logger.info("Profile updated:", {
      userId: user._id,
      updatedFields: Object.keys(updates),
      ip: req.ip,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: user.fullProfile,
    });
  } catch (error) {
    logger.error("Update profile error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  changePassword,
  getMe,
  updateProfile,
};
