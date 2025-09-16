const { body, param, query, validationResult } = require("express-validator");

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
    }));

    return res.status(400).json({
      message: "Validation failed",
      errors: formattedErrors,
      error: "VALIDATION_ERROR",
    });
  }

  next();
};

// Common validation rules
const commonValidations = {
  email: body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  password: body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),

  name: body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name can only contain letters and spaces"),

  objectId: (field) =>
    param(field).isMongoId().withMessage(`Invalid ${field} format`),

  optionalObjectId: (field) =>
    param(field).optional().isMongoId().withMessage(`Invalid ${field} format`),

  pagination: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
};

// User validation rules
const userValidations = {
  register: [
    commonValidations.name,
    commonValidations.email,
    commonValidations.password,
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password confirmation does not match password");
      }
      return true;
    }),
  ],

  login: [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("password").notEmpty().withMessage("Password is required"),
  ],

  updateProfile: [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2 and 50 characters"),
    body("email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
  ],

  changePassword: [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "New password must contain at least one lowercase letter, one uppercase letter, and one number"
      ),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Password confirmation does not match new password");
      }
      return true;
    }),
  ],
};

// Project validation rules
const projectValidations = {
  create: [
    body("title")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Title must be between 1 and 100 characters"),
    body("description")
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Description must be between 1 and 500 characters"),
    body("longDescription")
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage("Long description cannot exceed 2000 characters"),
    body("technologies")
      .optional()
      .isArray()
      .withMessage("Technologies must be an array"),
    body("technologies.*")
      .optional()
      .trim()
      .isLength({ max: 30 })
      .withMessage("Each technology name cannot exceed 30 characters"),
    body("category")
      .optional()
      .isIn(["Web Development", "Mobile App", "Desktop App", "API", "Other"])
      .withMessage("Invalid category"),
    body("status")
      .optional()
      .isIn(["In Progress", "Completed", "On Hold", "Cancelled"])
      .withMessage("Invalid status"),
    body("priority")
      .optional()
      .isIn(["Low", "Medium", "High"])
      .withMessage("Invalid priority"),
    body("projectUrl")
      .optional()
      .isURL()
      .withMessage("Project URL must be a valid URL"),
    body("githubUrl")
      .optional()
      .matches(/^https:\/\/github\.com\/.+/)
      .withMessage("GitHub URL must be a valid GitHub repository URL"),
    body("demoUrl")
      .optional()
      .isURL()
      .withMessage("Demo URL must be a valid URL"),
    body("startDate")
      .optional()
      .isISO8601()
      .withMessage("Start date must be a valid date"),
    body("endDate")
      .optional()
      .isISO8601()
      .withMessage("End date must be a valid date")
      .custom((value, { req }) => {
        if (
          value &&
          req.body.startDate &&
          new Date(value) < new Date(req.body.startDate)
        ) {
          throw new Error("End date must be after start date");
        }
        return true;
      }),
    body("featured")
      .optional()
      .isBoolean()
      .withMessage("Featured must be a boolean"),
    body("isPublic")
      .optional()
      .isBoolean()
      .withMessage("IsPublic must be a boolean"),
    body("tags").optional().isArray().withMessage("Tags must be an array"),
    body("tags.*")
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage("Each tag cannot exceed 20 characters"),
  ],

  update: [
    commonValidations.objectId("id"),
    body("title")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Title must be between 1 and 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Description must be between 1 and 500 characters"),
    // ... other optional fields similar to create
  ],

  getById: [commonValidations.objectId("id")],
};

// Contact validation rules
const contactValidations = {
  create: [
    body("name")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2 and 50 characters")
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage("Name can only contain letters and spaces"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("subject")
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage("Subject must be between 5 and 100 characters"),
    body("message")
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage("Message must be between 10 and 1000 characters"),
    body("phone")
      .optional()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage("Please provide a valid phone number"),
    body("company")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Company name cannot exceed 100 characters"),
    body("projectType")
      .optional()
      .isIn([
        "Web Development",
        "Mobile App",
        "E-commerce",
        "API Development",
        "Consultation",
        "Other",
      ])
      .withMessage("Invalid project type"),
    body("budget")
      .optional()
      .isIn([
        "Under $1,000",
        "$1,000 - $5,000",
        "$5,000 - $10,000",
        "$10,000 - $25,000",
        "Above $25,000",
        "Not specified",
      ])
      .withMessage("Invalid budget range"),
    body("timeline")
      .optional()
      .isIn([
        "ASAP",
        "1-2 weeks",
        "1 month",
        "2-3 months",
        "3+ months",
        "Flexible",
      ])
      .withMessage("Invalid timeline"),
  ],

  updateStatus: [
    commonValidations.objectId("id"),
    body("status")
      .isIn(["New", "Read", "In Progress", "Replied", "Closed"])
      .withMessage("Invalid status"),
    body("priority")
      .optional()
      .isIn(["Low", "Medium", "High", "Urgent"])
      .withMessage("Invalid priority"),
  ],

  addNote: [
    commonValidations.objectId("id"),
    body("content")
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Note content must be between 1 and 500 characters"),
  ],
};

// Task validation rules
const taskValidations = {
  create: [
    body("title")
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Title must be between 1 and 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description cannot exceed 1000 characters"),
    body("category")
      .optional()
      .isIn(["Work", "Personal", "Study", "Health", "Other"])
      .withMessage("Invalid category"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high"])
      .withMessage("Invalid priority"),
    body("dueDate")
      .optional()
      .isISO8601()
      .withMessage("Due date must be a valid date")
      .custom((value) => {
        if (value && new Date(value) < new Date().setHours(0, 0, 0, 0)) {
          throw new Error("Due date cannot be in the past");
        }
        return true;
      }),
    body("estimatedDuration")
      .optional()
      .isInt({ min: 1, max: 10080 })
      .withMessage("Estimated duration must be between 1 and 10080 minutes"),
    body("tags").optional().isArray().withMessage("Tags must be an array"),
    body("tags.*")
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage("Each tag cannot exceed 20 characters"),
  ],

  update: [
    commonValidations.objectId("id"),
    body("title")
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Title must be between 1 and 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description cannot exceed 1000 characters"),
    body("category")
      .optional()
      .isIn(["Work", "Personal", "Study", "Health", "Other"])
      .withMessage("Invalid category"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high"])
      .withMessage("Invalid priority"),
    body("status")
      .optional()
      .isIn(["pending", "in_progress", "completed", "cancelled"])
      .withMessage("Invalid status"),
    body("dueDate")
      .optional()
      .isISO8601()
      .withMessage("Due date must be a valid date"),
    body("completed")
      .optional()
      .isBoolean()
      .withMessage("Completed must be a boolean"),
  ],

  addSubtask: [
    commonValidations.objectId("id"),
    body("title")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Subtask title must be between 1 and 100 characters"),
  ],

  addReminder: [
    commonValidations.objectId("id"),
    body("datetime")
      .isISO8601()
      .withMessage("Reminder datetime must be a valid date")
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error("Reminder datetime must be in the future");
        }
        return true;
      }),
    body("message")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Reminder message cannot exceed 200 characters"),
  ],
};

// Analytics validation rules
const analyticsValidations = {
  track: [
    body("type")
      .isIn([
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
      ])
      .withMessage("Invalid analytics type"),
    body("page")
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Page must be between 1 and 200 characters"),
    body("element")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Element identifier cannot exceed 100 characters"),
    body("sessionId").notEmpty().withMessage("Session ID is required"),
    body("metadata")
      .optional()
      .isObject()
      .withMessage("Metadata must be an object"),
  ],

  getStats: [
    query("startDate")
      .optional()
      .isISO8601()
      .withMessage("Start date must be a valid date"),
    query("endDate")
      .optional()
      .isISO8601()
      .withMessage("End date must be a valid date"),
    query("page")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Page cannot exceed 200 characters"),
    ...commonValidations.pagination,
  ],
};

module.exports = {
  handleValidationErrors,
  userValidations,
  projectValidations,
  contactValidations,
  taskValidations,
  analyticsValidations,
  commonValidations,
};
