# 🎯 GUIDE DE DÉMARRAGE - FINALITY

**Projet séparé proprement**: Application Web + Application Mobile

---

## ⚡ DÉMARRAGE ULTRA-RAPIDE

### Option 1: Script automatique (Recommandé)
```powershell
.\start-apps.ps1
```
Choisissez web (1), mobile (2) ou les deux (3)

### Option 2: Manuellement

**Web**:
```powershell
npm run dev
```

**Mobile**:
```powershell
cd mobile
npm start
```

---

## 📂 STRUCTURE DU PROJET

```
finality-okok/
│
├── 🌐 WEB (Racine)
│   ├── src/pages/          → Pages web
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
└── 📱 MOBILE (mobile/)
    ├── src/screens/        → Écrans mobile
    ├── android/
    ├── App.tsx
    └── package.json
```

---

## 🚀 COMMANDES PRINCIPALES

### Web
```powershell
npm run dev        # Développement
npm run build      # Build production
npm run preview    # Preview
```

### Mobile
```powershell
cd mobile
npm start          # Expo Dev
npm run android    # Android
npm run ios        # iOS (Mac)
```

---

## 📦 INSTALLATION INITIALE

```powershell
# Web
npm install

# Mobile
cd mobile
npm install --legacy-peer-deps
```

---

## ✅ VÉRIFIER QUE TOUT FONCTIONNE

### Web doit:
- ✅ Démarrer avec `npm run dev`
- ✅ S'ouvrir sur http://localhost:5173
- ✅ 0 erreur TypeScript

### Mobile doit:
- ✅ Démarrer avec `npm start`
- ✅ Afficher un QR code
- ✅ Se connecter depuis Expo Go

---

## 📚 DOCUMENTATION COMPLÈTE

- `SEPARATION_VISUELLE.md` → Guide visuel
- `PROJECT_SEPARATION_COMPLETE.md` → Documentation complète
- `START_HERE_QUICK.md` → Guide rapide
- `RESUME_FINAL_SEPARATION.md` → Résumé final

---

## 🆘 AIDE

### Problème web
```powershell
rm -rf node_modules package-lock.json
npm install
```

### Problème mobile
```powershell
cd mobile
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

---

**Dernière mise à jour**: 14 octobre 2025  
**Statut**: ✅ Projet séparé et prêt
