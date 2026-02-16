$ErrorActionPreference = "Continue"
Write-Host "Stopping Gradle..."
Set-Location mobile/android
./gradlew --stop
Start-Sleep -Seconds 5

Write-Host "Deleting Gradle Caches (this may take a while)..."
Remove-Item -Path "C:\Users\mahdi\.gradle\caches" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\Users\mahdi\.gradle\daemon" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Deleting Project Build Artifacts..."
Remove-Item -Path ".gradle" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app/build" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "build" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".cxx" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Starting Clean Build..."
./gradlew clean
./gradlew assembleRelease
