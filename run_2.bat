@echo off

:: --- APP #1: Code-Cartographer ---
set "dan_laptop=C:\Users\danng\OneDrive\Desktop\Projects\Code-Cartographer"
set "dan_computer=C:\Users\minhn\Desktop\Projects\Code-Cartographer"

if exist "%dan_laptop%\main.py" (
    start "" /d "%dan_laptop%" pythonw main.py
) else if exist "%dan_computer%\main.py" (
    start "" /d "%dan_computer%" pythonw main.py
)

:: --- APP #2: Kaizen-RPG ---
cd /d "%~dp0"
start /b "" neu run

exit