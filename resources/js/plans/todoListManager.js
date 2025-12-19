export function initTodoList() {
    const input = document.getElementById('new-task-input');
    const addBtn = document.getElementById('add-task-btn');
    const list = document.getElementById('todo-list-container');

    // Basic toggle logic (Event delegation)
    if (list) {
        list.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const item = e.target.closest('.task-item');
                if (item) item.classList.toggle('completed', e.target.checked);
            }
        });

        list.addEventListener('click', (e) => {
            if (e.target.closest('.btn-delete')) {
                const item = e.target.closest('.task-item');
                if (item) item.remove();
            }
        });
    }
}