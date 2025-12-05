export async function handleDropdowns() {
    const dropdownButtons = document.getElementsByClassName("dropdown-button");
    const sidenav = document.getElementById("mySidenav");

    // Helper: Close all floating dropdowns
    function closeAllFloating() {
        const containers = document.querySelectorAll(".dropdown-container.floating-open");
        containers.forEach(container => {
            // Remove animation class first for fade out
            container.classList.remove("animate-in");
            
            // Wait for transition to finish before hiding
            setTimeout(() => {
                container.classList.remove("floating-open");
                container.style.top = ""; // Clean up styles
                container.style.left = "";
            }, 200); // Match CSS transition time
        });

        // Remove active state from buttons
        Array.from(dropdownButtons).forEach(btn => btn.classList.remove("active"));
        
        // Remove document listener
        document.removeEventListener("click", handleOutsideClick);
    }

    // Helper: Handle clicks outside the floating menu
    function handleOutsideClick(event) {
        // If click is not inside a dropdown container and not on a dropdown button
        if (!event.target.closest(".dropdown-container") && !event.target.closest(".dropdown-button")) {
            closeAllFloating();
        }
    }

    for (let i = 0; i < dropdownButtons.length; i++) {
        // Remove old listeners to prevent duplicates if function is called multiple times
        // (Note: In a pure module setup, this runs once, but this is good practice)
        const btn = dropdownButtons[i];
        
        // We use a wrapper function to handle the event logic
        btn.onclick = function (e) {
            e.stopPropagation(); // Prevent immediate triggering of document click
            
            const isCollapsed = sidenav.classList.contains("collapsed");
            const dropdownContent = this.nextElementSibling;

            // --- SCENARIO 1: SIDEBAR COLLAPSED (Floating Menus) ---
            if (isCollapsed) {
                // If this specific menu is already open, close it
                if (dropdownContent.classList.contains("floating-open")) {
                    closeAllFloating();
                    return;
                }

                // 1. Close any other open menus
                closeAllFloating();

                // 2. Add Active State to button
                this.classList.add("active");

                // 3. Calculate Position
                const rect = this.getBoundingClientRect();
                
                // 4. Set Styles for Floating
                dropdownContent.style.top = `${rect.top}px`;
                dropdownContent.style.left = `75px`; // Fixed width of collapsed sidebar
                
                // 5. Show and Animate
                dropdownContent.classList.add("floating-open");
                
                // Slight delay to allow display:flex to apply before opacity transition
                requestAnimationFrame(() => {
                    dropdownContent.classList.add("animate-in");
                });

                // 6. Listen for outside clicks
                document.addEventListener("click", handleOutsideClick);
            } 
            
            // --- SCENARIO 2: SIDEBAR EXPANDED (Accordion) ---
            else {
                // Remove floating classes if they exist (cleanup)
                dropdownContent.classList.remove("floating-open", "animate-in");
                dropdownContent.style.top = "";
                dropdownContent.style.left = "";

                this.classList.toggle("active");
                if (dropdownContent.style.display === "block") {
                    dropdownContent.style.display = "none";
                } else {
                    dropdownContent.style.display = "block";
                }
            }
        };
    }
}