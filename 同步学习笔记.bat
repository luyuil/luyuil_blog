@echo off
cd /d "%~dp0"
echo Syncing Obsidian notes to blog and pushing to GitHub...
python tools\sync_notes.py --push
echo.
pause
