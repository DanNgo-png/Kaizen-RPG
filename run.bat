cd Kaizen-RPG
if not errorlevel 1 (
    neu run
) else (
    echo The 'cd Kaizen-RPG' command failed. Trying 'neu run' in the current directory.
    neu run
)