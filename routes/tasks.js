const express = require("express");
const Task = require("../models/Task");
const {
  authenticateToken,
  optionalAuth,
  validateSession,
  checkOwnership,
} = require("../middleware/auth");
const {
  taskValidations,
  handleValidationErrors,
} = require("../middleware/validation");

const router = express.Router();

// @route   GET /api/tasks
// @desc    Get tasks for user or session
// @access  Public (with session) / Private
router.get("/", optionalAuth, validateSession, async (req, res) => {
  try {
    const {
      completed,
      category,
      priority,
      search,
      sort = "newest",
      limit = 100,
    } = req.query;

    const options = {
      completed: completed !== undefined ? completed === "true" : undefined,
      category,
      priority,
      limit: parseInt(limit),
    };

    let tasks = await Task.getByUserOrSession(
      req.user?._id,
      req.sessionId,
      options
    );

    // Apply search filter
    if (search) {
      const searchRegex = new RegExp(search, "i");
      tasks = tasks.filter(
        (task) =>
          searchRegex.test(task.title) ||
          searchRegex.test(task.description) ||
          task.tags.some((tag) => searchRegex.test(tag))
      );
    }

    // Apply sorting
    switch (sort) {
      case "oldest":
        tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case "priority":
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        tasks.sort(
          (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
        );
        break;
      case "dueDate":
        tasks.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
        break;
      case "title":
        tasks.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default: // newest
        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json({ tasks });
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({
      message: "Failed to fetch tasks",
      error: "FETCH_TASKS_ERROR",
    });
  }
});

// @route   GET /api/tasks/stats
// @desc    Get task statistics
// @access  Public (with session) / Private
router.get("/stats", optionalAuth, validateSession, async (req, res) => {
  try {
    const stats = await Task.getStats(req.user?._id, req.sessionId);
    const overdueTasks = await Task.getOverdue(req.user?._id, req.sessionId);
    const dueTodayTasks = await Task.getDueToday(req.user?._id, req.sessionId);

    res.json({
      stats: stats[0] || {
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
        highPriority: 0,
      },
      overdue: overdueTasks.length,
      dueToday: dueTodayTasks.length,
      recentOverdue: overdueTasks.slice(0, 5),
      recentDueToday: dueTodayTasks.slice(0, 5),
    });
  } catch (error) {
    console.error("Get task stats error:", error);
    res.status(500).json({
      message: "Failed to fetch task statistics",
      error: "FETCH_STATS_ERROR",
    });
  }
});

// @route   GET /api/tasks/overdue
// @desc    Get overdue tasks
// @access  Public (with session) / Private
router.get("/overdue", optionalAuth, validateSession, async (req, res) => {
  try {
    const overdueTasks = await Task.getOverdue(req.user?._id, req.sessionId);
    res.json({ tasks: overdueTasks });
  } catch (error) {
    console.error("Get overdue tasks error:", error);
    res.status(500).json({
      message: "Failed to fetch overdue tasks",
      error: "FETCH_OVERDUE_ERROR",
    });
  }
});

// @route   GET /api/tasks/due-today
// @desc    Get tasks due today
// @access  Public (with session) / Private
router.get("/due-today", optionalAuth, validateSession, async (req, res) => {
  try {
    const dueTodayTasks = await Task.getDueToday(req.user?._id, req.sessionId);
    res.json({ tasks: dueTodayTasks });
  } catch (error) {
    console.error("Get due today tasks error:", error);
    res.status(500).json({
      message: "Failed to fetch tasks due today",
      error: "FETCH_DUE_TODAY_ERROR",
    });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get single task
// @access  Public (with session) / Private
router.get(
  "/:id",
  optionalAuth,
  validateSession,
  checkOwnership(Task),
  async (req, res) => {
    try {
      res.json({ task: req.resource });
    } catch (error) {
      console.error("Get task error:", error);
      res.status(500).json({
        message: "Failed to fetch task",
        error: "FETCH_TASK_ERROR",
      });
    }
  }
);

// @route   POST /api/tasks
// @desc    Create new task
// @access  Public (with session) / Private
router.post(
  "/",
  optionalAuth,
  validateSession,
  taskValidations.create,
  handleValidationErrors,
  async (req, res) => {
    try {
      const taskData = {
        ...req.body,
        userId: req.user?._id || null,
        sessionId: req.user ? null : req.sessionId,
      };

      const task = new Task(taskData);
      await task.save();

      res.status(201).json({
        message: "Task created successfully",
        task,
      });
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({
        message: "Failed to create task",
        error: "CREATE_TASK_ERROR",
      });
    }
  }
);

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Public (with session) / Private
router.put(
  "/:id",
  optionalAuth,
  validateSession,
  checkOwnership(Task),
  taskValidations.update,
  handleValidationErrors,
  async (req, res) => {
    try {
      const task = req.resource;

      // Update task fields
      Object.keys(req.body).forEach((key) => {
        if (req.body[key] !== undefined) {
          task[key] = req.body[key];
        }
      });

      // Handle completion status change
      if (
        req.body.completed !== undefined &&
        req.body.completed !== task.completed
      ) {
        task.completed = req.body.completed;
        task.status = task.completed ? "completed" : "pending";
        task.completedAt = task.completed ? new Date() : null;
      }

      await task.save();

      res.json({
        message: "Task updated successfully",
        task,
      });
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({
        message: "Failed to update task",
        error: "UPDATE_TASK_ERROR",
      });
    }
  }
);

// @route   PUT /api/tasks/:id/toggle
// @desc    Toggle task completion
// @access  Public (with session) / Private
router.put(
  "/:id/toggle",
  optionalAuth,
  validateSession,
  checkOwnership(Task),
  async (req, res) => {
    try {
      const task = req.resource;
      await task.toggleComplete();

      res.json({
        message: `Task marked as ${task.completed ? "completed" : "pending"}`,
        task,
      });
    } catch (error) {
      console.error("Toggle task error:", error);
      res.status(500).json({
        message: "Failed to toggle task completion",
        error: "TOGGLE_TASK_ERROR",
      });
    }
  }
);

// @route   POST /api/tasks/:id/subtasks
// @desc    Add subtask
// @access  Public (with session) / Private
router.post(
  "/:id/subtasks",
  optionalAuth,
  validateSession,
  checkOwnership(Task),
  taskValidations.addSubtask,
  handleValidationErrors,
  async (req, res) => {
    try {
      const task = req.resource;
      const { title } = req.body;

      await task.addSubtask(title);

      res.json({
        message: "Subtask added successfully",
        task,
      });
    } catch (error) {
      console.error("Add subtask error:", error);
      res.status(500).json({
        message: "Failed to add subtask",
        error: "ADD_SUBTASK_ERROR",
      });
    }
  }
);

// @route   PUT /api/tasks/:id/subtasks/:subtaskId/toggle
// @desc    Toggle subtask completion
// @access  Public (with session) / Private
router.put(
  "/:id/subtasks/:subtaskId/toggle",
  optionalAuth,
  validateSession,
  checkOwnership(Task),
  async (req, res) => {
    try {
      const task = req.resource;
      const { subtaskId } = req.params;

      await task.toggleSubtask(subtaskId);

      res.json({
        message: "Subtask toggled successfully",
        task,
      });
    } catch (error) {
      console.error("Toggle subtask error:", error);
      res.status(500).json({
        message: "Failed to toggle subtask",
        error: "TOGGLE_SUBTASK_ERROR",
      });
    }
  }
);

// @route   DELETE /api/tasks/:id/subtasks/:subtaskId
// @desc    Delete subtask
// @access  Public (with session) / Private
router.delete(
  "/:id/subtasks/:subtaskId",
  optionalAuth,
  validateSession,
  checkOwnership(Task),
  async (req, res) => {
    try {
      const task = req.resource;
      const { subtaskId } = req.params;

      task.subtasks.id(subtaskId).remove();
      await task.save();

      res.json({
        message: "Subtask deleted successfully",
        task,
      });
    } catch (error) {
      console.error("Delete subtask error:", error);
      res.status(500).json({
        message: "Failed to delete subtask",
        error: "DELETE_SUBTASK_ERROR",
      });
    }
  }
);

// @route   POST /api/tasks/:id/reminders
// @desc    Add reminder to task
// @access  Public (with session) / Private
router.post(
  "/:id/reminders",
  optionalAuth,
  validateSession,
  checkOwnership(Task),
  taskValidations.addReminder,
  handleValidationErrors,
  async (req, res) => {
    try {
      const task = req.resource;
      const { datetime, message } = req.body;

      await task.addReminder(new Date(datetime), message);

      res.json({
        message: "Reminder added successfully",
        task,
      });
    } catch (error) {
      console.error("Add reminder error:", error);
      res.status(500).json({
        message: error.message || "Failed to add reminder",
        error: "ADD_REMINDER_ERROR",
      });
    }
  }
);

// @route   DELETE /api/tasks/:id/reminders/:reminderId
// @desc    Delete reminder
// @access  Public (with session) / Private
router.delete(
  "/:id/reminders/:reminderId",
  optionalAuth,
  validateSession,
  checkOwnership(Task),
  async (req, res) => {
    try {
      const task = req.resource;
      const { reminderId } = req.params;

      task.reminders.id(reminderId).remove();
      await task.save();

      res.json({
        message: "Reminder deleted successfully",
        task,
      });
    } catch (error) {
      console.error("Delete reminder error:", error);
      res.status(500).json({
        message: "Failed to delete reminder",
        error: "DELETE_REMINDER_ERROR",
      });
    }
  }
);

// @route   POST /api/tasks/:id/time-tracking/start
// @desc    Start time tracking for task
// @access  Public (with session) / Private
router.post(
  "/:id/time-tracking/start",
  optionalAuth,
  validateSession,
  checkOwnership(Task),
  async (req, res) => {
    try {
      const task = req.resource;
      const { description } = req.body;

      await task.startTimeTracking(description);

      res.json({
        message: "Time tracking started",
        task,
      });
    } catch (error) {
      console.error("Start time tracking error:", error);
      res.status(500).json({
        message: error.message || "Failed to start time tracking",
        error: "START_TRACKING_ERROR",
      });
    }
  }
);

// @route   POST /api/tasks/:id/time-tracking/stop
// @desc    Stop time tracking for task
// @access  Public (with session) / Private
router.post(
  "/:id/time-tracking/stop",
  optionalAuth,
  validateSession,
  checkOwnership(Task),
  async (req, res) => {
    try {
      const task = req.resource;
      await task.stopTimeTracking();

      res.json({
        message: "Time tracking stopped",
        task,
      });
    } catch (error) {
      console.error("Stop time tracking error:", error);
      res.status(500).json({
        message: error.message || "Failed to stop time tracking",
        error: "STOP_TRACKING_ERROR",
      });
    }
  }
);

// @route   PUT /api/tasks/:id/archive
// @desc    Archive task
// @access  Public (with session) / Private
router.put(
  "/:id/archive",
  optionalAuth,
  validateSession,
  checkOwnership(Task),
  async (req, res) => {
    try {
      const task = req.resource;
      await task.archive();

      res.json({
        message: "Task archived successfully",
        task,
      });
    } catch (error) {
      console.error("Archive task error:", error);
      res.status(500).json({
        message: "Failed to archive task",
        error: "ARCHIVE_TASK_ERROR",
      });
    }
  }
);

// @route   PUT /api/tasks/:id/unarchive
// @desc    Unarchive task
// @access  Public (with session) / Private
router.put(
  "/:id/unarchive",
  optionalAuth,
  validateSession,
  checkOwnership(Task),
  async (req, res) => {
    try {
      const task = req.resource;
      await task.unarchive();

      res.json({
        message: "Task unarchived successfully",
        task,
      });
    } catch (error) {
      console.error("Unarchive task error:", error);
      res.status(500).json({
        message: "Failed to unarchive task",
        error: "UNARCHIVE_TASK_ERROR",
      });
    }
  }
);

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Public (with session) / Private
router.delete(
  "/:id",
  optionalAuth,
  validateSession,
  checkOwnership(Task),
  async (req, res) => {
    try {
      await Task.findByIdAndDelete(req.params.id);

      res.json({
        message: "Task deleted successfully",
      });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({
        message: "Failed to delete task",
        error: "DELETE_TASK_ERROR",
      });
    }
  }
);

// @route   POST /api/tasks/bulk-update
// @desc    Bulk update tasks
// @access  Public (with session) / Private
router.post("/bulk-update", optionalAuth, validateSession, async (req, res) => {
  try {
    const { taskIds, updates } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        message: "Task IDs array is required",
        error: "MISSING_TASK_IDS",
      });
    }

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        message: "Updates object is required",
        error: "MISSING_UPDATES",
      });
    }

    // Build query to ensure user owns all tasks
    const query = {
      _id: { $in: taskIds },
      archived: false,
    };

    if (req.user) {
      query.userId = req.user._id;
    } else {
      query.sessionId = req.sessionId;
    }

    // Update tasks
    const result = await Task.updateMany(query, updates);

    res.json({
      message: `${result.modifiedCount} tasks updated successfully`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Bulk update tasks error:", error);
    res.status(500).json({
      message: "Failed to bulk update tasks",
      error: "BULK_UPDATE_ERROR",
    });
  }
});

// @route   DELETE /api/tasks/bulk-delete
// @desc    Bulk delete tasks
// @access  Public (with session) / Private
router.delete(
  "/bulk-delete",
  optionalAuth,
  validateSession,
  async (req, res) => {
    try {
      const { taskIds } = req.body;

      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({
          message: "Task IDs array is required",
          error: "MISSING_TASK_IDS",
        });
      }

      // Build query to ensure user owns all tasks
      const query = {
        _id: { $in: taskIds },
      };

      if (req.user) {
        query.userId = req.user._id;
      } else {
        query.sessionId = req.sessionId;
      }

      // Delete tasks
      const result = await Task.deleteMany(query);

      res.json({
        message: `${result.deletedCount} tasks deleted successfully`,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      console.error("Bulk delete tasks error:", error);
      res.status(500).json({
        message: "Failed to bulk delete tasks",
        error: "BULK_DELETE_ERROR",
      });
    }
  }
);

// @route   GET /api/tasks/export
// @desc    Export tasks data
// @access  Public (with session) / Private
router.get("/export", optionalAuth, validateSession, async (req, res) => {
  try {
    const { format = "json" } = req.query;

    const tasks = await Task.getByUserOrSession(req.user?._id, req.sessionId, {
      limit: 1000,
    });

    if (format === "csv") {
      // Convert to CSV format
      const csv = tasks.map((task) => ({
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        status: task.status,
        completed: task.completed,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        tags: task.tags.join(";"),
      }));

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=tasks-export.csv"
      );

      // Simple CSV conversion
      const csvHeader = Object.keys(csv[0] || {}).join(",");
      const csvRows = csv.map((row) =>
        Object.values(row)
          .map((val) => `"${val || ""}"`)
          .join(",")
      );
      const csvContent = [csvHeader, ...csvRows].join("\n");

      res.send(csvContent);
    } else {
      res.json({
        tasks,
        total: tasks.length,
        exportedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("Export tasks error:", error);
    res.status(500).json({
      message: "Failed to export tasks",
      error: "EXPORT_ERROR",
    });
  }
});

module.exports = router;
