const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    longDescription: {
      type: String,
      trim: true,
      maxlength: [2000, "Long description cannot exceed 2000 characters"],
    },
    technologies: [
      {
        type: String,
        trim: true,
        maxlength: [30, "Technology name cannot exceed 30 characters"],
      },
    ],
    category: {
      type: String,
      required: [true, "Project category is required"],
      enum: ["Web Development", "Mobile App", "Desktop App", "API", "Other"],
      default: "Web Development",
    },
    status: {
      type: String,
      enum: ["In Progress", "Completed", "On Hold", "Cancelled"],
      default: "Completed",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    imageUrl: {
      type: String,
      trim: true,
      default:
        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    },
    projectUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: "Project URL must be a valid HTTP/HTTPS URL",
      },
    },
    githubUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || /^https:\/\/github\.com\/.+/.test(v);
        },
        message: "GitHub URL must be a valid GitHub repository URL",
      },
    },
    demoUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: "Demo URL must be a valid HTTP/HTTPS URL",
      },
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (v) {
          return !v || !this.startDate || v >= this.startDate;
        },
        message: "End date must be after start date",
      },
    },
    featured: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [20, "Tag cannot exceed 20 characters"],
      },
    ],
    features: [
      {
        type: String,
        trim: true,
        maxlength: [100, "Feature description cannot exceed 100 characters"],
      },
    ],
    challenges: [
      {
        type: String,
        trim: true,
        maxlength: [200, "Challenge description cannot exceed 200 characters"],
      },
    ],
    learnings: [
      {
        type: String,
        trim: true,
        maxlength: [200, "Learning description cannot exceed 200 characters"],
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
projectSchema.index({ title: 1 });
projectSchema.index({ category: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ featured: -1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ isPublic: 1 });

// Virtual for project duration
projectSchema.virtual("duration").get(function () {
  if (!this.startDate) return null;

  const endDate = this.endDate || new Date();
  const diffTime = Math.abs(endDate - this.startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 30) {
    return `${diffDays} days`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? "s" : ""}`;
  } else {
    const years = Math.floor(diffDays / 365);
    const remainingMonths = Math.floor((diffDays % 365) / 30);
    return `${years} year${years > 1 ? "s" : ""}${
      remainingMonths > 0
        ? ` ${remainingMonths} month${remainingMonths > 1 ? "s" : ""}`
        : ""
    }`;
  }
});

// Virtual for completion percentage (if status is 'In Progress')
projectSchema.virtual("completionPercentage").get(function () {
  if (this.status !== "In Progress") return null;

  // Simple calculation based on time elapsed vs estimated duration
  if (!this.startDate || !this.endDate) return 0;

  const now = new Date();
  const totalDuration = this.endDate - this.startDate;
  const elapsed = now - this.startDate;

  const percentage = Math.min(
    Math.max((elapsed / totalDuration) * 100, 0),
    100
  );
  return Math.round(percentage);
});

// Method to increment view count
projectSchema.methods.incrementViewCount = function () {
  this.viewCount += 1;
  return this.save();
};

// Method to increment likes
projectSchema.methods.incrementLikes = function () {
  this.likes += 1;
  return this.save();
};

// Static method to get featured projects
projectSchema.statics.getFeatured = function (limit = 3) {
  return this.find({ featured: true, isPublic: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("createdBy", "name email");
};

// Static method to get projects by category
projectSchema.statics.getByCategory = function (category, limit = 10) {
  return this.find({ category, isPublic: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("createdBy", "name email");
};

// Static method to search projects
projectSchema.statics.search = function (query, options = {}) {
  const searchRegex = new RegExp(query, "i");
  const filter = {
    isPublic: true,
    $or: [
      { title: searchRegex },
      { description: searchRegex },
      { technologies: { $in: [searchRegex] } },
      { tags: { $in: [searchRegex] } },
    ],
  };

  if (options.category) {
    filter.category = options.category;
  }

  if (options.status) {
    filter.status = options.status;
  }

  return this.find(filter)
    .sort({ createdAt: -1 })
    .limit(options.limit || 20)
    .populate("createdBy", "name email");
};

// Pre-save middleware
projectSchema.pre("save", function (next) {
  // Ensure tags are unique and lowercase
  if (this.tags) {
    this.tags = [...new Set(this.tags.map((tag) => tag.toLowerCase()))];
  }

  // Ensure technologies are unique
  if (this.technologies) {
    this.technologies = [...new Set(this.technologies)];
  }

  next();
});

// Ensure virtual fields are serialized
projectSchema.set("toJSON", { virtuals: true });
projectSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Project", projectSchema);
