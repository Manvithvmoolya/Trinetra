@echo off
title TRINETRA - MediaMTX Video Gateway
echo ==========================================================
echo   TRINETRA MISSION CONTROL - MEDIAMTX RTSP-to-WEB GATEWAY
echo ==========================================================
echo   WebRTC Player:  http://localhost:8889/trinetra_cam/
echo   HLS Player:     http://localhost:8888/trinetra_cam/
echo   RTSP Stream:    rtsp://localhost:8554/trinetra_cam
echo   API Status:     http://localhost:9997/v3/paths/list
echo ==========================================================
cd /d "%~dp0"
if exist mediamtx.exe (
    mediamtx.exe mediamtx.yml
) else (
    echo Error: mediamtx.exe not found in this directory!
    pause
)
