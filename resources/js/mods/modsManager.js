// resources/js/mods/modsManager.js

export function initModsManager() {
    console.log("🧩 Mods Manager Initialized");

    const modList = document.querySelector('.mod-list');
    
    if (modList) {
        // Handle Mod Selection
        modList.addEventListener('click', (e) => {
            // Find closest mod item
            const item = e.target.closest('.mod-item');
            
            // Ignore if clicking the switch directly (let change event handle logic if needed)
            if (e.target.closest('.switch')) return;

            if (item) {
                // Remove selected from others
                document.querySelectorAll('.mod-item').forEach(el => el.classList.remove('selected'));
                // Add to current
                item.classList.add('selected');
                
                // In a real app, this would trigger updating the Right Inspector Panel
                console.log(`Selected mod: ${item.dataset.id}`);
            }
        });

        // Handle Toggle Switches (Visual update)
        modList.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.closest('.switch')) {
                const item = e.target.closest('.mod-item');
                const isChecked = e.target.checked;
                
                if (isChecked) {
                    item.classList.remove('inactive');
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                    item.classList.add('inactive');
                }
            }
        });
    }

    // Import Button Mock
    const importBtn = document.getElementById('btn-import-mod');
    if(importBtn) {
        importBtn.addEventListener('click', () => {
            alert("This would open a file dialog to select a .zip or .json mod file.");
        });
    }
}