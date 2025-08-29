@echo off
REM Move to repo root relative to this script's directory
cd /d "%~dp0.."

REM Build using the Dockerfile located at Src/Dockerfile (case-insensitive on Windows)
docker build -t tagnotes -f ./Src/Dockerfile .

if errorlevel 1 (
	echo Build failed.
	exit /b 1
) else (
	echo Build succeeded.
)
