# 📱 Guide des Notifications Push

## ⚠️ Important : Expo Go vs Development Build

Les **notifications push** ne fonctionnent plus dans **Expo Go** depuis le SDK 53.

### Option 1 : Expo Go (Actuel) ❌
- ❌ Notifications push **NON supportées**
- ✅ Bon pour le développement rapide
- ✅ Pas besoin de build

### Option 2 : Development Build (Recommandé pour tester les notifications) ✅
- ✅ Notifications push **supportées**
- ✅ Toutes les fonctionnalités natives
- ⚠️ Nécessite un build (5-10 min la première fois)

---

## 🚀 Comment créer un Development Build

### Prérequis
```bash
# Installer EAS CLI si ce n'est pas déjà fait
npm install -g eas-cli

# Se connecter à Expo
eas login
```

### Étape 1 : Configurer EAS Build
```bash
cd mobile
eas build:configure
```

### Étape 2 : Créer un Development Build Android
```bash
# Build local (plus rapide, nécessite Android Studio)
npx expo run:android

# OU Build sur les serveurs Expo (plus simple)
eas build --profile development --platform android
```

### Étape 3 : Installer l'APK sur votre téléphone
- Le build local installe automatiquement
- Pour le build Expo, téléchargez l'APK depuis le lien fourni

### Étape 4 : Lancer l'app
```bash
npx expo start --dev-client
```

---

## 📋 Vérifier que les notifications fonctionnent

1. **Ouvrir l'app** (development build, pas Expo Go)
2. **Se connecter** avec votre compte
3. **Vérifier les logs** :
   ```
   ✅ Push token obtenu: ExponentPushToken[...]
   ✅ Push token enregistré dans la base de données
   ✅ Notifications initialisées avec succès
   ```
4. **Tester** en créant une mission ou un message

---

## 🔧 Dépannage

### Erreur : "expo-notifications functionality is not fully supported in Expo Go"
**Solution** : C'est normal, utilisez un development build (voir ci-dessus).

### Token null ou non enregistré
**Solutions** :
- Vérifier que vous êtes sur un **appareil physique** (pas un émulateur)
- Accepter les permissions de notifications quand demandé
- Vérifier que vous utilisez un **development build**

### Build échoue
**Solutions** :
```bash
# Nettoyer et réessayer
cd mobile
rm -rf node_modules
npm install
eas build --profile development --platform android --clear-cache
```

---

## 📚 Documentation officielle

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

---

## 🎯 TL;DR (Résumé)

**Pour tester les notifications :**
```bash
# 1. Installer le dev build sur votre téléphone
npx expo run:android

# 2. Lancer l'app
npx expo start --dev-client
```

**Pour développer sans notifications :**
```bash
# Continuer avec Expo Go (notifications désactivées gracieusement)
npx expo start
```
