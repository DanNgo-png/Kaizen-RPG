export async function loadPage(pageUrl) {
    const default_page = document.getElementById("default-page");

    // --- Special Case: Detach layout for Play Game screen ---
    // This allows the Game Menu to be centered in the viewport 
    // regardless of sidebar state.
    if (pageUrl.includes('play-game.html')) {
        default_page.classList.add('full-viewport-view');
    } else {
        default_page.classList.remove('full-viewport-view');
    }
    
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