$ErrorActionPreference = "Continue"
Write-Host "Stopping Gradle..."
Set-Location mobile/android
./gradlew --stop
Start-Sleep -Seconds 5

Write-Host "Renaming transforms folder..."
Rename-Item -Path "C:\Users\mahdi\.gradle\caches\8.14.3\transforms" -NewName "transforms_backup_$(Get-Date -Format 'yyyyMMddHHmmss')" -ErrorAction SilentlyContinue

Write-Host "Starting Build..."
./gradlew clean
./gradlew assembleRelease --no-build-cache
