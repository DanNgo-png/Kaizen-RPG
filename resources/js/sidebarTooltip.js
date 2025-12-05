export function initSidebarTooltips() {
    const sidenav = document.getElementById("mySidenav");
    
    // Create the tooltip element
    const tooltip = document.createElement("div");
    tooltip.className = "sidebar-tooltip";
    document.body.appendChild(tooltip);

    let activeTarget = null;

    // Helper to hide tooltip
    const hideTooltip = () => {
        tooltip.classList.remove("visible");
        activeTarget = null;
    };

    // Helper to show tooltip
    const showTooltip = (target) => {
        // Only show if sidebar is collapsed
        if (!sidenav.classList.contains("collapsed")) return;

        const text = target.getAttribute("data-tooltip");
        if (!text) return;

        tooltip.textContent = text;
        activeTarget = target;

        // Position Logic
        const rect = target.getBoundingClientRect();
        
        // Vertically center
        const tooltipHeight = tooltip.offsetHeight || 30; // approx if not rendered yet
        const top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        
        // Position to the right (75px width + 10px gap = 85px)
        // Or calculated from button rect to be safer
        const left = 85; 

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.classList.add("visible");
    };

    // Global Event Delegation for cleanliness and dynamic elements
    document.addEventListener("mouseover", (e) => {
        // Find closest button with data-tooltip
        const target = e.target.closest("[data-tooltip]");
        
        if (target) {
            // If moving from one button to another, update immediately
            if (activeTarget !== target) {
                showTooltip(target);
            }
        } else {
            // Mouse is not on a tooltip-able element
            if (activeTarget) {
                hideTooltip();
            }
        }
    });

    // Hide when clicking (optional, but good UX if menu opens)
    document.addEventListener("mousedown", () => {
        if (activeTarget) hideTooltip();
    });
}