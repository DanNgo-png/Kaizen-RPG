/**
 * CustomMenuManager.js
 * A reusable class for creating context menus.
 * Handles DOM injection, positioning, styling, and cleanup.
 */
export class CustomMenuManager {
    constructor() {
        this.activeMenu = null;
        this._injectStyles();
        this._initGlobalListeners();
    }

    _injectStyles() {
        if (document.getElementById('kaizen-context-menu-css')) return;
        
        const css = `
            .kaizen-context-menu {
                position: fixed;
                z-index: 9999;
                background: var(--surface-color, #1f2937);
                border: 1px solid var(--bg-hover, #374151);
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                padding: 6px;
                min-width: 180px;
                display: flex;
                flex-direction: column;
                gap: 2px;
                opacity: 0;
                transform: scale(0.95);
                transition: opacity 0.1s ease, transform 0.1s ease;
                pointer-events: none;
            }
            .kaizen-context-menu.visible {
                opacity: 1;
                transform: scale(1);
                pointer-events: auto;
            }
            .ctx-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 12px;
                background: transparent;
                border: none;
                color: var(--text-primary, #e5e7eb);
                font-family: var(--font-main, "Segoe UI", sans-serif);
                font-size: 0.9rem;
                text-align: left;
                cursor: pointer;
                border-radius: 4px;
                transition: background 0.1s;
                width: 100%;
            }
            .ctx-item:hover {
                background-color: var(--bg-hover, #374151);
                color: #fff;
            }
            .ctx-item.danger {
                color: #ef4444;
            }
            .ctx-item.danger:hover {
                background-color: rgba(239, 68, 68, 0.1);
            }
            .ctx-separator {
                height: 1px;
                background-color: var(--bg-hover, #374151);
                margin: 4px 0;
            }
            .ctx-icon {
                width: 20px;
                text-align: center;
                color: var(--text-secondary, #9ca3af);
                display: flex;
                justify-content: center;
            }
            .ctx-item:hover .ctx-icon {
                color: #fff;
            }
            .ctx-item.danger .ctx-icon {
                color: #ef4444;
            }
        `;
        const style = document.createElement('style');
        style.id = 'kaizen-context-menu-css';
        style.textContent = css;
        document.head.appendChild(style);
    }

    _initGlobalListeners() {
        const closeMenu = () => this.hide();
        
        // Close on left click anywhere
        document.addEventListener('click', closeMenu);
        
        // Close on right click elsewhere (to allow opening a new one)
        document.addEventListener('contextmenu', (e) => {
            // Check if clicking inside an existing menu
            if (this.activeMenu && !this.activeMenu.contains(e.target)) {
                this.hide();
            }
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });

        // Close on Resize or Scroll to prevent floating issues
        window.addEventListener('resize', closeMenu);
        document.addEventListener('scroll', closeMenu, true);
    }

    /**
     * Show context menu at mouse position.
     * @param {MouseEvent} event 
     * @param {Array} items - [{ label, icon, action, danger, separator }]
     */
    show(event, items) {
        event.preventDefault();
        event.stopPropagation();

        this.hide();

        const menu = document.createElement('div');
        menu.className = 'kaizen-context-menu';

        items.forEach(item => {
            if (item.separator) {
                const sep = document.createElement('div');
                sep.className = 'ctx-separator';
                menu.appendChild(sep);
                return;
            }

            const btn = document.createElement('button');
            btn.className = `ctx-item ${item.danger ? 'danger' : ''}`;
            
            const iconHtml = item.icon 
                ? `<span class="ctx-icon">${item.icon}</span>` 
                : `<span class="ctx-icon"></span>`;
            
            btn.innerHTML = `${iconHtml}<span>${item.label}</span>`;

            btn.onclick = (e) => {
                e.stopPropagation();
                this.hide();
                if (item.action) item.action();
            };

            menu.appendChild(btn);
        });

        document.body.appendChild(menu);
        this.activeMenu = menu;

        // Position Logic (Prevent overflow)
        requestAnimationFrame(() => {
            const rect = menu.getBoundingClientRect();
            let x = event.clientX;
            let y = event.clientY;

            if (x + rect.width > window.innerWidth) x -= rect.width;
            if (y + rect.height > window.innerHeight) y -= rect.height;

            menu.style.top = `${y}px`;
            menu.style.left = `${x}px`;
            menu.classList.add('visible');
        });
    }

    hide() {
        if (this.activeMenu) {
            this.activeMenu.remove();
            this.activeMenu = null;
        }
    }
}