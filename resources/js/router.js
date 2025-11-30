export async function loadPage(pageUrl) {
    const main = document.getElementById("main");
    
    try {
        // 1. Fetch the file
        const response = await fetch(pageUrl);
        
        // 2. Check if file exists
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 3. Get the text (HTML)
        const html = await response.text();

        // 4. Inject it into the main div
        main.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading page:", error);
        main.innerHTML = "<h1>Error loading content</h1>";
    }
}