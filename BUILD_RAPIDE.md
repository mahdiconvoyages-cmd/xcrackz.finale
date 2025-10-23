# 🚀 BUILD APK & IPA - GUIDE RAPIDE

## ⚡ MÉTHODE SIMPLE (RECOMMANDÉ)

### 🤖 Pour Android (APK)

**Double-cliquez sur** : `build-apk.ps1`

OU via PowerShell :

```powershell
.\build-apk.ps1
```

**Le script va** :
1. ✅ Vérifier EAS CLI (l'installer si besoin)
2. ✅ Vérifier connexion Expo
3. ✅ Configurer le projet
4. ✅ Lancer le build APK

**Durée** : 10-20 minutes

---

### 🍎 Pour iOS (IPA)

**Double-cliquez sur** : `build-ios.ps1`

OU via PowerShell :

```powershell
.\build-ios.ps1
```

**Pré-requis** :
- Compte Apple Developer (99$/an)

**Durée** : 15-30 minutes

---

## 📱 MÉTHODE MANUELLE

### Android APK

```powershell
cd C:\Users\mahdi\Documents\Finality-okok\mobile
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

### iOS IPA

```powershell
cd C:\Users\mahdi\Documents\Finality-okok\mobile
npm install -g eas-cli
eas login
eas build --platform ios --profile production
```

---

## 📥 APRÈS LE BUILD

### Android
1. Recevoir lien de téléchargement dans le terminal
2. Télécharger l'APK
3. Transférer sur téléphone Android
4. Installer (autoriser "Sources inconnues")

### iOS
1. Recevoir lien de téléchargement
2. Distribuer via TestFlight
3. OU soumettre à App Store

---

## 🔑 PREMIÈRE FOIS

**Créer un compte Expo** :
1. Aller sur https://expo.dev
2. S'inscrire gratuitement
3. Retourner au script

**Obtenir Google Maps API Key** :
1. https://console.cloud.google.com/
2. Créer projet
3. Activer "Maps SDK for Android" et "Maps SDK for iOS"
4. Créer clé API
5. Ajouter dans `mobile/app.json`

---

## ❓ PROBLÈMES

### "eas: command not found"
```powershell
npm install -g eas-cli
```

### "Not logged in"
```powershell
eas login
```

### Build échoue
```powershell
eas build:list  # Voir logs
```

---

## 📚 DOCUMENTATION COMPLÈTE

Voir : **GUIDE_BUILD_APK_IPA.md**

---

## ✅ CHECKLIST PRE-BUILD

- [ ] SQL migration exécutée (CREATE_MISSION_LOCATIONS_TABLE.sql)
- [ ] Google Maps API Key configurée
- [ ] Compte Expo créé
- [ ] Icônes et splash screen prêts
- [ ] App testée en dev

---

## 🎯 QUICK START

**Windows** :
```powershell
.\build-apk.ps1
```

**Attendez 10-20 minutes → APK prêt ! 🎉**
