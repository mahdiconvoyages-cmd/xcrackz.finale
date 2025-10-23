# 📱 GUIDE COMPLET - BUILD APK & IPA

## 🎯 OBJECTIF

Créer les fichiers d'installation :
- **APK** : Android (fichier .apk)
- **IPA** : iOS (fichier .ipa)

---

## 📋 PRÉ-REQUIS

### 1. Compte Expo
✅ Créer un compte sur https://expo.dev
✅ Installer EAS CLI

### 2. Configuration Projet
✅ Projet Expo déjà configuré
✅ Toutes les dépendances installées

---

## 🚀 MÉTHODE 1 : BUILD AVEC EAS (RECOMMANDÉ)

### ÉTAPE 1 : Installer EAS CLI

```powershell
cd C:\Users\mahdi\Documents\Finality-okok\mobile
npm install -g eas-cli
```

### ÉTAPE 2 : Se connecter à Expo

```powershell
eas login
# Entrer email + mot de passe Expo
```

### ÉTAPE 3 : Configurer EAS

```powershell
eas build:configure
```

Cela va créer un fichier `eas.json` automatiquement.

### ÉTAPE 4 : Build Android (APK)

```powershell
# Build APK pour test
eas build --platform android --profile preview

# OU build AAB pour Google Play Store
eas build --platform android --profile production
```

**Durée** : 10-20 minutes  
**Résultat** : Lien de téléchargement APK dans le terminal

### ÉTAPE 5 : Build iOS (IPA)

```powershell
# Build IPA
eas build --platform ios --profile production
```

**⚠️ ATTENTION iOS** :
- Nécessite un compte Apple Developer (99$/an)
- Nécessite certificats de signature

---

## 🔧 CONFIGURATION DÉTAILLÉE

### Créer `eas.json` manuellement

Si pas créé automatiquement, créer le fichier `mobile/eas.json` :

```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Mettre à jour `app.json`

Vérifier la configuration dans `mobile/app.json` :

```json
{
  "expo": {
    "name": "Finality",
    "slug": "finality-convoyage",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "android": {
      "package": "com.finality.convoyage",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "POST_NOTIFICATIONS"
      ],
      "config": {
        "googleMaps": {
          "apiKey": "VOTRE_GOOGLE_MAPS_API_KEY"
        }
      }
    },
    "ios": {
      "bundleIdentifier": "com.finality.convoyage",
      "buildNumber": "1.0.0",
      "supportsTablet": true,
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Nous avons besoin de votre position pour tracker les missions",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Le tracking en arrière-plan permet de suivre la mission même si l'app est fermée",
        "UIBackgroundModes": ["location"]
      },
      "config": {
        "googleMapsApiKey": "VOTRE_GOOGLE_MAPS_API_KEY"
      }
    },
    "extra": {
      "eas": {
        "projectId": "VOTRE_PROJECT_ID"
      }
    }
  }
}
```

---

## 📦 MÉTHODE 2 : BUILD LOCAL (PLUS COMPLEXE)

### Pour Android (APK Local)

**Pré-requis** :
- ✅ Android Studio installé
- ✅ Java JDK installé
- ✅ Variables d'environnement configurées

```powershell
# 1. Générer le projet Android
cd mobile
npx expo prebuild --platform android

# 2. Build l'APK
cd android
.\gradlew assembleRelease

# 3. APK généré dans :
# android\app\build\outputs\apk\release\app-release.apk
```

### Pour iOS (IPA Local)

**Pré-requis** :
- ✅ macOS avec Xcode
- ✅ Compte Apple Developer
- ✅ Certificats de signature

```bash
# 1. Générer le projet iOS
cd mobile
npx expo prebuild --platform ios

# 2. Ouvrir dans Xcode
open ios/mobile.xcworkspace

# 3. Dans Xcode :
# - Product > Archive
# - Distribute App
# - Sélectionner méthode de distribution
```

---

## 🎨 PRÉPARER LES ASSETS

### 1. Icône de l'app (icon.png)

**Taille** : 1024x1024 pixels  
**Format** : PNG avec fond transparent ou couleur  
**Emplacement** : `mobile/assets/icon.png`

### 2. Splash Screen (splash.png)

**Taille** : 1242x2436 pixels  
**Format** : PNG  
**Emplacement** : `mobile/assets/splash.png`

### 3. Adaptive Icon Android (adaptive-icon.png)

**Taille** : 1024x1024 pixels  
**Format** : PNG  
**Emplacement** : `mobile/assets/adaptive-icon.png`

---

## 🔑 OBTENIR LES API KEYS

### Google Maps API Key

1. Aller sur https://console.cloud.google.com/
2. Créer un nouveau projet ou sélectionner existant
3. Activer "Maps SDK for Android"
4. Activer "Maps SDK for iOS"
5. Créer une clé API
6. Restreindre la clé aux applications Android/iOS

**Remplacer dans `app.json`** :
```json
"googleMaps": {
  "apiKey": "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

---

## 📝 COMMANDES COMPLÈTES ÉTAPE PAR ÉTAPE

### 🤖 BUILD ANDROID APK (SIMPLE)

```powershell
# 1. Aller dans le dossier mobile
cd C:\Users\mahdi\Documents\Finality-okok\mobile

# 2. Installer EAS CLI (si pas fait)
npm install -g eas-cli

# 3. Se connecter
eas login

# 4. Configurer EAS
eas build:configure

# 5. Build APK
eas build --platform android --profile preview

# 6. Attendre 10-20 minutes
# 7. Télécharger l'APK depuis le lien fourni
```

### 🍎 BUILD iOS IPA

```powershell
# 1. Même étapes 1-4 qu'Android

# 5. Build IPA
eas build --platform ios --profile production

# 6. Suivre les instructions pour certificats Apple
```

---

## 📥 TÉLÉCHARGER ET INSTALLER

### Android (APK)

**Après le build** :
1. ✅ Recevoir un lien : `https://expo.dev/accounts/.../builds/...`
2. ✅ Télécharger l'APK
3. ✅ Transférer sur téléphone Android
4. ✅ Autoriser "Sources inconnues" dans Paramètres
5. ✅ Installer l'APK

### iOS (IPA)

**Après le build** :
1. ✅ Télécharger l'IPA
2. ✅ Utiliser Xcode ou TestFlight pour installer
3. ✅ OU déployer sur App Store

---

## 🐛 RÉSOLUTION DE PROBLÈMES

### Erreur : "eas: command not found"

```powershell
npm install -g eas-cli
# Redémarrer PowerShell
```

### Erreur : "No project ID found"

```powershell
eas init
# Créer un nouveau projet sur Expo
```

### Erreur : "Google Maps API Key"

1. Obtenir clé sur Google Cloud Console
2. Ajouter dans `app.json` section android/ios
3. Rebuild

### Erreur : Build échoue

```powershell
# Voir les logs détaillés
eas build --platform android --profile preview --local

# Ou checker les logs en ligne
eas build:list
```

---

## 📊 TABLEAU RÉCAPITULATIF

| Méthode | Plateforme | Durée | Difficulté | Coût |
|---------|------------|-------|------------|------|
| **EAS Cloud** | Android | 10-20 min | ⭐ Facile | Gratuit |
| **EAS Cloud** | iOS | 15-30 min | ⭐⭐ Moyen | 99$/an Apple |
| **Local** | Android | 5-10 min | ⭐⭐⭐ Difficile | Gratuit |
| **Local** | iOS | 10-20 min | ⭐⭐⭐⭐ Très difficile | 99$/an Apple |

---

## 🎯 RECOMMANDATION

### Pour débuter : **EAS Cloud** (Méthode 1)

**Avantages** :
- ✅ Simple et rapide
- ✅ Pas besoin Android Studio / Xcode
- ✅ Builds dans le cloud
- ✅ Gestion des certificats automatique

**Commandes essentielles** :
```powershell
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

---

## 📱 DISTRIBUER L'APP

### Google Play Store (Android)

1. ✅ Build AAB : `eas build --platform android --profile production`
2. ✅ Créer compte Google Play Console (25$ one-time)
3. ✅ Uploader l'AAB
4. ✅ Remplir fiche store
5. ✅ Soumettre pour review

### Apple App Store (iOS)

1. ✅ Build IPA production
2. ✅ Compte Apple Developer (99$/an)
3. ✅ Uploader via Xcode ou Transporter
4. ✅ Remplir fiche App Store Connect
5. ✅ Soumettre pour review

### Distribution Interne (TestFlight / Firebase)

- **TestFlight** (iOS) : Gratuit, max 10,000 testeurs
- **Firebase App Distribution** : Gratuit, Android + iOS

---

## ✅ CHECKLIST AVANT BUILD

- [ ] Toutes les features testées en dev
- [ ] Variables d'environnement configurées
- [ ] Google Maps API Key obtenue et configurée
- [ ] Icônes et splash screen créés
- [ ] Permissions Android/iOS définies
- [ ] Version bumped dans app.json
- [ ] SQL migration exécutée sur Supabase
- [ ] Compte Expo créé
- [ ] EAS CLI installé

---

## 🚀 COMMANDES RAPIDES (COPY-PASTE)

### BUILD APK ANDROID

```powershell
cd C:\Users\mahdi\Documents\Finality-okok\mobile
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

### BUILD BOTH (ANDROID + iOS)

```powershell
eas build --platform all
```

### CHECK BUILD STATUS

```powershell
eas build:list
```

### TÉLÉCHARGER BUILD

```powershell
eas build:download --platform android --latest
```

---

## 📞 SUPPORT

**Documentation EAS** : https://docs.expo.dev/build/introduction/  
**Expo Discord** : https://discord.gg/expo  
**Stack Overflow** : Tag `expo-eas`

---

## 🎉 RÉSUMÉ

**POUR CRÉER L'APK ANDROID** :
```powershell
cd mobile
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

**Durée totale** : 10-20 minutes  
**Résultat** : Lien de téléchargement APK

**PRÊT À BUILD ! 🚀📱**
