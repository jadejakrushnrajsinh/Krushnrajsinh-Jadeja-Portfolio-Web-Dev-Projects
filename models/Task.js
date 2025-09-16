const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [1, "Title must be at least 1 character long"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["Work", "Personal", "Study", "Health", "Other"],
      default: "Other",
    },
    priority: {
      type: String,
      required: [true, "Priority is required"],
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    completed: {
      type: Boolean,
      default: false,
    },
    dueDate: {
      type: Date,
      validate: {
        validator: function (v) {
          return !v || v >= new Date().setHours(0, 0, 0, 0);
        },
        message: "Due date cannot be in the past",
      },
    },
    completedAt: {
      type: Date,
      default: null,
    },
    estimatedDuration: {
      type: Number, // in minutes
      min: [1, "Estimated duration must be at least 1 minute"],
      max: [10080, "Estimated duration cannot exceed 1 week (10080 minutes)"],
    },
    actualDuration: {
      type: Number, // in minutes
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
    subtasks: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
          maxlength: [100, "Subtask title cannot exceed 100 characters"],
        },
        completed: {
          type: Boolean,
          default: false,
        },
        completedAt: {
          type: Date,
          default: null,
        },
      },
    ],
    attachments: [
      {
        filename: {
          type: String,
          required: true,
        },
        originalName: {
          type: String,
          required: true,
        },
        mimetype: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    reminders: [
      {
        datetime: {
          type: Date,
          required: true,
        },
        message: {
          type: String,
          trim: true,
          maxlength: [200, "Reminder message cannot exceed 200 characters"],
        },
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: {
          type: Date,
          default: null,
        },
      },
    ],
    recurring: {
      enabled: {
        type: Boolean,
        default: false,
      },
      pattern: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly"],
        default: "weekly",
      },
      interval: {
        type: Number,
        min: 1,
        default: 1,
      },
      endDate: {
        type: Date,
        default: null,
      },
      nextDue: {
        type: Date,
        default: null,
      },
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null for anonymous users (using session/localStorage)
    },
    sessionId: {
      type: String,
      trim: true,
      default: null, // for anonymous users
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    sharedWith: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        permission: {
          type: String,
          enum: ["view", "edit"],
          default: "view",
        },
        sharedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    position: {
      type: Number,
      default: 0, // for ordering tasks
    },
    timeTracking: {
      sessions: [
        {
          startTime: {
            type: Date,
            required: true,
          },
          endTime: {
            type: Date,
            default: null,
          },
          duration: {
            type: Number, // in minutes
            default: 0,
          },
          description: {
            type: String,
            trim: true,
            maxlength: [
              200,
              "Time tracking description cannot exceed 200 characters",
            ],
          },
        },
      ],
      totalTime: {
        type: Number, // in minutes
        default: 0,
      },
      isActive: {
        type: Boolean,
        default: false,
      },
      activeSessionStart: {
        type: Date,
        default: null,
      },
    },
    archived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
taskSchema.index({ userId: 1, completed: 1, createdAt: -1 });
taskSchema.index({ sessionId: 1, completed: 1, createdAt: -1 });
taskSchema.index({ category: 1, createdAt: -1 });
taskSchema.index({ priority: 1, dueDate: 1 });
taskSchema.index({ status: 1, createdAt: -1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ archived: 1 });
taskSchema.index({ "recurring.enabled": 1, "recurring.nextDue": 1 });

// Virtual for overdue status
taskSchema.virtual("isOverdue").get(function () {
  if (!this.dueDate || this.completed) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dueDate = new Date(this.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < now;
});

// Virtual for completion percentage
taskSchema.virtual("completionPercentage").get(function () {
  if (this.completed) return 100;
  if (this.subtasks.length === 0) return 0;

  const completedSubtasks = this.subtasks.filter(
    (subtask) => subtask.completed
  ).length;
  return Math.round((completedSubtasks / this.subtasks.length) * 100);
});

// Virtual for time remaining
taskSchema.virtual("timeRemaining").get(function () {
  if (!this.dueDate || this.completed) return null;

  const now = new Date();
  const diffTime = this.dueDate - now;

  if (diffTime < 0) return "Overdue";

  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(
    (diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""}`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""}`;
  } else {
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
  }
});

// Method to toggle completion
taskSchema.methods.toggleComplete = function () {
  this.completed = !this.completed;
  this.status = this.completed ? "completed" : "pending";
  this.completedAt = this.completed ? new Date() : null;

  // Update actual duration if time tracking is active
  if (this.timeTracking.isActive) {
    this.stopTimeTracking();
  }

  return this.save();
};

// Method to add subtask
taskSchema.methods.addSubtask = function (title) {
  this.subtasks.push({ title, completed: false });
  return this.save();
};

// Method to toggle subtask completion
taskSchema.methods.toggleSubtask = function (subtaskId) {
  const subtask = this.subtasks.id(subtaskId);
  if (subtask) {
    subtask.completed = !subtask.completed;
    subtask.completedAt = subtask.completed ? new Date() : null;

    // Auto-complete main task if all subtasks are completed
    if (this.subtasks.length > 0 && this.subtasks.every((st) => st.completed)) {
      this.completed = true;
      this.status = "completed";
      this.completedAt = new Date();
    }

    return this.save();
  }
  return Promise.reject(new Error("Subtask not found"));
};

// Method to start time tracking
taskSchema.methods.startTimeTracking = function (description = "") {
  if (this.timeTracking.isActive) {
    throw new Error("Time tracking is already active for this task");
  }

  this.timeTracking.isActive = true;
  this.timeTracking.activeSessionStart = new Date();
  this.timeTracking.sessions.push({
    startTime: new Date(),
    description,
  });

  return this.save();
};

// Method to stop time tracking
taskSchema.methods.stopTimeTracking = function () {
  if (!this.timeTracking.isActive) {
    throw new Error("Time tracking is not active for this task");
  }

  const activeSession =
    this.timeTracking.sessions[this.timeTracking.sessions.length - 1];
  const endTime = new Date();
  const duration = Math.round(
    (endTime - activeSession.startTime) / (1000 * 60)
  ); // in minutes

  activeSession.endTime = endTime;
  activeSession.duration = duration;

  this.timeTracking.totalTime += duration;
  this.timeTracking.isActive = false;
  this.timeTracking.activeSessionStart = null;

  return this.save();
};

// Method to add reminder
taskSchema.methods.addReminder = function (datetime, message = "") {
  if (datetime <= new Date()) {
    throw new Error("Reminder datetime must be in the future");
  }

  this.reminders.push({ datetime, message });
  return this.save();
};

// Method to archive task
taskSchema.methods.archive = function () {
  this.archived = true;
  this.archivedAt = new Date();
  return this.save();
};

// Method to unarchive task
taskSchema.methods.unarchive = function () {
  this.archived = false;
  this.archivedAt = null;
  return this.save();
};

// Static method to get tasks by user or session
taskSchema.statics.getByUserOrSession = function (
  userId,
  sessionId,
  options = {}
) {
  const query = { archived: false };

  if (userId) {
    query.userId = userId;
  } else if (sessionId) {
    query.sessionId = sessionId;
  } else {
    return Promise.resolve([]);
  }

  if (options.completed !== undefined) {
    query.completed = options.completed;
  }

  if (options.category) {
    query.category = options.category;
  }

  if (options.priority) {
    query.priority = options.priority;
  }

  return this.find(query)
    .sort({ position: 1, createdAt: -1 })
    .limit(options.limit || 100);
};

// Static method to get overdue tasks
taskSchema.statics.getOverdue = function (userId, sessionId) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const query = {
    archived: false,
    completed: false,
    dueDate: { $lt: now },
  };

  if (userId) {
    query.userId = userId;
  } else if (sessionId) {
    query.sessionId = sessionId;
  }

  return this.find(query).sort({ dueDate: 1 });
};

// Static method to get tasks due today
taskSchema.statics.getDueToday = function (userId, sessionId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const query = {
    archived: false,
    completed: false,
    dueDate: { $gte: today, $lt: tomorrow },
  };

  if (userId) {
    query.userId = userId;
  } else if (sessionId) {
    query.sessionId = sessionId;
  }

  return this.find(query).sort({ dueDate: 1 });
};

// Static method to get task statistics
taskSchema.statics.getStats = function (userId, sessionId) {
  const query = { archived: false };

  if (userId) {
    query.userId = userId;
  } else if (sessionId) {
    query.sessionId = sessionId;
  }

  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: ["$completed", 1, 0] } },
        pending: { $sum: { $cond: ["$completed", 0, 1] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $not: "$completed" },
                  { $lt: ["$dueDate", new Date()] },
                ],
              },
              1,
              0,
            ],
          },
        },
        highPriority: {
          $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] },
        },
      },
    },
  ]);
};

// Pre-save middleware
taskSchema.pre("save", function (next) {
  // Ensure tags are unique and lowercase
  if (this.tags) {
    this.tags = [...new Set(this.tags.map((tag) => tag.toLowerCase()))];
  }

  // Update recurring task next due date
  if (this.recurring.enabled && this.dueDate) {
    this.calculateNextDueDate();
  }

  next();
});

// Method to calculate next due date for recurring tasks
taskSchema.methods.calculateNextDueDate = function () {
  if (!this.recurring.enabled || !this.dueDate) return;

  const nextDue = new Date(this.dueDate);

  switch (this.recurring.pattern) {
    case "daily":
      nextDue.setDate(nextDue.getDate() + this.recurring.interval);
      break;
    case "weekly":
      nextDue.setDate(nextDue.getDate() + 7 * this.recurring.interval);
      break;
    case "monthly":
      nextDue.setMonth(nextDue.getMonth() + this.recurring.interval);
      break;
    case "yearly":
      nextDue.setFullYear(nextDue.getFullYear() + this.recurring.interval);
      break;
  }

  this.recurring.nextDue = nextDue;
};

// Ensure virtual fields are serialized
taskSchema.set("toJSON", { virtuals: true });
taskSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Task", taskSchema);
