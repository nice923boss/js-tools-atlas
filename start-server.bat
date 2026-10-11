@echo off
cd /d "%~dp0"
title JS Tools Atlas 本機伺服器

set PORT=8765
set URL=http://localhost:%PORT%/

where python 1>nul 2>nul
if errorlevel 1 (
  echo 找不到 python，請先安裝 Python 3 並勾選加入 PATH。
  pause
  exit /b 1
)

netstat -ano | findstr /r /c:"127.0.0.1:%PORT% .*LISTENING" /c:"0.0.0.0:%PORT% .*LISTENING" 1>nul 2>nul
if not errorlevel 1 (
  echo 連接埠 %PORT% 已有伺服器在執行，直接開啟瀏覽器。
  start "" "%URL%"
  exit /b 0
)

echo 網站位址：%URL%
echo 關閉這個視窗即可停止伺服器。
echo.
start "" /min cmd /c "ping -n 3 127.0.0.1 1>nul & start "" %URL%"
python -m http.server %PORT% --bind 127.0.0.1
echo.
echo 伺服器已停止。
pause
