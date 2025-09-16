const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      minlength: [5, "Subject must be at least 5 characters long"],
      maxlength: [100, "Subject cannot exceed 100 characters"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [10, "Message must be at least 10 characters long"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || /^[\+]?[1-9][\d]{0,15}$/.test(v);
        },
        message: "Please enter a valid phone number",
      },
    },
    company: {
      type: String,
      trim: true,
      maxlength: [100, "Company name cannot exceed 100 characters"],
    },
    projectType: {
      type: String,
      enum: [
        "Web Development",
        "Mobile App",
        "E-commerce",
        "API Development",
        "Consultation",
        "Other",
      ],
      default: "Other",
    },
    budget: {
      type: String,
      enum: [
        "Under $1,000",
        "$1,000 - $5,000",
        "$5,000 - $10,000",
        "$10,000 - $25,000",
        "Above $25,000",
        "Not specified",
      ],
      default: "Not specified",
    },
    timeline: {
      type: String,
      enum: [
        "ASAP",
        "1-2 weeks",
        "1 month",
        "2-3 months",
        "3+ months",
        "Flexible",
      ],
      default: "Flexible",
    },
    status: {
      type: String,
      enum: ["New", "Read", "In Progress", "Replied", "Closed"],
      default: "New",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    source: {
      type: String,
      enum: ["Portfolio Website", "LinkedIn", "GitHub", "Referral", "Other"],
      default: "Portfolio Website",
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    isSpam: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    repliedAt: {
      type: Date,
      default: null,
    },
    notes: [
      {
        content: {
          type: String,
          required: true,
          trim: true,
          maxlength: [500, "Note cannot exceed 500 characters"],
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [20, "Tag cannot exceed 20 characters"],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ priority: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ isSpam: 1 });
contactSchema.index({ isArchived: 1 });
contactSchema.index({ projectType: 1 });

// Virtual for response time (if replied)
contactSchema.virtual("responseTime").get(function () {
  if (!this.repliedAt) return null;

  const diffTime = this.repliedAt - this.createdAt;
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 24) {
    return `${diffHours} hours`;
  } else {
    return `${diffDays} days`;
  }
});

// Virtual for age of message
contactSchema.virtual("age").get(function () {
  const now = new Date();
  const diffTime = now - this.createdAt;
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    return `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else if (diffDays < 30) {
    return `${diffDays} days ago`;
  } else {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} months ago`;
  }
});

// Method to mark as read
contactSchema.methods.markAsRead = function (userId) {
  this.status = "Read";
  this.readAt = new Date();
  return this.save();
};

// Method to mark as replied
contactSchema.methods.markAsReplied = function (userId) {
  this.status = "Replied";
  this.repliedAt = new Date();
  return this.save();
};

// Method to add note
contactSchema.methods.addNote = function (content, userId) {
  this.notes.push({
    content,
    addedBy: userId,
    addedAt: new Date(),
  });
  return this.save();
};

// Method to mark as spam
contactSchema.methods.markAsSpam = function () {
  this.isSpam = true;
  this.status = "Closed";
  return this.save();
};

// Method to archive
contactSchema.methods.archive = function () {
  this.isArchived = true;
  return this.save();
};

// Static method to get unread messages
contactSchema.statics.getUnread = function () {
  return this.find({
    status: "New",
    isSpam: false,
    isArchived: false,
  }).sort({ createdAt: -1 });
};

// Static method to get messages by status
contactSchema.statics.getByStatus = function (status) {
  return this.find({
    status,
    isSpam: false,
    isArchived: false,
  }).sort({ createdAt: -1 });
};

// Static method to get high priority messages
contactSchema.statics.getHighPriority = function () {
  return this.find({
    priority: { $in: ["High", "Urgent"] },
    status: { $in: ["New", "Read", "In Progress"] },
    isSpam: false,
    isArchived: false,
  }).sort({ priority: 1, createdAt: -1 });
};

// Static method to get statistics
contactSchema.statics.getStats = async function () {
  const stats = await this.aggregate([
    {
      $match: { isSpam: false },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        new: { $sum: { $cond: [{ $eq: ["$status", "New"] }, 1, 0] } },
        read: { $sum: { $cond: [{ $eq: ["$status", "Read"] }, 1, 0] } },
        inProgress: {
          $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] },
        },
        replied: { $sum: { $cond: [{ $eq: ["$status", "Replied"] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ["$status", "Closed"] }, 1, 0] } },
        highPriority: {
          $sum: { $cond: [{ $in: ["$priority", ["High", "Urgent"]] }, 1, 0] },
        },
      },
    },
  ]);

  return (
    stats[0] || {
      total: 0,
      new: 0,
      read: 0,
      inProgress: 0,
      replied: 0,
      closed: 0,
      highPriority: 0,
    }
  );
};

// Static method for spam detection (basic)
contactSchema.statics.detectSpam = function (message) {
  const spamKeywords = [
    "viagra",
    "casino",
    "lottery",
    "winner",
    "congratulations",
    "click here",
    "free money",
    "make money fast",
    "work from home",
    "guaranteed",
    "no risk",
    "limited time",
    "act now",
  ];

  const messageText = `${message.subject} ${message.message}`.toLowerCase();

  return spamKeywords.some((keyword) => messageText.includes(keyword));
};

// Pre-save middleware for spam detection
contactSchema.pre("save", function (next) {
  if (this.isNew) {
    this.isSpam = this.constructor.detectSpam(this);
  }

  // Ensure tags are unique and lowercase
  if (this.tags) {
    this.tags = [...new Set(this.tags.map((tag) => tag.toLowerCase()))];
  }

  next();
});

// Ensure virtual fields are serialized
contactSchema.set("toJSON", { virtuals: true });
contactSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Contact", contactSchema);
