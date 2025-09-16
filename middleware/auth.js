const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        message: "Access token required",
        error: "MISSING_TOKEN",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid token - user not found",
        error: "INVALID_TOKEN",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        message: "Account is deactivated",
        error: "ACCOUNT_DEACTIVATED",
      });
    }

    if (user.isLocked) {
      return res.status(423).json({
        message:
          "Account is temporarily locked due to multiple failed login attempts",
        error: "ACCOUNT_LOCKED",
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token",
        error: "INVALID_TOKEN",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired",
        error: "TOKEN_EXPIRED",
      });
    }

    console.error("Authentication error:", error);
    res.status(500).json({
      message: "Authentication failed",
      error: "AUTH_ERROR",
    });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
      error: "AUTH_REQUIRED",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required",
      error: "INSUFFICIENT_PERMISSIONS",
    });
  }

  next();
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (user && user.isActive && !user.isLocked) {
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    req.user = null;
    next();
  }
};

// Middleware to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    issuer: "portfolio-api",
    audience: "portfolio-client",
  });
};

// Middleware to refresh token if it's close to expiry
const refreshTokenIfNeeded = async (req, res, next) => {
  try {
    if (!req.user) return next();

    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return next();

    const decoded = jwt.decode(token);
    const now = Date.now() / 1000;
    const timeUntilExpiry = decoded.exp - now;

    // If token expires in less than 1 day, send a new one
    if (timeUntilExpiry < 24 * 60 * 60) {
      const newToken = generateToken(req.user._id);
      res.setHeader("X-New-Token", newToken);
    }

    next();
  } catch (error) {
    // Don't fail the request if refresh fails
    next();
  }
};

// Middleware to validate session for anonymous users
const validateSession = (req, res, next) => {
  const sessionId =
    req.headers["x-session-id"] || req.body.sessionId || req.query.sessionId;

  if (!sessionId && !req.user) {
    return res.status(400).json({
      message: "Session ID required for anonymous users",
      error: "MISSING_SESSION",
    });
  }

  req.sessionId = sessionId;
  next();
};

// Middleware to check resource ownership
const checkOwnership = (Model, paramName = "id") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          message: "Resource not found",
          error: "NOT_FOUND",
        });
      }

      // Check if user owns the resource
      const isOwner =
        req.user &&
        (resource.userId?.toString() === req.user._id.toString() ||
          resource.createdBy?.toString() === req.user._id.toString());

      // Check if session owns the resource (for anonymous users)
      const isSessionOwner =
        req.sessionId && resource.sessionId === req.sessionId;

      if (!isOwner && !isSessionOwner && req.user?.role !== "admin") {
        return res.status(403).json({
          message: "Access denied - insufficient permissions",
          error: "ACCESS_DENIED",
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error("Ownership check error:", error);
      res.status(500).json({
        message: "Error checking resource ownership",
        error: "OWNERSHIP_CHECK_ERROR",
      });
    }
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth,
  generateToken,
  refreshTokenIfNeeded,
  validateSession,
  checkOwnership,
};
