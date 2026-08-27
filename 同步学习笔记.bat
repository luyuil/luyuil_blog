@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在把 Obsidian 学习笔记同步到博客并推送到 GitHub...
python tools\sync_notes.py --push
echo.
pause
