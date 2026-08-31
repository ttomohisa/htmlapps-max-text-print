@echo off
setlocal
cd /d "%~dp0"
if not exist "%~dp0dist\index.html" (
  call "%~dp0build-standalone.bat"
  if errorlevel 1 exit /b 1
)
start "" "%~dp0dist\index.html"
