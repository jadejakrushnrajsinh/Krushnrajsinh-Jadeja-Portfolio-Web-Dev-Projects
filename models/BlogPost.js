const mongoose = require("mongoose");

const blogPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    excerpt: {
      type: String,
      maxlength: [500, "Excerpt cannot exceed 500 characters"],
    },
    featuredImage: {
      type: String,
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    categories: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    publishDate: {
      type: Date,
      default: null,
    },
    readingTime: {
      type: Number, // in minutes
      default: 0,
    },
    // SEO fields
    seoTitle: {
      type: String,
      maxlength: [60, "SEO title cannot exceed 60 characters"],
    },
    seoDescription: {
      type: String,
      maxlength: [160, "SEO description cannot exceed 160 characters"],
    },
    // Author (admin user)
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Analytics
    viewCount: {
      type: Number,
      default: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    // Comments (if enabled)
    commentsEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
blogPostSchema.index({ status: 1, publishDate: -1 });
blogPostSchema.index({ slug: 1 });
blogPostSchema.index({ tags: 1 });
blogPostSchema.index({ categories: 1 });
blogPostSchema.index({ author: 1 });

// Virtual for URL
blogPostSchema.virtual("url").get(function () {
  return `/blog/${this.slug}`;
});

// Virtual for reading time calculation
blogPostSchema.methods.calculateReadingTime = function () {
  // Average reading speed: 200 words per minute
  const wordsPerMinute = 200;
  const words = this.content.split(/\s+/).length;
  this.readingTime = Math.ceil(words / wordsPerMinute);
  return this.readingTime;
};

// Pre-save middleware
blogPostSchema.pre("save", function (next) {
  if (this.isModified("content")) {
    this.calculateReadingTime();
  }

  // Auto-generate excerpt if not provided
  if (!this.excerpt && this.content) {
    // Remove markdown/HTML and get first 150 characters
    const plainText = this.content
      .replace(/[#*`~\[\]()]/g, "")
      .substring(0, 150);
    this.excerpt = plainText + (this.content.length > 150 ? "..." : "");
  }

  // Set publish date when status changes to published
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishDate
  ) {
    this.publishDate = new Date();
  }

  next();
});

// Static methods
blogPostSchema.statics.getPublishedPosts = function (limit = 10, skip = 0) {
  return this.find({ status: "published" })
    .populate("author", "name email")
    .sort({ publishDate: -1 })
    .limit(limit)
    .skip(skip);
};

blogPostSchema.statics.getPostsByTag = function (tag, limit = 10) {
  return this.find({
    status: "published",
    tags: tag,
  })
    .populate("author", "name email")
    .sort({ publishDate: -1 })
    .limit(limit);
};

blogPostSchema.statics.getPostsByCategory = function (category, limit = 10) {
  return this.find({
    status: "published",
    categories: category,
  })
    .populate("author", "name email")
    .sort({ publishDate: -1 })
    .limit(limit);
};

blogPostSchema.statics.getRelatedPosts = function (
  currentPostId,
  tags,
  limit = 3
) {
  return this.find({
    _id: { $ne: currentPostId },
    status: "published",
    tags: { $in: tags },
  })
    .populate("author", "name email")
    .sort({ publishDate: -1 })
    .limit(limit);
};

blogPostSchema.statics.getStats = async function () {
  const stats = await this.aggregate([
    {
      $match: { status: "published" },
    },
    {
      $group: {
        _id: null,
        totalPosts: { $sum: 1 },
        totalViews: { $sum: "$viewCount" },
        totalLikes: { $sum: "$likeCount" },
        avgReadingTime: { $avg: "$readingTime" },
      },
    },
  ]);

  return (
    stats[0] || {
      totalPosts: 0,
      totalViews: 0,
      totalLikes: 0,
      avgReadingTime: 0,
    }
  );
};

blogPostSchema.statics.getPopularTags = function (limit = 10) {
  return this.aggregate([
    { $match: { status: "published" } },
    { $unwind: "$tags" },
    {
      $group: {
        _id: "$tags",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
};

blogPostSchema.statics.getPopularCategories = function (limit = 10) {
  return this.aggregate([
    { $match: { status: "published" } },
    { $unwind: "$categories" },
    {
      $group: {
        _id: "$categories",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
};

// Instance methods
blogPostSchema.methods.incrementViews = function () {
  this.viewCount += 1;
  return this.save();
};

blogPostSchema.methods.toggleLike = function () {
  this.likeCount += 1;
  return this.save();
};

module.exports = mongoose.model("BlogPost", blogPostSchema);
