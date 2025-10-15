# 📱 Liens et Commandes EAS Build

## 🌐 Liens de Surveillance des Builds EAS

### Dashboard Principal Expo
**Lien:** https://expo.dev/accounts/[votre-username]/projects

Pour accéder directement à votre projet :
1. Allez sur https://expo.dev
2. Connectez-vous avec votre compte
3. Sélectionnez votre projet "Finality" ou "XCrackz"

### Vérifier votre Username Expo
```powershell
cd c:\Users\mahdi\Documents\Finality-okok\mobile
eas whoami
```

### Lancer un Build EAS
```powershell
cd c:\Users\mahdi\Documents\Finality-okok\mobile
eas build --platform android --profile preview
```

Après le lancement, EAS affichera un lien direct vers le build, par exemple :
```
✔ Build link: https://expo.dev/accounts/[username]/projects/[project]/builds/[build-id]
```

---

## 📥 Télécharger l'APK Après le Build

### Option 1: Via le Dashboard Web
1. Allez sur https://expo.dev
2. Sélectionnez votre projet
3. Cliquez sur "Builds" dans le menu
4. Trouvez le build le plus récent
5. Cliquez sur "Download" pour télécharger l'APK

### Option 2: Via la CLI
```powershell
# Lister tous les builds
eas build:list

# Voir les détails d'un build spécifique
eas build:view [BUILD_ID]
```

### Option 3: Lien Direct (si vous avez le build ID)
```
https://expo.dev/artifacts/eas/[BUILD_ID].apk
```

**Exemple récent que vous avez utilisé:**
```
https://expo.dev/artifacts/eas/ahxELey2baESHBfDfV4oyC.apk
```

---

## 🚀 Commandes Utiles EAS

### Vérifier le Statut du Dernier Build
```powershell
cd c:\Users\mahdi\Documents\Finality-okok\mobile
eas build:list --limit 1
```

### Voir Tous les Builds
```powershell
eas build:list --platform android
```

### Annuler un Build en Cours
```powershell
eas build:cancel [BUILD_ID]
```

### Relancer le Dernier Build
```powershell
eas build:resign
```

---

## 📊 Structure des URLs EAS

### Dashboard Projet
```
https://expo.dev/accounts/[USERNAME]/projects/[PROJECT_NAME]
```

### Page Builds
```
https://expo.dev/accounts/[USERNAME]/projects/[PROJECT_NAME]/builds
```

### Build Spécifique
```
https://expo.dev/accounts/[USERNAME]/projects/[PROJECT_NAME]/builds/[BUILD_ID]
```

### Téléchargement Direct APK
```
https://expo.dev/artifacts/eas/[BUILD_ID].apk
```

---

## 🔧 Configuration dans app.json/eas.json

Vérifiez que votre `eas.json` est bien configuré :

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

---

## 💡 Astuce : Récupérer le Dernier Build Automatiquement

**PowerShell Script:**
```powershell
# Obtenir le dernier build ID et télécharger l'APK
cd c:\Users\mahdi\Documents\Finality-okok\mobile
$buildInfo = eas build:list --platform android --limit 1 --json | ConvertFrom-Json
$buildId = $buildInfo[0].id
$apkUrl = "https://expo.dev/artifacts/eas/$buildId.apk"
Write-Host "APK URL: $apkUrl"
Start-Process $apkUrl
```

---

## 📱 Surveillance en Temps Réel

Quand vous lancez un build EAS, vous verrez :

```
✔ Build link: https://expo.dev/accounts/[username]/projects/[project]/builds/[build-id]

You can monitor the build at https://expo.dev/accounts/[username]/projects/[project]/builds/[build-id]
```

**Ce lien vous permet de :**
- ✅ Voir la progression en temps réel
- ✅ Consulter les logs complets
- ✅ Télécharger l'APK une fois terminé
- ✅ Voir les erreurs éventuelles

---

## 🎯 Commande Recommandée

Pour lancer un build et obtenir directement le lien :

```powershell
cd c:\Users\mahdi\Documents\Finality-okok\mobile
eas build --platform android --profile preview --non-interactive
```

Le lien de surveillance sera affiché dans le terminal !

---

**Date:** 13 octobre 2025  
**Java Version:** 21.0.8 LTS (configuré pour EAS)
