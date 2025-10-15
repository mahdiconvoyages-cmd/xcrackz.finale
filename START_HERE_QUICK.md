# 🚀 DÉMARRAGE RAPIDE - FINALITY

**Projet séparé proprement**: Web + Mobile

---

## ⚡ DÉMARRAGE EXPRESS

### 🌐 Lancer l'application WEB

```powershell
# Depuis la RACINE
npm run dev
```
→ Ouvre http://localhost:5173

### 📱 Lancer l'application MOBILE

```powershell
# Depuis mobile/
cd mobile
npm start
```
→ Scanner le QR code avec Expo Go

---

## 📦 INSTALLATION INITIALE

### Web
```powershell
npm install
```

### Mobile
```powershell
cd mobile
npm install --legacy-peer-deps
```

---

## 🏗️ STRUCTURE DU PROJET

```
finality-okok/
├── 🌐 WEB (racine)       → Vite + React + TypeScript
│   ├── src/pages/         → Pages web
│   ├── vite.config.ts
│   └── package.json
│
└── 📱 MOBILE (mobile/)    → Expo + React Native
    ├── src/screens/       → Écrans mobile
    ├── App.tsx
    ├── android/
    └── package.json
```

---

## ✅ VÉRIFICATIONS

### Web fonctionne si:
- `npm run dev` démarre Vite
- http://localhost:5173 s'ouvre
- Aucune erreur TypeScript

### Mobile fonctionne si:
- `npm start` démarre Expo
- QR code affiché
- App se connecte depuis Expo Go

---

## 🔧 COMMANDES UTILES

### Web
```powershell
npm run dev        # Développement
npm run build      # Build production
npm run preview    # Preview build
npm run typecheck  # Vérifier TS
```

### Mobile
```powershell
cd mobile
npm start          # Expo Dev Server
npm run android    # Lancer sur Android
npm run ios        # Lancer sur iOS (Mac)
```

---

## ❓ PROBLÈMES COURANTS

### Web: "vite: command not found"
```powershell
rm -rf node_modules package-lock.json
npm install
```

### Mobile: Erreurs de dépendances
```powershell
cd mobile
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Les deux: Cache problématique
```powershell
# Fermer VS Code
# Supprimer node_modules
# Réinstaller les dépendances
```

---

## 📚 DOCUMENTATION

- `PROJECT_SEPARATION_COMPLETE.md` - Séparation complète
- `PROJECT_ARCHITECTURE_ANALYSIS.md` - Analyse détaillée
- README.md - Documentation générale

---

**Dernière mise à jour**: 14 octobre 2025
