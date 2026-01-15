export class TaskRenderer {
    constructor(callbacks) {
        this.callbacks = callbacks;
    }

    renderLists(container, lists, activeListId) {
        if (!container) return;
        container.innerHTML = '';

        // 1. Build Tree Structure
        const tree = this._buildTree(lists);

        // 2. Recursive Render
        this._renderTreeNodes(container, tree, activeListId, 0);
    }

    _buildTree(flatLists) {
        const map = {};
        const roots = [];

        // Init Map
        flatLists.forEach(l => {
            map[l.id] = { ...l, children: [] };
        });

        // Link Children
        flatLists.forEach(l => {
            if (l.parent_id && map[l.parent_id]) {
                map[l.parent_id].children.push(map[l.id]);
            } else {
                roots.push(map[l.id]);
            }
        });

        return roots;
    }

    _renderTreeNodes(container, nodes, activeListId, depth) {
        nodes.forEach(list => {
            const btn = document.createElement('button');
            const isActive = list.id === activeListId;
            
            // Indentation Style
            const indent = depth * 15; 
            btn.style.paddingLeft = `${10 + indent}px`; 
            
            btn.className = `list-item-btn ${isActive ? 'active' : ''}`;
            
            // Visual indicator for sub-list
            const iconHtml = list.parent_id 
                ? `<i class="fa-solid fa-turn-up fa-rotate-90" style="font-size:0.7em; opacity:0.5; margin-right:5px;"></i> <i class="${list.icon}"></i>`
                : `<i class="${list.icon}"></i>`;

            btn.innerHTML = `${iconHtml} ${list.title}`;
            
            // Click
            btn.addEventListener('click', () => {
                this.callbacks.onListSwitch(list.id, list.title, list.icon);
            });

            // Context Menu
            btn.addEventListener('contextmenu', (e) => {
                if (this.callbacks.onListContextMenu) {
                    this.callbacks.onListContextMenu(e, list);
                }
            });

            container.appendChild(btn);

            // Render Children
            if (list.children && list.children.length > 0) {
                this._renderTreeNodes(container, list.children, activeListId, depth + 1);
            }
        });
    }

    // ... (renderTasks and existing helper methods remain unchanged) ...
    renderTasks(container, tasks, filterType) {
        if (!container) return;
        container.innerHTML = '';

        const filtered = this._filterTasks(tasks, filterType);

        if (filtered.length === 0) {
            this._renderEmptyState(container, filterType);
            return;
        }

        filtered.forEach(task => {
            container.appendChild(this._createTaskElement(task));
        });
    }

    _filterTasks(tasks, filterType) {
        return tasks.filter(task => {
            const isComplete = task.completed === 1;
            if (filterType === 'pending') return !isComplete;
            if (filterType === 'completed') return isComplete;
            return true; // 'all'
        });
    }

    _createTaskElement(task) {
        const item = document.createElement('div');
        const priorityClass = task.priority || 'p4';
        const completedClass = task.completed === 1 ? 'completed' : '';
        
        item.className = `task-item ${priorityClass} ${completedClass}`;
        item.dataset.id = task.id; 

        const hasDescIcon = task.description 
            ? `<i class="fa-solid fa-align-left" style="font-size:0.8rem; margin-left:8px; opacity:0.5;"></i>` 
            : '';
        
        const hasDateIcon = task.due_date
            ? `<i class="fa-regular fa-calendar" style="font-size:0.8rem; margin-left:8px; opacity:0.5; color:#60a5fa;"></i>`
            : '';

        item.innerHTML = `
            <div class="task-left">
                <label class="check-container">
                    <input type="checkbox" ${task.completed === 1 ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                <span class="task-text">${this._escapeHtml(task.content)}</span>
                ${hasDescIcon}
                ${hasDateIcon}
            </div>
            <button class="btn-delete" title="Delete Task">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        const checkbox = item.querySelector('input[type="checkbox"]');
        const checkContainer = item.querySelector('.check-container');
        const delBtn = item.querySelector('.btn-delete');

        checkContainer.addEventListener('click', (e) => e.stopPropagation());
        
        checkbox.addEventListener('change', () => {
            this.callbacks.onToggleTask(task.id);
            item.classList.toggle('completed');
        });

        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm("Delete this task?")) {
                this.callbacks.onDeleteTask(task.id);
            }
        });

        item.addEventListener('click', () => {
            const selection = window.getSelection();
            if (selection.toString().length === 0) {
                this.callbacks.onTaskClick(task);
            }
        });

        item.addEventListener('contextmenu', (e) => {
            if (this.callbacks.onTaskContextMenu) {
                this.callbacks.onTaskContextMenu(e, task);
            }
        });

        return item;
    }

    _renderEmptyState(container, filterType) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'empty-state';
        const msgs = {
            'pending': "No pending tasks! Time to relax? 🌴",
            'completed': "No completed tasks yet. Get to work! 🚀",
            'all': "No tasks found. Add one above."
        };
        msgDiv.textContent = msgs[filterType] || msgs['all'];
        container.appendChild(msgDiv);
    }

    _escapeHtml(text) {
        if (!text) return text;
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
}