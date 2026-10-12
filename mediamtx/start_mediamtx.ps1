# TRINETRA - MediaMTX Video Gateway PowerShell Launcher
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  TRINETRA MISSION CONTROL - MEDIAMTX RTSP-to-WEB GATEWAY" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  WebRTC Player:  http://localhost:8889/trinetra_cam/" -ForegroundColor Green
Write-Host "  HLS Stream:     http://localhost:8888/trinetra_cam/" -ForegroundColor Green
Write-Host "  RTSP Uplink:    rtsp://localhost:8554/trinetra_cam" -ForegroundColor Green
Write-Host "  API Endpoint:   http://localhost:9997/v3/paths/list" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

if (Test-Path ".\mediamtx.exe") {
    & ".\mediamtx.exe" ".\mediamtx.yml"
} else {
    Write-Error "mediamtx.exe not found in $ScriptDir!"
}
