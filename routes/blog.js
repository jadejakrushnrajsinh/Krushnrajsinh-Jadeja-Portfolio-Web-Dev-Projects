const express = require("express");
const BlogPost = require("../models/BlogPost");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const {
  blogValidations,
  handleValidationErrors,
} = require("../middleware/validation");

const router = express.Router();

// @route   GET /api/blog
// @desc    Get all published blog posts
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10, tag, category, search, author } = req.query;

    // Build query
    const query = { status: "published" };

    if (tag) {
      query.tags = tag;
    }

    if (category) {
      query.categories = category;
    }

    if (author) {
      query.author = author;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { excerpt: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const posts = await BlogPost.find(query)
      .populate("author", "name email")
      .sort({ publishDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await BlogPost.countDocuments(query);

    res.json({
      posts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get blog posts error:", error);
    res.status(500).json({
      message: "Failed to fetch blog posts",
      error: "FETCH_BLOG_POSTS_ERROR",
    });
  }
});

// @route   GET /api/blog/featured
// @desc    Get featured blog posts
// @access  Public
router.get("/featured", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 3;

    const posts = await BlogPost.find({
      status: "published",
      featuredImage: { $exists: true, $ne: null },
    })
      .populate("author", "name email")
      .sort({ publishDate: -1 })
      .limit(limit);

    res.json({ posts });
  } catch (error) {
    console.error("Get featured posts error:", error);
    res.status(500).json({
      message: "Failed to fetch featured posts",
      error: "FETCH_FEATURED_POSTS_ERROR",
    });
  }
});

// @route   GET /api/blog/:slug
// @desc    Get single blog post by slug
// @access  Public
router.get("/:slug", async (req, res) => {
  try {
    const post = await BlogPost.findOne({
      slug: req.params.slug,
      status: "published",
    }).populate("author", "name email");

    if (!post) {
      return res.status(404).json({
        message: "Blog post not found",
        error: "POST_NOT_FOUND",
      });
    }

    // Increment view count
    await post.incrementViews();

    // Get related posts
    const relatedPosts = await BlogPost.getRelatedPosts(post._id, post.tags, 3);

    res.json({
      post,
      relatedPosts,
    });
  } catch (error) {
    console.error("Get blog post error:", error);
    res.status(500).json({
      message: "Failed to fetch blog post",
      error: "FETCH_BLOG_POST_ERROR",
    });
  }
});

// @route   GET /api/blog/tags/popular
// @desc    Get popular tags
// @access  Public
router.get("/tags/popular", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const tags = await BlogPost.getPopularTags(limit);
    res.json({ tags });
  } catch (error) {
    console.error("Get popular tags error:", error);
    res.status(500).json({
      message: "Failed to fetch popular tags",
      error: "FETCH_POPULAR_TAGS_ERROR",
    });
  }
});

// @route   GET /api/blog/categories/popular
// @desc    Get popular categories
// @access  Public
router.get("/categories/popular", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const categories = await BlogPost.getPopularCategories(limit);
    res.json({ categories });
  } catch (error) {
    console.error("Get popular categories error:", error);
    res.status(500).json({
      message: "Failed to fetch popular categories",
      error: "FETCH_POPULAR_CATEGORIES_ERROR",
    });
  }
});

// @route   POST /api/blog
// @desc    Create new blog post
// @access  Private (Admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      featuredImage,
      tags,
      categories,
      status,
      publishDate,
      seoTitle,
      seoDescription,
    } = req.body;

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Check if slug already exists
    const existingPost = await BlogPost.findOne({ slug });
    if (existingPost) {
      return res.status(400).json({
        message: "A post with this title already exists",
        error: "SLUG_EXISTS",
      });
    }

    const post = new BlogPost({
      title,
      slug,
      content,
      excerpt,
      featuredImage,
      tags: tags ? tags.split(",").map((tag) => tag.trim().toLowerCase()) : [],
      categories: categories
        ? categories.split(",").map((cat) => cat.trim())
        : [],
      status: status || "draft",
      publishDate: publishDate || (status === "published" ? new Date() : null),
      seoTitle,
      seoDescription,
      author: req.user._id,
    });

    await post.save();
    await post.populate("author", "name email");

    res.status(201).json({
      message: "Blog post created successfully",
      post,
    });
  } catch (error) {
    console.error("Create blog post error:", error);
    res.status(500).json({
      message: "Failed to create blog post",
      error: "CREATE_BLOG_POST_ERROR",
    });
  }
});

// @route   PUT /api/blog/:id
// @desc    Update blog post
// @access  Private (Admin only)
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      featuredImage,
      tags,
      categories,
      status,
      publishDate,
      seoTitle,
      seoDescription,
    } = req.body;

    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        message: "Blog post not found",
        error: "POST_NOT_FOUND",
      });
    }

    // Update slug if title changed
    let slug = post.slug;
    if (title && title !== post.title) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      // Check if new slug already exists (excluding current post)
      const existingPost = await BlogPost.findOne({
        slug,
        _id: { $ne: req.params.id },
      });
      if (existingPost) {
        return res.status(400).json({
          message: "A post with this title already exists",
          error: "SLUG_EXISTS",
        });
      }
    }

    // Update fields
    if (title !== undefined) post.title = title;
    if (slug !== post.slug) post.slug = slug;
    if (content !== undefined) post.content = content;
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (featuredImage !== undefined) post.featuredImage = featuredImage;
    if (tags !== undefined) {
      post.tags = tags
        ? tags.split(",").map((tag) => tag.trim().toLowerCase())
        : [];
    }
    if (categories !== undefined) {
      post.categories = categories
        ? categories.split(",").map((cat) => cat.trim())
        : [];
    }
    if (status !== undefined) post.status = status;
    if (publishDate !== undefined) post.publishDate = publishDate;
    if (seoTitle !== undefined) post.seoTitle = seoTitle;
    if (seoDescription !== undefined) post.seoDescription = seoDescription;

    await post.save();
    await post.populate("author", "name email");

    res.json({
      message: "Blog post updated successfully",
      post,
    });
  } catch (error) {
    console.error("Update blog post error:", error);
    res.status(500).json({
      message: "Failed to update blog post",
      error: "UPDATE_BLOG_POST_ERROR",
    });
  }
});

// @route   DELETE /api/blog/:id
// @desc    Delete blog post
// @access  Private (Admin only)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        message: "Blog post not found",
        error: "POST_NOT_FOUND",
      });
    }

    await BlogPost.findByIdAndDelete(req.params.id);

    res.json({
      message: "Blog post deleted successfully",
    });
  } catch (error) {
    console.error("Delete blog post error:", error);
    res.status(500).json({
      message: "Failed to delete blog post",
      error: "DELETE_BLOG_POST_ERROR",
    });
  }
});

// @route   GET /api/blog/admin/all
// @desc    Get all blog posts for admin (including drafts)
// @access  Private (Admin only)
router.get("/admin/all", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { excerpt: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const posts = await BlogPost.find(query)
      .populate("author", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await BlogPost.countDocuments(query);

    res.json({
      posts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get admin blog posts error:", error);
    res.status(500).json({
      message: "Failed to fetch blog posts",
      error: "FETCH_ADMIN_BLOG_POSTS_ERROR",
    });
  }
});

// @route   GET /api/blog/admin/stats
// @desc    Get blog statistics for admin
// @access  Private (Admin only)
router.get(
  "/admin/stats",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const stats = await BlogPost.getStats();
      const draftCount = await BlogPost.countDocuments({ status: "draft" });
      const publishedCount = await BlogPost.countDocuments({
        status: "published",
      });
      const archivedCount = await BlogPost.countDocuments({
        status: "archived",
      });

      res.json({
        stats,
        draftCount,
        publishedCount,
        archivedCount,
      });
    } catch (error) {
      console.error("Get blog stats error:", error);
      res.status(500).json({
        message: "Failed to fetch blog statistics",
        error: "FETCH_BLOG_STATS_ERROR",
      });
    }
  }
);

module.exports = router;
