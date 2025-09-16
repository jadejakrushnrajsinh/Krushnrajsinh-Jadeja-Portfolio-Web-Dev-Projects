// Enhanced Task Management App JavaScript - Fullstack Version
class TaskManager {
  constructor() {
    this.tasks = [];
    this.currentFilter = "all";
    this.currentSort = "default";
    this.searchQuery = "";
    this.editingTaskId = null;
  this.apiBaseUrl = (window?.location?.origin || 'http://localhost:5000') + "/api/tasks";
    this.init();
  }

  async init() {
    // Set min date to today for due date inputs
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("taskDueDate").min = today;
    document.getElementById("editTaskDueDate").min = today;

    await this.loadTasks();
    this.bindEvents();
    this.loadSampleTasks();
  }

  bindEvents() {
    // Add task form
    document.getElementById("taskForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.addTask();
    });

    // Filter buttons
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.setFilter(e.target.dataset.filter);
      });
    });

    // Sort buttons
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.setSort(e.target.dataset.sort);
      });
    });

    // Search input
    document.getElementById("searchInput").addEventListener("input", (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderTasks();
    });

    // Modal events
    document.getElementById("closeModal").addEventListener("click", () => {
      this.closeModal();
    });

    document.getElementById("editTaskForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.updateTask();
    });

    // Close modal when clicking outside
    window.addEventListener("click", (e) => {
      const modal = document.getElementById("editModal");
      if (e.target === modal) {
        this.closeModal();
      }
    });
  }

  async addTask() {
    const title = document.getElementById("taskTitle").value.trim();
    const category = document.getElementById("taskCategory").value;
    const priority = document.getElementById("taskPriority").value;
    const dueDate = document.getElementById("taskDueDate").value;
    const description = document.getElementById("taskDescription").value.trim();

    if (!title) {
      this.showToast("Task title is required!", "error");
      return;
    }

    // Validate due date
    if (dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(dueDate);

      if (selectedDate < today) {
        this.showToast("Due date cannot be in the past!", "error");
        return;
      }
    }

    const taskData = {
      title,
      category,
      priority,
      dueDate: dueDate || null,
      description,
    };

    try {
      const newTask = await this.apiCall(this.apiBaseUrl, "POST", taskData);
      this.tasks.push(newTask);
      this.renderTasks();
      this.updateStats();

      // Reset form
      document.getElementById("taskForm").reset();
      this.showToast("Task added successfully!", "success");

      // Track task creation
      this.trackEvent("task_created", {
        taskId: newTask._id,
        category,
        priority,
      });
    } catch (error) {
      this.showToast(error.message || "Failed to add task", "error");
    }
  }

  async deleteTask(id) {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await this.apiCall(`${this.apiBaseUrl}/${id}`, "DELETE");
        this.tasks = this.tasks.filter((task) => task._id !== id);
        this.renderTasks();
        this.updateStats();
        this.showToast("Task deleted successfully!", "success");

        // Track task deletion
        this.trackEvent("task_deleted", { taskId: id });
      } catch (error) {
        this.showToast(error.message || "Failed to delete task", "error");
      }
    }
  }

  async toggleComplete(id) {
    try {
      const task = await this.apiCall(`${this.apiBaseUrl}/${id}/toggle`, "PUT");
      const index = this.tasks.findIndex((t) => t._id === id);
      if (index !== -1) {
        this.tasks[index] = task;
      }
      this.renderTasks();
      this.updateStats();

      const message = task.completed
        ? "Task marked as complete!"
        : "Task marked as pending!";
      this.showToast(message, "success");

      // Track task completion
      this.trackEvent("task_toggled", {
        taskId: id,
        completed: task.completed,
      });
    } catch (error) {
      this.showToast(error.message || "Failed to update task", "error");
    }
  }

  editTask(id) {
    const task = this.tasks.find((task) => task._id === id);
    if (task) {
      this.editingTaskId = id;
      document.getElementById("editTaskTitle").value = task.title;
      document.getElementById("editTaskCategory").value = task.category;
      document.getElementById("editTaskPriority").value = task.priority;
      document.getElementById("editTaskDueDate").value = task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "";
      document.getElementById("editTaskDescription").value = task.description;
      document.getElementById("editModal").style.display = "block";
    }
  }

  async updateTask() {
    const task = this.tasks.find((task) => task._id === this.editingTaskId);
    if (task) {
      const title = document.getElementById("editTaskTitle").value.trim();

      if (!title) {
        this.showToast("Task title is required!", "error");
        return;
      }

      // Validate due date
      const dueDate = document.getElementById("editTaskDueDate").value;
      if (dueDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(dueDate);

        if (selectedDate < today) {
          this.showToast("Due date cannot be in the past!", "error");
          return;
        }
      }

      const taskData = {
        title,
        category: document.getElementById("editTaskCategory").value,
        priority: document.getElementById("editTaskPriority").value,
        dueDate: dueDate || null,
        description: document
          .getElementById("editTaskDescription")
          .value.trim(),
      };

      try {
        const updatedTask = await this.apiCall(
          `${this.apiBaseUrl}/${this.editingTaskId}`,
          "PUT",
          taskData
        );
        const index = this.tasks.findIndex((t) => t._id === this.editingTaskId);
        if (index !== -1) {
          this.tasks[index] = updatedTask;
        }
        this.renderTasks();
        this.updateStats();
        this.closeModal();
        this.showToast("Task updated successfully!", "success");

        // Track task update
        this.trackEvent("task_updated", { taskId: this.editingTaskId });
      } catch (error) {
        this.showToast(error.message || "Failed to update task", "error");
      }
    }
  }

  closeModal() {
    document.getElementById("editModal").style.display = "none";
    this.editingTaskId = null;
  }

  setFilter(filter) {
    this.currentFilter = filter;
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add("active");
    this.renderTasks();
  }

  setSort(sortType) {
    this.currentSort = sortType;
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-sort="${sortType}"]`).classList.add("active");
    this.renderTasks();
  }

  getFilteredTasks() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return this.tasks.filter((task) => {
      // Apply search filter
      if (
        this.searchQuery &&
        !task.title.toLowerCase().includes(this.searchQuery) &&
        !task.description.toLowerCase().includes(this.searchQuery) &&
        !task.category.toLowerCase().includes(this.searchQuery)
      ) {
        return false;
      }

      // Apply category filter
      switch (this.currentFilter) {
        case "pending":
          return !task.completed;
        case "completed":
          return task.completed;
        case "overdue":
          if (!task.dueDate || task.completed) return false;
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate < now;
        case "high":
          return task.priority === "high";
        default:
          return true;
      }
    });
  }

  sortTasks(tasks) {
    switch (this.currentSort) {
      case "date":
        return tasks.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
      case "priority":
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        return tasks.sort(
          (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
        );
      default:
        return tasks.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        ); // Newest first
    }
  }

  renderTasks() {
    const container = document.getElementById("tasksContainer");
    let filteredTasks = this.getFilteredTasks();
    filteredTasks = this.sortTasks(filteredTasks);

    if (filteredTasks.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No tasks found</h3>
                    <p>${
                      this.searchQuery
                        ? "No tasks match your search."
                        : this.currentFilter === "all"
                        ? "Add your first task to get started!"
                        : `No ${this.currentFilter} tasks.`
                    }</p>
                </div>
            `;
      return;
    }

    container.innerHTML = filteredTasks
      .map((task) => this.createTaskHTML(task))
      .join("");
  }

  createTaskHTML(task) {
    const isOverdue = this.isOverdue(task);
    const priorityClass = `priority-${task.priority}`;

    return `
            <div class="task-card ${task.completed ? "completed" : ""} ${
      task.priority
    }-priority" data-id="${task._id}">
                <div class="task-header">
                    <div style="display: flex; align-items: center;">
                        <input type="checkbox" class="task-checkbox" ${
                          task.completed ? "checked" : ""
                        } onclick="taskManager.toggleComplete('${task._id}')" />
                        <div class="task-title">${task.title}</div>
                    </div>
                    <div class="task-actions">
                        <button class="task-expand-btn" onclick="taskManager.toggleExpand('${
                          task._id
                        }')" title="Expand/Collapse Details">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <button class="task-btn edit" onclick="taskManager.editTask('${
                          task._id
                        }')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="task-btn delete" onclick="taskManager.deleteTask('${
                          task._id
                        }')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>

                <div class="task-details" id="details-${task._id}">
                    <div class="task-category">${task.category}</div>
                    ${
                      task.description
                        ? `<div class="task-full-description">${task.description}</div>`
                        : ""
                    }
                    <div class="task-additional-info">
                        <div>${
                          task.dueDate
                            ? `Due: ${this.formatDate(task.dueDate)}`
                            : ""
                        }</div>
                        <div class="task-priority ${priorityClass}">${
      task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
    }</div>
                    </div>
                    ${
                      isOverdue
                        ? '<div style="color: #dc3545; margin-top: 5px;">Overdue</div>'
                        : ""
                    }
                </div>
            </div>
        `;
  }

  updateStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter((task) => task.completed).length;
    const pending = total - completed;
    const overdue = this.tasks.filter(
      (task) => this.isOverdue(task) && !task.completed
    ).length;

    document.getElementById("totalTasks").textContent = total;
    document.getElementById("completedTasks").textContent = completed;
    document.getElementById("pendingTasks").textContent = pending;
    document.getElementById("overdueTasks").textContent = overdue;
  }

  toggleExpand(id) {
    const details = document.getElementById(`details-${id}`);
    if (details) {
      const expanded = details.classList.toggle("expanded");
      const btn =
        details.previousElementSibling.querySelector(".task-expand-btn i");
      if (btn) {
        btn.classList.toggle("fa-chevron-down", !expanded);
        btn.classList.toggle("fa-chevron-up", expanded);
      }
    }
  }

  isOverdue(task) {
    if (!task.dueDate || task.completed) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < now;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  async loadTasks() {
    try {
      this.tasks = await this.apiCall(this.apiBaseUrl);
      this.renderTasks();
      this.updateStats();
    } catch (error) {
      console.error("Error loading tasks:", error);
      this.showToast("Failed to load tasks from server", "error");
      // Fallback to local storage if API fails
      this.tasks = JSON.parse(localStorage.getItem("tasks")) || [];
      this.renderTasks();
      this.updateStats();
    }
  }

  async apiCall(endpoint, method = "GET", data = null) {
    const config = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

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

  trackEvent(eventType, data = {}) {
    // Send analytics data to backend
    const analyticsData = {
      eventType: `task_${eventType}`,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId(),
        pageUrl: window.location.href,
      },
    };

    // Use sendBeacon for better reliability
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(analyticsData)], {
        type: "application/json",
      });
  const analyticsEndpoint = (window?.location?.origin || 'http://localhost:5000') + '/api/analytics/track';
  navigator.sendBeacon(analyticsEndpoint, blob);
    } else {
      // Fallback to fetch
      this.apiCall(
  (window?.location?.origin || 'http://localhost:5000') + '/api/analytics/track',
        "POST",
        analyticsData
      ).catch(() => {
        // Silently fail analytics calls
      });
    }
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem("task_app_session_id");
    if (!sessionId) {
      sessionId =
        "task_session_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem("task_app_session_id", sessionId);
    }
    return sessionId;
  }

  showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");

    toastMessage.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
      toast.className = "toast";
    }, 3000);
  }

  loadSampleTasks() {
    // Only load sample tasks if no tasks exist
    if (this.tasks.length === 0) {
      // Sample tasks will be created through the API
      console.log("No tasks found, ready to add your first task!");
    }
  }
}

// Initialize the app
const taskManager = new TaskManager();
