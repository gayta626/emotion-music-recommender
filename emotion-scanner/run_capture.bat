@echo off
chcp 65001 > nul
cd /d "%~dp0"
"..\..\.venv\Scripts\python.exe" 1_capture_data.py %*
pause
