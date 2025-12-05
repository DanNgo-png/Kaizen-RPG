export async function toggleSideBar() {
    var sidenav = document.getElementById("mySidenav");
    var main = document.getElementById("main"); 

    // Check if the sidebar is currently fully open
    if (sidenav.style.width === "250px") {
        // --- CLOSE STATE ---
        sidenav.style.width = "75px";
        main.style.marginLeft = "75px"; 
        
        sidenav.classList.add("collapsed"); // This class signals CSS to hide text
        closeAllDropdowns(); // Automatically close any open dropdowns
    } else {
        // --- OPEN STATE ---
        sidenav.style.width = "250px";
        main.style.marginLeft = "250px";
        
        // Remove the class so text reappears
        sidenav.classList.remove("collapsed");
        closeAllDropdowns(); // Also close floating dropdowns if expanding
    }
}

// Helper to close dropdowns (Both Accordion and Floating)
function closeAllDropdowns() {
    // 1. Reset Accordion styles
    var dropdowns = document.getElementsByClassName("dropdown-container");
    var buttons = document.getElementsByClassName("dropdown-button");
    
    for (var i = 0; i < dropdowns.length; i++) {
        dropdowns[i].style.display = "none"; // Standard accordion hide
        
        // Floating cleanup
        dropdowns[i].classList.remove("floating-open", "animate-in");
        dropdowns[i].style.top = "";
        dropdowns[i].style.left = "";
        
        buttons[i].classList.remove("active");
    }
}