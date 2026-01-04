export class NotificationManager {
    constructor() {
        if (NotificationManager.instance) return NotificationManager.instance;
        NotificationManager.instance = this;

        // Create container if it doesn't exist
        this._createContainer();
    }

    _createContainer() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container-layer';
            document.body.appendChild(container);
            this.container = container;
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    /**
     * Show a notification.
     * @param {string} title - The header text
     * @param {string} message - The body text
     * @param {string} iconClass - FontAwesome class (e.g., 'fa-solid fa-check')
     */
    show(title, message, iconClass = 'fa-solid fa-check') {
        // 1. Trigger Native OS Notification (Global Visibility)
        try {
            Neutralino.os.showNotification(title, message, 'INFO');
        } catch (e) {
            console.warn("System notification failed:", e);
        }

        // 2. OPTIONAL: Trigger In-App HTML Toast
        // this._createToastElement(title, message, iconClass);
        
        // 3. Play Sound (Optional, reusing your audio manager concept if desired)
        // const audio = new Audio('resources/audio/bell-sound.mp3');
        // audio.play().catch(() => {});
    }

    _createToastElement(title, message, iconClass) {
        const toast = document.createElement('div');
        toast.className = 'kaizen-toast';
        
        toast.innerHTML = `
            <div class="toast-icon"><i class="${iconClass}"></i></div>
            <div class="toast-content">
                <span class="toast-title">${title}</span>
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
        `;

        // Close Button Logic
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.onclick = () => this._closeToast(toast);

        // Auto Close after 5 seconds
        setTimeout(() => {
            this._closeToast(toast);
        }, 5000);

        this.container.appendChild(toast);
    }

    _closeToast(element) {
        // Prevent double closing
        if (element.classList.contains('closing')) return;

        // Add exit animation class
        element.classList.add('closing');

        // Remove from DOM after animation finishes
        element.addEventListener('animationend', () => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    }
}

export const notifier = new NotificationManager();