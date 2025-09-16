const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const Project = require("../models/Project");
const {
  authenticateToken,
  requireAdmin,
  optionalAuth,
} = require("../middleware/auth");
const {
  projectValidations,
  handleValidationErrors,
} = require("../middleware/validation");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "..", "uploads", "projects");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "project-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow images only
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// @route   GET /api/projects
// @desc    Get all public projects
// @access  Public
router.get("/", optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      status,
      featured,
      search,
      sort = "newest",
    } = req.query;

    // Build query - only public projects for non-admin users
    const query = req.user?.role === "admin" ? {} : { isPublic: true };

    if (category) query.category = category;
    if (status) query.status = status;
    if (featured !== undefined) query.featured = featured === "true";

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { technologies: { $in: [new RegExp(search, "i")] } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    // Build sort
    let sortQuery = {};
    switch (sort) {
      case "oldest":
        sortQuery = { createdAt: 1 };
        break;
      case "title":
        sortQuery = { title: 1 };
        break;
      case "views":
        sortQuery = { viewCount: -1 };
        break;
      case "likes":
        sortQuery = { likes: -1 };
        break;
      case "featured":
        sortQuery = { featured: -1, createdAt: -1 };
        break;
      default: // newest
        sortQuery = { createdAt: -1 };
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const projects = await Project.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    const total = await Project.countDocuments(query);

    res.json({
      projects,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({
      message: "Failed to fetch projects",
      error: "FETCH_PROJECTS_ERROR",
    });
  }
});

// @route   GET /api/projects/featured
// @desc    Get featured projects
// @access  Public
router.get("/featured", async (req, res) => {
  try {
    const { limit = 3 } = req.query;
    const projects = await Project.getFeatured(parseInt(limit));

    res.json({ projects });
  } catch (error) {
    console.error("Get featured projects error:", error);
    res.status(500).json({
      message: "Failed to fetch featured projects",
      error: "FETCH_FEATURED_ERROR",
    });
  }
});

// @route   GET /api/projects/categories
// @desc    Get project categories with counts
// @access  Public
router.get("/categories", async (req, res) => {
  try {
    const categories = await Project.aggregate([
      { $match: { isPublic: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      message: "Failed to fetch categories",
      error: "FETCH_CATEGORIES_ERROR",
    });
  }
});

// @route   GET /api/projects/search
// @desc    Search projects
// @access  Public
router.get("/search", async (req, res) => {
  try {
    const { q, category, status, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        message: "Search query is required",
        error: "MISSING_QUERY",
      });
    }

    const options = {
      category,
      status,
      limit: parseInt(limit),
    };

    const projects = await Project.search(q, options);

    res.json({
      projects,
      query: q,
      total: projects.length,
    });
  } catch (error) {
    console.error("Search projects error:", error);
    res.status(500).json({
      message: "Failed to search projects",
      error: "SEARCH_ERROR",
    });
  }
});

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Public
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
        error: "NOT_FOUND",
      });
    }

    // Check if user can view this project
    if (!project.isPublic && (!req.user || req.user.role !== "admin")) {
      return res.status(403).json({
        message: "Access denied - project is private",
        error: "ACCESS_DENIED",
      });
    }

    // Increment view count (don't await to avoid slowing response)
    project
      .incrementViewCount()
      .catch((err) => console.error("Failed to increment view count:", err));

    res.json({ project });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({
      message: "Failed to fetch project",
      error: "FETCH_PROJECT_ERROR",
    });
  }
});

// @route   POST /api/projects
// @desc    Create new project (admin only)
// @access  Private (Admin)
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  upload.single("image"),
  projectValidations.create,
  handleValidationErrors,
  async (req, res) => {
    try {
      const projectData = {
        ...req.body,
        createdBy: req.user._id,
      };

      // Handle file upload
      if (req.file) {
        projectData.imageUrl = `/uploads/projects/${req.file.filename}`;
      }

      // Parse arrays if they come as strings
      if (typeof projectData.technologies === "string") {
        projectData.technologies = JSON.parse(projectData.technologies);
      }
      if (typeof projectData.tags === "string") {
        projectData.tags = JSON.parse(projectData.tags);
      }
      if (typeof projectData.features === "string") {
        projectData.features = JSON.parse(projectData.features);
      }

      const project = new Project(projectData);
      await project.save();

      // Populate for response
      await project.populate("createdBy", "name email");

      res.status(201).json({
        message: "Project created successfully",
        project,
      });
    } catch (error) {
      console.error("Create project error:", error);

      // Clean up uploaded file if project creation failed
      if (req.file) {
        fs.unlink(req.file.path).catch((err) =>
          console.error("Failed to delete uploaded file:", err)
        );
      }

      res.status(500).json({
        message: "Failed to create project",
        error: "CREATE_PROJECT_ERROR",
      });
    }
  }
);

// @route   PUT /api/projects/:id
// @desc    Update project (admin only)
// @access  Private (Admin)
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  upload.single("image"),
  projectValidations.update,
  handleValidationErrors,
  async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({
          message: "Project not found",
          error: "NOT_FOUND",
        });
      }

      const updateData = {
        ...req.body,
        updatedBy: req.user._id,
      };

      // Handle file upload
      if (req.file) {
        // Delete old image if it exists and is not a default/external URL
        if (project.imageUrl && project.imageUrl.startsWith("/uploads/")) {
          const oldImagePath = path.join(__dirname, "..", project.imageUrl);
          fs.unlink(oldImagePath).catch((err) =>
            console.error("Failed to delete old image:", err)
          );
        }
        updateData.imageUrl = `/uploads/projects/${req.file.filename}`;
      }

      // Parse arrays if they come as strings
      if (typeof updateData.technologies === "string") {
        updateData.technologies = JSON.parse(updateData.technologies);
      }
      if (typeof updateData.tags === "string") {
        updateData.tags = JSON.parse(updateData.tags);
      }
      if (typeof updateData.features === "string") {
        updateData.features = JSON.parse(updateData.features);
      }

      const updatedProject = await Project.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

      res.json({
        message: "Project updated successfully",
        project: updatedProject,
      });
    } catch (error) {
      console.error("Update project error:", error);

      // Clean up uploaded file if update failed
      if (req.file) {
        fs.unlink(req.file.path).catch((err) =>
          console.error("Failed to delete uploaded file:", err)
        );
      }

      res.status(500).json({
        message: "Failed to update project",
        error: "UPDATE_PROJECT_ERROR",
      });
    }
  }
);

// @route   PUT /api/projects/:id/like
// @desc    Like/unlike project
// @access  Public
router.put("/:id/like", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        message: "Project not found",
        error: "NOT_FOUND",
      });
    }

    if (!project.isPublic) {
      return res.status(403).json({
        message: "Cannot like private project",
        error: "ACCESS_DENIED",
      });
    }

    await project.incrementLikes();

    res.json({
      message: "Project liked successfully",
      likes: project.likes,
    });
  } catch (error) {
    console.error("Like project error:", error);
    res.status(500).json({
      message: "Failed to like project",
      error: "LIKE_ERROR",
    });
  }
});

// @route   PUT /api/projects/:id/toggle-featured
// @desc    Toggle project featured status (admin only)
// @access  Private (Admin)
router.put(
  "/:id/toggle-featured",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({
          message: "Project not found",
          error: "NOT_FOUND",
        });
      }

      project.featured = !project.featured;
      project.updatedBy = req.user._id;
      await project.save();

      res.json({
        message: `Project ${
          project.featured ? "featured" : "unfeatured"
        } successfully`,
        project,
      });
    } catch (error) {
      console.error("Toggle featured error:", error);
      res.status(500).json({
        message: "Failed to toggle featured status",
        error: "TOGGLE_FEATURED_ERROR",
      });
    }
  }
);

// @route   PUT /api/projects/:id/toggle-visibility
// @desc    Toggle project visibility (admin only)
// @access  Private (Admin)
router.put(
  "/:id/toggle-visibility",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({
          message: "Project not found",
          error: "NOT_FOUND",
        });
      }

      project.isPublic = !project.isPublic;
      project.updatedBy = req.user._id;
      await project.save();

      res.json({
        message: `Project made ${
          project.isPublic ? "public" : "private"
        } successfully`,
        project,
      });
    } catch (error) {
      console.error("Toggle visibility error:", error);
      res.status(500).json({
        message: "Failed to toggle visibility",
        error: "TOGGLE_VISIBILITY_ERROR",
      });
    }
  }
);

// @route   DELETE /api/projects/:id
// @desc    Delete project (admin only)
// @access  Private (Admin)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        message: "Project not found",
        error: "NOT_FOUND",
      });
    }

    // Delete associated image file if it exists
    if (project.imageUrl && project.imageUrl.startsWith("/uploads/")) {
      const imagePath = path.join(__dirname, "..", project.imageUrl);
      fs.unlink(imagePath).catch((err) =>
        console.error("Failed to delete project image:", err)
      );
    }

    await Project.findByIdAndDelete(req.params.id);

    res.json({
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      message: "Failed to delete project",
      error: "DELETE_PROJECT_ERROR",
    });
  }
});

// @route   GET /api/projects/stats/overview
// @desc    Get project statistics (admin only)
// @access  Private (Admin)
router.get(
  "/stats/overview",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const stats = await Project.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            public: { $sum: { $cond: ["$isPublic", 1, 0] } },
            private: { $sum: { $cond: ["$isPublic", 0, 1] } },
            featured: { $sum: { $cond: ["$featured", 1, 0] } },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
            },
            inProgress: {
              $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] },
            },
            totalViews: { $sum: "$viewCount" },
            totalLikes: { $sum: "$likes" },
          },
        },
      ]);

      const categoryStats = await Project.aggregate([
        { $match: { isPublic: true } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      const technologyStats = await Project.aggregate([
        { $match: { isPublic: true } },
        { $unwind: "$technologies" },
        { $group: { _id: "$technologies", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      res.json({
        overview: stats[0] || {
          total: 0,
          public: 0,
          private: 0,
          featured: 0,
          completed: 0,
          inProgress: 0,
          totalViews: 0,
          totalLikes: 0,
        },
        categories: categoryStats,
        technologies: technologyStats,
      });
    } catch (error) {
      console.error("Get project stats error:", error);
      res.status(500).json({
        message: "Failed to fetch project statistics",
        error: "FETCH_STATS_ERROR",
      });
    }
  }
);

module.exports = router;
