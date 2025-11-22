$ErrorActionPreference = "Continue"
Write-Host "Stopping Gradle..."
Set-Location mobile/android
./gradlew --stop
Start-Sleep -Seconds 5

Write-Host "Deleting specific corrupted cache entry..."
Remove-Item -Path "C:\Users\mahdi\.gradle\caches\8.14.3\transforms\1c52e982d68f513861459af3accf0bf4" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Starting Build with NO CACHE..."
./gradlew clean
./gradlew assembleRelease --no-build-cache --rerun-tasks
