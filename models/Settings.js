const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    footer: {
      copyright: {
        type: String,
        default: "© 2023 Krushnraj Sinh Jadeja. All rights reserved.",
      },
      socialLinks: [
        {
          platform: { type: String, required: true },
          url: { type: String, required: true },
          icon: { type: String, required: true },
        },
      ],
      customText: {
        type: String,
        default: "",
      },
    },
    site: {
      title: {
        type: String,
        default: "Krushnraj | Full Stack Developer",
      },
      description: {
        type: String,
        default:
          "Creating innovative web solutions with cutting-edge technologies.",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists
settingsSchema.pre("save", async function (next) {
  if (this.isNew) {
    const existing = await this.constructor.findOne();
    if (existing) {
      throw new Error("Settings document already exists");
    }
  }
  next();
});

// Static method to get settings (create if doesn't exist)
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = new this({
      footer: {
        socialLinks: [
          {
            platform: "GitHub",
            url: "https://github.com/jadejakrushnrajsinh",
            icon: "fab fa-github",
          },
          {
            platform: "LinkedIn",
            url: "https://www.linkedin.com/in/krushnrajsinh-jadeja-285775228/",
            icon: "fab fa-linkedin",
          },
          {
            platform: "Twitter",
            url: "https://x.com/KrushnrajsinhJ5",
            icon: "fab fa-twitter",
          },
          {
            platform: "Instagram",
            url: "https://www.instagram.com/krushnrajsinhjadeja407?igsh=cnh1cWloMHN2anpy",
            icon: "fab fa-instagram",
          },
        ],
      },
    });
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model("Settings", settingsSchema);
