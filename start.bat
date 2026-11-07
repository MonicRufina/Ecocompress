@echo off
title EcoCompress Server
cd /d "%~dp0"
echo Starting EcoCompress Backend and Frontend on http://localhost:8000 ...
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
pause
