const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, "Analytics type is required"],
      enum: [
        "page_view",
        "project_view",
        "contact_form_submit",
        "download",
        "external_link_click",
        "social_link_click",
        "button_click",
        "form_interaction",
        "scroll_depth",
        "time_on_page",
        "search",
        "error",
      ],
    },
    page: {
      type: String,
      required: [true, "Page is required"],
      trim: true,
      maxlength: [200, "Page URL cannot exceed 200 characters"],
    },
    element: {
      type: String,
      trim: true,
      maxlength: [100, "Element identifier cannot exceed 100 characters"],
    },
    value: {
      type: mongoose.Schema.Types.Mixed, // Can store strings, numbers, objects
      default: null,
    },
    metadata: {
      userAgent: {
        type: String,
        trim: true,
      },
      browser: {
        type: String,
        trim: true,
      },
      os: {
        type: String,
        trim: true,
      },
      device: {
        type: String,
        enum: ["desktop", "tablet", "mobile", "unknown"],
        default: "unknown",
      },
      screenResolution: {
        type: String,
        trim: true,
      },
      language: {
        type: String,
        trim: true,
      },
      timezone: {
        type: String,
        trim: true,
      },
      referrer: {
        type: String,
        trim: true,
      },
      utm: {
        source: String,
        medium: String,
        campaign: String,
        term: String,
        content: String,
      },
    },
    session: {
      id: {
        type: String,
        required: true,
        trim: true,
      },
      isNewSession: {
        type: Boolean,
        default: false,
      },
      duration: {
        type: Number, // in seconds
        min: 0,
      },
    },
    user: {
      ipAddress: {
        type: String,
        trim: true,
      },
      fingerprint: {
        type: String,
        trim: true,
      },
      isReturning: {
        type: Boolean,
        default: false,
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    location: {
      country: {
        type: String,
        trim: true,
      },
      region: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    performance: {
      loadTime: {
        type: Number, // in milliseconds
        min: 0,
      },
      domContentLoaded: {
        type: Number, // in milliseconds
        min: 0,
      },
      firstContentfulPaint: {
        type: Number, // in milliseconds
        min: 0,
      },
    },
    isBot: {
      type: Boolean,
      default: false,
    },
    processed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
analyticsSchema.index({ type: 1, createdAt: -1 });
analyticsSchema.index({ page: 1, createdAt: -1 });
analyticsSchema.index({ "session.id": 1 });
analyticsSchema.index({ "user.ipAddress": 1 });
analyticsSchema.index({ "user.fingerprint": 1 });
analyticsSchema.index({ createdAt: -1 });
analyticsSchema.index({ processed: 1 });
analyticsSchema.index({ isBot: 1 });

// Compound indexes for common queries
analyticsSchema.index({ type: 1, page: 1, createdAt: -1 });
analyticsSchema.index({ "metadata.device": 1, createdAt: -1 });
analyticsSchema.index({ "location.country": 1, createdAt: -1 });

// Static method to get page views
analyticsSchema.statics.getPageViews = function (page = null, dateRange = {}) {
  const match = {
    type: "page_view",
    isBot: false,
  };

  if (page) {
    match.page = page;
  }

  if (dateRange.start || dateRange.end) {
    match.createdAt = {};
    if (dateRange.start) match.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) match.createdAt.$lte = new Date(dateRange.end);
  }

  return this.countDocuments(match);
};

// Static method to get unique visitors
analyticsSchema.statics.getUniqueVisitors = function (dateRange = {}) {
  const match = {
    type: "page_view",
    isBot: false,
  };

  if (dateRange.start || dateRange.end) {
    match.createdAt = {};
    if (dateRange.start) match.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) match.createdAt.$lte = new Date(dateRange.end);
  }

  return this.distinct("user.fingerprint", match).then(
    (result) => result.length
  );
};

// Static method to get popular pages
analyticsSchema.statics.getPopularPages = function (
  limit = 10,
  dateRange = {}
) {
  const match = {
    type: "page_view",
    isBot: false,
  };

  if (dateRange.start || dateRange.end) {
    match.createdAt = {};
    if (dateRange.start) match.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) match.createdAt.$lte = new Date(dateRange.end);
  }

  return this.aggregate([
    { $match: match },
    { $group: { _id: "$page", views: { $sum: 1 } } },
    { $sort: { views: -1 } },
    { $limit: limit },
  ]);
};

// Static method to get device statistics
analyticsSchema.statics.getDeviceStats = function (dateRange = {}) {
  const match = {
    type: "page_view",
    isBot: false,
  };

  if (dateRange.start || dateRange.end) {
    match.createdAt = {};
    if (dateRange.start) match.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) match.createdAt.$lte = new Date(dateRange.end);
  }

  return this.aggregate([
    { $match: match },
    { $group: { _id: "$metadata.device", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
};

// Static method to get browser statistics
analyticsSchema.statics.getBrowserStats = function (dateRange = {}) {
  const match = {
    type: "page_view",
    isBot: false,
  };

  if (dateRange.start || dateRange.end) {
    match.createdAt = {};
    if (dateRange.start) match.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) match.createdAt.$lte = new Date(dateRange.end);
  }

  return this.aggregate([
    { $match: match },
    { $group: { _id: "$metadata.browser", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
};

// Static method to get location statistics
analyticsSchema.statics.getLocationStats = function (dateRange = {}) {
  const match = {
    type: "page_view",
    isBot: false,
  };

  if (dateRange.start || dateRange.end) {
    match.createdAt = {};
    if (dateRange.start) match.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) match.createdAt.$lte = new Date(dateRange.end);
  }

  return this.aggregate([
    { $match: match },
    { $group: { _id: "$location.country", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);
};

// Static method to get daily analytics
analyticsSchema.statics.getDailyAnalytics = function (days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        type: "page_view",
        isBot: false,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        views: { $sum: 1 },
        uniqueVisitors: { $addToSet: "$user.fingerprint" },
      },
    },
    {
      $project: {
        date: {
          $dateFromParts: {
            year: "$_id.year",
            month: "$_id.month",
            day: "$_id.day",
          },
        },
        views: 1,
        uniqueVisitors: { $size: "$uniqueVisitors" },
      },
    },
    { $sort: { date: 1 } },
  ]);
};

// Static method to get real-time statistics
analyticsSchema.statics.getRealTimeStats = function () {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: fiveMinutesAgo },
        isBot: false,
      },
    },
    {
      $group: {
        _id: null,
        activeUsers: { $addToSet: "$user.fingerprint" },
        pageViews: { $sum: { $cond: [{ $eq: ["$type", "page_view"] }, 1, 0] } },
        events: { $sum: 1 },
      },
    },
    {
      $project: {
        activeUsers: { $size: "$activeUsers" },
        pageViews: 1,
        events: 1,
      },
    },
  ]);
};

// Method to detect if request is from a bot
analyticsSchema.statics.detectBot = function (userAgent) {
  if (!userAgent) return true;

  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i,
    /whatsapp/i,
    /telegram/i,
    /skype/i,
    /zoom/i,
  ];

  return botPatterns.some((pattern) => pattern.test(userAgent));
};

// Method to parse user agent
analyticsSchema.statics.parseUserAgent = function (userAgent) {
  if (!userAgent)
    return { browser: "unknown", os: "unknown", device: "unknown" };

  const ua = userAgent.toLowerCase();

  // Browser detection
  let browser = "unknown";
  if (ua.includes("chrome")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari")) browser = "Safari";
  else if (ua.includes("edge")) browser = "Edge";
  else if (ua.includes("opera")) browser = "Opera";

  // OS detection
  let os = "unknown";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("ios")) os = "iOS";

  // Device detection
  let device = "desktop";
  if (ua.includes("mobile")) device = "mobile";
  else if (ua.includes("tablet")) device = "tablet";

  return { browser, os, device };
};

// Pre-save middleware
analyticsSchema.pre("save", function (next) {
  // Parse user agent if not already parsed
  if (this.metadata.userAgent && !this.metadata.browser) {
    const parsed = this.constructor.parseUserAgent(this.metadata.userAgent);
    this.metadata.browser = parsed.browser;
    this.metadata.os = parsed.os;
    this.metadata.device = parsed.device;
  }

  // Detect bots
  if (this.metadata.userAgent) {
    this.isBot = this.constructor.detectBot(this.metadata.userAgent);
  }

  next();
});

module.exports = mongoose.model("Analytics", analyticsSchema);
