export async function toggleSideBar() {
    var sidenav = document.getElementById("mySidenav");
    var default_page = document.getElementById("default-page"); 

    // Check if the sidebar is currently fully open
    if (sidenav.style.width === "250px") {
        // --- CLOSE STATE ---
        default_page.style.marginLeft = "75px"; 
        sidenav.style.width = "75px";
        
        sidenav.classList.add("collapsed"); // This class signals CSS to hide text
        closeAllDropdowns(); // Automatically close any open dropdowns
    } else {
        // --- OPEN STATE ---
        sidenav.style.width = "250px";
        default_page.style.marginLeft = "250px";
        
        // Remove the class so text reappears
        sidenav.classList.remove("collapsed");
        closeAllDropdowns(); // Also close floating dropdowns if expanding
    }
}

// Helper to close dropdowns (Both Accordion and Floating)
function closeAllDropdowns() {
    const dropdowns = document.querySelectorAll(".dropdown-container");
    const buttons = document.querySelectorAll(".dropdown-button");
    
    dropdowns.forEach(d => {
        d.style.display = "none";
        d.classList.remove("floating-open", "animate-in");
        d.style.top = "";
        d.style.left = "";
    });
    
    buttons.forEach(b => b.classList.remove("active"));
}