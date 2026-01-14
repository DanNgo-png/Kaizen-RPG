import { TaskAPI } from "../api/TaskAPI.js";

export function initKanbanBoard() {
    // 1. Request Data
    TaskAPI.getTasks();
    
    // 2. Listen for Data (One-time binding handled by caller or idempotent check)
    // Note: We reuse the generic 'receiveTasks' event.
    // Ensure we don't double bind if this is called multiple times.
    document.removeEventListener('kaizen:refresh-kanban', handleKanbanData); 
    document.addEventListener('kaizen:refresh-kanban', handleKanbanData);
}

// Logic to process tasks for Kanban view
export function renderKanbanView(tasks) {
    const colTodo = document.getElementById('kanban-col-todo');
    const colProgress = document.getElementById('kanban-col-progress');
    const colDone = document.getElementById('kanban-col-done');

    // Counts
    const countTodo = document.getElementById('kanban-count-todo');
    const countProgress = document.getElementById('kanban-count-progress');
    const countDone = document.getElementById('kanban-count-done');

    if (!colTodo || !colProgress || !colDone) return;

    // Clear Columns
    colTodo.innerHTML = '';
    colProgress.innerHTML = '';
    colDone.innerHTML = '';

    let cTodo = 0, cProg = 0, cDone = 0;

    tasks.forEach(task => {
        // Logic: 
        // Completed = 1 -> Done
        // Completed = 0 AND (Priority P1 or P2) -> In Progress (Simulated)
        // Completed = 0 AND (Priority P3 or P4) -> To Do
        
        const card = createKanbanCard(task);

        if (task.completed === 1) {
            colDone.appendChild(card);
            cDone++;
        } else if (task.priority === 'p1' || task.priority === 'p2') {
            colProgress.appendChild(card);
            cProg++;
        } else {
            colTodo.appendChild(card);
            cTodo++;
        }
    });

    if(countTodo) countTodo.textContent = cTodo;
    if(countProgress) countProgress.textContent = cProg;
    if(countDone) countDone.textContent = cDone;
}

function createKanbanCard(task) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true; // Visual only for now

    // Tag based on Priority
    let tagHtml = '';
    if (task.priority === 'p1') tagHtml = `<span class="tag tag-urgent">Urgent</span>`;
    else if (task.priority === 'p2') tagHtml = `<span class="tag tag-design">High</span>`;
    else tagHtml = `<span class="tag tag-dev">Task</span>`;

    card.innerHTML = `
        <div class="card-tags">${tagHtml}</div>
        <div class="kanban-card-title">${task.content}</div>
        <div class="card-footer">
            <span class="card-id">#${task.id}</span>
            <div class="card-meta">
               ${task.completed ? '<i class="fa-solid fa-check" style="color:var(--stat-check)"></i>' : ''}
            </div>
        </div>
    `;
    
    return card;
}

// Event Proxy
const handleKanbanData = (e) => {
    renderKanbanView(e.detail);
};