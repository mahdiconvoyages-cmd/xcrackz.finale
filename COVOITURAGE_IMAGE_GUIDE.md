# Guide d'intégration de l'image Covoiturage

## 📸 Image à ajouter

**Fichier** : `Capture d'écran 2025-10-11 154912.png`

## 🗂️ Emplacements

### Web (React)
```
src/assets/images/covoiturage-hero.jpg
```

### Mobile (React Native)
```
mobile/assets/covoiturage-hero.jpg
```

## 📋 Instructions

### 1. Renommer l'image
Renommez `Capture d'écran 2025-10-11 154912.png` en `covoiturage-hero.jpg`

### 2. Web - Copier dans le dossier assets

```powershell
# Créer le dossier s'il n'existe pas
New-Item -ItemType Directory -Force -Path "src\assets\images"

# Copier l'image
Copy-Item "Capture d'écran 2025-10-11 154912.png" "src\assets\images\covoiturage-hero.jpg"
```

### 3. Mobile - Copier dans assets

```powershell
# Copier l'image
Copy-Item "Capture d'écran 2025-10-11 154912.png" "mobile\assets\covoiturage-hero.jpg"
```

## ✅ Vérification

### Web
L'image apparaîtra dans la hero section de `src/pages/CovoiturageModern.tsx`

### Mobile
L'image apparaîtra dans `mobile/src/screens/CovoiturageScreen.tsx`

## 🎨 Optimisation recommandée

### Dimensions optimales
- **Web** : 1920x600px (ratio 3.2:1)
- **Mobile** : 1080x720px (ratio 3:2)

### Compression
```powershell
# Avec ImageMagick (optionnel)
magick convert covoiturage-hero.jpg -quality 85 -resize 1920x600 covoiturage-hero-optimized.jpg
```

## 📱 Formats alternatifs

### WebP pour le web (meilleure performance)
```powershell
magick convert covoiturage-hero.jpg -quality 80 covoiturage-hero.webp
```

Ensuite dans le code web :
```tsx
<picture>
  <source srcset="/src/assets/images/covoiturage-hero.webp" type="image/webp" />
  <img src="/src/assets/images/covoiturage-hero.jpg" alt="Covoiturage" />
</picture>
```

## 🔧 Si l'image ne s'affiche pas

### Web
1. Vérifiez le chemin dans `CovoiturageModern.tsx` ligne ~420
2. Assurez-vous que Vite peut charger l'image
3. Redémarrez le serveur de développement

### Mobile
1. Vérifiez que le fichier est dans `mobile/assets/`
2. Importez correctement : `require('../../assets/covoiturage-hero.jpg')`
3. Relancez Metro bundler : `npm start -- --reset-cache`

## 📄 Fichiers modifiés

- ✅ `src/pages/CovoiturageModern.tsx` (hero section préparée)
- ✅ `mobile/src/screens/CovoiturageScreen.tsx` (créé avec support image)

## 🚀 Prochaines étapes

1. **Ajouter l'image** aux emplacements indiqués
2. **Tester** sur web et mobile
3. **Optimiser** si nécessaire (compression, resize)
4. **Commit** avec les assets
