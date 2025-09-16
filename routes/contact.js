const express = require("express");
const nodemailer = require("nodemailer");
const Contact = require("../models/Contact");
const {
  authenticateToken,
  requireAdmin,
  optionalAuth,
} = require("../middleware/auth");
const {
  contactValidations,
  handleValidationErrors,
} = require("../middleware/validation");

const router = express.Router();

// Email transporter setup
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// @route   POST /api/contact
// @desc    Submit contact form
// @access  Public
router.post(
  "/",
  contactValidations.create,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        name,
        email,
        subject,
        message,
        phone,
        company,
        projectType,
        budget,
        timeline,
      } = req.body;

      // Get client information
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get("User-Agent");

      // Create contact message
      const contact = new Contact({
        name,
        email,
        subject,
        message,
        phone,
        company,
        projectType,
        budget,
        timeline,
        ipAddress,
        userAgent,
        source: "Portfolio Website",
      });

      await contact.save();

      // Send email notification to admin
      try {
        const transporter = createEmailTransporter();

        const adminEmailOptions = {
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: process.env.EMAIL_TO || "krushnrajsinhjadeja777@gmail.com",
          subject: `New Contact Form Submission: ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                New Contact Form Submission
              </h2>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #2c3e50; margin-top: 0;">Contact Information</h3>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                ${
                  phone
                    ? `<p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>`
                    : ""
                }
                ${company ? `<p><strong>Company:</strong> ${company}</p>` : ""}
              </div>

              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #2c3e50; margin-top: 0;">Project Details</h3>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Project Type:</strong> ${projectType}</p>
                <p><strong>Budget:</strong> ${budget}</p>
                <p><strong>Timeline:</strong> ${timeline}</p>
              </div>

              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #2c3e50; margin-top: 0;">Message</h3>
                <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
              </div>

              <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 12px; color: #666;">
                <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>IP Address:</strong> ${ipAddress}</p>
                <p><strong>User Agent:</strong> ${userAgent}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="mailto:${email}?subject=Re: ${subject}" 
                   style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Reply to ${name}
                </a>
              </div>
            </div>
          `,
        };

        await transporter.sendMail(adminEmailOptions);

        // Send auto-reply to user
        const userEmailOptions = {
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: email,
          subject: `Thank you for contacting me - ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                Thank You for Your Message!
              </h2>
              
              <p>Hi ${name},</p>
              
              <p>Thank you for reaching out! I've received your message about "<strong>${subject}</strong>" and I appreciate you taking the time to contact me.</p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #2c3e50; margin-top: 0;">What happens next?</h3>
                <ul style="line-height: 1.6;">
                  <li>I'll review your message and project requirements carefully</li>
                  <li>You can expect a personal response within 24-48 hours</li>
                  <li>If your project is a good fit, I'll schedule a call to discuss details</li>
                </ul>
              </div>

              <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4 style="color: #2c3e50; margin-top: 0;">Your Message Summary:</h4>
                <p><strong>Project Type:</strong> ${projectType}</p>
                <p><strong>Budget Range:</strong> ${budget}</p>
                <p><strong>Timeline:</strong> ${timeline}</p>
              </div>

              <p>In the meantime, feel free to check out my portfolio and recent projects on my website.</p>
              
              <p>Best regards,<br>
              <strong>Krushnraj Sinh Jadeja</strong><br>
              Full Stack Developer</p>

              <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  This is an automated response. Please don't reply to this email.<br>
                  If you have urgent questions, you can reach me at 
                  <a href="mailto:krushnrajsinhjadeja777@gmail.com">krushnrajsinhjadeja777@gmail.com</a>
                </p>
              </div>
            </div>
          `,
        };

        await transporter.sendMail(userEmailOptions);
      } catch (emailError) {
        console.error("Email sending error:", emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json({
        message: "Message sent successfully! I'll get back to you soon.",
        contact: {
          id: contact._id,
          name: contact.name,
          subject: contact.subject,
          createdAt: contact.createdAt,
        },
      });
    } catch (error) {
      console.error("Contact form error:", error);
      res.status(500).json({
        message: "Failed to send message. Please try again.",
        error: "CONTACT_FORM_ERROR",
      });
    }
  }
);

// @route   GET /api/contact
// @desc    Get all contact messages (admin only)
// @access  Private (Admin)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      search,
      startDate,
      endDate,
    } = req.query;

    // Build query
    const query = { isArchived: false };

    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("notes.addedBy", "name email");

    const total = await Contact.countDocuments(query);

    res.json({
      contacts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get contacts error:", error);
    res.status(500).json({
      message: "Failed to fetch contacts",
      error: "FETCH_CONTACTS_ERROR",
    });
  }
});

// @route   GET /api/contact/stats
// @desc    Get contact statistics (admin only)
// @access  Private (Admin)
router.get("/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await Contact.getStats();
    const highPriorityMessages = await Contact.getHighPriority();
    const unreadMessages = await Contact.getUnread();

    res.json({
      stats,
      highPriorityCount: highPriorityMessages.length,
      unreadCount: unreadMessages.length,
      recentHighPriority: highPriorityMessages.slice(0, 5),
      recentUnread: unreadMessages.slice(0, 5),
    });
  } catch (error) {
    console.error("Get contact stats error:", error);
    res.status(500).json({
      message: "Failed to fetch contact statistics",
      error: "FETCH_STATS_ERROR",
    });
  }
});

// @route   GET /api/contact/:id
// @desc    Get single contact message (admin only)
// @access  Private (Admin)
router.get("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id).populate(
      "notes.addedBy",
      "name email"
    );

    if (!contact) {
      return res.status(404).json({
        message: "Contact message not found",
        error: "NOT_FOUND",
      });
    }

    // Mark as read if it's new
    if (contact.status === "New") {
      await contact.markAsRead(req.user._id);
    }

    res.json({ contact });
  } catch (error) {
    console.error("Get contact error:", error);
    res.status(500).json({
      message: "Failed to fetch contact message",
      error: "FETCH_CONTACT_ERROR",
    });
  }
});

// @route   PUT /api/contact/:id/status
// @desc    Update contact message status (admin only)
// @access  Private (Admin)
router.put(
  "/:id/status",
  authenticateToken,
  requireAdmin,
  contactValidations.updateStatus,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status, priority } = req.body;

      const contact = await Contact.findById(req.params.id);
      if (!contact) {
        return res.status(404).json({
          message: "Contact message not found",
          error: "NOT_FOUND",
        });
      }

      // Update status and priority
      contact.status = status;
      if (priority) contact.priority = priority;

      // Set timestamps based on status
      if (status === "Read" && !contact.readAt) {
        contact.readAt = new Date();
      } else if (status === "Replied" && !contact.repliedAt) {
        contact.repliedAt = new Date();
      }

      await contact.save();

      res.json({
        message: "Contact status updated successfully",
        contact,
      });
    } catch (error) {
      console.error("Update contact status error:", error);
      res.status(500).json({
        message: "Failed to update contact status",
        error: "UPDATE_STATUS_ERROR",
      });
    }
  }
);

// @route   POST /api/contact/:id/notes
// @desc    Add note to contact message (admin only)
// @access  Private (Admin)
router.post(
  "/:id/notes",
  authenticateToken,
  requireAdmin,
  contactValidations.addNote,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { content } = req.body;

      const contact = await Contact.findById(req.params.id);
      if (!contact) {
        return res.status(404).json({
          message: "Contact message not found",
          error: "NOT_FOUND",
        });
      }

      await contact.addNote(content, req.user._id);

      // Populate the notes for response
      await contact.populate("notes.addedBy", "name email");

      res.json({
        message: "Note added successfully",
        contact,
      });
    } catch (error) {
      console.error("Add note error:", error);
      res.status(500).json({
        message: "Failed to add note",
        error: "ADD_NOTE_ERROR",
      });
    }
  }
);

// @route   PUT /api/contact/:id/spam
// @desc    Mark contact message as spam (admin only)
// @access  Private (Admin)
router.put("/:id/spam", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({
        message: "Contact message not found",
        error: "NOT_FOUND",
      });
    }

    await contact.markAsSpam();

    res.json({
      message: "Message marked as spam",
      contact,
    });
  } catch (error) {
    console.error("Mark spam error:", error);
    res.status(500).json({
      message: "Failed to mark as spam",
      error: "MARK_SPAM_ERROR",
    });
  }
});

// @route   PUT /api/contact/:id/archive
// @desc    Archive contact message (admin only)
// @access  Private (Admin)
router.put(
  "/:id/archive",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const contact = await Contact.findById(req.params.id);
      if (!contact) {
        return res.status(404).json({
          message: "Contact message not found",
          error: "NOT_FOUND",
        });
      }

      await contact.archive();

      res.json({
        message: "Message archived successfully",
        contact,
      });
    } catch (error) {
      console.error("Archive contact error:", error);
      res.status(500).json({
        message: "Failed to archive message",
        error: "ARCHIVE_ERROR",
      });
    }
  }
);

// @route   DELETE /api/contact/:id
// @desc    Delete contact message (admin only)
// @access  Private (Admin)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({
        message: "Contact message not found",
        error: "NOT_FOUND",
      });
    }

    await Contact.findByIdAndDelete(req.params.id);

    res.json({
      message: "Contact message deleted successfully",
    });
  } catch (error) {
    console.error("Delete contact error:", error);
    res.status(500).json({
      message: "Failed to delete contact message",
      error: "DELETE_ERROR",
    });
  }
});

module.exports = router;
