// Admin Dashboard JavaScript - Enhanced Version
class AdminDashboard {
  constructor() {
    this.token = localStorage.getItem("adminToken");
    this.user = null;
    this.currentSection = "overview";
    this.charts = {};
    this.currentFilters = {
      messages: { status: "all", search: "", priority: "all" },
      projects: { category: "all", status: "all", search: "" },
      tasks: { status: "all", priority: "all", search: "" },
    };
    this.selectedItems = new Set();
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupThemeToggle();
    this.setupSearchAndFilters();
    this.setupBulkActions();
    this.checkAuth();
  }

  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    }

    // Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.handleLogout());
    }

    // Navigation
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => this.switchSection(e));
    });

    // Project management
    const addProjectBtn = document.getElementById("addProjectBtn");
    if (addProjectBtn) {
      addProjectBtn.addEventListener("click", () => this.openProjectModal());
    }

    const projectForm = document.getElementById("projectForm");
    if (projectForm) {
      projectForm.addEventListener("submit", (e) =>
        this.handleProjectSubmit(e)
      );
    }

    // Task management
    const addTaskBtn = document.getElementById("addTaskBtn");
    if (addTaskBtn) {
      addTaskBtn.addEventListener("click", () => this.openTaskModal());
    }

    const taskForm = document.getElementById("taskForm");
    if (taskForm) {
      taskForm.addEventListener("submit", (e) => this.handleTaskSubmit(e));
    }

    // Settings forms
    const profileForm = document.getElementById("profileForm");
    if (profileForm) {
      profileForm.addEventListener("submit", (e) =>
        this.handleProfileUpdate(e)
      );
    }

    const passwordForm = document.getElementById("passwordForm");
    if (passwordForm) {
      passwordForm.addEventListener("submit", (e) =>
        this.handlePasswordChange(e)
      );
    }

    const footerForm = document.getElementById("footerForm");
    if (footerForm) {
      footerForm.addEventListener("submit", (e) => this.handleFooterUpdate(e));
    }

    const addSocialLinkBtn = document.getElementById("addSocialLink");
    if (addSocialLinkBtn) {
      addSocialLinkBtn.addEventListener("click", () =>
        this.addSocialLinkField()
      );
    }

    // Message filters
    const messageFilter = document.getElementById("messageFilter");
    if (messageFilter) {
      messageFilter.addEventListener("change", () => this.loadMessages());
    }

    // Task filters
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.filterTasks(e));
    });

    // Analytics range
    const analyticsRange = document.getElementById("analyticsRange");
    if (analyticsRange) {
      analyticsRange.addEventListener("change", () => this.loadAnalytics());
    }

    // Modal close buttons
    document.querySelectorAll(".modal-close").forEach((btn) => {
      btn.addEventListener("click", () => this.closeModals());
    });

    // Close modals on outside click
    document.querySelectorAll(".modal").forEach((modal) => {
      if (modal.id !== "loginModal") {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            this.closeModals();
          }
        });
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) =>
      this.handleKeyboardShortcuts(e)
    );
  }

  setupThemeToggle() {
    const themeToggle = document.createElement("button");
    themeToggle.className = "theme-toggle";
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    themeToggle.title = "Toggle Dark Mode";
    themeToggle.addEventListener("click", () => this.toggleTheme());

    const headerRight = document.querySelector(".header-right");
    if (headerRight) {
      headerRight.insertBefore(themeToggle, headerRight.firstChild);
    }

    // Load saved theme
    const savedTheme = localStorage.getItem("adminTheme");
    if (savedTheme === "dark") {
      this.setTheme("dark");
    }
  }

  setupSearchAndFilters() {
    // Add search inputs to sections
    this.addSearchToSection("messages", "Search messages...");
    this.addSearchToSection("projects", "Search projects...");
    this.addSearchToSection("tasks", "Search tasks...");

    // Add advanced filters
    this.addAdvancedFilters();
  }

  setupBulkActions() {
    // Add bulk action buttons
    this.addBulkActionsToSection("messages");
    this.addBulkActionsToSection("projects");
    this.addBulkActionsToSection("tasks");
  }

  addSearchToSection(sectionId, placeholder) {
    const section = document.getElementById(`${sectionId}Section`);
    if (!section) return;

    const header = section.querySelector(".section-header");
    if (!header) return;

    const searchContainer = document.createElement("div");
    searchContainer.className = "search-container";
    searchContainer.innerHTML = `
      <div class="search-input-wrapper">
        <i class="fas fa-search"></i>
        <input type="text" class="search-input" placeholder="${placeholder}" data-section="${sectionId}">
      </div>
    `;

    header.appendChild(searchContainer);

    // Add search functionality
    const searchInput = searchContainer.querySelector(".search-input");
    searchInput.addEventListener("input", (e) => {
      this.currentFilters[sectionId].search = e.target.value.toLowerCase();
      this.applyFilters(sectionId);
    });
  }

  addAdvancedFilters() {
    // Add priority filter for messages
    const messageFilters = document.querySelector(".message-filters");
    if (messageFilters) {
      const priorityFilter = document.createElement("select");
      priorityFilter.id = "messagePriorityFilter";
      priorityFilter.innerHTML = `
        <option value="all">All Priorities</option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
        <option value="Urgent">Urgent</option>
      `;
      priorityFilter.addEventListener("change", () => {
        this.currentFilters.messages.priority = priorityFilter.value;
        this.loadMessages();
      });
      messageFilters.appendChild(priorityFilter);
    }

    // Add category filter for projects
    const projectsSection = document.getElementById("projectsSection");
    const projectsHeader = projectsSection?.querySelector(".section-header");
    if (projectsHeader) {
      const categoryFilter = document.createElement("select");
      categoryFilter.id = "projectCategoryFilter";
      categoryFilter.innerHTML = `
        <option value="all">All Categories</option>
        <option value="Web Development">Web Development</option>
        <option value="Mobile App">Mobile App</option>
        <option value="Desktop App">Desktop App</option>
        <option value="API">API</option>
        <option value="Other">Other</option>
      `;
      categoryFilter.addEventListener("change", () => {
        this.currentFilters.projects.category = categoryFilter.value;
        this.loadProjects();
      });
      projectsHeader.appendChild(categoryFilter);
    }
  }

  addBulkActionsToSection(sectionId) {
    const section = document.getElementById(`${sectionId}Section`);
    if (!section) return;

    const header = section.querySelector(".section-header");
    if (!header) return;

    const bulkActions = document.createElement("div");
    bulkActions.className = "bulk-actions";
    bulkActions.id = `${sectionId}BulkActions`;
    bulkActions.style.display = "none";
    bulkActions.innerHTML = `
      <span class="selected-count">0 selected</span>
      <button class="btn btn-danger btn-sm" onclick="dashboard.bulkDelete('${sectionId}')">
        <i class="fas fa-trash"></i> Delete Selected
      </button>
      ${
        sectionId === "messages"
          ? `
        <button class="btn btn-success btn-sm" onclick="dashboard.bulkMarkAsRead()">
          <i class="fas fa-check"></i> Mark as Read
        </button>
        <button class="btn btn-warning btn-sm" onclick="dashboard.bulkArchive()">
          <i class="fas fa-archive"></i> Archive
        </button>
      `
          : ""
      }
      ${
        sectionId === "tasks"
          ? `
        <button class="btn btn-success btn-sm" onclick="dashboard.bulkComplete()">
          <i class="fas fa-check"></i> Mark Complete
        </button>
      `
          : ""
      }
    `;

    header.appendChild(bulkActions);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    this.setTheme(newTheme);
  }

  setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("adminTheme", theme);

    const themeToggle = document.querySelector(".theme-toggle i");
    if (themeToggle) {
      themeToggle.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
    }
  }

  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K: Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      const currentSection = this.currentSection;
      const searchInput = document.querySelector(
        `[data-section="${currentSection}"]`
      );
      if (searchInput) {
        searchInput.focus();
      }
    }

    // Escape: Close modals
    if (e.key === "Escape") {
      this.closeModals();
    }
  }

  checkAuth() {
    if (this.token) {
      this.showDashboard();
      this.loadDashboardData();
    } else {
      this.showLogin();
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const loginData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      const response = await this.apiCall("/api/auth/login", "POST", loginData);
      this.token = response.token;
      this.user = response.user;
      localStorage.setItem("adminToken", this.token);
      this.showToast("Login successful!", "success");
      this.showDashboard();
      this.loadDashboardData();
    } catch (error) {
      this.showError("loginError", error.message || "Login failed");
      if (error.message && error.message.includes("EMAIL_NOT_VERIFIED")) {
        this.showResendVerification(loginData.email);
      }
    }
  }

  handleLogout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem("adminToken");
    this.showLogin();
    this.showToast("Logged out successfully", "success");
  }

  showLogin() {
    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("loginModal").style.display = "block";
  }

  showDashboard() {
    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("loginModal").style.display = "none";
    document.getElementById("dashboard").style.display = "flex";
    document.getElementById("userName").textContent =
      this.user?.name || "Admin";
  }

  switchSection(e) {
    e.preventDefault();
    const section = e.currentTarget.dataset.section;
    this.currentSection = section;

    // Update navigation
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
    });
    e.currentTarget.classList.add("active");

    // Update section title
    const titles = {
      overview: "Dashboard Overview",
      projects: "Project Management",
      messages: "Contact Messages",
      tasks: "Task Management",
      analytics: "Analytics Dashboard",
      settings: "Settings",
    };
    document.getElementById("sectionTitle").textContent =
      titles[section] || "Dashboard";

    // Show section
    document.querySelectorAll(".content-section").forEach((sec) => {
      sec.classList.remove("active");
    });
    document.getElementById(`${section}Section`).classList.add("active");

    // Load section data
    this.loadSectionData(section);
  }

  async loadDashboardData() {
    try {
      const [stats, activity, featured] = await Promise.all([
        this.apiCall("/api/analytics/stats"),
        this.apiCall("/api/analytics/activity?limit=5"),
        this.apiCall("/api/projects/featured?limit=3"),
      ]);

      this.updateStats(stats);
      this.renderActivity(activity);
      this.renderFeaturedProjects(featured);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      this.showToast("Failed to load dashboard data", "error");
    }
  }

  async loadSectionData(section) {
    switch (section) {
      case "projects":
        await this.loadProjects();
        break;
      case "messages":
        await this.loadMessages();
        break;
      case "tasks":
        await this.loadTasks();
        break;
      case "analytics":
        await this.loadAnalytics();
        break;
      case "settings":
        await this.loadSettings();
        break;
    }
  }

  updateStats(stats) {
    // Animate number counting
    this.animateNumber("totalProjects", stats.totalProjects || 0);
    this.animateNumber("totalMessages", stats.totalMessages || 0);
    this.animateNumber("totalViews", stats.totalViews || 0);
    this.animateNumber("totalTasks", stats.totalTasks || 0);

    document.getElementById("messageCount").textContent =
      stats.unreadMessages || 0;
    document.getElementById("messageCount").style.display =
      stats.unreadMessages > 0 ? "inline" : "none";
  }

  animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.round(
        startValue + (targetValue - startValue) * easeOutQuart
      );

      element.textContent = currentValue;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  renderActivity(activity) {
    const container = document.getElementById("recentActivity");
    if (!activity || activity.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><i class="fas fa-chart-line"></i><h3>No recent activity</h3></div>';
      return;
    }

    container.innerHTML = activity
      .map(
        (item) => `
      <div class="activity-item animate-slide-left">
        <div class="activity-icon" style="background: ${this.getActivityColor(
          item.type
        )}">
          <i class="fas ${this.getActivityIcon(item.type)}"></i>
        </div>
        <div class="activity-content">
          <div class="activity-text">${item.description}</div>
          <div class="activity-time">${this.formatDate(item.createdAt)}</div>
        </div>
      </div>
    `
      )
      .join("");
  }

  renderFeaturedProjects(projects) {
    const container = document.getElementById("featuredProjects");
    if (!projects || projects.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><i class="fas fa-star"></i><h3>No featured projects</h3></div>';
      return;
    }

    container.innerHTML = projects
      .map(
        (project) => `
      <div class="featured-item animate-slide-right">
        <img src="${project.imageUrl || "/placeholder.jpg"}" alt="${
          project.title
        }" class="featured-image">
        <div class="featured-content">
          <div class="featured-title">${project.title}</div>
          <div class="featured-stats">
            <i class="fas fa-eye"></i> ${project.viewCount || 0} views •
            <i class="fas fa-heart"></i> ${project.likes || 0} likes
          </div>
        </div>
      </div>
    `
      )
      .join("");
  }

  async loadProjects() {
    try {
      this.showLoading("projectsGrid");
      const projects = await this.apiCall("/api/projects");
      this.renderProjects(this.applyProjectFilters(projects));
    } catch (error) {
      console.error("Error loading projects:", error);
      this.showToast("Failed to load projects", "error");
    } finally {
      this.hideLoading("projectsGrid");
    }
  }

  applyProjectFilters(projects) {
    const { category, status, search } = this.currentFilters.projects;

    return projects.filter((project) => {
      const matchesCategory =
        category === "all" || project.category === category;
      const matchesStatus = status === "all" || project.status === status;
      const matchesSearch =
        !search ||
        project.title.toLowerCase().includes(search) ||
        project.description.toLowerCase().includes(search) ||
        (project.technologies &&
          project.technologies.some((tech) =>
            tech.toLowerCase().includes(search)
          ));

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }

  renderProjects(projects) {
    const container = document.getElementById("projectsGrid");
    if (!projects || projects.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><i class="fas fa-folder-open"></i><h3>No projects found</h3><p>Create your first project to get started.</p></div>';
      return;
    }

    container.innerHTML = projects
      .map(
        (project, index) => `
      <div class="project-card animate-bounce" style="animation-delay: ${
        index * 0.1
      }s" data-id="${project._id}">
        <img src="${project.imageUrl || "/placeholder.jpg"}" alt="${
          project.title
        }" class="project-image">
        <div class="project-content">
          <div class="project-header">
            <div>
              <h3 class="project-title">${project.title}</h3>
              <span class="project-category">${project.category}</span>
            </div>
            <div class="project-status ${project.status
              .toLowerCase()
              .replace(" ", "-")}">
              ${project.status}
            </div>
          </div>
          <p class="project-description">${project.description.substring(
            0,
            100
          )}...</p>
          <div class="project-tech">
            ${
              project.technologies
                ?.slice(0, 3)
                .map((tech) => `<span class="tech-tag">${tech}</span>`)
                .join("") || ""
            }
            ${
              project.technologies?.length > 3
                ? `<span class="tech-tag">+${
                    project.technologies.length - 3
                  }</span>`
                : ""
            }
          </div>
          <div class="project-actions">
            <button class="btn btn-sm btn-secondary" onclick="dashboard.editProject('${
              project._id
            }')">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-sm btn-danger" onclick="dashboard.deleteProject('${
              project._id
            }')">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join("");

    // Add selection checkboxes for bulk actions
    this.addSelectionCheckboxes("projects");
  }

  async loadMessages() {
    try {
      this.showLoading("messagesList");
      const filter = document.getElementById("messageFilter").value;
      const messages = await this.apiCall(`/api/contact?status=${filter}`);
      this.renderMessages(this.applyMessageFilters(messages));
    } catch (error) {
      console.error("Error loading messages:", error);
      this.showToast("Failed to load messages", "error");
    } finally {
      this.hideLoading("messagesList");
    }
  }

  applyMessageFilters(messages) {
    const { status, search, priority } = this.currentFilters.messages;

    return messages.filter((message) => {
      const matchesStatus = status === "all" || message.status === status;
      const matchesPriority =
        priority === "all" || message.priority === priority;
      const matchesSearch =
        !search ||
        message.name.toLowerCase().includes(search) ||
        message.email.toLowerCase().includes(search) ||
        message.subject.toLowerCase().includes(search) ||
        message.message.toLowerCase().includes(search);

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }

  renderMessages(messages) {
    const container = document.getElementById("messagesList");
    if (!messages || messages.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><i class="fas fa-envelope"></i><h3>No messages found</h3></div>';
      return;
    }

    container.innerHTML = messages
      .map(
        (message, index) => `
      <div class="message-item animate-slide-left ${
        message.status === "New" ? "unread" : ""
      }"
           style="animation-delay: ${index * 0.05}s" data-id="${message._id}">
        <div class="message-header">
          <div class="message-sender">${message.name}</div>
          <div class="message-date">${this.formatDate(message.createdAt)}</div>
        </div>
        <div class="message-subject">${message.subject}</div>
        <div class="message-preview">${message.message.substring(
          0,
          150
        )}...</div>
        <div class="message-actions">
          <button class="btn btn-sm btn-secondary" onclick="dashboard.viewMessage('${
            message._id
          }')">
            <i class="fas fa-eye"></i> View
          </button>
          <button class="btn btn-sm btn-success" onclick="dashboard.markAsRead('${
            message._id
          }')">
            <i class="fas fa-check"></i> Mark Read
          </button>
          <button class="btn btn-sm btn-danger" onclick="dashboard.deleteMessage('${
            message._id
          }')">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `
      )
      .join("");

    // Add selection checkboxes for bulk actions
    this.addSelectionCheckboxes("messages");
  }

  async loadTasks() {
    try {
      this.showLoading("tasksList");
      const tasks = await this.apiCall("/api/tasks");
      this.renderTasks(this.applyTaskFilters(tasks));
    } catch (error) {
      console.error("Error loading tasks:", error);
      this.showToast("Failed to load tasks", "error");
    } finally {
      this.hideLoading("tasksList");
    }
  }

  applyTaskFilters(tasks) {
    const { status, priority, search } = this.currentFilters.tasks;

    return tasks.filter((task) => {
      const matchesStatus = status === "all" || task.status === status;
      const matchesPriority = priority === "all" || task.priority === priority;
      const matchesSearch =
        !search ||
        task.title.toLowerCase().includes(search) ||
        (task.description && task.description.toLowerCase().includes(search));

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }

  renderTasks(tasks) {
    const container = document.getElementById("tasksList");
    if (!tasks || tasks.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><i class="fas fa-tasks"></i><h3>No tasks found</h3><p>Create your first task to get started.</p></div>';
      return;
    }

    container.innerHTML = tasks
      .map(
        (task, index) => `
      <div class="task-item animate-slide-right" style="animation-delay: ${
        index * 0.05
      }s" data-id="${task._id}">
        <input type="checkbox" class="task-checkbox" ${
          task.completed ? "checked" : ""
        }
               onchange="dashboard.toggleTask('${task._id}')">
        <div class="task-content">
          <div class="task-title ${task.completed ? "completed" : ""}">${
          task.title
        }</div>
          <div class="task-meta">
            <span class="priority-badge priority-${task.priority}">${
          task.priority
        }</span>
            ${
              task.dueDate
                ? `<span><i class="fas fa-calendar"></i> ${this.formatDate(
                    task.dueDate
                  )}</span>`
                : ""
            }
            <span><i class="fas fa-clock"></i> ${this.formatDate(
              task.createdAt
            )}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-sm btn-secondary" onclick="dashboard.editTask('${
            task._id
          }')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="dashboard.deleteTask('${
            task._id
          }')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `
      )
      .join("");

    // Add selection checkboxes for bulk actions
    this.addSelectionCheckboxes("tasks");
  }

  addSelectionCheckboxes(sectionId) {
    const container =
      document.getElementById(`${sectionId}List`) ||
      document.getElementById(`${sectionId}Grid`);
    if (!container) return;

    const items = container.querySelectorAll(
      `.${
        sectionId === "projects"
          ? "project-card"
          : sectionId === "messages"
          ? "message-item"
          : "task-item"
      }`
    );

    items.forEach((item) => {
      if (!item.querySelector(".selection-checkbox")) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "selection-checkbox";
        checkbox.dataset.id = item.dataset.id;
        checkbox.addEventListener("change", () =>
          this.updateSelection(sectionId)
        );

        // Insert at the beginning of the item
        item.insertBefore(checkbox, item.firstChild);
      }
    });
  }

  updateSelection(sectionId) {
    const checkboxes = document.querySelectorAll(
      `#${sectionId}Section .selection-checkbox:checked`
    );
    this.selectedItems.clear();

    checkboxes.forEach((checkbox) => {
      this.selectedItems.add(checkbox.dataset.id);
    });

    this.updateBulkActions(sectionId);
  }

  updateBulkActions(sectionId) {
    const bulkActions = document.getElementById(`${sectionId}BulkActions`);
    const selectedCount = this.selectedItems.size;

    if (bulkActions) {
      bulkActions.style.display = selectedCount > 0 ? "flex" : "none";
      const countSpan = bulkActions.querySelector(".selected-count");
      if (countSpan) {
        countSpan.textContent = `${selectedCount} selected`;
      }
    }
  }

  async bulkDelete(sectionId) {
    if (this.selectedItems.size === 0) return;

    const confirmMessage = `Are you sure you want to delete ${this.selectedItems.size} ${sectionId}?`;
    if (!confirm(confirmMessage)) return;

    try {
      const deletePromises = Array.from(this.selectedItems).map((id) => {
        let endpoint;
        switch (sectionId) {
          case "messages":
            endpoint = `/api/contact/${id}`;
            break;
          case "projects":
            endpoint = `/api/projects/${id}`;
            break;
          case "tasks":
            endpoint = `/api/tasks/${id}`;
            break;
        }
        return this.apiCall(endpoint, "DELETE");
      });

      await Promise.all(deletePromises);
      this.showToast(
        `Successfully deleted ${this.selectedItems.size} ${sectionId}`,
        "success"
      );
      this.selectedItems.clear();
      this.loadSectionData(sectionId);
    } catch (error) {
      this.showToast(`Failed to delete ${sectionId}`, "error");
    }
  }

  async bulkMarkAsRead() {
    if (this.selectedItems.size === 0) return;

    try {
      const promises = Array.from(this.selectedItems).map((id) =>
        this.apiCall(`/api/contact/${id}/status`, "PUT", { status: "Read" })
      );
      await Promise.all(promises);
      this.showToast(
        `Marked ${this.selectedItems.size} messages as read`,
        "success"
      );
      this.selectedItems.clear();
      this.loadMessages();
    } catch (error) {
      this.showToast("Failed to update messages", "error");
    }
  }

  async bulkArchive() {
    if (this.selectedItems.size === 0) return;

    try {
      const promises = Array.from(this.selectedItems).map((id) =>
        this.apiCall(`/api/contact/${id}/archive`, "PUT")
      );
      await Promise.all(promises);
      this.showToast(`Archived ${this.selectedItems.size} messages`, "success");
      this.selectedItems.clear();
      this.loadMessages();
    } catch (error) {
      this.showToast("Failed to archive messages", "error");
    }
  }

  async bulkComplete() {
    if (this.selectedItems.size === 0) return;

    try {
      const promises = Array.from(this.selectedItems).map((id) =>
        this.apiCall(`/api/tasks/${id}/toggle`, "PUT")
      );
      await Promise.all(promises);
      this.showToast(`Completed ${this.selectedItems.size} tasks`, "success");
      this.selectedItems.clear();
      this.loadTasks();
    } catch (error) {
      this.showToast("Failed to complete tasks", "error");
    }
  }

  showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="loading-skeleton">
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
        </div>
      `;
    }
  }

  hideLoading(containerId) {
    // Loading is hidden when content is rendered
  }

  applyFilters(sectionId) {
    // Re-load the section data with current filters
    this.loadSectionData(sectionId);
  }

  async loadAnalytics() {
    try {
      const range = document.getElementById("analyticsRange").value;
      const analytics = await this.apiCall(
        `/api/analytics/dashboard?range=${range}`
      );
      this.renderAnalytics(analytics);
    } catch (error) {
      console.error("Error loading analytics:", error);
      this.showToast("Failed to load analytics", "error");
    }
  }

  renderAnalytics(data) {
    // Page Views Chart
    const pageViewsCtx = document
      .getElementById("pageViewsChart")
      ?.getContext("2d");
    if (pageViewsCtx) {
      if (this.charts.pageViews) {
        this.charts.pageViews.destroy();
      }

      this.charts.pageViews = new Chart(pageViewsCtx, {
        type: "line",
        data: {
          labels: data.pageViews?.map((d) => this.formatDate(d.date)) || [],
          datasets: [
            {
              label: "Page Views",
              data: data.pageViews?.map((d) => d.views) || [],
              borderColor: "rgb(99, 102, 241)",
              backgroundColor: "rgba(99, 102, 241, 0.1)",
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: { beginAtZero: true },
          },
        },
      });
    }

    // Device Types Chart
    const deviceCtx = document.getElementById("deviceChart")?.getContext("2d");
    if (deviceCtx) {
      if (this.charts.devices) {
        this.charts.devices.destroy();
      }

      this.charts.devices = new Chart(deviceCtx, {
        type: "doughnut",
        data: {
          labels: ["Desktop", "Mobile", "Tablet"],
          datasets: [
            {
              data: [
                data.devices?.desktop || 0,
                data.devices?.mobile || 0,
                data.devices?.tablet || 0,
              ],
              backgroundColor: [
                "rgb(99, 102, 241)",
                "rgb(16, 185, 129)",
                "rgb(245, 158, 11)",
              ],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: "bottom" },
          },
        },
      });
    }

    // Popular Projects
    const popularProjectsEl = document.getElementById("popularProjects");
    if (popularProjectsEl) {
      popularProjectsEl.innerHTML =
        data.popularProjects
          ?.map(
            (project) =>
              `<div class="analytics-item">
          <span>${project.title}</span>
          <span class="analytics-value">${project.views} views</span>
        </div>`
          )
          .join("") || "No data available";
    }

    // Visitor Locations
    const visitorLocationsEl = document.getElementById("visitorLocations");
    if (visitorLocationsEl) {
      visitorLocationsEl.innerHTML =
        data.locations
          ?.map(
            (location) =>
              `<div class="analytics-item">
          <span>${location.country}</span>
          <span class="analytics-value">${location.count} visitors</span>
        </div>`
          )
          .join("") || "No data available";
    }
  }

  async loadSettings() {
    try {
      const [profile, settings] = await Promise.all([
        this.apiCall("/api/auth/profile"),
        this.apiCall("/api/settings"),
      ]);

      // Load profile settings
      document.getElementById("profileName").value = profile.name;
      document.getElementById("profileEmail").value = profile.email;

      // Load footer settings
      document.getElementById("footerCopyright").value =
        settings.footer?.copyright || "";
      document.getElementById("footerCustomText").value =
        settings.footer?.customText || "";

      // Load social links
      this.renderSocialLinks(settings.footer?.socialLinks || []);
    } catch (error) {
      console.error("Error loading settings:", error);
      this.showToast("Failed to load settings", "error");
    }
  }

  // Modal functions
  openProjectModal(projectId = null) {
    const modal = document.getElementById("projectModal");
    const form = document.getElementById("projectForm");
    const title = document.getElementById("projectModalTitle");

    if (projectId) {
      title.textContent = "Edit Project";
      this.loadProjectForEdit(projectId);
    } else {
      title.textContent = "Add Project";
      form.reset();
    }

    modal.classList.add("show");
  }

  openTaskModal(taskId = null) {
    const modal = document.getElementById("taskModal");
    const form = document.getElementById("taskForm");
    const title = document.getElementById("taskModalTitle");

    if (taskId) {
      title.textContent = "Edit Task";
      this.loadTaskForEdit(taskId);
    } else {
      title.textContent = "Add Task";
      form.reset();
    }

    modal.classList.add("show");
  }

  closeModals() {
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.classList.remove("show");
    });
  }

  // Form handlers
  async handleProjectSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const projectData = {
      title: formData.get("title"),
      description: formData.get("description"),
      category: formData.get("category"),
      status: formData.get("status"),
      priority: formData.get("priority"),
      projectUrl: formData.get("projectUrl"),
      githubUrl: formData.get("githubUrl"),
      technologies: formData
        .get("technologies")
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t),
      featured: formData.get("featured") === "on",
    };

    try {
      const projectId = e.target.dataset.projectId;
      if (projectId) {
        await this.apiCall(`/api/projects/${projectId}`, "PUT", projectData);
        this.showToast("Project updated successfully!", "success");
      } else {
        await this.apiCall("/api/projects", "POST", projectData);
        this.showToast("Project created successfully!", "success");
      }
      this.closeModals();
      this.loadProjects();
    } catch (error) {
      this.showToast(error.message, "error");
    }
  }

  async handleTaskSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const taskData = {
      title: formData.get("title"),
      description: formData.get("description"),
      priority: formData.get("priority"),
      dueDate: formData.get("dueDate") || null,
    };

    try {
      const taskId = e.target.dataset.taskId;
      if (taskId) {
        await this.apiCall(`/api/tasks/${taskId}`, "PUT", taskData);
        this.showToast("Task updated successfully!", "success");
      } else {
        await this.apiCall("/api/tasks", "POST", taskData);
        this.showToast("Task created successfully!", "success");
      }
      this.closeModals();
      this.loadTasks();
    } catch (error) {
      console.error("Error handling task submit:", error);
      this.showToast(error.message || "Failed to save task", "error");
    }
  }

  async handleProfileUpdate(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const profileData = {
      name: formData.get("name"),
      email: formData.get("email"),
    };

    try {
      await this.apiCall("/api/auth/profile", "PUT", profileData);
      this.user = { ...this.user, ...profileData };
      this.showToast("Profile updated successfully!", "success");
    } catch (error) {
      this.showToast(error.message, "error");
    }
  }

  async handlePasswordChange(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const passwordData = {
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    };

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      this.showToast("Passwords do not match", "error");
      return;
    }

    try {
      await this.apiCall("/api/auth/password", "PUT", passwordData);
      this.showToast("Password changed successfully!", "success");
      e.target.reset();
    } catch (error) {
      this.showToast(error.message, "error");
    }
  }

  async handleFooterUpdate(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const footerData = {
      copyright: formData.get("copyright"),
      customText: formData.get("customText"),
      socialLinks: this.getSocialLinksData(),
    };

    try {
      await this.apiCall("/api/settings/footer", "PUT", footerData);
      this.showToast("Footer settings updated successfully!", "success");
    } catch (error) {
      this.showToast(error.message, "error");
    }
  }

  renderSocialLinks(socialLinks) {
    const container = document.getElementById("socialLinksContainer");
    if (!container) return;

    container.innerHTML =
      socialLinks
        ?.map(
          (link, index) => `
      <div class="social-link-item" data-index="${index}">
        <select class="social-platform">
          <option value="facebook" ${
            link.platform === "facebook" ? "selected" : ""
          }>Facebook</option>
          <option value="twitter" ${
            link.platform === "twitter" ? "selected" : ""
          }>Twitter</option>
          <option value="instagram" ${
            link.platform === "instagram" ? "selected" : ""
          }>Instagram</option>
          <option value="linkedin" ${
            link.platform === "linkedin" ? "selected" : ""
          }>LinkedIn</option>
          <option value="github" ${
            link.platform === "github" ? "selected" : ""
          }>GitHub</option>
          <option value="youtube" ${
            link.platform === "youtube" ? "selected" : ""
          }>YouTube</option>
          <option value="other" ${
            link.platform === "other" ? "selected" : ""
          }>Other</option>
        </select>
        <input type="url" class="social-url" placeholder="https://" value="${
          link.url || ""
        }">
        <button type="button" class="btn btn-danger btn-sm remove-social-link">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `
        )
        .join("") || "";

    // Add remove functionality
    container.querySelectorAll(".remove-social-link").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.target.closest(".social-link-item").remove();
      });
    });
  }

  addSocialLinkField() {
    const container = document.getElementById("socialLinksContainer");
    if (!container) return;

    const linkItem = document.createElement("div");
    linkItem.className = "social-link-item";
    linkItem.innerHTML = `
      <select class="social-platform">
        <option value="facebook">Facebook</option>
        <option value="twitter">Twitter</option>
        <option value="instagram">Instagram</option>
        <option value="linkedin">LinkedIn</option>
        <option value="github">GitHub</option>
        <option value="youtube">YouTube</option>
        <option value="other">Other</option>
      </select>
      <input type="url" class="social-url" placeholder="https://">
      <button type="button" class="btn btn-danger btn-sm remove-social-link">
        <i class="fas fa-trash"></i>
      </button>
    `;

    container.appendChild(linkItem);

    // Add remove functionality
    linkItem
      .querySelector(".remove-social-link")
      .addEventListener("click", () => {
        linkItem.remove();
      });
  }

  getSocialLinksData() {
    const container = document.getElementById("socialLinksContainer");
    if (!container) return [];

    return Array.from(container.querySelectorAll(".social-link-item"))
      .map((item) => ({
        platform: item.querySelector(".social-platform").value,
        url: item.querySelector(".social-url").value,
      }))
      .filter((link) => link.url.trim() !== "");
  }

  // Additional methods
  async loadProjectForEdit(projectId) {
    try {
      const project = await this.apiCall(`/api/projects/${projectId}`);
      const form = document.getElementById("projectForm");
      form.dataset.projectId = projectId;

      form.title.value = project.title || "";
      form.description.value = project.description || "";
      form.category.value = project.category || "";
      form.status.value = project.status || "";
      form.priority.value = project.priority || "";
      form.projectUrl.value = project.projectUrl || "";
      form.githubUrl.value = project.githubUrl || "";
      form.technologies.value = project.technologies?.join(", ") || "";
      form.featured.checked = project.featured || false;
    } catch (error) {
      this.showToast("Failed to load project", "error");
    }
  }

  async loadTaskForEdit(taskId) {
    try {
      const task = await this.apiCall(`/api/tasks/${taskId}`);
      const form = document.getElementById("taskForm");
      form.dataset.taskId = taskId;

      form.title.value = task.title || "";
      form.description.value = task.description || "";
      form.priority.value = task.priority || "";
      form.dueDate.value = task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "";
    } catch (error) {
      this.showToast("Failed to load task", "error");
    }
  }

  async editProject(projectId) {
    this.openProjectModal(projectId);
  }

  async deleteProject(projectId) {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      await this.apiCall(`/api/projects/${projectId}`, "DELETE");
      this.showToast("Project deleted successfully!", "success");
      this.loadProjects();
    } catch (error) {
      this.showToast("Failed to delete project", "error");
    }
  }

  async viewMessage(messageId) {
    try {
      const message = await this.apiCall(`/api/contact/${messageId}`);
      // Show message in a modal or detailed view
      alert(
        `From: ${message.name}\nEmail: ${message.email}\nSubject: ${message.subject}\n\n${message.message}`
      );
    } catch (error) {
      this.showToast("Failed to load message", "error");
    }
  }

  async markAsRead(messageId) {
    try {
      await this.apiCall(`/api/contact/${messageId}/status`, "PUT", {
        status: "Read",
      });
      this.showToast("Message marked as read", "success");
      this.loadMessages();
    } catch (error) {
      this.showToast("Failed to update message", "error");
    }
  }

  async deleteMessage(messageId) {
    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      await this.apiCall(`/api/contact/${messageId}`, "DELETE");
      this.showToast("Message deleted successfully!", "success");
      this.loadMessages();
    } catch (error) {
      this.showToast("Failed to delete message", "error");
    }
  }

  async editTask(taskId) {
    this.openTaskModal(taskId);
  }

  async deleteTask(taskId) {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await this.apiCall(`/api/tasks/${taskId}`, "DELETE");
      this.showToast("Task deleted successfully!", "success");
      this.loadTasks();
    } catch (error) {
      this.showToast("Failed to delete task", "error");
    }
  }

  async toggleTask(taskId) {
    try {
      await this.apiCall(`/api/tasks/${taskId}/toggle`, "PUT");
      this.loadTasks();
    } catch (error) {
      this.showToast("Failed to update task", "error");
    }
  }

  filterTasks(e) {
    const filter = e.currentTarget.dataset.filter;
    this.currentFilters.tasks.status = filter === "all" ? "all" : filter;
    this.loadTasks();
  }

  showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = message;
      element.style.display = "block";
    }
  }

  showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");

    if (toast && toastMessage) {
      toastMessage.textContent = message;
      toast.className = `toast ${type}`;
      toast.style.display = "block";

      setTimeout(() => {
        toast.style.display = "none";
      }, 3000);
    }
  }

  showResendVerification(email) {
    const errorElement = document.getElementById("loginError");
    if (errorElement) {
      errorElement.innerHTML = `
        Email not verified. 
        <button onclick="dashboard.resendVerification('${email}')" class="btn-link">Resend verification email</button>
      `;
    }
  }

  async resendVerification(email) {
    try {
      await this.apiCall("/api/auth/resend-verification", "POST", { email });
      this.showToast("Verification email sent!", "success");
    } catch (error) {
      this.showToast("Failed to send verification email", "error");
    }
  }

  async apiCall(endpoint, method = "GET", data = null) {
    const config = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(endpoint, config);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "API call failed");
    }

    return result;
  }

  formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }

  getActivityColor(type) {
    const colors = {
      project: "#10b981",
      message: "#3b82f6",
      task: "#f59e0b",
      user: "#ef4444",
    };
    return colors[type] || "#6b7280";
  }

  getActivityIcon(type) {
    const icons = {
      project: "fa-folder-open",
      message: "fa-envelope",
      task: "fa-tasks",
      user: "fa-user",
    };
    return icons[type] || "fa-info-circle";
  }
}

// Initialize the dashboard
const dashboard = new AdminDashboard();
