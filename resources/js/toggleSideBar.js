export async function toggleSideBar() {
    var sidenav = document.getElementById("mySidenav");
    var main = document.getElementById("main"); 

    // Check if the sidebar is currently fully open
    if (sidenav.style.width === "250px") {
        // --- CLOSE STATE ---
        sidenav.style.width = "60px";
        main.style.marginLeft = "60px"; 
        
        sidenav.classList.add("collapsed"); // This class signals CSS to hide text
        closeAllDropdowns(); // Automatically close any open dropdowns
    } else {
        // --- OPEN STATE ---
        sidenav.style.width = "250px";
        main.style.marginLeft = "250px";
        
        // Remove the class so text reappears
        sidenav.classList.remove("collapsed");
    }
}

// Helper to close dropdowns (optional but recommended)
function closeAllDropdowns() {
    var dropdowns = document.getElementsByClassName("dropdown-container");
    var buttons = document.getElementsByClassName("dropdown-button");
    for (var i = 0; i < dropdowns.length; i++) {
        dropdowns[i].style.display = "none";
        buttons[i].classList.remove("active");
    }
}