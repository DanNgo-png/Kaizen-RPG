export class WorldHUD {
    constructor() {
        // Cache Tooltip Element
        this.tooltip = document.getElementById('map-tooltip');
        
        // Cache Stat Elements
        this.stats = {
            gold: document.getElementById('hud-gold'),
            supplies: document.getElementById('hud-supplies'),
            day: document.getElementById('hud-day'),
            roster: document.getElementById('hud-roster')
        };
    }

    /**
     * Updates the top bar statistics.
     * @param {Object} data - { gold, supplies, day, currentRoster, maxRoster }
     */
    updateStats(data) {
        if (data.gold !== undefined && this.stats.gold) {
            this.stats.gold.textContent = data.gold;
        }
        if (data.supplies !== undefined && this.stats.supplies) {
            this.stats.supplies.textContent = `${data.supplies} days`;
        }
        if (data.day !== undefined && this.stats.day) {
            this.stats.day.textContent = `Day ${data.day}`;
        }
        if (data.currentRoster !== undefined && this.stats.roster) {
            this.stats.roster.textContent = `${data.currentRoster} / ${data.maxRoster || 12}`;
        }
    }

    /**
     * Shows and positions the map node tooltip.
     * @param {Object} node - The map node data { name, type, ... }
     * @param {number} screenX - Mouse X relative to viewport
     * @param {number} screenY - Mouse Y relative to viewport
     */
    showTooltip(node, screenX, screenY) {
        if (!this.tooltip) return;

        // 1. Set Content
        // Use a color code for the type to make it pop (optional)
        const typeColor = node.type === 'Stronghold' ? '#f87171' : '#aaa';
        
        this.tooltip.innerHTML = `
            <div style="font-weight:700; font-size:1rem; margin-bottom:2px;">${node.name}</div>
            <div style="color:${typeColor}; font-size:0.8rem; text-transform:uppercase;">${node.type}</div>
            ${node.faction ? `<div style="color:#60a5fa; font-size:0.75rem; margin-top:4px;">${node.faction}</div>` : ''}
        `;

        // 2. Position (with offset so cursor doesn't cover it)
        const OFFSET_X = 15;
        const OFFSET_Y = 15;
        
        // 3. Boundary Detection (Prevent tooltip from going off-screen)
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = screenX + OFFSET_X;
        let top = screenY + OFFSET_Y;

        // Flip to left if too close to right edge
        if (left + tooltipRect.width > viewportWidth) {
            left = screenX - tooltipRect.width - OFFSET_X;
        }

        // Flip up if too close to bottom edge
        if (top + tooltipRect.height > viewportHeight) {
            top = screenY - tooltipRect.height - OFFSET_Y;
        }

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.display = 'block';
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.display = 'none';
        }
    }
}