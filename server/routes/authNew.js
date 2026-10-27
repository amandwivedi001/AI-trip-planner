const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");
const {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  changePassword,
  getMe,
  updateProfile,
} = require("../controllers/authControllerNew");
const {
  protect,
  authorize,
  checkAccountStatus,
  userRateLimit,
} = require("../middleware/auth");

const router = express.Router();

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration validation rules
const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(
      "Name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes"
    ),
  body("email")
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage("Please provide a valid email address"),
  body("password")
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage(
      "Password must be at least 8 characters with uppercase, lowercase, number, and special character"
    ),

  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid date of birth"),
];

// Login validation rules
const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Password reset validation
const passwordResetValidation = [
  body("password")
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must be 8+ characters with uppercase, lowercase, number, and special character"
    ),
];

// Profile update validation
const profileUpdateValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("Name must be 2-50 characters and contain only letters"),
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
];

// =======================
// PUBLIC ROUTES (No authentication required)
// =======================

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", authLimiter, registerValidation, register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get tokens
 * @access  Public
 */
router.post("/login", authLimiter, loginValidation, login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (requires refresh token cookie)
 */
router.post("/refresh", refresh);

// =======================
// PROTECTED ROUTES (Authentication required)
// =======================

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/me", protect, checkAccountStatus, getMe);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  "/profile",
  protect,
  checkAccountStatus,
  userRateLimit(20, 15 * 60 * 1000), // 20 requests per 15 minutes
  profileUpdateValidation,
  updateProfile
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  "/change-password",
  protect,
  checkAccountStatus,
  strictAuthLimiter,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 8, max: 128 })
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        "New password must be 8+ characters with uppercase, lowercase, number, and special character"
      ),
  ],
  changePassword
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate current refresh token)
 * @access  Private
 */
router.post("/logout", protect, logout);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post("/logout-all", protect, logoutAll);

module.exports = router;
