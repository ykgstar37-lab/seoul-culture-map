@echo off
chcp 65001 >nul
start "Backend" cmd /k "cd /d "C:\Users\ykgst\OneDrive\바탕 화면\Personal\seoul-culture-map\backend" && venv\Scripts\python.exe run_server.py"
ping 127.0.0.1 -n 4 >nul
start "Frontend" cmd /k "cd /d "C:\Users\ykgst\OneDrive\바탕 화면\Personal\seoul-culture-map\frontend" && npm run dev"
