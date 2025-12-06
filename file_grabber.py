import os
import shutil
import re
import customtkinter as ctk
from tkinterdnd2 import TkinterDnD, DND_ALL

# --- Custom Class combining CTk and DND ---
class Tk(ctk.CTk, TkinterDnD.DnDWrapper):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.TkdndVersion = TkinterDnD._require(self)

class App(Tk):
    def __init__(self):
        super().__init__()

        # --- Application Settings (Defaults) ---
        self.output_folder_name = "temp_result"
        self.target_extensions = {'.html', '.css', '.js', '.json'}
        # Default ignored items (common junk folders)
        self.ignore_list = {'neutralino.js','neutralino.d.ts','node_modules', '.git', '__pycache__', '.vscode', '.DS_Store'}
        
        self.settings_window = None 

        # --- Window Setup ---
        self.title("Web File Extractor")
        self.geometry("600x550") # Increased height for new setting
        
        # Grid Configuration
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=0) # Header/Settings
        self.grid_rowconfigure(1, weight=1) # Drop Zone
        self.grid_rowconfigure(2, weight=0) # Status

        # --- 1. Settings Button (Top Right) ---
        self.top_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.top_frame.grid(row=0, column=0, sticky="ew", padx=10, pady=5)
        
        self.settings_btn = ctk.CTkButton(
            self.top_frame, 
            text="⚙ Settings", 
            width=80, 
            command=self.open_settings_window
        )
        self.settings_btn.pack(side="right")

        # --- 2. Drop Zone (Main Frame) ---
        self.drop_frame = ctk.CTkFrame(self, corner_radius=10)
        self.drop_frame.grid(row=1, column=0, padx=20, pady=10, sticky="nsew")
        
        self.label = ctk.CTkLabel(
            self.drop_frame, 
            text="DRAG & DROP\nFolders or Files Here", 
            font=("Arial", 24)
        )
        self.label.place(relx=0.5, rely=0.5, anchor="center")

        # --- 3. Status Bar ---
        self.status_label = ctk.CTkLabel(
            self, 
            text=f"Ready. Target: {', '.join(self.target_extensions)}", 
            text_color="gray"
        )
        self.status_label.grid(row=2, column=0, pady=(0, 10))

        # --- Enable Drag and Drop ---
        self.drop_frame.drop_target_register(DND_ALL)
        self.drop_frame.dnd_bind('<<Drop>>', self.drop_files)

    # --- Settings Logic ---
    def open_settings_window(self):
        if self.settings_window is None or not self.settings_window.winfo_exists():
            self.settings_window = SettingsWindow(self)
        else:
            self.settings_window.focus()
            self.settings_window.lift()

    def update_settings(self, new_folder, new_extensions, new_ignore_list):
        """Callback to update settings from the popup window"""
        self.output_folder_name = new_folder
        self.target_extensions = new_extensions
        self.ignore_list = new_ignore_list
        
        # Update main UI to reflect changes
        ext_str = ', '.join(self.target_extensions)
        self.status_label.configure(text=f"Settings Saved. Target: {ext_str}")
        print(f"Updated: Folder='{new_folder}', Exts={new_extensions}, Ignore={new_ignore_list}")

    # --- File Processing Logic ---
    def parse_drop_files(self, event_data):
        pattern = r'\{.*?\}|\S+'
        files = re.findall(pattern, event_data)
        return [f.strip('{}') for f in files]

    def get_unique_filename(self, target_folder, filename):
        base, ext = os.path.splitext(filename)
        counter = 1
        new_filename = filename
        while os.path.exists(os.path.join(target_folder, new_filename)):
            new_filename = f"{base}_{counter}{ext}"
            counter += 1
        return new_filename

    def process_path(self, path, target_folder):
        copied_count = 0
        
        if os.path.isdir(path):
            for root, dirs, files in os.walk(path):
                # --- IGNORE LOGIC: Folders ---
                # Modify 'dirs' in-place to prevent os.walk from entering ignored folders
                dirs[:] = [d for d in dirs if d not in self.ignore_list]

                for file in files:
                    # --- IGNORE LOGIC: Files ---
                    if file in self.ignore_list:
                        continue
                        
                    if os.path.splitext(file)[1].lower() in self.target_extensions:
                        copied_count += self.copy_file(os.path.join(root, file), target_folder)
        
        elif os.path.isfile(path):
            filename = os.path.basename(path)
            if filename not in self.ignore_list:
                if os.path.splitext(path)[1].lower() in self.target_extensions:
                    copied_count += self.copy_file(path, target_folder)
                
        return copied_count

    def copy_file(self, source_path, target_folder):
        try:
            filename = os.path.basename(source_path)
            dest_filename = self.get_unique_filename(target_folder, filename)
            dest_path = os.path.join(target_folder, dest_filename)
            shutil.copy2(source_path, dest_path)
            return 1
        except Exception as e:
            print(f"Error: {e}")
            return 0

    def drop_files(self, event):
        if not os.path.exists(self.output_folder_name):
            try:
                os.makedirs(self.output_folder_name)
            except OSError:
                self.status_label.configure(text="Error: Invalid Folder Name", text_color="red")
                return

        paths = self.parse_drop_files(event.data)
        total_copied = 0

        self.status_label.configure(text="Processing...", text_color="orange")
        self.update()

        for path in paths:
            total_copied += self.process_path(path, self.output_folder_name)

        self.status_label.configure(
            text=f"Done! Copied {total_copied} files to '/{self.output_folder_name}'", 
            text_color="green"
        )
        self.label.configure(text=f"DRAG & DROP\nLast Run: {total_copied} files copied")

# --- Separate Window Class for Settings ---
class SettingsWindow(ctk.CTkToplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.parent = parent
        self.title("Settings")
        self.geometry("400x450")
        
        # --- Make Window Topmost ---
        self.attributes('-topmost', True)
        self.lift()
        self.focus_force()
        
        # 1. Folder Name Input
        self.lbl_folder = ctk.CTkLabel(self, text="Output Folder Name:")
        self.lbl_folder.pack(pady=(15, 0))
        
        self.entry_folder = ctk.CTkEntry(self, width=300)
        self.entry_folder.insert(0, parent.output_folder_name)
        self.entry_folder.pack(pady=(5, 10))

        # 2. Extensions Input
        self.lbl_ext = ctk.CTkLabel(self, text="Extensions (comma separated):")
        self.lbl_ext.pack(pady=(10, 0))
        
        current_ext_str = ", ".join(parent.target_extensions)
        self.entry_ext = ctk.CTkEntry(self, width=300)
        self.entry_ext.insert(0, current_ext_str)
        self.entry_ext.pack(pady=(5, 0))
        
        self.lbl_hint1 = ctk.CTkLabel(self, text="Example: .html, .css, .js", text_color="gray", font=("Arial", 10))
        self.lbl_hint1.pack(pady=(0, 10))

        # 3. Ignore List Input (New)
        self.lbl_ignore = ctk.CTkLabel(self, text="Ignored Names (Folders or Files):")
        self.lbl_ignore.pack(pady=(10, 0))

        current_ignore_str = ", ".join(parent.ignore_list)
        self.entry_ignore = ctk.CTkEntry(self, width=300)
        self.entry_ignore.insert(0, current_ignore_str)
        self.entry_ignore.pack(pady=(5, 0))

        self.lbl_hint2 = ctk.CTkLabel(self, text="Example: node_modules, .git, temp.html", text_color="gray", font=("Arial", 10))
        self.lbl_hint2.pack(pady=(0, 20))

        # Save Button
        self.btn_save = ctk.CTkButton(self, text="Save & Close", command=self.save_settings, fg_color="green")
        self.btn_save.pack(pady=10)

    def save_settings(self):
        # 1. Get Folder
        folder_name = self.entry_folder.get().strip()
        if not folder_name:
            folder_name = "result" 

        # 2. Get Extensions
        ext_string = self.entry_ext.get()
        ext_list = [e.strip() for e in ext_string.split(',') if e.strip()]
        clean_exts = set()
        for ext in ext_list:
            if not ext.startswith('.'):
                ext = '.' + ext
            clean_exts.add(ext.lower())

        # 3. Get Ignored Items
        ignore_string = self.entry_ignore.get()
        ignore_list = {i.strip() for i in ignore_string.split(',') if i.strip()}

        # Pass data back to main app
        self.parent.update_settings(folder_name, clean_exts, ignore_list)
        self.destroy()

if __name__ == "__main__":
    ctk.set_appearance_mode("Dark")
    app = App()
    app.mainloop()