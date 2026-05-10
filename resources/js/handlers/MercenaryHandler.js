import { GameAPI } from "../api/GameAPI.js";
import { notifier } from "../_global-managers/NotificationManager.js";

export const MercenaryHandler = {
    onReceiveData: (event) => {
        const data = event.detail; 
        console.log("📦 Mercenaries loaded:", data);
    },

    onCreated: (event) => {
        const info = event.detail;
        console.log("✅ Created successfully:", info);
        GameAPI.getMercenaries();
    },

    onXpGained: async (event) => {
        const result = event.detail;
        console.log("✨ XP/Logs Received:", result);
        
        // If logs exist (e.g. Barebones Dungeon Crawler ran a session)
        if (result.logs && result.logs.length > 0) {
            
            const isGameActive = !!document.getElementById('world-canvas');
            const logText = result.logs.join('\n\n');

            if (isGameActive) {
                // If they are playing the game, show the immersive popup
                await Neutralino.os.showMessageBox(
                    'Dungeon Cleared!', 
                    `The dust settles. Here are the results of your delve:\n\n${logText}`, 
                    'OK', 
                    'INFO'
                );
            } else {
                // If they are on the Focus timer, show a subtle toast instead
                notifier.show(
                    "Dungeon Cleared!",
                    "Your party survived a delve. Check your game logs.",
                    "fa-solid fa-dungeon"
                );
            }
        }
    }
};