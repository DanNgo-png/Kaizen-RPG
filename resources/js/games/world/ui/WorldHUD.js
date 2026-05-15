import { getReputationString, getReputationColor } from "./barebones/BarebonesConstants.js";

const DEFAULT_FACTION_COLOR = '#60a5fa';
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export class WorldHUD {
    constructor() {
        this.tooltip = document.getElementById('map-tooltip');
        
        this.stats = {
            gold: document.getElementById('hud-gold'),
            provisions: document.getElementById('hud-provisions'),
            tools: document.getElementById('hud-tools'),
            ammo: document.getElementById('hud-ammo'),
            meds: document.getElementById('hud-meds'),
            day: document.getElementById('hud-day'),
            roster: document.getElementById('hud-roster')
        };

        this.currentData = null; 

        this._bindResourceTooltips();
    }

    updateStats(data) {
        this.currentData = data; 

        if (data.day !== undefined && this.stats.day) {
            const accTime = data.accumulated_time || 0;
            const fraction = Math.min(accTime / 30, 1);
            const totalMinutes = fraction * 24 * 60;
            const h = Math.floor(totalMinutes / 60);
            const m = Math.floor(totalMinutes % 60);
            const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            this.stats.day.textContent = `Day ${data.day} - ${timeStr}`;
        }

        if (data.gold !== undefined && this.stats.gold) this.stats.gold.textContent = data.gold;
        if (data.provisions !== undefined && this.stats.provisions) this.stats.provisions.textContent = data.provisions;
        if (data.tools !== undefined && this.stats.tools) this.stats.tools.textContent = data.tools;
        if (data.ammo !== undefined && this.stats.ammo) this.stats.ammo.textContent = data.ammo;
        if (data.medicine !== undefined && this.stats.meds) this.stats.meds.textContent = data.medicine;
        if (data.day !== undefined && this.stats.day) this.stats.day.textContent = `Day ${data.day}`;
        if (data.currentRoster !== undefined && this.stats.roster) {
            this.stats.roster.textContent = `${data.currentRoster} / ${data.maxRoster || 12}`;
        }
    }

    _bindResourceTooltips() {
        const resourceTriggers = [
            { id: 'res-time-container', type: 'time' },
            { id: 'res-gold-container', type: 'gold' },
            { id: 'res-provisions-container', type: 'provisions' },
            { id: 'res-tools-container', type: 'tools' },
            { id: 'res-ammo-container', type: 'ammo' },
            { id: 'res-meds-container', type: 'meds' }
        ];

        resourceTriggers.forEach(item => {
            const el = document.getElementById(item.id);
            if (el) {
                el.addEventListener('mouseenter', (e) => this._showResourceTooltip(item.type, e));
                el.addEventListener('mousemove', (e) => this._positionTooltip(e.clientX, e.clientY));
                el.addEventListener('mouseleave', () => this.hideTooltip());
            }
        });
    }

    _showResourceTooltip(type, e) {
        if (!this.tooltip || !this.currentData) return;

        let html = '';
        const d = this.currentData;

        switch(type) {
            case 'time':
                const day = d.day || 1;
                const year = Math.floor((day - 1) / 365) + 1;
                const dayOfYear = ((day - 1) % 365) + 1;
                html = `
                    <div style="font-weight:700; color:#e2e8f0; margin-bottom:5px; font-size:1.05rem;">Calendar</div>
                    <div style="max-width: 250px; line-height:1.4;">Year <b style="color:#fff;">${year}</b>, Day <b style="color:#fff;">${dayOfYear}</b>.</div>
                    <div style="margin-top:8px; max-width: 250px; line-height:1.4; color:#9ca3af;">Time advances as you complete focus sessions. (30m focus = 1 in-game day).</div>
                `;
                break;
            case 'gold':
                const daysGold = d.dailyWages > 0 ? Math.floor(d.gold / d.dailyWages) : '∞';
                html = `
                    <div style="font-weight:700; color:#facc15; margin-bottom:5px; font-size:1.05rem;">Crowns</div>
                    <div style="max-width: 250px; line-height:1.4;">You pay out <b style="color:#fff;">${d.dailyWages || 0}</b> crowns per day.</div>
                    <div style="margin-top:8px; max-width: 250px; line-height:1.4;">Your <b style="color:#fff;">${d.gold}</b> crowns will last you for <b style="color:#fff;">${daysGold}</b> more days.</div>
                `;
                break;
            case 'provisions':
                const daysFood = d.foodPerDay > 0 ? Math.floor(d.provisions / d.foodPerDay) : '∞';
                html = `
                    <div style="font-weight:700; color:#d97706; margin-bottom:5px; font-size:1.05rem;">Provisions</div>
                    <div style="max-width: 260px; line-height:1.4;">The average person requires 2 provisions per day.</div>
                    <div style="margin-top:8px; max-width: 260px; line-height:1.4;">You use <b style="color:#fff;">${d.foodPerDay || 0}</b> provisions per day.</div>
                    <div style="margin-top:4px; max-width: 260px; line-height:1.4;">Your <b style="color:#fff;">${d.provisions}</b> provisions will last you for <b style="color:#fff;">${daysFood}</b> more days.</div>
                `;
                break;
            case 'tools':
                html = `
                    <div style="font-weight:700; color:#9ca3af; margin-bottom:5px; font-size:1.05rem;">Tools and Supplies</div>
                    <div style="max-width: 280px; line-height:1.4;">One point is required to repair 15 points of item condition. Running out of supplies may result in weapons breaking in combat and will leave your armor damaged and useless.</div>
                    <div style="margin-top:8px; color:#9ca3af;">You can carry 200 units at most.</div>
                `;
                break;
            case 'ammo':
                html = `
                    <div style="font-weight:700; color:#d1d5db; margin-bottom:5px; font-size:1.05rem;">Ammunition</div>
                    <div style="max-width: 320px; line-height:1.4;">Replacing one arrow or bolt will take up one point of ammunition, replacing one shot of a Handgonne will take up two points, and replacing one throwing weapon or charge of a Fire Lance will take up three.</div>
                    <div style="margin-top:8px; max-width: 320px; line-height:1.4;">Running out of ammunition will leave your quivers empty and your people with nothing to shoot with.</div>
                    <div style="margin-top:8px; color:#9ca3af;">You can carry no more than 500 units at a time.</div>
                `;
                break;
            case 'meds':
                html = `
                    <div style="font-weight:700; color:#f87171; margin-bottom:5px; font-size:1.05rem;">Medical Supplies</div>
                    <div style="max-width: 280px; line-height:1.4;">One point of medical is required each day for every injury to improve and heal. Lost hitpoints heal on their own.</div>
                    <div style="margin-top:8px; max-width: 280px; line-height:1.4;">Running out of medical supplies will leave your group unable to recover from severe injuries.</div>
                    <div style="margin-top:8px; color:#9ca3af;">You can carry 150 units at most.</div>
                `;
                break;
        }

        this.tooltip.innerHTML = html;
        this.tooltip.style.display = 'block';
        this._positionTooltip(e.clientX, e.clientY);
    }

    _positionTooltip(screenX, screenY) {
        if (!this.tooltip || this.tooltip.style.display === 'none') return;

        const OFFSET_X = 15;
        const OFFSET_Y = 15;
        
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = screenX + OFFSET_X;
        let top = screenY + OFFSET_Y;

        if (left + tooltipRect.width > viewportWidth) {
            left = screenX - tooltipRect.width - OFFSET_X;
        }

        if (top + tooltipRect.height > viewportHeight) {
            top = screenY - tooltipRect.height - OFFSET_Y;
        }

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    showTooltip(node, screenX, screenY) {
        if (!this.tooltip) return;

        const typeColor = node.type === 'Stronghold' ? '#f87171' : '#aaa';
        const specHtml = node.specialization 
            ? `<div style="color:#a78bfa; font-size:0.75rem; margin-top:4px;"><i class="fa-solid fa-star"></i> Specialization: ${this._escapeHtml(node.specialization)}</div>` 
            : `<div style="color:#6b7280; font-size:0.75rem; margin-top:4px; font-style:italic;"><i class="fa-solid fa-ban"></i> Too poor to specialize</div>`;
        const factionHtml = node.faction
            ? this._factionBannerHtml(node.faction)
            : `<div class="map-tooltip-unclaimed"><i class="fa-solid fa-tree"></i> Unclaimed Wilderness</div>`;
        const attachHtml = node.attachments > 0 
            ? `<div style="color:#9ca3af; font-size:0.75rem; margin-top:2px;"><i class="fa-solid fa-link"></i> Attached Locations: ${node.attachments}</div>`
            : '';

        const rep = node.reputation || 0;
        const repStr = getReputationString(rep);
        const repCol = getReputationColor(rep);

        this.tooltip.innerHTML = `
            ${factionHtml}
            <div style="font-weight:700; font-size:1rem; margin-bottom:2px;">${this._escapeHtml(node.name)}</div>
            <div style="color:${typeColor}; font-size:0.8rem; text-transform:uppercase;">${this._escapeHtml(node.type)}</div>
            <div style="color:${repCol}; font-size:0.75rem; margin-top:4px;"><i class="fa-solid fa-handshake"></i> Reputation: ${repStr} (${rep})</div>
            ${specHtml}
            ${attachHtml}
        `;

        this.tooltip.style.display = 'block';
        this._positionTooltip(screenX, screenY);
    }

    _factionBannerHtml(faction) {
        const color = this._safeHexColor(faction.color);

        return `
            <div class="map-tooltip-faction" style="--faction-color:${color};">
                <span class="map-tooltip-faction-dot"></span>
                Bannermen of ${this._escapeHtml(faction.name)}
            </div>
        `;
    }

    _safeHexColor(color) {
        return HEX_COLOR_PATTERN.test(String(color ?? '')) ? color : DEFAULT_FACTION_COLOR;
    }

    _escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.display = 'none';
        }
    }
}