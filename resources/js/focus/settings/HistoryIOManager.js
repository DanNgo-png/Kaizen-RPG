import { FocusAPI } from "../../api/FocusAPI.js";

export class HistoryIOManager {

    /**
     * Triggered when the user clicks "Import".
     * Opens file dialog, reads file, parses CSV, and sends to backend.
     */
    static async triggerImportFlow() {
        try {
            // 1. Open File Dialog
            const entry = await Neutralino.os.showOpenDialog('Import Focus History', {
                filters: [{ name: 'CSV Files', extensions: ['csv'] }]
            });

            if (!entry || entry.length === 0) return; // User cancelled

            const filePath = entry[0];
            
            // 2. Read File
            console.log(`📖 Reading file: ${filePath}`);
            const content = await Neutralino.filesystem.readFile(filePath);
            
            // 3. Parse
            const parsedData = this._parseCSV(content);
            
            if (parsedData.length > 0) {
                const confirmImport = await Neutralino.os.showMessageBox(
                    'Confirm Import',
                    `Found ${parsedData.length} sessions. Import them into your database?`,
                    'YES_NO',
                    'QUESTION'
                );

                if (confirmImport === 'YES') {
                    // 4. Send to Backend via API
                    await FocusAPI.importHistory(parsedData);
                }
            } else {
                await Neutralino.os.showMessageBox('Import Error', 'No valid session data found in file.', 'OK', 'ERROR');
            }
        } catch (err) {
            console.error("❌ Import Flow Error:", err);
            await Neutralino.os.showMessageBox('Error', 'Failed to read or parse the file.', 'OK', 'ERROR');
        }
    }

    /**
     * Triggered when backend sends CSV data.
     * Opens save dialog and writes file.
     * @param {string} csvContent 
     */
    static async handleExportFlow(csvContent) {
        try {
            // 1. Open Save Dialog
            const entry = await Neutralino.os.showSaveDialog('Export Focus History', {
                defaultPath: 'focus_history.csv',
                filters: [{ name: 'CSV Files', extensions: ['csv'] }]
            });

            if (!entry) return; // User cancelled

            // 2. Write File
            await Neutralino.filesystem.writeFile(entry, csvContent);
            
            // 3. Notify
            await Neutralino.os.showNotification('Export Successful', 'Your history has been saved.', 'INFO');

        } catch (err) {
            console.error("❌ Export Flow Error:", err);
            await Neutralino.os.showMessageBox('Error', 'Failed to write the file.', 'OK', 'ERROR');
        }
    }

    /**
     * Internal Helper: Parses CSV string into Array of Objects
     * Expects header: tag,focus_seconds,break_seconds,ratio,created_at
     */
    static _parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return []; // Header only or empty

        // Helper to handle potential quotes in CSV (basic implementation)
        // For complex CSVs with embedded commas, a regex solution is robust, 
        // but simple split works for our specific backend generation.
        
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = line.split(','); 
            
            // Basic Validation: Ensure we have enough columns based on our Schema
            if (cols.length < 5) continue; 

            const obj = {};
            // Map CSV columns to DB keys
            // Columns: tag, focus_seconds, break_seconds, ratio, created_at
            
            // Handle Tag (might be quoted if it contained a comma, though our backend simple export didn't force quotes yet)
            obj.tag = cols[0].replace(/"/g, ''); 
            obj.focus_seconds = parseInt(cols[1]) || 0;
            obj.break_seconds = parseInt(cols[2]) || 0;
            obj.ratio = parseFloat(cols[3]) || 1.0;
            obj.created_at = cols[4]; // Format: YYYY-MM-DD HH:MM:SS

            result.push(obj);
        }
        return result;
    }
}