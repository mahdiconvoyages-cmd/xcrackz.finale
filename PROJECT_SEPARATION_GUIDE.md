# 🔧 SÉPARATION PROPRE DES PROJETS WEB & MOBILE

**Date**: 14 octobre 2025  
**Objectif**: Séparer complètement l'application web (Vite/React) et mobile (Expo/React Native)

---

## 📊 ÉTAT ACTUEL

### Structure détectée:
```
finality-okok/
├── 🌐 WEB (Racine)
│   ├── src/
│   │   ├── App.tsx ✅          → Application web (React Router)
│   │   ├── main.tsx ✅         → Point d'entrée web
│   │   ├── pages/ ✅           → 37 pages web
│   │   └── components/ ✅
│   ├── index.html ✅
│   ├── vite.config.ts ✅
│   └── package.json ✅         → Dépendances web
│
├── 📱 MOBILE (Dossier mobile/)
│   ├── App.tsx ✅              → Point d'entrée mobile
│   ├── src/
│   │   ├── screens/ ✅         → 32 écrans mobile
│   │   └── components/ ✅
│   ├── app.json ✅
│   ├── eas.json ✅
│   └── package.json ✅         → Dépendances mobile
│
└── ⚠️ FICHIERS DUPLIQUÉS À LA RACINE (à nettoyer)
    ├── App.tsx ❌              → Doublon mobile
    ├── android/ ❌             → Doit être dans mobile/
    ├── app.json ❌             → Doublon mobile
    ├── eas.json ❌             → Doublon mobile
    ├── expo.config.js ❌       → Doublon mobile
    └── index.js ❌             → Doublon mobile
```

---

## ✅ ACTIONS À EFFECTUER

### 1️⃣ Déplacer les fichiers mobiles vers `mobile/`

```powershell
# Déplacer android/ vers mobile/
Move-Item -Path ".\android" -Destination ".\mobile\android" -Force

# Déplacer les fichiers config Expo
Move-Item -Path ".\app.json" -Destination ".\mobile\app.json" -Force
Move-Item -Path ".\eas.json" -Destination ".\mobile\eas.json" -Force
Move-Item -Path ".\expo.config.js" -Destination ".\mobile\expo.config.js" -Force

# Déplacer index.js (point d'entrée Expo)
Move-Item -Path ".\index.js" -Destination ".\mobile\index.js" -Force
```

### 2️⃣ Supprimer le doublon App.tsx à la racine

```powershell
# Le vrai App.tsx web est dans src/App.tsx
# Supprimer le doublon mobile à la racine
Remove-Item -Path ".\App.tsx" -Force
```

### 3️⃣ Nettoyer les dossiers de build/cache

```powershell
# Nettoyer le cache Expo à la racine
Remove-Item -Path ".\.expo" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".\.expo-shared" -Recurse -Force -ErrorAction SilentlyContinue

# Nettoyer node_modules (sera réinstallé)
# (Déjà tenté - peut nécessiter fermeture VS Code)
```

### 4️⃣ Installer les dépendances séparément

```powershell
# Web (racine)
npm install

# Mobile
cd mobile
npm install --legacy-peer-deps
cd ..
```

### 5️⃣ Vérifier les tsconfig

**tsconfig.app.json** (web) - Déjà correct ✅
```json
{
  "include": ["src"]  // ✅ Pointe uniquement vers src/ (web)
}
```

---

## 🎯 STRUCTURE FINALE

```
finality-okok/
│
├── 🌐 WEB APPLICATION (Racine)
│   ├── src/
│   │   ├── App.tsx              # Application web React Router
│   │   ├── main.tsx             # Point d'entrée web
│   │   ├── pages/               # Pages web (37 fichiers)
│   │   ├── components/          # Composants web/partagés
│   │   ├── lib/                 # Utilitaires partagés
│   │   └── types/               # Types TypeScript
│   │
│   ├── public/                  # Assets web statiques
│   ├── index.html               # HTML racine
│   ├── vite.config.ts           # Config Vite
│   ├── tsconfig.json            # Config TypeScript globale
│   ├── tsconfig.app.json        # Config TypeScript web
│   ├── package.json             # Dépendances web
│   └── tailwind.config.js       # Config Tailwind
│
├── 📱 MOBILE APPLICATION (mobile/)
│   ├── src/
│   │   ├── screens/             # Écrans mobile (32 fichiers)
│   │   ├── components/          # Composants mobile
│   │   ├── contexts/            # Contextes React
│   │   ├── services/            # Services API
│   │   └── utils/               # Utilitaires
│   │
│   ├── android/                 # Build Android
│   ├── App.tsx                  # Point d'entrée mobile
│   ├── index.js                 # Enregistrement Expo
│   ├── app.json                 # Config Expo
│   ├── eas.json                 # Config EAS Build
│   ├── expo.config.js           # Config Expo dynamique
│   └── package.json             # Dépendances mobile
│
└── 📦 PARTAGÉ
    ├── supabase/                # Configuration Supabase
    ├── database/                # Scripts SQL
    └── .env                     # Variables d'environnement
```

---

## 🚀 COMMANDES DE LANCEMENT

### Web (depuis la racine)
```powershell
npm run dev          # Démarre Vite → http://localhost:5173
npm run build        # Build production
npm run preview      # Preview du build
```

### Mobile (depuis mobile/)
```powershell
cd mobile
npm start            # Démarre Expo
npm run android      # Lance sur Android
npm run ios          # Lance sur iOS (Mac uniquement)
```

---

## 📋 CHECKLIST DE VÉRIFICATION

- [ ] `android/` déplacé vers `mobile/android/`
- [ ] `app.json` déplacé vers `mobile/app.json`
- [ ] `eas.json` déplacé vers `mobile/eas.json`
- [ ] `expo.config.js` déplacé vers `mobile/expo.config.js`
- [ ] `index.js` déplacé vers `mobile/index.js`
- [ ] `App.tsx` (racine) supprimé
- [ ] `.expo/` supprimé de la racine
- [ ] `npm install` exécuté à la racine (web)
- [ ] `cd mobile && npm install --legacy-peer-deps` exécuté
- [ ] `npm run dev` fonctionne (web)
- [ ] `cd mobile && npm start` fonctionne (mobile)
- [ ] 0 erreur TypeScript dans l'éditeur

---

## ⚙️ SCRIPTS ACTUELS

### Web (package.json racine)
```json
{
  "scripts": {
    "dev": "vite",                    // ✅
    "build": "vite build",            // ✅
    "preview": "vite preview",        // ✅
    "typecheck": "tsc --noEmit"       // ✅
  }
}
```

### Mobile (mobile/package.json)
```json
{
  "scripts": {
    "start": "expo start",            // ✅
    "android": "expo run:android",    // ✅
    "ios": "expo run:ios",            // ✅
    "web": "expo start --web"         // ⚠️ Optionnel (utilise Expo web)
  }
}
```

---

## 🎨 AVANTAGES DE CETTE SÉPARATION

✅ **Clarté**: Chaque projet a son propre contexte  
✅ **Indépendance**: Builds séparés, dépendances séparées  
✅ **Performance**: Pas de confusion entre React DOM et React Native  
✅ **Maintenabilité**: Code organisé par plateforme  
✅ **Déploiement**: Web et mobile déployés indépendamment  
✅ **Collaboration**: Équipes peuvent travailler séparément  

---

## 🔥 PROCHAINES ÉTAPES

1. **Exécuter les commandes de déplacement** ci-dessus
2. **Installer les dépendances** pour chaque projet
3. **Tester les deux applications** séparément
4. **Commiter la nouvelle structure** dans Git

---

**Statut**: 🟡 En cours de séparation  
**Temps estimé**: 10-15 minutes  
**Priorité**: 🔥 HAUTE
