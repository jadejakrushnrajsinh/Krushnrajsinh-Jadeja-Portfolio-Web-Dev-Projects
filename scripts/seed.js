const mongoose = require("mongoose");
const User = require("../models/User");
const Project = require("../models/Project");
require("dotenv").config();

const seedDatabase = async () => {
  try {
    console.log("🔍 Current working directory:", process.cwd());
    console.log("🔍 Script location:", __filename);
    // Connect to MongoDB
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/portfolio";
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB for seeding");

    // Create admin user
    console.log("🔧 Creating admin user...");
    const adminUser = await User.createAdmin(
      process.env.ADMIN_EMAIL || "jadejakrushnrajsinh99@gmail.com",
      process.env.ADMIN_PASSWORD || "jadeja.kirtiba.12",
      "Portfolio Admin"
    );
    console.log("✅ Admin user created:", adminUser.email);

    // Create sample projects
    console.log("🔧 Creating sample projects...");
    const sampleProjects = [
      {
        title: "Amazon Clone",
        description:
          "Full-featured e-commerce platform with product listings, search functionality, and shopping cart. Built with HTML, CSS, and JavaScript.",
        longDescription:
          "A comprehensive e-commerce platform that replicates the core functionality of Amazon. Features include product browsing, search and filtering, shopping cart management, user authentication, and responsive design. This project demonstrates proficiency in frontend development and user experience design.",
        technologies: ["HTML", "CSS", "JavaScript", "Local Storage"],
        category: "Web Development",
        status: "Completed",
        priority: "High",
        imageUrl:
          "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
        demoUrl: `http://localhost:${
          process.env.PORT || 5000
        }/amazon-clone.html`,
        featured: true,
        isPublic: true,
        tags: ["ecommerce", "frontend", "responsive"],
        features: [
          "Product catalog with search and filtering",
          "Shopping cart functionality",
          "Responsive design",
          "Local storage for persistence",
        ],
        createdBy: adminUser._id,
      },
      {
        title: "Task Management App",
        description:
          "Advanced productivity application with task creation, organization, filtering, and progress tracking. Features include expandable details, priority management, and local storage.",
        longDescription:
          "A sophisticated task management application designed to boost productivity. Users can create, organize, and track tasks with various priority levels, categories, and due dates. The app includes advanced features like subtasks, time tracking, search functionality, and data export capabilities.",
        technologies: [
          "HTML",
          "CSS",
          "JavaScript",
          "Local Storage",
          "Chart.js",
        ],
        category: "Web Development",
        status: "Completed",
        priority: "High",
        imageUrl:
          "https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
        demoUrl: `http://localhost:${
          process.env.PORT || 5000
        }/task-management-app.html`,
        featured: true,
        isPublic: true,
        tags: ["productivity", "tasks", "organization"],
        features: [
          "Task creation and management",
          "Priority and category system",
          "Due date tracking",
          "Search and filtering",
          "Progress statistics",
          "Data export functionality",
        ],
        createdBy: adminUser._id,
      },
      {
        title: "Weather Dashboard",
        description:
          "Interactive weather application that displays current and forecasted weather conditions with beautiful UI and real-time data.",
        longDescription:
          "A modern weather dashboard that provides comprehensive weather information including current conditions, hourly forecasts, and extended predictions. Features location-based weather detection, interactive charts, and a clean, intuitive interface.",
        technologies: ["HTML", "CSS", "JavaScript", "Weather API", "Chart.js"],
        category: "Web Development",
        status: "Completed",
        priority: "Medium",
        imageUrl:
          "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
        demoUrl: `http://localhost:${
          process.env.PORT || 5000
        }/weather-dashboard.html`,
        featured: true,
        isPublic: true,
        tags: ["weather", "api", "dashboard"],
        features: [
          "Current weather conditions",
          "Extended weather forecast",
          "Location-based detection",
          "Interactive weather charts",
          "Responsive design",
        ],
        createdBy: adminUser._id,
      },
      {
        title: "Portfolio Website",
        description:
          "Personal portfolio website showcasing projects, skills, and professional experience with modern design and fullstack capabilities.",
        longDescription:
          "A comprehensive portfolio website built with modern web technologies. Features include project showcases, contact forms, admin dashboard, analytics tracking, and content management system. Demonstrates fullstack development skills with both frontend and backend implementation.",
        technologies: [
          "HTML",
          "CSS",
          "JavaScript",
          "Node.js",
          "Express",
          "MongoDB",
          "JWT",
        ],
        category: "Web Development",
        status: "In Progress",
        priority: "High",
        imageUrl:
          "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
        projectUrl: `http://localhost:${process.env.PORT || 5000}/`,
        githubUrl: "https://github.com/jadejakrushnrajsinh/portfolio",
        featured: false,
        isPublic: true,
        tags: ["portfolio", "fullstack", "cms"],
        features: [
          "Responsive portfolio design",
          "Admin dashboard",
          "Contact form with email notifications",
          "Analytics tracking",
          "Project management system",
          "User authentication",
        ],
        createdBy: adminUser._id,
      },
    ];

    // Clear existing projects
    await Project.deleteMany({});

    // Insert sample projects
    const createdProjects = await Project.insertMany(sampleProjects);
    console.log(`✅ Created ${createdProjects.length} sample projects`);

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`👤 Admin User: ${adminUser.email}`);
    console.log(`📁 Projects: ${createdProjects.length}`);
    const adminPassword = process.env.ADMIN_PASSWORD || "jadeja.kirtiba.12";
    console.log("\n🔐 Admin Login Credentials:");
    console.log(`Email: ${adminUser.email}`);
    console.log(`Password: ${adminPassword}`);
  } catch (error) {
    console.error("❌ Seeding error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("📦 Database connection closed");
    process.exit(0);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
