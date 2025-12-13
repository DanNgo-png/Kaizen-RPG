@echo off
set "dan_laptop=C:\Users\danng\OneDrive\Desktop\Projects\Code-Cartographer"
set "dan_computer=C:\Users\minhn\Desktop\Projects\Code-Cartographer"

if exist "%dan_laptop%\main.py" (
    echo "Found Code Cartographer at %dan_laptop%"
    cd /d "%dan_laptop%"
    python main.py
) else if exist "%dan_computer%\main.py" (
    echo "Found Code Cartographer at %dan_computer%"
    cd /d "%dan_computer%"
    python main.py
) else (
    echo "Error: Could not find Code Cartographer's main.py in any of the specified paths."
    pause
)