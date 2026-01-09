export const DragState = {
    current: null, // { duration: 30, title: "Task Name", origin: "pool" | "schedule" }
    avatarEl: null,
    emptyImage: null,

    init() {
        // 1. Create Custom Avatar Element (Follows Mouse)
        if (!this.avatarEl) {
            this.avatarEl = document.createElement('div');
            this.avatarEl.id = 'custom-drag-avatar';
            document.body.appendChild(this.avatarEl);
        }

        // 2. Create Empty Image (Hides Default Browser Ghost)
        this.emptyImage = new Image();
        this.emptyImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

        // 3. Global Mouse Tracker
        document.addEventListener('dragover', (e) => {
            if (this.current && this.avatarEl) {
                e.preventDefault(); // Necessary to allow dropping
                // Offset slightly so mouse doesn't cover top-left corner
                this.avatarEl.style.top = (e.clientY + 10) + 'px';
                this.avatarEl.style.left = (e.clientX + 10) + 'px';
            }
        });
    },

    startDrag(event, taskData, htmlContent) {
        this.current = taskData;

        // Hide browser default
        event.dataTransfer.setDragImage(this.emptyImage, 0, 0);
        event.dataTransfer.setData('application/json', JSON.stringify(taskData));
        event.dataTransfer.effectAllowed = "move";

        // Show Custom Avatar
        this.avatarEl.innerHTML = htmlContent;
        this.avatarEl.classList.add('active');
        this.avatarEl.style.top = (event.clientY + 10) + 'px';
        this.avatarEl.style.left = (event.clientX + 10) + 'px';
    },

    endDrag() {
        this.current = null;
        if (this.avatarEl) {
            this.avatarEl.classList.remove('active');
            this.avatarEl.innerHTML = '';
        }
    }
};