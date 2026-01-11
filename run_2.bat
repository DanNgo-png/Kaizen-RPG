@echo off

:: --- APP #1: Code-Cartographer ---
set "dan_laptop=C:\Users\danng\OneDrive\Desktop\Projects\Code-Cartographer"
set "dan_computer=C:\Users\minhn\Desktop\Projects\Code-Cartographer"

if exist "%dan_laptop%\main.py" (
    echo "Starting Code Cartographer from Laptop path..."
    start /d "%dan_laptop%" python main.py
) else if exist "%dan_computer%\main.py" (
    echo "Starting Code Cartographer from Desktop path..."
    start /d "%dan_computer%" python main.py
) else (
    echo "Warning: Could not find App #1"
)

:: --- APP #2: Kaizen-RPG ---
echo "Starting App #2..."
cd /d "%~dp0"
start "" neu run

echo Both applications are launching.
pause