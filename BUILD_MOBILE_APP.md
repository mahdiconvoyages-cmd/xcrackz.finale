# 📱 Build & Distribution Application Mobile Finality

Guide complet pour builder l'app Flutter et la distribuer via votre site web (sans passer par les stores).

---

## 🎯 Vue d'ensemble

**Android** : ✅ APK installable directement depuis votre site  
**iOS** : ⚠️ Limitations techniques (voir solutions ci-dessous)

---

## 📦 PARTIE 1 : Build Android APK

### Prérequis

```powershell
# Vérifier Flutter installé
flutter --version

# Aller dans le dossier mobile
cd mobile
```

### 1️⃣ Configuration Android

Éditer `mobile/android/app/build.gradle` :

```gradle
android {
    defaultConfig {
        applicationId "com.finality.convoyage"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
    
    signingConfigs {
        release {
            // Configuration signature (voir étape suivante)
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

### 2️⃣ Générer Keystore (Signature App)

**IMPORTANT** : Nécessaire pour APK release

```powershell
# Créer keystore
keytool -genkey -v -keystore C:\Users\mahdi\finality-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias finality

# Répondre aux questions :
# Password: [votre-mot-de-passe-fort]
# Prénom/Nom: Finality
# Unité: Development
# Organisation: Finality
# Ville: Paris
# État: IDF
# Code pays: FR
```

### 3️⃣ Configurer la Signature

Créer `mobile/android/key.properties` :

```properties
storePassword=votre-mot-de-passe
keyPassword=votre-mot-de-passe
keyAlias=finality
storeFile=C:\\Users\\mahdi\\finality-release-key.jks
```

**⚠️ SÉCURITÉ** : Ajouter à `.gitignore` :
```
mobile/android/key.properties
*.jks
```

Modifier `mobile/android/app/build.gradle` :

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
}
```

### 4️⃣ Build APK Release

```powershell
# Dans le dossier mobile/
cd mobile

# Clean build précédent
flutter clean

# Get dependencies
flutter pub get

# Build APK (ARM64 + ARMv7 + x86)
flutter build apk --release

# OU Build APK optimisé par architecture (plus petit)
flutter build apk --split-per-abi --release
```

**Résultat** :
- APK universel : `mobile/build/app/outputs/flutter-apk/app-release.apk` (~50-80 MB)
- APKs optimisés : 
  - `app-armeabi-v7a-release.apk` (~25 MB) - Anciens téléphones
  - `app-arm64-v8a-release.apk` (~28 MB) - Téléphones récents
  - `app-x86_64-release.apk` (~30 MB) - Émulateurs

---

## 🍎 PARTIE 2 : Build iOS (Sans Mac)

### Option A : Service Cloud (RECOMMANDÉ)

**Codemagic** (Gratuit 500 min/mois) :

1. Aller sur https://codemagic.io
2. Connecter GitHub repository
3. Configuration automatique Flutter iOS
4. Build dans le cloud (pas besoin de Mac)
5. Télécharger IPA

**AppCenter** (Microsoft, Gratuit) :

1. Aller sur https://appcenter.ms
2. Créer nouveau projet iOS
3. Connecter repository
4. Configure build
5. Télécharger IPA

### Option B : Build Local (Si vous avez accès Mac)

```bash
# Sur Mac uniquement
cd mobile
flutter build ios --release

# Résultat dans mobile/build/ios/iphoneos/Runner.app
```

### ⚠️ Limitations iOS Sans Compte Développeur

**Problème** : iOS n'autorise pas installation APK-like sans signature Apple

**Solutions** :

1. **TestFlight** (Distribution Beta) :
   - ✅ Installation simple via lien
   - ❌ Nécessite compte développeur ($99/an)
   - ❌ Validation Apple (1-2 jours)

2. **Enterprise Distribution** :
   - ✅ Installation via site web
   - ❌ Compte entreprise ($299/an)
   - ❌ Réservé entreprises >100 employés

3. **Ad-Hoc Distribution** :
   - ✅ Installation directe
   - ❌ Max 100 devices (UDID requis)
   - ❌ Compte développeur requis

4. **PWA (Alternative)** :
   - ✅ Pas de compte développeur
   - ✅ Installation via Safari
   - ⚠️ Pas une "vraie" app native
   - ⚠️ Fonctionnalités limitées

**RECOMMANDATION** : 
- **Android** : APK sur votre site ✅
- **iOS** : Compte développeur Apple obligatoire ($99/an) pour distribution hors App Store

---

## 🌐 PARTIE 3 : Page de Téléchargement sur Votre Site

Je vais créer une page web pour télécharger l'APK Android.

### Structure Page Download

```
/download
  - Détection automatique OS (Android/iOS/Desktop)
  - Bouton téléchargement APK Android
  - Instructions installation
  - QR Code pour scan mobile
  - Changelog versions
```

---

## 📊 PARTIE 4 : Hébergement APK

### Option 1 : GitHub Releases (GRATUIT & RECOMMANDÉ)

```powershell
# Créer release GitHub avec APK
git tag v1.0.0
git push origin v1.0.0

# Dans GitHub :
# Repository → Releases → Create Release
# Upload : app-release.apk
# Lien direct : https://github.com/user/repo/releases/download/v1.0.0/app-release.apk
```

### Option 2 : Hébergement Vercel/Netlify

```powershell
# Créer dossier public/downloads
mkdir public/downloads

# Copier APK
copy mobile\build\app\outputs\flutter-apk\app-release.apk public\downloads\finality-v1.0.0.apk

# Commit
git add public/downloads
git commit -m "feat: Add Android APK v1.0.0"
git push

# Accessible : https://votre-site.com/downloads/finality-v1.0.0.apk
```

### Option 3 : Supabase Storage

```sql
-- Créer bucket public
INSERT INTO storage.buckets (id, name, public)
VALUES ('mobile-apps', 'mobile-apps', true);
```

Upload via Dashboard Supabase :
- Storage → mobile-apps → Upload `app-release.apk`
- URL : `https://[project].supabase.co/storage/v1/object/public/mobile-apps/finality-v1.0.0.apk`

---

## 🚀 PARTIE 5 : Instructions Installation Android

### Pour les Utilisateurs

**Étape 1** : Autoriser sources inconnues
1. Paramètres → Sécurité
2. Activer "Sources inconnues" ou "Installer applications inconnues"

**Étape 2** : Télécharger APK
1. Ouvrir navigateur mobile
2. Aller sur `https://votre-site.com/download`
3. Cliquer "Télécharger Android"

**Étape 3** : Installer
1. Ouvrir fichier téléchargé
2. Cliquer "Installer"
3. Ouvrir l'application

---

## 🔄 PARTIE 6 : Système de Mise à Jour

### Vérification Version In-App

Ajouter dans `mobile/lib/services/update_service.dart` :

```dart
class UpdateService {
  static const String currentVersion = '1.0.0';
  static const String updateCheckUrl = 'https://votre-site.com/api/version.json';
  
  Future<bool> checkForUpdate() async {
    final response = await http.get(Uri.parse(updateCheckUrl));
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final latestVersion = data['latest_version'];
      return _isNewerVersion(latestVersion, currentVersion);
    }
    return false;
  }
  
  bool _isNewerVersion(String latest, String current) {
    final latestParts = latest.split('.').map(int.parse).toList();
    final currentParts = current.split('.').map(int.parse).toList();
    
    for (int i = 0; i < 3; i++) {
      if (latestParts[i] > currentParts[i]) return true;
      if (latestParts[i] < currentParts[i]) return false;
    }
    return false;
  }
}
```

Créer `public/api/version.json` :

```json
{
  "latest_version": "1.0.0",
  "download_url_android": "https://votre-site.com/downloads/finality-v1.0.0.apk",
  "download_url_ios": "https://apps.apple.com/app/...",
  "changelog": [
    "Système d'inscription intelligent",
    "Suivi GPS en temps réel",
    "Génération factures automatique"
  ],
  "force_update": false,
  "min_supported_version": "1.0.0"
}
```

---

## 📱 PARTIE 7 : Alternative Progressive Web App (PWA)

Si iOS pose problème, créer PWA installable :

### Avantages PWA
- ✅ Pas de compte développeur
- ✅ Fonctionne iOS + Android
- ✅ Mise à jour instantanée
- ✅ Installation via navigateur
- ⚠️ Pas toutes les fonctionnalités natives

### Créer PWA depuis Web Existant

Ajouter `public/manifest.json` :

```json
{
  "name": "Finality",
  "short_name": "Finality",
  "description": "Plateforme de convoyage intelligent",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#667eea",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Ajouter dans `index.html` :

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#667eea">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="apple-touch-icon" href="/icon-192.png">
```

---

## ✅ Checklist Complète

### Android APK
- [ ] Keystore généré et sécurisé
- [ ] `key.properties` configuré (pas dans git)
- [ ] `build.gradle` configuré avec signature
- [ ] APK release buildé (`flutter build apk --release`)
- [ ] APK testé sur appareil physique
- [ ] APK uploadé (GitHub Releases / Vercel / Supabase)
- [ ] Page download créée sur site
- [ ] Instructions installation rédigées
- [ ] Système vérification mise à jour implémenté

### iOS (Si Compte Développeur)
- [ ] Compte Apple Developer créé ($99/an)
- [ ] Certificat iOS généré
- [ ] Provisioning profile configuré
- [ ] IPA buildé (Codemagic / AppCenter / Mac local)
- [ ] TestFlight configuré
- [ ] Testers ajoutés
- [ ] App validée par Apple

### iOS (Sans Compte Développeur)
- [ ] PWA configuré comme alternative
- [ ] Manifest.json créé
- [ ] Icons PWA générés
- [ ] Instructions "Add to Home Screen" iOS
- [ ] Test installation Safari iOS

---

## 🔥 Commandes Rapides

```powershell
# BUILD ANDROID APK
cd mobile
flutter clean
flutter pub get
flutter build apk --release --split-per-abi

# LOCALISATION APK
# ARM64 (téléphones récents) :
# mobile\build\app\outputs\flutter-apk\app-arm64-v8a-release.apk

# COPIER VERS SITE WEB
copy mobile\build\app\outputs\flutter-apk\app-arm64-v8a-release.apk public\downloads\finality-android-v1.0.0.apk

# COMMIT & PUSH
git add public/downloads
git commit -m "release: Android APK v1.0.0"
git push
```

---

## 📞 Support & Troubleshooting

### Erreur "Keystore not found"
```powershell
# Vérifier chemin dans key.properties
echo $keystoreProperties['storeFile']

# Régénérer si perdu
keytool -genkey -v -keystore finality-release-key.jks ...
```

### APK trop volumineux
```powershell
# Build par architecture (3 APKs séparés)
flutter build apk --split-per-abi --release

# Activer obfuscation
flutter build apk --release --obfuscate --split-debug-info=./debug-info
```

### Installation APK bloquée Android
- Vérifier "Sources inconnues" activé
- Vérifier signature APK valide
- Essayer réinstaller (désinstaller ancienne version)

---

## 🎯 Prochaines Étapes

Voulez-vous que je :

1. ✅ **Crée la page `/download` sur le site web** avec détection OS automatique ?
2. ✅ **Configure le build Android APK** (modifier build.gradle, générer keystore) ?
3. ✅ **Implémente le système de vérification de mise à jour** in-app ?
4. ✅ **Crée le PWA** comme alternative iOS ?

Dites-moi ce que vous voulez prioriser ! 🚀
