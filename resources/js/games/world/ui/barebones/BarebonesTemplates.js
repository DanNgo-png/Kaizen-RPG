import { getReputationString, getReputationColor } from "./BarebonesConstants.js";

const DEFAULT_FACTION_COLOR = "#60a5fa";
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function emptyStateHtml(message, iconClass = "") {
    const iconHtml = iconClass ? `<i class="${escapeHtml(iconClass)}"></i><br>` : "";
    return `<div class="bb-empty-state">${iconHtml}${escapeHtml(message)}</div>`;
}

export function loadingStateHtml(message) {
    return `<div class="bb-empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i> ${escapeHtml(message)}</div>`;
}

export function selectedNodeLabelHtml(node) {
    if (!node) return "";

    const factionHtml = node.faction
        ? selectedFactionHtml(node.faction)
        : `<span style="color: #64748b; font-size: 0.75rem; font-style: italic; margin-left: 4px;">Unclaimed Wilderness</span>`;

    const rep = Number(node.reputation) || 0;
    const repStr = getReputationString(rep);
    const repCol = getReputationColor(rep);

    // Create a badge for the settlement type (e.g., Stronghold, Village)
    const typeHtml = node.type 
        ? `<span style="background: rgba(148, 163, 184, 0.1); border: 1px solid rgba(148, 163, 184, 0.3); color: #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">${escapeHtml(node.type)}</span>` 
        : "";

    return `
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px; padding: 8px 0;">
            
            <!-- Top Line: Settlement Name & Type -->
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #f8fafc; font-weight: 800; font-size: 1.15rem; letter-spacing: 0.3px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${escapeHtml(node.name)}</span>
                ${typeHtml}
            </div>

            <!-- Bottom Line: Reputation & Faction -->
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: ${repCol}; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 4px; background: ${repCol}15; padding: 3px 8px; border-radius: 12px; border: 1px solid ${repCol}40;">
                    <i class="fa-solid fa-handshake"></i> ${repStr} (${rep})
                </span>
                ${factionHtml}
            </div>

        </div>
    `;
}

function selectedFactionHtml(faction) {
    const color = HEX_COLOR_PATTERN.test(String(faction.color ?? ""))
        ? faction.color
        : DEFAULT_FACTION_COLOR;

    return `
        <span class="bb-selected-faction" style="--faction-color:${color}; margin: 0;">
            <span class="bb-selected-faction-dot"></span>
            ${escapeHtml(faction.name)}
        </span>
    `;
}