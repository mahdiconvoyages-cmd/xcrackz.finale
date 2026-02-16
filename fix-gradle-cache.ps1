$ErrorActionPreference = "Continue"
Set-Location mobile/android
./gradlew --stop
Start-Sleep -Seconds 5
Write-Host "Cleaning Gradle Cache..."
Remove-Item -Path "C:\Users\mahdi\.gradle\caches\8.14.3" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\Users\mahdi\.gradle\caches\transforms-3" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\Users\mahdi\.gradle\caches\jars-9" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\Users\mahdi\.gradle\caches\modules-2" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Cache cleaned. Starting build..."

./gradlew clean
./gradlew assembleRelease
