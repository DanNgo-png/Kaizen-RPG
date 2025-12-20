export function initTodoList() {
    const input = document.getElementById('new-task-input');
    const addBtn = document.getElementById('add-task-btn');
    const list = document.getElementById('todo-list-container');
    const tabs = document.querySelectorAll('.tab-btn');

    // --- Helper: Create/Toggle Empty State ---
    function updateEmptyState(visibleTasksCount) {
        let emptyMsg = list.querySelector('.empty-state');
        
        if (visibleTasksCount === 0) {
            if (!emptyMsg) {
                emptyMsg = document.createElement('div');
                emptyMsg.className = 'empty-state';
                list.appendChild(emptyMsg);
            }
            const activeTab = document.querySelector('.tab-btn.active').textContent.trim();
            emptyMsg.textContent = activeTab === 'All Tasks' 
                ? "No tasks yet. Add one above!" 
                : `No ${activeTab.toLowerCase()} tasks found.`;
        } else if (emptyMsg) {
            emptyMsg.remove();
        }
    }

    // --- Task Creation Logic ---
    function addTask() {
        const taskText = input.value.trim();
        if (taskText === "") return;

        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
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
        applyCurrentFilter();
    }

    // --- Filter Logic ---
    function applyCurrentFilter() {
        const activeTab = document.querySelector('.tab-btn.active').textContent.trim();
        const tasks = list.querySelectorAll('.task-item');
        let visibleCount = 0;

        tasks.forEach(task => {
            const isCompleted = task.classList.contains('completed');
            let shouldShow = false;

            if (activeTab === 'Pending') shouldShow = !isCompleted;
            else if (activeTab === 'Completed') shouldShow = isCompleted;
            else shouldShow = true; // All Tasks

            task.style.display = shouldShow ? 'flex' : 'none';
            if (shouldShow) visibleCount++;
        });

        updateEmptyState(visibleCount);
    }

    // --- Events ---
    addBtn.addEventListener('click', addTask);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            applyCurrentFilter();
        });
    });

    if (list) {
        list.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const item = e.target.closest('.task-item');
                if (item) {
                    item.classList.toggle('completed', e.target.checked);
                    applyCurrentFilter();
                }
            }
        });

        list.addEventListener('click', (e) => {
            if (e.target.closest('.btn-delete')) {
                const item = e.target.closest('.task-item');
                if (item) {
                    item.remove();
                    applyCurrentFilter();
                }
            }
        });
    }

    // Initial check in case the HTML has hardcoded example tasks
    applyCurrentFilter();
}