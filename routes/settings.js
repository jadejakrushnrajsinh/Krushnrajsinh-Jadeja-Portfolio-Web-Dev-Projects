const express = require("express");
const Settings = require("../models/Settings");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/settings
// @desc    Get site settings
// @access  Private (Admin only)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch settings", error: error.message });
  }
});

// @route   PUT /api/settings/footer
// @desc    Update footer settings
// @access  Private (Admin only)
router.put("/footer", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { copyright, socialLinks, customText } = req.body;

    const settings = await Settings.getSettings();

    if (copyright !== undefined) settings.footer.copyright = copyright;
    if (socialLinks !== undefined) settings.footer.socialLinks = socialLinks;
    if (customText !== undefined) settings.footer.customText = customText;

    await settings.save();

    res.json({
      message: "Footer settings updated successfully",
      footer: settings.footer,
    });
  } catch (error) {
    console.error("Error updating footer settings:", error);
    res
      .status(500)
      .json({
        message: "Failed to update footer settings",
        error: error.message,
      });
  }
});

// @route   PUT /api/settings/site
// @desc    Update site settings
// @access  Private (Admin only)
router.put("/site", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description } = req.body;

    const settings = await Settings.getSettings();

    if (title !== undefined) settings.site.title = title;
    if (description !== undefined) settings.site.description = description;

    await settings.save();

    res.json({
      message: "Site settings updated successfully",
      site: settings.site,
    });
  } catch (error) {
    console.error("Error updating site settings:", error);
    res
      .status(500)
      .json({
        message: "Failed to update site settings",
        error: error.message,
      });
  }
});

// @route   PUT /api/settings
// @desc    Update all settings
// @access  Private (Admin only)
router.put("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { footer, site } = req.body;

    const settings = await Settings.getSettings();

    if (footer) {
      if (footer.copyright !== undefined)
        settings.footer.copyright = footer.copyright;
      if (footer.socialLinks !== undefined)
        settings.footer.socialLinks = footer.socialLinks;
      if (footer.customText !== undefined)
        settings.footer.customText = footer.customText;
    }

    if (site) {
      if (site.title !== undefined) settings.site.title = site.title;
      if (site.description !== undefined)
        settings.site.description = site.description;
    }

    await settings.save();

    res.json({
      message: "Settings updated successfully",
      settings,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res
      .status(500)
      .json({ message: "Failed to update settings", error: error.message });
  }
});

module.exports = router;
