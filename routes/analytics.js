const express = require("express");
const Analytics = require("../models/Analytics");
const {
  authenticateToken,
  requireAdmin,
  optionalAuth,
} = require("../middleware/auth");
const {
  analyticsValidations,
  handleValidationErrors,
} = require("../middleware/validation");

const router = express.Router();

// Helper function to generate session ID
const generateSessionId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Helper function to create user fingerprint
const createFingerprint = (req) => {
  const userAgent = req.get("User-Agent") || "";
  const acceptLanguage = req.get("Accept-Language") || "";
  const acceptEncoding = req.get("Accept-Encoding") || "";
  const ip = req.ip || req.connection.remoteAddress || "";

  // Create a simple fingerprint (in production, use more sophisticated methods)
  const fingerprint = Buffer.from(
    `${userAgent}${acceptLanguage}${acceptEncoding}${ip}`
  )
    .toString("base64")
    .substr(0, 32);

  return fingerprint;
};

// @route   POST /api/analytics/track
// @desc    Track analytics event
// @access  Public
router.post(
  "/track",
  analyticsValidations.track,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { type, page, element, value, sessionId, metadata = {} } = req.body;

      // Get client information
      const userAgent = req.get("User-Agent");
      const ipAddress = req.ip || req.connection.remoteAddress;
      const referrer = req.get("Referer") || req.get("Referrer");
      const language = req.get("Accept-Language")?.split(",")[0];

      // Parse user agent
      const parsedUA = Analytics.parseUserAgent(userAgent);

      // Create analytics entry
      const analyticsData = {
        type,
        page,
        element,
        value,
        metadata: {
          ...metadata,
          userAgent,
          browser: parsedUA.browser,
          os: parsedUA.os,
          device: parsedUA.device,
          language,
          referrer,
        },
        session: {
          id: sessionId || generateSessionId(),
          isNewSession: !sessionId,
        },
        user: {
          ipAddress,
          fingerprint: createFingerprint(req),
          userId: req.user?._id || null,
        },
      };

      // Add location data if available (you might want to integrate with a GeoIP service)
      // For now, we'll leave it empty
      analyticsData.location = {};

      // Add performance data if provided
      if (metadata.performance) {
        analyticsData.performance = metadata.performance;
      }

      const analytics = new Analytics(analyticsData);
      await analytics.save();

      res.status(201).json({
        message: "Analytics event tracked successfully",
        sessionId: analytics.session.id,
      });
    } catch (error) {
      console.error("Track analytics error:", error);
      res.status(500).json({
        message: "Failed to track analytics event",
        error: "TRACK_ERROR",
      });
    }
  }
);

// @route   GET /api/analytics/stats
// @desc    Get analytics statistics (admin only)
// @access  Private (Admin)
router.get(
  "/stats",
  authenticateToken,
  requireAdmin,
  analyticsValidations.getStats,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { startDate, endDate, page } = req.query;

      const dateRange = {};
      if (startDate) dateRange.start = startDate;
      if (endDate) dateRange.end = endDate;

      // Get basic statistics
      const pageViews = await Analytics.getPageViews(page, dateRange);
      const uniqueVisitors = await Analytics.getUniqueVisitors(dateRange);
      const popularPages = await Analytics.getPopularPages(10, dateRange);
      const deviceStats = await Analytics.getDeviceStats(dateRange);
      const browserStats = await Analytics.getBrowserStats(dateRange);
      const locationStats = await Analytics.getLocationStats(dateRange);

      res.json({
        overview: {
          pageViews,
          uniqueVisitors,
          avgPageViewsPerVisitor:
            uniqueVisitors > 0
              ? Math.round((pageViews / uniqueVisitors) * 100) / 100
              : 0,
        },
        popularPages,
        deviceStats,
        browserStats,
        locationStats,
      });
    } catch (error) {
      console.error("Get analytics stats error:", error);
      res.status(500).json({
        message: "Failed to fetch analytics statistics",
        error: "FETCH_STATS_ERROR",
      });
    }
  }
);

// @route   GET /api/analytics/daily
// @desc    Get daily analytics data (admin only)
// @access  Private (Admin)
router.get("/daily", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dailyData = await Analytics.getDailyAnalytics(parseInt(days));

    res.json({ dailyData });
  } catch (error) {
    console.error("Get daily analytics error:", error);
    res.status(500).json({
      message: "Failed to fetch daily analytics",
      error: "FETCH_DAILY_ERROR",
    });
  }
});

// @route   GET /api/analytics/realtime
// @desc    Get real-time analytics (admin only)
// @access  Private (Admin)
router.get("/realtime", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const realtimeStats = await Analytics.getRealTimeStats();

    res.json({
      realtime: realtimeStats[0] || {
        activeUsers: 0,
        pageViews: 0,
        events: 0,
      },
    });
  } catch (error) {
    console.error("Get realtime analytics error:", error);
    res.status(500).json({
      message: "Failed to fetch real-time analytics",
      error: "FETCH_REALTIME_ERROR",
    });
  }
});

// @route   GET /api/analytics/events
// @desc    Get analytics events (admin only)
// @access  Private (Admin)
router.get("/events", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      startDate,
      endDate,
      sessionId,
    } = req.query;

    // Build query
    const query = { isBot: false };

    if (type) query.type = type;
    if (sessionId) query["session.id"] = sessionId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const events = await Analytics.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-user.ipAddress -metadata.userAgent"); // Hide sensitive data

    const total = await Analytics.countDocuments(query);

    res.json({
      events,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get analytics events error:", error);
    res.status(500).json({
      message: "Failed to fetch analytics events",
      error: "FETCH_EVENTS_ERROR",
    });
  }
});

// @route   GET /api/analytics/page-performance
// @desc    Get page performance metrics (admin only)
// @access  Private (Admin)
router.get(
  "/page-performance",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { page, days = 7 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const query = {
        type: "page_view",
        isBot: false,
        createdAt: { $gte: startDate },
        "performance.loadTime": { $exists: true },
      };

      if (page) query.page = page;

      const performanceData = await Analytics.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$page",
            avgLoadTime: { $avg: "$performance.loadTime" },
            avgDomContentLoaded: { $avg: "$performance.domContentLoaded" },
            avgFirstContentfulPaint: {
              $avg: "$performance.firstContentfulPaint",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { avgLoadTime: -1 } },
      ]);

      res.json({ performanceData });
    } catch (error) {
      console.error("Get page performance error:", error);
      res.status(500).json({
        message: "Failed to fetch page performance data",
        error: "FETCH_PERFORMANCE_ERROR",
      });
    }
  }
);

// @route   GET /api/analytics/user-journey
// @desc    Get user journey data (admin only)
// @access  Private (Admin)
router.get(
  "/user-journey",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { sessionId, fingerprint, days = 7 } = req.query;

      if (!sessionId && !fingerprint) {
        return res.status(400).json({
          message: "Session ID or fingerprint is required",
          error: "MISSING_IDENTIFIER",
        });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const query = {
        isBot: false,
        createdAt: { $gte: startDate },
      };

      if (sessionId) {
        query["session.id"] = sessionId;
      } else if (fingerprint) {
        query["user.fingerprint"] = fingerprint;
      }

      const journey = await Analytics.find(query)
        .sort({ createdAt: 1 })
        .select("type page element value createdAt session.duration");

      res.json({ journey });
    } catch (error) {
      console.error("Get user journey error:", error);
      res.status(500).json({
        message: "Failed to fetch user journey",
        error: "FETCH_JOURNEY_ERROR",
      });
    }
  }
);

// @route   GET /api/analytics/conversion-funnel
// @desc    Get conversion funnel data (admin only)
// @access  Private (Admin)
router.get(
  "/conversion-funnel",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Define funnel steps
      const funnelSteps = [
        { name: "Visitors", type: "page_view", page: "/" },
        {
          name: "Portfolio Views",
          type: "page_view",
          page: { $regex: "projects|portfolio" },
        },
        { name: "Project Views", type: "project_view" },
        {
          name: "Contact Form Views",
          type: "page_view",
          element: "contact-form",
        },
        { name: "Contact Submissions", type: "contact_form_submit" },
      ];

      const funnelData = [];

      for (const step of funnelSteps) {
        const query = {
          isBot: false,
          createdAt: { $gte: startDate },
          type: step.type,
        };

        if (step.page) {
          if (typeof step.page === "string") {
            query.page = step.page;
          } else {
            query.page = step.page;
          }
        }

        if (step.element) {
          query.element = step.element;
        }

        const count = await Analytics.countDocuments(query);
        const uniqueUsers = await Analytics.distinct("user.fingerprint", query);

        funnelData.push({
          step: step.name,
          totalEvents: count,
          uniqueUsers: uniqueUsers.length,
        });
      }

      res.json({ funnelData });
    } catch (error) {
      console.error("Get conversion funnel error:", error);
      res.status(500).json({
        message: "Failed to fetch conversion funnel data",
        error: "FETCH_FUNNEL_ERROR",
      });
    }
  }
);

// @route   DELETE /api/analytics/cleanup
// @desc    Clean up old analytics data (admin only)
// @access  Private (Admin)
router.delete("/cleanup", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { days = 90 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await Analytics.deleteMany({
      createdAt: { $lt: cutoffDate },
      processed: true, // Only delete processed events
    });

    res.json({
      message: `Cleaned up ${result.deletedCount} old analytics records`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Analytics cleanup error:", error);
    res.status(500).json({
      message: "Failed to cleanup analytics data",
      error: "CLEANUP_ERROR",
    });
  }
});

// @route   GET /api/analytics/export
// @desc    Export analytics data (admin only)
// @access  Private (Admin)
router.get("/export", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, type, format = "json" } = req.query;

    const query = { isBot: false };

    if (type) query.type = type;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const data = await Analytics.find(query)
      .sort({ createdAt: -1 })
      .limit(10000) // Limit to prevent memory issues
      .select("-user.ipAddress -metadata.userAgent"); // Hide sensitive data

    if (format === "csv") {
      // Convert to CSV format
      const csv = data.map((item) => ({
        timestamp: item.createdAt,
        type: item.type,
        page: item.page,
        element: item.element,
        device: item.metadata.device,
        browser: item.metadata.browser,
        os: item.metadata.os,
      }));

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=analytics-export.csv"
      );

      // Simple CSV conversion (in production, use a proper CSV library)
      const csvHeader = Object.keys(csv[0] || {}).join(",");
      const csvRows = csv.map((row) => Object.values(row).join(","));
      const csvContent = [csvHeader, ...csvRows].join("\n");

      res.send(csvContent);
    } else {
      res.json({
        data,
        total: data.length,
        exportedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("Export analytics error:", error);
    res.status(500).json({
      message: "Failed to export analytics data",
      error: "EXPORT_ERROR",
    });
  }
});

module.exports = router;
