$ErrorActionPreference = "Continue"
Set-Location mobile/android
Remove-Item -Path .cxx -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path app/build -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path build -Recurse -Force -ErrorAction SilentlyContinue
./gradlew clean
./gradlew assembleRelease --stacktrace --info | Out-File -FilePath ../../build_log.txt -Encoding UTF8
