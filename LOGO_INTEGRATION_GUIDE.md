# 🎨 Guide - Génération des Icônes xCrackz

## 📋 Instructions

### **1. Générer les icônes PNG**

#### **Option A : Via le navigateur (Recommandé)**

1. Ouvrez le fichier HTML :
   ```
   public/icon-generator.html
   ```

2. Double-cliquez dessus → S'ouvre dans votre navigateur

3. Vous verrez toutes les icônes générées en temps réel

4. Cliquez sur **"📥 Tout Télécharger"**

5. Les fichiers se téléchargent automatiquement :
   - `favicon-16.png` (16x16)
   - `favicon-32.png` (32x32)
   - `favicon-48.png` (48x48)
   - `icon-192.png` (192x192) pour PWA
   - `icon-512.png` (512x512) pour PWA
   - `apple-touch-icon.png` (180x180) pour iOS
   - `mobile-icon.png` (1024x1024) pour app mobile

6. **Placez les fichiers** :
   ```
   public/
     ├─ favicon-16.png
     ├─ favicon-32.png
     ├─ favicon-48.png
     ├─ icon-192.png
     ├─ icon-512.png
     └─ apple-touch-icon.png
   
   mobile/assets/
     ├─ icon.png (copier mobile-icon.png)
     ├─ adaptive-icon.png (copier mobile-icon.png)
     ├─ splash-icon.png (copier mobile-icon.png)
     └─ favicon.png (copier favicon-48.png)
   ```

---

#### **Option B : Via outil en ligne (Si vous préférez)**

1. Allez sur **https://realfavicongenerator.net/**

2. Uploadez le fichier `public/logo.svg`

3. Téléchargez le package complet

4. Placez les fichiers dans `public/`

---

### **2. Vérifier l'intégration Web**

1. Lancez le serveur :
   ```powershell
   npm run dev
   ```

2. Ouvrez **http://localhost:5173**

3. Vérifiez l'onglet du navigateur → icône XZ visible

4. Testez PWA :
   - Chrome → F12 → Application → Manifest
   - Vérifiez les icônes chargées

---

### **3. Vérifier l'intégration Mobile**

#### **Android**

1. Placez les icônes :
   ```
   mobile/assets/icon.png (1024x1024)
   mobile/assets/adaptive-icon.png (1024x1024)
   mobile/assets/splash-icon.png (1024x1024)
   ```

2. Rebuilder l'app :
   ```powershell
   cd mobile
   eas build --platform android --profile preview
   ```

3. Installer l'APK → icône XZ visible sur l'écran d'accueil

#### **iOS**

1. Mêmes icônes que Android

2. Build :
   ```powershell
   cd mobile
   eas build --platform ios --profile preview
   ```

3. TestFlight → icône XZ visible

---

### **4. Déployer sur Vercel**

1. **Ajouter les fichiers au Git** :
   ```powershell
   git add public/
   git commit -m "✨ Nouveau logo xCrackz moderne"
   git push
   ```

2. **Vercel déploie automatiquement**

3. **Configurer le domaine xcrackz.com** :
   
   - Dashboard Vercel → Projet → Settings → Domains
   - Add Domain → `xcrackz.com`
   - Add Domain → `www.xcrackz.com`
   - Vercel donne les DNS à configurer

4. **Configurer DNS chez votre registrar** :
   
   **Type A** (pour xcrackz.com) :
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   TTL: 3600
   ```

   **CNAME** (pour www.xcrackz.com) :
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 3600
   ```

5. **Attendre propagation DNS** (5-30 minutes)

6. **Vérifier** :
   - https://xcrackz.com → votre app
   - https://www.xcrackz.com → redirect vers xcrackz.com
   - Icône visible dans onglet navigateur

---

## 🎨 Caractéristiques du Logo

### **Design**

- **Forme** : Carré arrondi (border-radius 20%)
- **Couleurs** : Gradient teal (#14b8a6) → cyan (#06b6d4)
- **Texte** : "XZ" en blanc, font Arial Black 900
- **Effets** : Shine subtle, bordure blanche semi-transparente

### **Versions**

| Fichier | Taille | Usage |
|---------|--------|-------|
| `logo.svg` | Vectoriel | Page web, haute résolution |
| `favicon.svg` | 32x32 | Onglet navigateur (SVG) |
| `favicon-16.png` | 16x16 | Onglet navigateur (legacy) |
| `favicon-32.png` | 32x32 | Onglet navigateur (retina) |
| `favicon-48.png` | 48x48 | Onglet navigateur (HD) |
| `icon-192.png` | 192x192 | PWA Android |
| `icon-512.png` | 512x512 | PWA splash screen |
| `apple-touch-icon.png` | 180x180 | iOS home screen |
| `mobile-icon.png` | 1024x1024 | App mobile (iOS/Android) |

---

## ✅ Checklist

### **Web**

- [x] `public/logo.svg` créé
- [x] `public/favicon.svg` créé
- [x] `public/icon-generator.html` créé
- [x] `public/manifest.json` créé
- [x] `index.html` mis à jour avec favicons
- [ ] Générer PNG depuis icon-generator.html
- [ ] Placer PNG dans `public/`
- [ ] Vérifier onglet navigateur
- [ ] Tester PWA installable

### **Mobile**

- [ ] Copier `mobile-icon.png` → `mobile/assets/icon.png`
- [ ] Copier `mobile-icon.png` → `mobile/assets/adaptive-icon.png`
- [ ] Copier `mobile-icon.png` → `mobile/assets/splash-icon.png`
- [ ] Copier `favicon-48.png` → `mobile/assets/favicon.png`
- [x] `mobile/app.json` mis à jour (nom xCrackz, couleurs)
- [ ] Build Android preview
- [ ] Build iOS preview
- [ ] Vérifier icône app installée

### **Domaine**

- [ ] Ajouter xcrackz.com dans Vercel
- [ ] Configurer DNS A record
- [ ] Configurer DNS CNAME www
- [ ] Attendre propagation (30 min)
- [ ] Vérifier https://xcrackz.com
- [ ] Configurer SSL auto (Vercel)
- [ ] Tester redirections www → non-www

---

## 🚀 Résultat Final

### **Ce que vous verrez** :

1. **Onglet navigateur** :
   ```
   [🟦 XZ] xCrackz - Gestion de Convoyage
   ```

2. **Écran d'accueil mobile** :
   ```
   ┌──────────┐
   │  ┌────┐  │
   │  │ XZ │  │  ← Icône gradient teal/cyan
   │  └────┘  │
   │ xCrackz  │
   └──────────┘
   ```

3. **PWA installée** :
   - Même icône XZ moderne
   - Splash screen avec logo
   - Thème teal (#14b8a6)

4. **Domaine** :
   - https://xcrackz.com ✅
   - https://www.xcrackz.com → redirect ✅
   - SSL automatique ✅

---

## 📞 Support

**Problème avec les icônes ?**

1. Vérifiez que les PNG sont générés (icon-generator.html)
2. Vérifiez les chemins dans `index.html` et `app.json`
3. Clear cache navigateur (Ctrl+Shift+R)
4. Rebuild l'app mobile (EAS)

**Problème avec le domaine ?**

1. Vérifiez DNS propagation : https://dnschecker.org
2. Vercel Dashboard → Domains → Refresh
3. Attendre jusqu'à 48h (rare)

---

**xCrackz** - Votre marque, votre logo ! 🎨🚀

**Build Status:** ✅ Ready  
**Last Update:** 11/10/2025  
**Version:** 1.0
