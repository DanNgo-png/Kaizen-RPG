export function initTodoList() {
    const input = document.getElementById('new-task-input');
    const priorityInput = document.getElementById('priority-input');
    const addBtn = document.getElementById('add-task-btn');
    const list = document.getElementById('todo-list-container');
    const tabs = document.querySelectorAll('.tab-btn');
    const newListBtn = document.querySelector('.btn-new-list');
    const clearBtn = document.getElementById('clear-completed-btn');

    // --- STORAGE PLACEHOLDERS ---
    function saveToStorage() {
        // TODO: Map existing .task-item elements to a data structure and save
    }

    function loadFromStorage() {
        // TODO: Retrieve data and rebuild task items
    }

    // --- CLEAR COMPLETED LOGIC ---
    function clearCompletedTasks() {
        const completedTasks = list.querySelectorAll('.task-item.completed');
        
        if (completedTasks.length === 0) return;

        if (confirm(`Remove all ${completedTasks.length} completed tasks?`)) {
            completedTasks.forEach(task => task.remove());
            applyCurrentFilter();
            saveToStorage(); // Placeholder for future persistence
        }
    }

    // --- TASK COUNT LOGIC ---
    function updateTaskCounts() {
        const allTasks = list.querySelectorAll('.task-item');
        const completedTasks = list.querySelectorAll('.task-item.completed');
        
        const counts = {
            all: allTasks.length,
            completed: completedTasks.length,
            pending: allTasks.length - completedTasks.length
        };

        tabs.forEach(tab => {
            const filter = tab.getAttribute('data-filter');
            const badge = tab.querySelector('.count-badge');
            if (badge && counts[filter] !== undefined) {
                badge.textContent = counts[filter];
            }
        });
    }

    // --- NEW LIST LOGIC ---
    function createNewList() {
        const confirmClear = confirm("Create a new list? This will clear all current tasks.");
        if (confirmClear) {
            if (list) {
                list.innerHTML = ''; // Clears the list container
                applyCurrentFilter();
                saveToStorage(); // TODO
            }
        }
    }

    // --- EMPTY STATE LOGIC ---
    function updateEmptyState(visibleTasksCount) {
        let emptyMsg = list.querySelector('.empty-state');
        
        if (visibleTasksCount === 0) {
            if (!emptyMsg) {
                emptyMsg = document.createElement('div');
                emptyMsg.className = 'empty-state'; // Uses dashed border from todo-list.css
                list.appendChild(emptyMsg);
            }

            // Use data-filter instead of textContent to avoid badge numbers in text
            const activeTab = document.querySelector('.tab-btn.active');
            const filterType = activeTab ? activeTab.getAttribute('data-filter') : 'all';

            if (filterType === 'pending') {
                emptyMsg.textContent = "No pending tasks found.";
            } else if (filterType === 'completed') {
                emptyMsg.textContent = "No completed tasks found.";
            } else {
                emptyMsg.textContent = "No tasks found.";
            }
        } else if (emptyMsg) {
            emptyMsg.remove();
        }
    }

    // --- FILTER LOGIC ---
    function applyCurrentFilter() {
        if (!list) return;

        // Use the data-filter attribute instead of textContent
        const activeTab = document.querySelector('.tab-btn.active');
        const filterType = activeTab ? activeTab.getAttribute('data-filter') : 'all';
        
        const tasks = list.querySelectorAll('.task-item');
        let visibleCount = 0;

        tasks.forEach(task => {
            const isCompleted = task.classList.contains('completed');
            let shouldShow = false;

            // Logic based on the data-filter value
            if (filterType === 'pending') {
                shouldShow = !isCompleted;
            } else if (filterType === 'completed') {
                shouldShow = isCompleted;
            } else {
                shouldShow = true; // 'all'
            }

            task.style.display = shouldShow ? 'flex' : 'none';
            if (shouldShow) visibleCount++;
        });

        updateEmptyState(visibleCount);
        updateTaskCounts();
    }

    // --- TASK ACTIONS ---
    function addTask() {
        const taskText = input.value.trim();
        const priority = priorityInput.value; // Get p1, p2, p3, or p4
        
        if (taskText === "") return;

        const taskItem = document.createElement('div');
        // Apply the priority as a class (e.g., task-item p1)
        taskItem.className = `task-item ${priority}`; 
        
        taskItem.innerHTML = `
            <div class="task-left">
                <label class="check-container">
                    <input type="checkbox">
                    <span class="checkmark"></span>
                </label>
                <span class="task-text">${taskText}</span>
            </div>
            <button class="btn-delete" title="Delete Task">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        list.appendChild(taskItem);
        input.value = '';
        priorityInput.value = 'p4'; // Reset to default Priority 4
        applyCurrentFilter();
        sortTasksByPriority();
        saveToStorage(); // TODO
    }

    // --- PRIORITY SORTING ---
    function sortTasksByPriority() {
        const tasks = Array.from(list.querySelectorAll('.task-item'));
        
        // Priority weight mapping
        const weights = { 'p1': 1, 'p2': 2, 'p3': 3, 'p4': 4 };

        tasks.sort((a, b) => {
            const pA = weights[Array.from(a.classList).find(c => weights[c])] || 4;
            const pB = weights[Array.from(b.classList).find(c => weights[c])] || 4;
            return pA - pB;
        });

        // Re-append in sorted order
        tasks.forEach(task => list.appendChild(task));
    }

    // --- EVENT LISTENERS ---
    if (addBtn) addBtn.addEventListener('click', addTask);
    
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });
    }

    // --- EVENT LISTENERS ---
    addBtn.addEventListener('click', addTask);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCompletedTasks);
    }
    
    // New List Button Listener
    if (newListBtn) {
        newListBtn.addEventListener('click', createNewList);
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active'); // Activates CSS pseudo-element underline
            applyCurrentFilter();
        });
    });

    if (list) {
        list.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const item = e.target.closest('.task-item');
                if (item) {
                    item.classList.toggle('completed', e.target.checked); // Logic from manager
                    applyCurrentFilter();
                    saveToStorage(); // TODO
                }
            }
        });

        list.addEventListener('click', (e) => {
            if (e.target.closest('.btn-delete')) {
                const item = e.target.closest('.task-item'); // Delete logic from manager
                if (item) {
                    item.remove();
                    applyCurrentFilter();
                    saveToStorage(); // TODO
                }
            }
        });
    }

    // Initialization
    loadFromStorage();
    applyCurrentFilter();
}