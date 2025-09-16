const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const crypto = require("crypto");
const {
  authenticateToken,
  generateToken,
  refreshTokenIfNeeded,
} = require("../middleware/auth");
const { sendVerificationEmail } = require("../utils/mailer");
const {
  userValidations,
  handleValidationErrors,
} = require("../middleware/validation");

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  "/register",
  userValidations.register,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          message: "User already exists with this email",
          error: "USER_EXISTS",
        });
      }

      // Create new user (unverified)
      const user = new User({
        name,
        email,
        password,
        role: "user",
        isVerified: false,
      });

      // Generate verification token and save hashed token on user
      const plainToken = user.generateVerificationToken();

      await user.save();

      // Send verification email (best-effort)
      try {
        const origin =
          req.headers.origin || `${req.protocol}://${req.get("host")}`;
        await sendVerificationEmail({
          to: email,
          name,
          token: plainToken,
          origin,
        });
      } catch (mailErr) {
        console.warn("Failed to send verification email:", mailErr);
      }

      // Helpful dev fallback: if SMTP not configured, print verification link to console
      try {
        if (!process.env.SMTP_HOST || process.env.NODE_ENV !== "production") {
          const origin =
            req.headers.origin || `${req.protocol}://${req.get("host")}`;
          const link = `${origin.replace(
            /\/$/,
            ""
          )}/api/auth/verify-email?token=${encodeURIComponent(
            plainToken
          )}&email=${encodeURIComponent(email)}`;
          console.log("DEV: Verification link:", link);
          // also write to a temp log for automated tests
          const fs = require("fs");
          const outDir = require("path").join(__dirname, "..", "tmp");
          try {
            if (!fs.existsSync(outDir))
              fs.mkdirSync(outDir, { recursive: true });
            fs.appendFileSync(
              require("path").join(outDir, "dev_verification_links.log"),
              `${new Date().toISOString()} ${email} ${link}\n`
            );
          } catch (fileErr) {
            // ignore file write errors in dev fallback
          }
        }
      } catch (err) {
        // ignore
      }

      // Generate token for client (optional - may be limited until verification)
      const token = generateToken(user._id);

      res.status(201).json({
        message: "User registered successfully. Please verify your email.",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        message: "Registration failed",
        error: "REGISTRATION_ERROR",
      });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  "/login",
  userValidations.login,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password",
          error: "INVALID_CREDENTIALS",
        });
      }

      // Ensure email is verified before allowing login
      if (!user.isVerified) {
        return res.status(403).json({
          message: "Please verify your email before logging in",
          error: "EMAIL_NOT_VERIFIED",
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        return res.status(423).json({
          message:
            "Account is temporarily locked due to multiple failed login attempts",
          error: "ACCOUNT_LOCKED",
          lockUntil: user.lockUntil,
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(401).json({
          message: "Account is deactivated",
          error: "ACCOUNT_DEACTIVATED",
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        // Increment login attempts
        await user.incLoginAttempts();

        return res.status(401).json({
          message: "Invalid email or password",
          error: "INVALID_CREDENTIALS",
        });
      }

      // Reset login attempts on successful login
      await user.resetLoginAttempts();

      // Generate token
      const token = generateToken(user._id);

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        message: "Login failed",
        error: "LOGIN_ERROR",
      });
    }
  }
);

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post("/logout", authenticateToken, (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // by removing the token from storage
  res.json({
    message: "Logout successful",
  });
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get("/me", authenticateToken, refreshTokenIfNeeded, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
      lastLogin: req.user.lastLogin,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
    },
  });
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  authenticateToken,
  userValidations.updateProfile,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, email } = req.body;
      const userId = req.user._id;

      // Check if email is being changed and if it's already taken
      if (email && email !== req.user.email) {
        const existingUser = await User.findOne({
          email,
          _id: { $ne: userId },
        });
        if (existingUser) {
          return res.status(400).json({
            message: "Email is already taken",
            error: "EMAIL_TAKEN",
          });
        }
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          ...(name && { name }),
          ...(email && { email }),
        },
        { new: true, runValidators: true }
      ).select("-password");

      res.json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({
        message: "Profile update failed",
        error: "PROFILE_UPDATE_ERROR",
      });
    }
  }
);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put(
  "/change-password",
  authenticateToken,
  userValidations.changePassword,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user._id);

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(
        currentPassword
      );
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          message: "Current password is incorrect",
          error: "INVALID_CURRENT_PASSWORD",
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({
        message: "Password change failed",
        error: "PASSWORD_CHANGE_ERROR",
      });
    }
  }
);

// @route   POST /api/auth/refresh-token
// @desc    Refresh JWT token
// @access  Private
router.post("/refresh-token", authenticateToken, (req, res) => {
  try {
    // Generate new token
    const newToken = generateToken(req.user._id);

    res.json({
      message: "Token refreshed successfully",
      token: newToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      message: "Token refresh failed",
      error: "TOKEN_REFRESH_ERROR",
    });
  }
});

// @route   POST /api/auth/verify-token
// @desc    Verify if token is valid
// @access  Private
router.post("/verify-token", authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// @route   POST /api/auth/create-admin
// @desc    Create admin user (development only)
// @access  Public (should be restricted in production)
router.post("/create-admin", async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        message: "Admin creation not allowed in production",
        error: "PRODUCTION_RESTRICTION",
      });
    }

    const { name, email, password } = req.body;

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      return res.status(400).json({
        message: "Admin user already exists",
        error: "ADMIN_EXISTS",
      });
    }

    // Create admin user
    const admin = await User.createAdmin(
      email || process.env.ADMIN_EMAIL || "jadejakrushnrajsinh99@gmail.com",
      password || process.env.ADMIN_PASSWORD || "jadeja.kirtiba.12",
      name || "Portfolio Admin"
    );

    // Mark admin as verified by default
    admin.isVerified = true;
    await admin.save();

    // Generate token
    const token = generateToken(admin._id);

    res.status(201).json({
      message: "Admin user created successfully",
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin creation error:", error);
    res.status(500).json({
      message: "Admin creation failed",
      error: "ADMIN_CREATION_ERROR",
    });
  }
});

// @route   GET /api/auth/verify-email
// @desc    Verify a user's email using token and email query params
// @access  Public
router.get("/verify-email", async (req, res) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({
        message: "Missing token or email",
        error: "MISSING_PARAMS",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        error: "USER_NOT_FOUND",
      });
    }

    if (user.isVerified) {
      return res.redirect("/verify-success.html");
    }

    if (!user.verifyToken || !user.verifyExpires) {
      return res.status(400).json({
        message: "No verification token found or token already used",
        error: "NO_TOKEN",
      });
    }

    // Compare hashed token
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    if (hash !== user.verifyToken || user.verifyExpires < Date.now()) {
      return res.redirect("/verify-failed.html");
    }

    // Mark verified
    user.isVerified = true;
    user.verifyToken = null;
    user.verifyExpires = null;
    await user.save();

    return res.redirect("/verify-success.html");
  } catch (error) {
    console.error("Email verification error:", error);
    return res.redirect("/verify-failed.html");
  }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email for a given email address
// @access  Public
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ message: "Email is required", error: "MISSING_EMAIL" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", error: "USER_NOT_FOUND" });
    }

    if (user.isVerified) {
      return res
        .status(400)
        .json({ message: "Email already verified", error: "ALREADY_VERIFIED" });
    }

    // Cooldown: require at least COOLDOWN_SECONDS between resend attempts
    const COOLDOWN_SECONDS = Number(process.env.RESEND_COOLDOWN_SECONDS || 60);
    const now = Date.now();
    if (user.lastVerificationSent) {
      const elapsed = Math.floor(
        (now - new Date(user.lastVerificationSent).getTime()) / 1000
      );
      if (elapsed < COOLDOWN_SECONDS) {
        const remaining = COOLDOWN_SECONDS - elapsed;
        return res.status(429).json({
          message: "Verification email already sent recently",
          error: "TOO_MANY_REQUESTS",
          retryAfter: remaining,
        });
      }
    }

    // Generate a new token
    const plainToken = user.generateVerificationToken();
    await user.save();

    try {
      const origin =
        req.headers.origin || `${req.protocol}://${req.get("host")}`;
      await sendVerificationEmail({
        to: email,
        name: user.name,
        token: plainToken,
        origin,
      });
    } catch (mailErr) {
      console.warn("Failed to resend verification email:", mailErr);
    }

    res.json({
      message: "Verification email resent",
      cooldown: COOLDOWN_SECONDS,
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ message: "Resend failed", error: "RESEND_ERROR" });
  }
});

module.exports = router;
