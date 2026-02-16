# APK Build & Deployment Guide

## Prerequisites

1. **Android SDK** installed via Android Studio
2. **Flutter** properly configured
3. **Java JDK** 8 or higher
4. **Keystore** for signing (we'll create one below)

## Step 1: Create a Keystore for Signing

Run this command in PowerShell to generate a keystore:

```powershell
keytool -genkey -v -keystore c:\Users\mahdi\Documents\Finality-okok\mobile_flutter\finality_app\finality-release-key.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias finality
```

**Important:** Save the keystore password and key password securely!

## Step 2: Configure Signing

### Create `android/key.properties`

Create the file `mobile_flutter/finality_app/android/key.properties` with:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=finality
storeFile=../finality-release-key.jks
```

**Security Note:** Add `key.properties` to `.gitignore` to keep credentials secret!

### Update `android/app/build.gradle`

The signing configuration should be:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Step 3: Update App Configuration

### Update `android/app/build.gradle` version info:

```gradle
defaultConfig {
    applicationId "com.finality.app"  // Simplified ID
    minSdk 21  // Minimum Android 5.0
    targetSdk 34  // Latest Android
    versionCode 1
    versionName "1.0.0"
    multiDexEnabled true
}
```

### Update `AndroidManifest.xml`

Ensure these permissions are present:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
```

## Step 4: Build APK

### Debug APK (for testing):
```powershell
cd c:\Users\mahdi\Documents\Finality-okok\mobile_flutter\finality_app
flutter build apk --debug
```

### Release APK (for distribution):
```powershell
cd c:\Users\mahdi\Documents\Finality-okok\mobile_flutter\finality_app
flutter build apk --release
```

### Split APKs by architecture (smaller files):
```powershell
flutter build apk --split-per-abi --release
```

This creates separate APKs for:
- `app-armeabi-v7a-release.apk` (32-bit ARM)
- `app-arm64-v8a-release.apk` (64-bit ARM)
- `app-x86_64-release.apk` (64-bit Intel)

## Step 5: Build App Bundle (Recommended for Play Store)

```powershell
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab`

## Step 6: Test the APK

### Install on connected device:
```powershell
flutter install
```

### Or manually install:
```powershell
adb install build/app/outputs/flutter-apk/app-release.apk
```

## Step 7: Optimize Build

### Enable Obfuscation (code protection):
```powershell
flutter build apk --release --obfuscate --split-debug-info=build/app/outputs/symbols
```

### Enable Tree Shaking (reduce size):
```powershell
flutter build apk --release --tree-shake-icons
```

## Step 8: Verify APK

### Check APK info:
```powershell
aapt dump badging build/app/outputs/flutter-apk/app-release.apk
```

### Analyze APK size:
```powershell
flutter build apk --release --analyze-size
```

## Build Output Locations

- **Debug APK:** `build/app/outputs/flutter-apk/app-debug.apk`
- **Release APK:** `build/app/outputs/flutter-apk/app-release.apk`
- **Split APKs:** `build/app/outputs/flutter-apk/app-{arch}-release.apk`
- **App Bundle:** `build/app/outputs/bundle/release/app-release.aab`

## Common Issues & Solutions

### Issue: "Keystore not found"
**Solution:** Ensure the path in `key.properties` points correctly to your `.jks` file

### Issue: "Signing config error"
**Solution:** Check that all passwords in `key.properties` are correct

### Issue: "Build fails with memory error"
**Solution:** Add to `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m
```

### Issue: "App crashes on startup"
**Solution:** Check ProGuard rules if using obfuscation. Add to `android/app/proguard-rules.pro`:
```
-keep class io.flutter.** { *; }
-keep class com.google.** { *; }
-keep class com.supabase.** { *; }
```

## Deployment Checklist

- [ ] Update version number in `build.gradle`
- [ ] Update version in `pubspec.yaml`
- [ ] Test on multiple devices (different Android versions)
- [ ] Verify all permissions work correctly
- [ ] Test deep linking functionality
- [ ] Verify Supabase connection
- [ ] Test offline functionality
- [ ] Check app icon and splash screen
- [ ] Review app size (should be < 50MB)
- [ ] Generate release notes
- [ ] Create backup of keystore file

## Distribution Options

### 1. Google Play Store
- Upload `.aab` file (recommended)
- Fill in store listing
- Set up pricing & distribution
- Submit for review

### 2. Direct Distribution
- Share `.apk` file directly
- Enable "Unknown sources" on device
- Install manually
- Note: Users may see security warnings

### 3. Internal Testing
- Use Firebase App Distribution
- Upload APK
- Invite testers via email
- Collect feedback

## Version Management

Update version for each release:

**In `pubspec.yaml`:**
```yaml
version: 1.0.0+1  # version+build
```

**In `android/app/build.gradle`:**
```gradle
versionCode 1       // Integer, must increment
versionName "1.0.0" // String, visible to users
```

## Performance Tips

1. **Enable R8/ProGuard** for code shrinking
2. **Use split APKs** to reduce download size
3. **Enable multidex** if you have many dependencies
4. **Compress images** and assets
5. **Lazy load** heavy components
6. **Test on low-end devices** (Android 5.0+)

## Security Best Practices

1. **Never commit keystore** to version control
2. **Use environment variables** for sensitive data
3. **Enable code obfuscation** for production
4. **Implement certificate pinning** for API calls
5. **Use ProGuard rules** to protect sensitive classes
6. **Validate all user inputs**
7. **Encrypt local storage** for sensitive data

## Next Steps

After successful build:
1. Test APK on physical device
2. Test all features thoroughly
3. Get feedback from beta testers
4. Fix any bugs found
5. Prepare store listing materials (screenshots, description)
6. Submit to Play Store or distribute directly

## Support & Troubleshooting

For issues during build:
1. Run `flutter doctor` to check configuration
2. Clean build: `flutter clean && flutter pub get`
3. Check logs: `flutter logs`
4. Rebuild: `flutter build apk --release --verbose`
