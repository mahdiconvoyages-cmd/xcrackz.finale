# 📦 Optimisation de la Taille de l'APK

## 🚨 Problème Actuel
**Taille APK : 164 MB** (limite recommandée : 50-100 MB)

## 📊 Analyse des Sources

### Assets : 13 MB
- ✅ Acceptable, mais optimisable

### Dépendances Lourdes : ~150 MB
1. **tesseract.js** : ~50-70 MB (modèles OCR)
2. **@shopify/react-native-skia** : ~30-40 MB (animations Skia)
3. **react-native-reanimated** : ~15-20 MB
4. **react-native-maps** : ~10-15 MB
5. **pdf-lib** : ~5-10 MB
6. **jszip** : ~3-5 MB
7. **react-native-chart-kit** : ~2-3 MB

---

## 🎯 Solutions Immédiates (Réduction : 50-80 MB)

### 1️⃣ Supprimer Tesseract.js (si non utilisé)
**Gain : -60 MB**

```bash
npm uninstall tesseract.js
```

**Alternative** : Si vous avez besoin d'OCR :
- Utilisez une API cloud (Google Vision API, AWS Textract)
- Chargez le modèle à la demande uniquement

### 2️⃣ Remplacer @shopify/react-native-skia
**Gain : -35 MB**

Si vous n'utilisez pas d'animations Skia complexes :

```bash
npm uninstall @shopify/react-native-skia
```

**Alternative** : 
- Utilisez `react-native-reanimated` seul (déjà installé)
- Pour les graphiques, utilisez des SVG ou React Native Animated

### 3️⃣ Optimiser les Images Assets
**Gain : -5-8 MB**

**Compresser les PNG** :
```bash
# Installer pngquant
npm install -g pngquant-bin

# Compresser toutes les images
pngquant --quality=60-80 --ext=.png --force assets/**/*.png
```

**Ou utiliser TinyPNG** : https://tinypng.com/
- scania-arriere.png : 1.81 MB → 0.4 MB (-75%)
- blablacar.png : 1.31 MB → 0.3 MB (-77%)
- icon.png : 0.63 MB → 0.15 MB (-75%)

### 4️⃣ Activer ProGuard (Android)
**Gain : -15-20 MB**

Dans `app.json`, ajouter :

```json
{
  "expo": {
    "android": {
      "enableProguardInReleaseBuilds": true,
      "enableShrinkResourcesInReleaseBuilds": true
    }
  }
}
```

### 5️⃣ Générer des APK par Architecture
**Gain : -40-60 MB par APK**

Dans `eas.json` :

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease",
        "config": "release.gradle"
      }
    }
  }
}
```

Créer `android/app/build.gradle` avec splits :

```gradle
android {
  splits {
    abi {
      enable true
      reset()
      include 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
      universalApk false
    }
  }
}
```

Résultat : 4 APK séparés de ~40 MB chacun au lieu d'un seul de 164 MB.

### 6️⃣ Passer à AAB (Android App Bundle)
**Gain : Distribution optimisée par Google Play**

```bash
eas build --platform android --profile production
```

Google Play génère automatiquement des APK optimisés par appareil (~30-50 MB au lieu de 164 MB).

---

## 🔧 Solutions Avancées (Réduction : 20-40 MB)

### 7️⃣ Lazy Loading des Services Lourds

**Charger pdf-lib à la demande** :

```typescript
// Au lieu de :
import { PDFDocument } from 'pdf-lib';

// Utiliser :
const generatePDF = async () => {
  const { PDFDocument } = await import('pdf-lib');
  // ...
};
```

### 8️⃣ Remplacer pdf-lib par expo-print
**Gain : -8 MB**

```bash
npm uninstall pdf-lib
```

Utiliser `expo-print` (déjà installé) :

```typescript
import * as Print from 'expo-print';

const html = `<html>...</html>`;
const { uri } = await Print.printToFileAsync({ html });
```

### 9️⃣ Analyser les node_modules avec source-map-explorer

```bash
npm install -g source-map-explorer
expo export --platform android
source-map-explorer dist/bundles/android/*.js
```

Identifie les modules les plus lourds dans le bundle JS.

### 🔟 Utiliser Hermes Engine

Dans `app.json` :

```json
{
  "expo": {
    "jsEngine": "hermes"
  }
}
```

**Avantages** :
- Bundle JS réduit de 30-40%
- Démarrage plus rapide

---

## 📋 Plan d'Optimisation Recommandé

### Phase 1 : Quick Wins (30 min)
1. ✅ Supprimer tesseract.js (-60 MB)
2. ✅ Compresser images PNG (-6 MB)
3. ✅ Activer ProGuard (-18 MB)
4. ✅ Activer Hermes (-20 MB)

**Résultat attendu : 164 MB → 60 MB (-104 MB)**

### Phase 2 : Optimisation Avancée (1h)
5. ✅ Supprimer @shopify/react-native-skia si non utilisé (-35 MB)
6. ✅ Remplacer pdf-lib par expo-print (-8 MB)
7. ✅ Générer AAB au lieu d'APK (-30-50 MB par appareil)

**Résultat final : 30-50 MB par appareil**

---

## 🚀 Commandes à Exécuter

```bash
# 1. Nettoyer les dépendances
npm uninstall tesseract.js @shopify/react-native-skia pdf-lib

# 2. Installer outil de compression
npm install -g pngquant-bin

# 3. Compresser les images
pngquant --quality=60-80 --ext=.png --force assets/vehicles/*.png
pngquant --quality=60-80 --ext=.png --force assets/*.png

# 4. Rebuilder
npm install
eas build --platform android --profile production
```

---

## 📊 Résultat Attendu

| Élément | Avant | Après | Gain |
|---------|-------|-------|------|
| **APK Universel** | 164 MB | 60 MB | -104 MB (-63%) |
| **AAB (arm64-v8a)** | 164 MB | 35 MB | -129 MB (-78%) |
| **AAB (armeabi-v7a)** | 164 MB | 30 MB | -134 MB (-81%) |

---

## ⚠️ Vérifications Avant Suppression

### Tesseract.js
Rechercher son utilisation :
```bash
grep -r "tesseract" src/ --include="*.tsx" --include="*.ts"
```

### @shopify/react-native-skia
Rechercher son utilisation :
```bash
grep -r "react-native-skia" src/ --include="*.tsx" --include="*.ts"
grep -r "useSharedValue\|useAnimatedStyle" src/ --include="*.tsx" --include="*.ts"
```

### pdf-lib
Rechercher son utilisation :
```bash
grep -r "pdf-lib\|PDFDocument" src/ --include="*.tsx" --include="*.ts"
```

---

## 📝 Notes Importantes

1. **AAB vs APK** :
   - AAB : Format recommandé pour Google Play (génère des APK optimisés automatiquement)
   - APK : Format universel mais plus lourd

2. **ProGuard** :
   - Supprime le code mort
   - Obfuscation du code
   - Réduction de 15-20% en moyenne

3. **Hermes** :
   - Moteur JS optimisé pour React Native
   - Réduit le bundle JS de 30-40%
   - Améliore le temps de démarrage

4. **Images** :
   - Utilisez WebP au lieu de PNG (70% plus léger)
   - Compression sans perte pour les icônes
   - Compression avec perte (60-80%) pour les photos

---

## 🎯 Objectif Final

**Taille cible : 30-50 MB par appareil (AAB)**

✅ Google Play Store limite : 100 MB  
✅ Téléchargement rapide sur 4G/5G  
✅ Moins d'espace sur l'appareil  
✅ Meilleure expérience utilisateur
