# Finality App Build Script
# PowerShell script to automate the APK building process

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("debug", "release", "bundle")]
    [string]$BuildType = "debug",
    
    [Parameter(Mandatory=$false)]
    [switch]$Clean,
    
    [Parameter(Mandatory=$false)]
    [switch]$SplitAbi,
    
    [Parameter(Mandatory=$false)]
    [switch]$Obfuscate,
    
    [Parameter(Mandatory=$false)]
    [switch]$Install
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Finality App Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set working directory
$AppDir = "c:\Users\mahdi\Documents\Finality-okok\mobile_flutter\finality_app"
Set-Location $AppDir

# Clean if requested
if ($Clean) {
    Write-Host "[1/5] Cleaning previous builds..." -ForegroundColor Yellow
    flutter clean
    flutter pub get
    Write-Host "✓ Clean complete" -ForegroundColor Green
} else {
    Write-Host "[1/5] Skipping clean (use -Clean to clean)" -ForegroundColor Gray
}

# Verify dependencies
Write-Host "[2/5] Verifying dependencies..." -ForegroundColor Yellow
flutter pub get
Write-Host "✓ Dependencies verified" -ForegroundColor Green

# Check keystore for release builds
if ($BuildType -eq "release" -or $BuildType -eq "bundle") {
    Write-Host "[3/5] Checking keystore..." -ForegroundColor Yellow
    
    $KeyPropertiesPath = Join-Path $AppDir "android\key.properties"
    $KeystorePath = Join-Path $AppDir "finality-release-key.jks"
    
    if (-not (Test-Path $KeyPropertiesPath)) {
        Write-Host "✗ key.properties not found!" -ForegroundColor Red
        Write-Host "  Create it from key.properties.template" -ForegroundColor Red
        Write-Host "  See APK_BUILD_GUIDE.md for instructions" -ForegroundColor Red
        exit 1
    }
    
    if (-not (Test-Path $KeystorePath)) {
        Write-Host "✗ Keystore file not found at: $KeystorePath" -ForegroundColor Red
        Write-Host "  Generate it with:" -ForegroundColor Red
        Write-Host "  keytool -genkey -v -keystore $KeystorePath -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias finality" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✓ Keystore configuration found" -ForegroundColor Green
} else {
    Write-Host "[3/5] Skipping keystore check (debug build)" -ForegroundColor Gray
}

# Build the app
Write-Host "[4/5] Building $BuildType..." -ForegroundColor Yellow

$BuildArgs = @()

switch ($BuildType) {
    "debug" {
        $BuildArgs += "apk", "--debug"
    }
    "release" {
        $BuildArgs += "apk", "--release"
        
        if ($SplitAbi) {
            $BuildArgs += "--split-per-abi"
        }
        
        if ($Obfuscate) {
            $BuildArgs += "--obfuscate", "--split-debug-info=build/app/outputs/symbols"
        }
        
        # Tree shake icons to reduce size
        $BuildArgs += "--tree-shake-icons"
    }
    "bundle" {
        $BuildArgs += "appbundle", "--release"
        
        if ($Obfuscate) {
            $BuildArgs += "--obfuscate", "--split-debug-info=build/app/outputs/symbols"
        }
    }
}

Write-Host "Running: flutter build $($BuildArgs -join ' ')" -ForegroundColor Cyan
& flutter build @BuildArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Build complete!" -ForegroundColor Green

# Display output locations
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build Output" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

switch ($BuildType) {
    "debug" {
        $ApkPath = Join-Path $AppDir "build\app\outputs\flutter-apk\app-debug.apk"
        Write-Host "Debug APK: $ApkPath" -ForegroundColor Green
        
        if (Test-Path $ApkPath) {
            $ApkSize = (Get-Item $ApkPath).Length / 1MB
            Write-Host "Size: $([math]::Round($ApkSize, 2)) MB" -ForegroundColor Yellow
        }
    }
    "release" {
        if ($SplitAbi) {
            Write-Host "Split APKs:" -ForegroundColor Green
            $Architectures = @("armeabi-v7a", "arm64-v8a", "x86_64")
            foreach ($Arch in $Architectures) {
                $ApkPath = Join-Path $AppDir "build\app\outputs\flutter-apk\app-$Arch-release.apk"
                if (Test-Path $ApkPath) {
                    $ApkSize = (Get-Item $ApkPath).Length / 1MB
                    Write-Host "  $Arch : $([math]::Round($ApkSize, 2)) MB" -ForegroundColor Yellow
                }
            }
        } else {
            $ApkPath = Join-Path $AppDir "build\app\outputs\flutter-apk\app-release.apk"
            Write-Host "Release APK: $ApkPath" -ForegroundColor Green
            
            if (Test-Path $ApkPath) {
                $ApkSize = (Get-Item $ApkPath).Length / 1MB
                Write-Host "Size: $([math]::Round($ApkSize, 2)) MB" -ForegroundColor Yellow
            }
        }
    }
    "bundle" {
        $BundlePath = Join-Path $AppDir "build\app\outputs\bundle\release\app-release.aab"
        Write-Host "App Bundle: $BundlePath" -ForegroundColor Green
        
        if (Test-Path $BundlePath) {
            $BundleSize = (Get-Item $BundlePath).Length / 1MB
            Write-Host "Size: $([math]::Round($BundleSize, 2)) MB" -ForegroundColor Yellow
        }
    }
}

# Install if requested
if ($Install) {
    Write-Host ""
    Write-Host "[5/5] Installing on device..." -ForegroundColor Yellow
    
    # Check if device is connected
    $Devices = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "device$" }
    
    if ($Devices.Count -eq 0) {
        Write-Host "✗ No devices connected!" -ForegroundColor Red
        Write-Host "  Connect a device via USB or start an emulator" -ForegroundColor Red
        exit 1
    }
    
    flutter install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Installation complete!" -ForegroundColor Green
    } else {
        Write-Host "✗ Installation failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "[5/5] Skipping installation (use -Install to install)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Show next steps
Write-Host "Next Steps:" -ForegroundColor Yellow
if ($BuildType -eq "release") {
    Write-Host "  1. Test the APK on multiple devices" -ForegroundColor White
    Write-Host "  2. Verify all features work correctly" -ForegroundColor White
    Write-Host "  3. Share with testers or upload to Play Store" -ForegroundColor White
} elseif ($BuildType -eq "bundle") {
    Write-Host "  1. Upload to Google Play Console" -ForegroundColor White
    Write-Host "  2. Complete store listing" -ForegroundColor White
    Write-Host "  3. Submit for review" -ForegroundColor White
} else {
    Write-Host "  1. Install with: .\build-apk.ps1 -Install" -ForegroundColor White
    Write-Host "  2. Test on device/emulator" -ForegroundColor White
    Write-Host "  3. For release build: .\build-apk.ps1 -BuildType release" -ForegroundColor White
}

Write-Host ""
Write-Host "For more information, see APK_BUILD_GUIDE.md" -ForegroundColor Cyan
