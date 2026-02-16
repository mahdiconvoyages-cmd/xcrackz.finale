# 📱 Finality Mobile

Application mobile React Native avec Expo pour la gestion de transport.

## 🚀 Démarrage rapide

```bash
# Installation des dépendances
npm install

# Lancer en développement
npm start

# Lancer sur Android
npm run android

# Lancer sur iOS
npm run ios
```

## 📦 Principales dépendances

- **Expo** ~54.0.10 - Framework React Native
- **React Navigation** 7.x - Navigation
- **Supabase** 2.58.0 - Backend & Base de données
- **Expo Location** - GPS & Géolocalisation
- **Expo Camera** - Scan de documents
- **Expo Notifications** - Push notifications

## 🔐 Configuration

Les variables d'environnement sont dans `.env` à la racine du dossier mobile:

```env
EXPO_PUBLIC_SUPABASE_URL=https://...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_MAPBOX_TOKEN=...
EXPO_PUBLIC_ONESIGNAL_APP_ID=...
EXPO_PUBLIC_GOOGLE_CLIENT_ID=...
```

## 🏗️ Build

### Android

```bash
# Build APK de développement
npx eas build --platform android --profile development

# Build APK de production
npx eas build --platform android --profile production
```

### iOS

```bash
# Build de développement
npx eas build --platform ios --profile development

# Build de production
npx eas build --platform ios --profile production
```

## 📂 Structure

```
mobile/
├── src/
│   └── screens/      # Écrans de l'application
├── android/          # Code natif Android
├── App.tsx           # Point d'entrée
├── app.json          # Configuration Expo
├── eas.json          # Configuration EAS Build
└── package.json      # Dépendances
```

## 📖 Documentation

Pour plus d'informations, consultez:
- [Documentation Expo](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Supabase Docs](https://supabase.com/docs)

## 🔗 Projet Web

Le projet web est dans le dossier parent. Voir `../README.md`.
