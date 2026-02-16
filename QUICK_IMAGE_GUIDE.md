# 🚀 Guide Rapide - Ajout Image Covoiturage

## ⚡ En 3 commandes PowerShell

### 1️⃣ Renommer l'image
```powershell
# Depuis le dossier où se trouve l'image
Rename-Item "Capture d'écran 2025-10-11 154912.png" "covoiturage-hero.jpg"
```

### 2️⃣ Copier vers le web
```powershell
# Depuis la racine du projet Finality-okok
Copy-Item "chemin\vers\covoiturage-hero.jpg" "src\assets\images\covoiturage-hero.jpg"
```

### 3️⃣ Copier vers mobile
```powershell
Copy-Item "chemin\vers\covoiturage-hero.jpg" "mobile\assets\covoiturage-hero.jpg"
```

## ✅ Vérification

### Web
Ouvrez la page Covoiturage :
```
http://localhost:5173/covoiturage
```
➡️ L'image doit apparaître dans la section hero en haut

### Mobile
Ouvrez le screen Covoiturage dans l'app
➡️ L'image doit apparaître en haut avec badge "Covoiturage"

## 🔧 Si l'image ne s'affiche pas

### Web
```powershell
# Arrêter le serveur (Ctrl+C)
# Relancer
cd c:\Users\mahdi\Documents\Finality-okok
npm run dev
```

### Mobile
```powershell
# Effacer le cache
cd mobile
npx expo start -c
```

## 📐 Optimisation (optionnel)

Si l'image est trop lourde (>500KB), optimisez :

```powershell
# Avec ImageMagick (si installé)
magick convert covoiturage-hero.jpg -quality 85 -resize 1920x600 covoiturage-hero-optimized.jpg
```

---

## 🎯 Résumé complet session

Pour voir tout ce qui a été fait :
```powershell
Get-Content RECAP_COMPLET_SESSION.md
```

Pour voir comment configurer Mapbox GPS :
```powershell
Get-Content MAPBOX_SETUP.md
```

Pour voir le guide Wizard photos :
```powershell
Get-Content WIZARD_PHOTOS_GUIDE.md
```
