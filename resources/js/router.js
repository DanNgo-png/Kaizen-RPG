/**
 * --- ROUTE MIDDLEWARE CONFIGURATION ---
 * Define special cases for specific URLs here.
 * Keys are substrings of the URL (e.g., 'play-game.html').
 * Values are functions that run when that page loads.
 */
const routeMiddleware = {
    // Case 1: Game Menu (Full screen, covers sidebar)
    'play-game.html': {
        onEnter: (container) => container.classList.add('full-viewport-view'),
        onLeave: (container) => container.classList.remove('full-viewport-view')
    },
    
    // Case 2: Focus Timer (Centered relative to available space, respects sidebar)
    'focus-standard.html': {
        onEnter: (container) => container.classList.add('centered-content-view'),
        onLeave: (container) => container.classList.remove('centered-content-view')
    }
};

/**
 * Applies specific logic based on the URL and cleans up previous states.
 * @param {string} url - The URL being loaded
 * @param {HTMLElement} container - The container element
 */
function handleRouteLogic(url, container) {
    // 1. CLEANUP: Run 'onLeave' for all defined routes to ensure clean state
    // This acts as a reset mechanism so we don't need a specific 'else' block inside loadPage
    Object.values(routeMiddleware).forEach(handler => {
        if (typeof handler.onLeave === 'function') {
            handler.onLeave(container);
        }
    });

    // 2. MATCH & EXECUTE: Find if the current URL matches a config key
    const matchedKey = Object.keys(routeMiddleware).find(key => url.includes(key));
    
    if (matchedKey) {
        const handler = routeMiddleware[matchedKey];
        if (typeof handler.onEnter === 'function') {
            handler.onEnter(container);
        }
    }
}

/**
 * Generic Page Loader
 * @param {string} pageUrl - Path to the HTML file
 */
export async function loadPage(pageUrl) {
    const default_page = document.getElementById("default-page");

    // --- SCALABLE LOGIC HANDLER ---
    // Decouples specific UI logic from the fetching mechanism
    handleRouteLogic(pageUrl, default_page);
    
    try {
        // 1. Fetch the file
        const response = await fetch(pageUrl);
        
        // 2. Check if file exists
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 3. Get the text (HTML)
        const html = await response.text();

        // 4. Inject it into the default-page div
        default_page.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading page:", error);
        default_page.innerHTML = "<h1>Error loading content</h1>";
    }
}