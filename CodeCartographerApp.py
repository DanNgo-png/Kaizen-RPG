import os
import shutil
import re
import sys
from pathlib import Path
import customtkinter as ctk
from tkinterdnd2 import TkinterDnD, DND_ALL

# --- Configuration ---
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

# ==============================================================================
# TOOL 1: WEB FILE EXTRACTOR (Refactored)
# ==============================================================================

class GrabberSettingsWindow(ctk.CTkToplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.parent = parent
        self.title("Grabber Settings")
        self.geometry("400x450")
        
        self.attributes('-topmost', True)
        self.lift()
        self.focus_force()
        
        # 1. Folder Name
        self.lbl_folder = ctk.CTkLabel(self, text="Output Folder Name:")
        self.lbl_folder.pack(pady=(15, 0))
        self.entry_folder = ctk.CTkEntry(self, width=300)
        self.entry_folder.insert(0, parent.output_folder_name)
        self.entry_folder.pack(pady=(5, 10))

        # 2. Extensions
        self.lbl_ext = ctk.CTkLabel(self, text="Extensions (comma separated):")
        self.lbl_ext.pack(pady=(10, 0))
        current_ext_str = ", ".join(parent.target_extensions)
        self.entry_ext = ctk.CTkEntry(self, width=300)
        self.entry_ext.insert(0, current_ext_str)
        self.entry_ext.pack(pady=(5, 0))
        self.lbl_hint1 = ctk.CTkLabel(self, text="Example: .html, .css, .js", text_color="gray", font=("Arial", 10))
        self.lbl_hint1.pack(pady=(0, 10))

        # 3. Ignore List
        self.lbl_ignore = ctk.CTkLabel(self, text="Ignored Names (Folders or Files):")
        self.lbl_ignore.pack(pady=(10, 0))
        current_ignore_str = ", ".join(parent.ignore_list)
        self.entry_ignore = ctk.CTkEntry(self, width=300)
        self.entry_ignore.insert(0, current_ignore_str)
        self.entry_ignore.pack(pady=(5, 0))
        self.lbl_hint2 = ctk.CTkLabel(self, text="Example: node_modules, .git", text_color="gray", font=("Arial", 10))
        self.lbl_hint2.pack(pady=(0, 20))

        # Save Button
        self.btn_save = ctk.CTkButton(self, text="Save & Close", command=self.save_settings, fg_color="green")
        self.btn_save.pack(pady=10)

    def save_settings(self):
        folder_name = self.entry_folder.get().strip() or "result"
        
        ext_string = self.entry_ext.get()
        ext_list = [e.strip() for e in ext_string.split(',') if e.strip()]
        clean_exts = {('.' + e if not e.startswith('.') else e).lower() for e in ext_list}

        ignore_string = self.entry_ignore.get()
        ignore_list = {i.strip() for i in ignore_string.split(',') if i.strip()}

        self.parent.update_settings(folder_name, clean_exts, ignore_list)
        self.destroy()

class FileGrabberTool(ctk.CTkToplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.title("Web File Extractor")
        self.geometry("600x550")
        
        self.attributes('-topmost', True)
        self.lift()
        self.focus_force()

        # Settings
        self.output_folder_name = "temp_result"
        self.target_extensions = {'.html', '.css', '.js'}
        self.ignore_list = {'neutralino.js','neutralino.d.ts','node_modules', '.git', '__pycache__', '.vscode', '.DS_Store'}
        self.settings_window = None 

        # Grid Config
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # UI Elements
        self.top_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.top_frame.grid(row=0, column=0, sticky="ew", padx=10, pady=5)
        
        self.settings_btn = ctk.CTkButton(self.top_frame, text="⚙ Settings", width=80, command=self.open_settings_window)
        self.settings_btn.pack(side="right")

        self.drop_frame = ctk.CTkFrame(self, corner_radius=10)
        self.drop_frame.grid(row=1, column=0, padx=20, pady=10, sticky="nsew")
        
        self.label = ctk.CTkLabel(self.drop_frame, text="DRAG & DROP\nFolders or Files Here", font=("Arial", 24))
        self.label.place(relx=0.5, rely=0.5, anchor="center")

        self.status_label = ctk.CTkLabel(self, text=f"Ready. Target: {', '.join(self.target_extensions)}", text_color="gray")
        self.status_label.grid(row=2, column=0, pady=(0, 10))

        # Enable Drag and Drop
        self.drop_frame.drop_target_register(DND_ALL)
        self.drop_frame.dnd_bind('<<Drop>>', self.drop_files)

    def open_settings_window(self):
        if self.settings_window is None or not self.settings_window.winfo_exists():
            self.settings_window = GrabberSettingsWindow(self)
        else:
            self.settings_window.focus()
            self.settings_window.lift()

    def update_settings(self, new_folder, new_extensions, new_ignore_list):
        self.output_folder_name = new_folder
        self.target_extensions = new_extensions
        self.ignore_list = new_ignore_list
        ext_str = ', '.join(self.target_extensions)
        self.status_label.configure(text=f"Settings Saved. Target: {ext_str}")

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
                dirs[:] = [d for d in dirs if d not in self.ignore_list]
                for file in files:
                    if file in self.ignore_list: continue
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

        self.status_label.configure(text=f"Done! Copied {total_copied} files.", text_color="green")
        self.label.configure(text=f"DRAG & DROP\nLast Run: {total_copied} files copied")

# ==============================================================================
# TOOL 2: FOLDER STRUCTURE MAPPER (Refactored)
# ==============================================================================

class StructureMapperTool(ctk.CTkToplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.title("Folder Structure to Markdown")
        self.geometry("600x700")

        self.attributes('-topmost', True)
        self.lift()
        self.focus_force()
        
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # 1. Drag and Drop Area
        self.drop_frame = ctk.CTkFrame(self, height=100, fg_color=("gray85", "gray25"))
        self.drop_frame.grid(row=0, column=0, padx=20, pady=20, sticky="ew")
        self.drop_frame.grid_propagate(False)

        self.drop_label = ctk.CTkLabel(self.drop_frame, text="DRAG & DROP FOLDER HERE", font=("Roboto Medium", 16))
        self.drop_label.place(relx=0.5, rely=0.5, anchor="center")

        self.drop_frame.drop_target_register(DND_ALL)
        self.drop_frame.dnd_bind("<<Drop>>", self.on_drop)

        # 2. Preview Area
        self.textbox = ctk.CTkTextbox(self, font=("Consolas", 14))
        self.textbox.grid(row=1, column=0, padx=20, pady=(0, 20), sticky="nsew")
        self.textbox.insert("0.0", "Structure preview will appear here...")

        # 3. Action Buttons
        self.btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.btn_frame.grid(row=2, column=0, padx=20, pady=(0, 20), sticky="ew")
        
        self.copy_btn = ctk.CTkButton(self.btn_frame, text="Copy to Clipboard", command=self.copy_to_clipboard)
        self.copy_btn.pack(side="left", expand=True, padx=5)

        self.save_btn = ctk.CTkButton(self.btn_frame, text="Save .md File", command=self.save_file, fg_color="green")
        self.save_btn.pack(side="left", expand=True, padx=5)

        self.generated_structure = ""

    def on_drop(self, event):
        raw_path = event.data
        if raw_path.startswith('{') and raw_path.endswith('}'):
            raw_path = raw_path[1:-1]
        
        path_obj = Path(raw_path)

        if not path_obj.exists():
            self.update_preview("Error: Path does not exist.")
            return

        self.drop_label.configure(text=f"Analyzing: {path_obj.name}")
        try:
            tree_str = self.generate_tree_string(path_obj)
            self.generated_structure = f"```\n{tree_str}\n```"
            self.update_preview(self.generated_structure)
            self.drop_label.configure(text="Dropped: " + path_obj.name)
        except Exception as e:
            self.update_preview(f"Error processing folder: {str(e)}")

    def generate_tree_string(self, path_obj):
        output = [f"{path_obj.name}/"]
        output.extend(self._walk_tree(path_obj))
        return "\n".join(output)

    def _walk_tree(self, directory, prefix=""):
        lines = []
        try:
            contents = list(directory.iterdir())
            contents.sort(key=lambda x: (not x.is_dir(), x.name.lower()))
        except PermissionError:
            return [f"{prefix}└── <Permission Denied>"]

        pointers = [('├── ', '│   ')] * (len(contents) - 1) + [('└── ', '    ')]

        for pointer, path in zip(pointers, contents):
            connector, extension = pointer
            if path.is_dir():
                lines.append(f"{prefix}{connector}{path.name}/")
                lines.extend(self._walk_tree(path, prefix + extension))
            else:
                lines.append(f"{prefix}{connector}{path.name}")
        return lines

    def update_preview(self, text):
        self.textbox.delete("0.0", "end")
        self.textbox.insert("0.0", text)

    def copy_to_clipboard(self):
        self.clipboard_clear()
        self.clipboard_append(self.generated_structure)
        self.drop_label.configure(text="Copied to Clipboard!")

    def save_file(self):
        if not self.generated_structure: return
        file_path = ctk.filedialog.asksaveasfilename(
            defaultextension=".md",
            filetypes=[("Markdown files", "*.md"), ("Text files", "*.txt")]
        )
        if file_path:
            try:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(self.generated_structure)
                self.drop_label.configure(text="File Saved Successfully!")
            except Exception as e:
                self.drop_label.configure(text=f"Error saving: {e}")

# ==============================================================================
# MAIN LAUNCHER APP
# ==============================================================================

class CodeCartographerApp(ctk.CTk, TkinterDnD.DnDWrapper):
    def __init__(self):
        super().__init__()
        
        # Initialize DnD Wrapper on the MAIN Root only
        self.TkdndVersion = TkinterDnD._require(self)

        self.title("Code Cartographer")
        self.geometry("500x300")
        self.resizable(False, False)

        # Title Label
        self.lbl_title = ctk.CTkLabel(self, text="Code Cartographer", font=("Arial", 28, "bold"))
        self.lbl_title.pack(pady=(30, 10))
        
        self.lbl_subtitle = ctk.CTkLabel(self, text="Select a tool to begin", text_color="gray")
        self.lbl_subtitle.pack(pady=(0, 20))

        # Button Container
        self.btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.btn_frame.pack(fill="both", expand=True, padx=40, pady=20)

        # Button 1: Extractor
        self.btn_grabber = ctk.CTkButton(
            self.btn_frame, 
            text="📁 Web File Grabber\n(Extract .js, .css, .html)", 
            command=self.open_grabber,
            height=60,
            font=("Arial", 14)
        )
        self.btn_grabber.pack(fill="x", pady=10)

        # Button 2: Structure Mapper
        self.btn_structure = ctk.CTkButton(
            self.btn_frame, 
            text="🌳 Structure Mapper\n(Generate Tree to Markdown)", 
            command=self.open_structure,
            height=60,
            font=("Arial", 14),
            fg_color="#D35B58", # Reddish accent
            hover_color="#A84340"
        )
        self.btn_structure.pack(fill="x", pady=10)
        
        # Track active windows so we don't open duplicates (optional)
        self.grabber_window = None
        self.structure_window = None

    def open_grabber(self):
        if self.grabber_window is None or not self.grabber_window.winfo_exists():
            self.grabber_window = FileGrabberTool(self)
        else:
            self.grabber_window.focus()
            self.grabber_window.lift()

    def open_structure(self):
        if self.structure_window is None or not self.structure_window.winfo_exists():
            self.structure_window = StructureMapperTool(self)
        else:
            self.structure_window.focus()
            self.structure_window.lift()

if __name__ == "__main__":
    app = CodeCartographerApp()
    app.mainloop()