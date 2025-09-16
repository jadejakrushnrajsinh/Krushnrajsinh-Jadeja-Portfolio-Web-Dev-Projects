const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const updateAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/portfolio";
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    const newEmail = "jadejakrushnrajsinh99@gmail.com";
    const newPassword = "jadeja.kirtiba.12";
    const newName = "Krushnraj Sinh Jadeja";

    // Find existing admin
    const existingAdmin = await User.findOne({ role: "admin" });
    if (!existingAdmin) {
      console.log("❌ No admin user found");
      return;
    }

    // Update admin credentials
    existingAdmin.email = newEmail;
    existingAdmin.password = newPassword; // This will be hashed by the pre-save middleware
    existingAdmin.name = newName;
    existingAdmin.isVerified = true; // Ensure admin is verified

    await existingAdmin.save();

    console.log("✅ Admin credentials updated successfully!");
    console.log(`Email: ${newEmail}`);
    console.log(`Password: ${newPassword}`);
    console.log(`Name: ${newName}`);
  } catch (error) {
    console.error("❌ Error updating admin:", error);
  } finally {
    await mongoose.connection.close();
    console.log("📦 Database connection closed");
  }
};

updateAdmin();
