document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('long-break-toggle');
    const options = document.getElementById('long-break-options');

    // Function to update visibility
    const updateVisibility = () => {
        if (toggle.checked) {
            options.style.display = 'block';
        } else {
            options.style.display = 'none';
        }
    };

    // Initialize state on load
    // (We manually set toggle to true to match the screenshot request)
    toggle.checked = true; 
    updateVisibility();

    // Listen for changes
    toggle.addEventListener('change', updateVisibility);
});