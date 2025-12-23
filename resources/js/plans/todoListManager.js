import { GameAPI } from "../api/GameAPI.js";

// State to track current filter
let currentFilter = 'all';

export function initTodoList() {
    const input = document.getElementById('new-task-input');
    const priorityInput = document.getElementById('priority-input');
    const addBtn = document.getElementById('add-task-btn');
    const tabs = document.querySelectorAll('.tab-btn');
    const clearBtn = document.getElementById('clear-completed-btn');

    // --- 1. Actions ---

    const handleAddTask = () => {
        const content = input.value.trim();
        const priority = priorityInput.value || 'p4';

        if (!content) return;

        GameAPI.addTask({ content, priority });
        input.value = ''; // Clear input immediately
    };

    const handleClearCompleted = () => {
        if (confirm("Remove all completed tasks?")) {
            GameAPI.clearCompletedTasks();
        }
    };

    // --- 2. Event Listeners ---

    if (addBtn) addBtn.addEventListener('click', handleAddTask);

    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAddTask();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearCompleted);
    }

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // UI Update
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Logic Update
            currentFilter = tab.getAttribute('data-filter');

            // Refresh Data (Calls renderTasks eventually)
            GameAPI.getTasks();
        });
    });

    // --- 3. Initial Load ---
    GameAPI.getTasks();
}

export function renderTasks(allTasks) {
    const list = document.getElementById('todo-list-container');
    if (!list) return;
    list.innerHTML = ''; // Clear current list
    // 1. Filter
    const visibleTasks = allTasks.filter(task => {
        const isComplete = task.completed === 1;
        if (currentFilter === 'pending') return !isComplete;
        if (currentFilter === 'completed') return isComplete;
        return true; // 'all'
    });
    // 2. Update Counts
    updateCounts(allTasks);
    // 3. Empty State
    if (visibleTasks.length === 0) {
        renderEmptyState(list);
        return;
    }
    // 4. Render Items
    visibleTasks.forEach(task => {
        const item = document.createElement('div');
        // Add priority class (p1, p2...) and completed class
        const priorityClass = task.priority || 'p4';
        const completedClass = task.completed === 1 ? 'completed' : '';
        item.className = `task-item ${priorityClass} ${completedClass}`;

        // HTML Structure
        item.innerHTML = `
            <div class="task-left">
                <label class="check-container">
                    <input type="checkbox" ${task.completed === 1 ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                <span class="task-text">${task.content}</span>
            </div>
            <button class="btn-delete" title="Delete Task">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        // Checkbox Event
        const checkbox = item.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
            GameAPI.toggleTask(task.id);
        });

        // Delete Event
        const delBtn = item.querySelector('.btn-delete');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent bubbling
            GameAPI.deleteTask(task.id);
        });

        list.appendChild(item);
    });
}

function updateCounts(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed === 1).length;
    const pending = total - completed;

    const badges = document.querySelectorAll('.tab-btn .count-badge');
    badges.forEach(badge => {
        const filter = badge.parentElement.getAttribute('data-filter');
        if (filter === 'all') badge.textContent = total;
        if (filter === 'pending') badge.textContent = pending;
        if (filter === 'completed') badge.textContent = completed;
    });
}

function renderEmptyState(container) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-state';

    if (currentFilter === 'pending') emptyMsg.textContent = "No pending tasks! Time to relax?";
    else if (currentFilter === 'completed') emptyMsg.textContent = "No completed tasks yet.";
    else emptyMsg.textContent = "No tasks found. Add one above.";

    container.appendChild(emptyMsg);
}