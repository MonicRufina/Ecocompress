@echo off
title EcoCompress Platform
echo =========================================================================
echo Starting EcoCompress: Carbon-Aware Compression Platform
echo Serving at: http://localhost:8000
echo =========================================================================
venv\Scripts\python.exe -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
pause
