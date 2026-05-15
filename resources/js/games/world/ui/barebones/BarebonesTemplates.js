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
    const iconHtml = iconClass ? `<i class="${escapeHtml(iconClass)}"></i> ` : "";
    return `<div class="bb-empty-state">${iconHtml}${escapeHtml(message)}</div>`;
}

export function loadingStateHtml(message) {
    return `<div class="bb-empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i> ${escapeHtml(message)}</div>`;
}

export function selectedNodeLabelHtml(node) {
    if (!node) return "";

    const factionHtml = node.faction
        ? selectedFactionHtml(node.faction)
        : "";

    return `
        &mdash; ${escapeHtml(node.name)}
        <span class="bb-selected-reputation">
            <i class="fa-solid fa-handshake"></i> Rep: ${Number(node.reputation) || 0}
        </span>
        ${factionHtml}
    `;
}

function selectedFactionHtml(faction) {
    const color = HEX_COLOR_PATTERN.test(String(faction.color ?? ""))
        ? faction.color
        : DEFAULT_FACTION_COLOR;

    return `
        <span class="bb-selected-faction" style="--faction-color:${color};">
            <span class="bb-selected-faction-dot"></span>
            ${escapeHtml(faction.name)}
        </span>
    `;
}
