const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot be more than 50 characters"],
      match: [
        /^[a-zA-Z\s'-]+$/,
        "Name can only contain letters, spaces, hyphens and apostrophes",
      ],
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
      validate: {
        validator: function (password) {
          // Password must contain at least: 1 uppercase, 1 lowercase, 1 number, 1 special char
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(
            password
          );
        },
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      },
    },
    avatar: {
      type: String,
      default: "default-avatar.jpg",
    },
    phone: {
      type: String,
      match: [/^\+?[\d\s\-\(\)]+$/, "Please provide a valid phone number"],
      maxlength: [20, "Phone number is too long"],
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function (date) {
          if (!date) return true; // Optional field
          const age = Math.floor(
            (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          );
          return age >= 13 && age <= 120; // Must be between 13 and 120 years old
        },
        message: "Age must be between 13 and 120 years",
      },
    },

    // Security & Authentication
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: true,
      index: true,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      default: Date.now,
      select: false,
    },

    // Refresh Tokens (for JWT rotation)
    refreshTokens: [
      {
        token: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        device: {
          type: String,
          default: "unknown",
        },
        ip: {
          type: String,
          default: "unknown",
        },
        lastUsed: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Account Security
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    lockUntil: {
      type: Date,
      select: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },

    // Activity Tracking
    lastLogin: {
      type: Date,
      index: true,
    },
    lastLoginIP: {
      type: String,
      select: false,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
    loginHistory: [
      {
        ip: String,
        userAgent: String,
        location: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        success: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // User Preferences
    preferences: {
      travelStyle: {
        type: String,
        enum: ["budget", "luxury", "adventure", "relaxation", "cultural"],
        default: "budget",
      },
      preferredTransport: [
        {
          type: String,
          enum: ["flight", "train", "bus", "car"],
        },
      ],
      preferredAccommodation: {
        type: String,
        enum: ["hotel", "hostel", "apartment", "resort"],
        default: "hotel",
      },
      budgetRange: {
        min: {
          type: Number,
          min: [0, "Budget cannot be negative"],
        },
        max: {
          type: Number,
          min: [0, "Budget cannot be negative"],
        },
      },
      currency: {
        type: String,
        default: "USD",
        enum: ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD"],
      },
      language: {
        type: String,
        default: "en",
        enum: ["en", "es", "fr", "de", "it", "pt", "ja", "zh"],
      },
      timezone: {
        type: String,
        default: "UTC",
      },
    },

    // Saved Data
    savedDestinations: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        coordinates: {
          lat: {
            type: Number,
            required: true,
            min: [-90, "Latitude must be between -90 and 90"],
            max: [90, "Latitude must be between -90 and 90"],
          },
          lng: {
            type: Number,
            required: true,
            min: [-180, "Longitude must be between -180 and 180"],
            max: [180, "Longitude must be between -180 and 180"],
          },
        },
        country: String,
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],



    // Usage Tracking
    monthlyAiRequests: {
      type: Number,
      default: 0,
      min: [0, "AI requests cannot be negative"],
    },
    monthlyAiRequestsReset: {
      type: Date,
      default: Date.now,
    },
    totalTripsCreated: {
      type: Number,
      default: 0,
      min: [0, "Trips created cannot be negative"],
    },
    totalAiRequestsUsed: {
      type: Number,
      default: 0,
      min: [0, "Total AI requests cannot be negative"],
    },

    // Privacy & Compliance
    privacyPolicyAccepted: {
      type: Boolean,
      default: false,
    },
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    marketingOptIn: {
      type: Boolean,
      default: false,
    },
    dataProcessingConsent: {
      type: Boolean,
      default: false,
    },

    // Metadata
    createdFrom: {
      type: String,
      enum: ["web", "mobile", "api", "admin"],
      default: "web",
    },
    referredBy: String,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.passwordChangedAt;
        delete ret.lockUntil;
        delete ret.failedLoginAttempts;
        delete ret.twoFactorSecret;
        delete ret.lastLoginIP;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Indexes for performance (email index already created by unique: true)
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ lastActivity: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ "refreshTokens.token": 1 });

// Virtual fields
userSchema.virtual("fullProfile").get(function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    avatar: this.avatar,
    preferences: this.preferences,
  };
});

userSchema.virtual("isAccountLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual("remainingLockTime").get(function () {
  if (!this.lockUntil || this.lockUntil <= Date.now()) return 0;
  return Math.ceil((this.lockUntil.getTime() - Date.now()) / 1000 / 60); // minutes
});

// Pre-save middleware
userSchema.pre("save", async function (next) {
  try {
    // Hash password if modified
    if (this.isModified("password")) {
      if (this.password) {
        const salt = await bcrypt.genSalt(14); // Increased from 12 to 14 for better security
        this.password = await bcrypt.hash(this.password, salt);
        this.passwordChangedAt = new Date();
      }
    }

    // Update lastActivity
    if (this.isModified() && !this.isNew) {
      this.lastActivity = new Date();
    }

    // Validate email if changed
    if (this.isModified("email") && !this.isNew) {
      this.isEmailVerified = false;
    }

    // Clean up expired refresh tokens
    if (this.refreshTokens && this.refreshTokens.length > 0) {
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      this.refreshTokens = this.refreshTokens.filter((tokenObj) => {
        return Date.now() - tokenObj.createdAt.getTime() < maxAge;
      });

      // Limit to 10 refresh tokens per user
      if (this.refreshTokens.length > 10) {
        this.refreshTokens = this.refreshTokens
          .sort((a, b) => b.lastUsed - a.lastUsed)
          .slice(0, 10);
      }
    }

    // Limit login history to last 50 entries
    if (this.loginHistory && this.loginHistory.length > 50) {
      this.loginHistory = this.loginHistory
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Instance Methods

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

  return resetToken;
};

// Add refresh token
userSchema.methods.addRefreshToken = function (
  tokenHash,
  device = "unknown",
  ip = "unknown"
) {
  // Remove existing token for same device/ip if exists
  this.refreshTokens = this.refreshTokens.filter(
    (tokenObj) => !(tokenObj.device === device && tokenObj.ip === ip)
  );

  // Add new token
  this.refreshTokens.push({
    token: tokenHash,
    device,
    ip,
    createdAt: new Date(),
    lastUsed: new Date(),
  });

  return this.save();
};

// Remove refresh token
userSchema.methods.removeRefreshToken = function (tokenHash) {
  this.refreshTokens = this.refreshTokens.filter(
    (tokenObj) => tokenObj.token !== tokenHash
  );
  return this.save();
};

// Remove all refresh tokens (logout all devices)
userSchema.methods.removeAllRefreshTokens = function () {
  this.refreshTokens = [];
  return this.save();
};

// Update refresh token last used
userSchema.methods.updateRefreshTokenUsage = function (tokenHash) {
  const tokenObj = this.refreshTokens.find(
    (token) => token.token === tokenHash
  );
  if (tokenObj) {
    tokenObj.lastUsed = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Handle failed login attempt
userSchema.methods.handleFailedLogin = async function () {
  // If account is already locked, don't update attempts
  if (this.lockUntil && this.lockUntil > Date.now()) {
    return this;
  }

  this.failedLoginAttempts += 1;

  // Lock account after 5 failed attempts
  if (this.failedLoginAttempts >= 5) {
    // Lock for 30 minutes initially, increasing exponentially
    const lockDuration = Math.min(
      30 * Math.pow(2, this.failedLoginAttempts - 5),
      24 * 60
    ); // Max 24 hours
    this.lockUntil = Date.now() + lockDuration * 60 * 1000;
    this.isLocked = true;
  }

  return this.save();
};

// Reset failed login attempts on successful login
userSchema.methods.resetFailedAttempts = function () {
  if (this.failedLoginAttempts > 0 || this.lockUntil) {
    this.failedLoginAttempts = 0;
    this.lockUntil = undefined;
    this.isLocked = false;
    return this.save();
  }
  return Promise.resolve(this);
};

// Add login history entry
userSchema.methods.addLoginHistory = function (
  ip,
  userAgent,
  location = "Unknown",
  success = true
) {
  this.loginHistory.unshift({
    ip,
    userAgent,
    location,
    timestamp: new Date(),
    success,
  });

  // Keep only last 50 entries
  this.loginHistory = this.loginHistory.slice(0, 50);

  if (success) {
    this.lastLogin = new Date();
    this.lastLoginIP = ip;
  }

  return this;
};

// Check if user can perform action based on plan
userSchema.methods.canPerformAction = function (action) {
  const limits = {
    free: {
      monthlyAiRequests: 10,
      tripsPerMonth: 5,
      savedDestinations: 10,
    },
    premium: {
      monthlyAiRequests: 100,
      tripsPerMonth: 50,
      savedDestinations: 100,
    },
    enterprise: {
      monthlyAiRequests: -1, // unlimited
      tripsPerMonth: -1,
      savedDestinations: -1,
    },
  };

  const userLimits = limits.free;

  switch (action) {
    case "ai_request":
      return (
        userLimits.monthlyAiRequests === -1 ||
        this.monthlyAiRequests < userLimits.monthlyAiRequests
      );
    case "create_trip":
      return (
        userLimits.tripsPerMonth === -1 ||
        this.totalTripsCreated < userLimits.tripsPerMonth
      );
    case "save_destination":
      return (
        userLimits.savedDestinations === -1 ||
        this.savedDestinations.length < userLimits.savedDestinations
      );
    default:
      return false;
  }
};

// Static Methods

// Find user by password reset token
userSchema.statics.findByPasswordResetToken = function (token) {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  return this.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
};

// Get user statistics
userSchema.statics.getStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        verified: { $sum: { $cond: ["$isEmailVerified", 1, 0] } },
        active: { $sum: { $cond: ["$isActive", 1, 0] } },
        locked: { $sum: { $cond: ["$isLocked", 1, 0] } },
        byRole: {
          $push: {
            role: "$role",
            count: 1,
          },
        },
        byPlan: {
          $push: {
            plan: "$planType",
            count: 1,
          },
        },
      },
    },
  ]);
};

module.exports = mongoose.model("User", userSchema);
