# Build APK Local v4.7.0

## Changements dans cette version:
- ✅ Système de deeplink mission (`finality://mission/open/{id}`)
- ✅ Hook `useDeeplinkMission` pour ouvrir missions via liens
- ✅ Suppression de la section "Code de partage" de l'UI
- ✅ Amélioration affichage détails mission (titre, description, date prévue)
- ✅ Intégration `shareMissionLink()` avec deeplink et web URL
- ✅ Version: 4.7.0 (versionCode: 3)

## Option 1: Build avec Expo Application Services (Recommandé)
```powershell
cd C:\Users\mahdi\Documents\Finality-okok\mobile
eas build --platform android --profile production-apk
```

**Note**: Nécessite des crédits EAS (100% utilisés ce mois-ci)

## Option 2: Build local avec Gradle (Gratuit)

### Prérequis:
- Android Studio installé
- Android SDK configuré
- Java JDK 17+

### Étapes:

1. **Prébuild natif**
```powershell
cd C:\Users\mahdi\Documents\Finality-okok\mobile
npx expo prebuild --clean
```

2. **Build APK de production**
```powershell
cd android
./gradlew assembleRelease
```

3. **Localiser l'APK**
L'APK sera dans:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Option 3: Expo Turtle CLI (Local, automatisé)

```powershell
# Installer Turtle CLI
npm install -g turtle-cli

# Build APK
cd C:\Users\mahdi\Documents\Finality-okok\mobile
turtle build:android --type apk --release-channel production
```

## Signature de l'APK (si nécessaire)

Si l'APK n'est pas signé automatiquement:

```powershell
# Générer une clé de signature (première fois uniquement)
keytool -genkeypair -v -storetype PKCS12 -keystore finality-release.keystore -alias finality-key -keyalg RSA -keysize 2048 -validity 10000

# Signer l'APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore finality-release.keystore app-release-unsigned.apk finality-key

# Aligner l'APK
zipalign -v 4 app-release-unsigned.apk finality-v4.7.0-release.apk
```

## Test de l'APK

Installer l'APK sur un appareil Android:
```powershell
adb install android/app/build/outputs/apk/release/app-release.apk
```

## Fonctionnalités à tester dans v4.7.0:

1. ✅ Cliquer sur un lien `https://xcrackz.com/mission/{id}` → ouvre l'app
2. ✅ Cliquer sur deeplink `finality://mission/open/{id}` → navigue vers mission
3. ✅ Bouton partage dans MissionViewScreenNew → génère lien mission
4. ✅ Section "Code de partage" n'apparaît plus
5. ✅ Titre, description, date prévue affichés dans détails mission
6. ✅ Véhicule (marque/modèle) correctement affiché

## Download APK v4.7.0

Une fois buildé, l'APK sera disponible pour download et distribution.

**Taille estimée**: ~50-60 MB
**Min Android version**: 8.0 (API 26)
**Target Android version**: 14 (API 34)
