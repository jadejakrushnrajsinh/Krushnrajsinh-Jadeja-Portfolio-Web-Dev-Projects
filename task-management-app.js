// Enhanced Task Management App JavaScript
class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.currentFilter = 'all';
        this.currentSort = 'default';
        this.searchQuery = '';
        this.editingTaskId = null;
        this.init();
    }

    init() {
        // Set min date to today for due date inputs
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('taskDueDate').min = today;
        document.getElementById('editTaskDueDate').min = today;
        
        this.renderTasks();
        this.updateStats();
        this.bindEvents();
        this.loadSampleTasks();
    }

    bindEvents() {
        // Add task form
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Sort buttons
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setSort(e.target.dataset.sort);
            });
        });

        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderTasks();
        });

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('editTaskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateTask();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('editModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    addTask() {
        const title = document.getElementById('taskTitle').value.trim();
        const category = document.getElementById('taskCategory').value;
        const priority = document.getElementById('taskPriority').value;
        const dueDate = document.getElementById('taskDueDate').value;
        const description = document.getElementById('taskDescription').value.trim();

        if (!title) {
            this.showToast('Task title is required!', 'error');
            return;
        }

        // Validate due date
        if (dueDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDate = new Date(dueDate);
            
            if (selectedDate < today) {
                this.showToast('Due date cannot be in the past!', 'error');
                return;
            }
        }

        const task = {
            id: Date.now(),
            title,
            category,
            priority,
            dueDate,
            description,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();

        // Reset form
        document.getElementById('taskForm').reset();
        this.showToast('Task added successfully!', 'success');
    }

    deleteTask(id) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(task => task.id !== id);
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.showToast('Task deleted successfully!', 'success');
        }
    }

    toggleComplete(id) {
        const task = this.tasks.find(task => task.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            
            const message = task.completed ? 
                'Task marked as complete!' : 'Task marked as pending!';
            this.showToast(message, 'success');
        }
    }

    editTask(id) {
        const task = this.tasks.find(task => task.id === id);
        if (task) {
            this.editingTaskId = id;
            document.getElementById('editTaskTitle').value = task.title;
            document.getElementById('editTaskCategory').value = task.category;
            document.getElementById('editTaskPriority').value = task.priority;
            document.getElementById('editTaskDueDate').value = task.dueDate;
            document.getElementById('editTaskDescription').value = task.description;
            document.getElementById('editModal').style.display = 'block';
        }
    }

    updateTask() {
        const task = this.tasks.find(task => task.id === this.editingTaskId);
        if (task) {
            const title = document.getElementById('editTaskTitle').value.trim();
            
            if (!title) {
                this.showToast('Task title is required!', 'error');
                return;
            }
            
            // Validate due date
            const dueDate = document.getElementById('editTaskDueDate').value;
            if (dueDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const selectedDate = new Date(dueDate);
                
                if (selectedDate < today) {
                    this.showToast('Due date cannot be in the past!', 'error');
                    return;
                }
            }

            task.title = title;
            task.category = document.getElementById('editTaskCategory').value;
            task.priority = document.getElementById('editTaskPriority').value;
            task.dueDate = dueDate;
            task.description = document.getElementById('editTaskDescription').value.trim();

            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.closeModal();
            this.showToast('Task updated successfully!', 'success');
        }
    }

    closeModal() {
        document.getElementById('editModal').style.display = 'none';
        this.editingTaskId = null;
    }

    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        this.renderTasks();
    }

    setSort(sortType) {
        this.currentSort = sortType;
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-sort="${sortType}"]`).classList.add('active');
        this.renderTasks();
    }

    getFilteredTasks() {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        return this.tasks.filter(task => {
            // Apply search filter
            if (this.searchQuery && 
                !task.title.toLowerCase().includes(this.searchQuery) &&
                !task.description.toLowerCase().includes(this.searchQuery) &&
                !task.category.toLowerCase().includes(this.searchQuery)) {
                return false;
            }
            
            // Apply category filter
            switch (this.currentFilter) {
                case 'pending':
                    return !task.completed;
                case 'completed':
                    return task.completed;
                case 'overdue':
                    if (!task.dueDate || task.completed) return false;
                    const dueDate = new Date(task.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    return dueDate < now;
                case 'high':
                    return task.priority === 'high';
                default:
                    return true;
            }
        });
    }

    sortTasks(tasks) {
        switch (this.currentSort) {
            case 'date':
                return tasks.sort((a, b) => {
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
            case 'priority':
                const priorityOrder = { high: 1, medium: 2, low: 3 };
                return tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
            default:
                return tasks.sort((a, b) => b.id - a.id); // Newest first
        }
    }

    renderTasks() {
        const container = document.getElementById('tasksContainer');
        let filteredTasks = this.getFilteredTasks();
        filteredTasks = this.sortTasks(filteredTasks);

        if (filteredTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No tasks found</h3>
                    <p>${this.searchQuery ? 'No tasks match your search.' : 
                      this.currentFilter === 'all' ? 'Add your first task to get started!' : 
                      `No ${this.currentFilter} tasks.`}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredTasks.map(task => this.createTaskHTML(task)).join('');
    }

    createTaskHTML(task) {
        const isOverdue = this.isOverdue(task);
        const priorityClass = `priority-${task.priority}`;

        return `
            <div class="task-card ${task.completed ? 'completed' : ''} ${task.priority}-priority" data-id="${task.id}">
                <div class="task-header">
                    <div style="display: flex; align-items: center;">
                        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onclick="taskManager.toggleComplete(${task.id})" />
                        <div class="task-title">${task.title}</div>
                    </div>
                    <div class="task-actions">
                        <button class="task-expand-btn" onclick="taskManager.toggleExpand(${task.id})" title="Expand/Collapse Details">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <button class="task-btn edit" onclick="taskManager.editTask(${task.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="task-btn delete" onclick="taskManager.deleteTask(${task.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>

                <div class="task-details" id="details-${task.id}">
                    <div class="task-category">${task.category}</div>
                    ${task.description ? `<div class="task-full-description">${task.description}</div>` : ''}
                    <div class="task-additional-info">
                        <div>${task.dueDate ? `Due: ${this.formatDate(task.dueDate)}` : ''}</div>
                        <div class="task-priority ${priorityClass}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</div>
                    </div>
                    ${isOverdue ? '<div style="color: #dc3545; margin-top: 5px;">Overdue</div>' : ''}
                </div>
            </div>
        `;
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
        const pending = total - completed;
        const overdue = this.tasks.filter(task => this.isOverdue(task) && !task.completed).length;

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('pendingTasks').textContent = pending;
        document.getElementById('overdueTasks').textContent = overdue;
    }

    toggleExpand(id) {
        const details = document.getElementById(`details-${id}`);
        if (details) {
            const expanded = details.classList.toggle('expanded');
            const btn = details.previousElementSibling.querySelector('.task-expand-btn i');
            if (btn) {
                btn.classList.toggle('fa-chevron-down', !expanded);
                btn.classList.toggle('fa-chevron-up', expanded);
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
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    }

    loadSampleTasks() {
        if (this.tasks.length === 0) {
            const sampleTasks = [
                {
                    id: 1,
                    title: 'Complete project proposal',
                    category: 'Work',
                    priority: 'high',
                    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    description: 'Finish the Q1 project proposal and send it to the team for review.',
                    completed: false,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 2,
                    title: 'Buy groceries',
                    category: 'Personal',
                    priority: 'medium',
                    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    description: 'Milk, bread, eggs, and vegetables for the week.',
                    completed: false,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 3,
                    title: 'Study JavaScript',
                    category: 'Study',
                    priority: 'medium',
                    dueDate: '',
                    description: 'Complete the JavaScript fundamentals course on Udemy.',
                    completed: true,
                    createdAt: new Date().toISOString()
                }
            ];

            this.tasks = sampleTasks;
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
        }
    }
}

// Initialize the app
const taskManager = new TaskManager();
