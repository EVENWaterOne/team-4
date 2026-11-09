@echo off
setlocal
rem Downstairs - Clementi launcher. ASCII only on purpose: a UTF-8 batch file with
rem chcp 65001 can be misread by cmd.exe and close at once. Messages in Chinese come from Node.
title Downstairs - Clementi
set "GAME_DIR="
if exist "%~dp0team-4\clementi-demo\server.cjs" set "GAME_DIR=%~dp0team-4\clementi-demo"
if exist "%~dp0clementi-demo\server.cjs" set "GAME_DIR=%~dp0clementi-demo"
if exist "%~dp0dist\data.js" if exist "%~dp0server.cjs" set "GAME_DIR=%~dp0."
if not defined GAME_DIR goto nogame
set "LOG=%GAME_DIR%\launch-log.txt"
> "%LOG%" echo [%date% %time%] launcher %~f0
>>"%LOG%" echo game folder: %GAME_DIR%

rem Find node.exe even when it is not on PATH.
set "NODE_EXE="
for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%ProgramW6432%\nodejs\node.exe" set "NODE_EXE=%ProgramW6432%\nodejs\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined NODE_EXE if defined NVM_SYMLINK if exist "%NVM_SYMLINK%\node.exe" set "NODE_EXE=%NVM_SYMLINK%\node.exe"
if not defined NODE_EXE goto nonode
>>"%LOG%" echo node: %NODE_EXE%
if not exist "%GAME_DIR%\scripts\launch-game.cjs" goto noscript

pushd "%GAME_DIR%"
"%NODE_EXE%" "scripts\launch-game.cjs"
set "GAME_EXIT=%ERRORLEVEL%"
popd
>>"%LOG%" echo launcher exit code: %GAME_EXIT%
if not "%GAME_EXIT%"=="0" goto failed
exit /b 0

:failed
echo.
echo [Clementi] The game did not start. Read the lines above, or launch-log.txt in the game folder.
pause
exit /b %GAME_EXIT%

:nogame
echo [Clementi] Game files not found. Keep the team-4\clementi-demo folder next to this file.
pause
exit /b 1

:noscript
>>"%LOG%" echo missing scripts\launch-game.cjs
echo [Clementi] scripts\launch-game.cjs is missing. Please copy the whole clementi-demo folder again.
pause
exit /b 1

:nonode
>>"%LOG%" echo node.exe not found
echo.
echo [Clementi] Node.js was not found, so DeepSeek dialogue cannot run.
echo Install the LTS version from https://nodejs.org and double-click this file again.
echo.
echo Press any key to open the offline version (written dialogue only).
pause >nul
for %%F in ("%GAME_DIR%\*-AI*.html") do (
  start "" "%%~fF"
  exit /b 0
)
start "" "%GAME_DIR%\dist\index.html"
exit /b 0
