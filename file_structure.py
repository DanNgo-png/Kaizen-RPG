import os
import sys
from pathlib import Path
import customtkinter as ctk
from tkinterdnd2 import TkinterDnD, DND_ALL

# Configuration for CustomTkinter
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

class DirectoryMapperApp(ctk.CTk, TkinterDnD.DnDWrapper):
    def __init__(self):
        super().__init__()
        
        # Initialize TkinterDnD functionality
        self.TkdndVersion = TkinterDnD._require(self)
        
        # Window Setup
        self.title("Folder Structure to Markdown")
        self.geometry("600x700")
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # 1. Drag and Drop Area
        self.drop_frame = ctk.CTkFrame(self, height=100, fg_color=("gray85", "gray25"))
        self.drop_frame.grid(row=0, column=0, padx=20, pady=20, sticky="ew")
        self.drop_frame.grid_propagate(False) # Stop frame from shrinking

        self.drop_label = ctk.CTkLabel(
            self.drop_frame, 
            text="DRAG & DROP FOLDER HERE",
            font=("Roboto Medium", 16)
        )
        self.drop_label.place(relx=0.5, rely=0.5, anchor="center")

        # Bind Drag and Drop events
        self.drop_frame.drop_target_register(DND_ALL)
        self.drop_frame.dnd_bind("<<Drop>>", self.on_drop)

        # 2. Preview Area (Textbox)
        self.textbox = ctk.CTkTextbox(self, font=("Consolas", 14))
        self.textbox.grid(row=1, column=0, padx=20, pady=(0, 20), sticky="nsew")
        self.textbox.insert("0.0", "Structure preview will appear here...")

        # 3. Action Buttons Frame
        self.btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.btn_frame.grid(row=2, column=0, padx=20, pady=(0, 20), sticky="ew")
        
        self.copy_btn = ctk.CTkButton(self.btn_frame, text="Copy to Clipboard", command=self.copy_to_clipboard)
        self.copy_btn.pack(side="left", expand=True, padx=5)

        self.save_btn = ctk.CTkButton(self.btn_frame, text="Save .md File", command=self.save_file, fg_color="green")
        self.save_btn.pack(side="left", expand=True, padx=5)

        # Internal storage for the generated text
        self.generated_structure = ""

    def on_drop(self, event):
        """Handle the file drop event."""
        raw_path = event.data
        
        # Windows Drag&Drop quirk: paths with spaces often come wrapped in curly braces {}
        # We need to clean this up.
        if raw_path.startswith('{') and raw_path.endswith('}'):
            raw_path = raw_path[1:-1]
            
        path_obj = Path(raw_path)

        if not path_obj.exists():
            self.update_preview("Error: Path does not exist.")
            return

        # Start generating the tree
        self.drop_label.configure(text=f"Analyzing: {path_obj.name}")
        
        try:
            # Generate the tree structure
            tree_str = self.generate_tree_string(path_obj)
            
            # Update UI
            self.generated_structure = f"```\n{tree_str}\n```"
            self.update_preview(self.generated_structure)
            self.drop_label.configure(text="Dropped: " + path_obj.name)
            
        except Exception as e:
            self.update_preview(f"Error processing folder: {str(e)}")

    def generate_tree_string(self, path_obj):
        """Generates the full string for the directory tree."""
        output = [f"{path_obj.name}/"]
        output.extend(self._walk_tree(path_obj))
        return "\n".join(output)

    def _walk_tree(self, directory, prefix=""):
        """Recursive function to walk directories."""
        lines = []
        
        # Get contents and sort them (directories first, then files)
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
        if not self.generated_structure:
            return

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

if __name__ == "__main__":
    app = DirectoryMapperApp()
    app.mainloop()