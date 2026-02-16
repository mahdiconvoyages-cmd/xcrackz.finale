# 📱 Guide de création et intégration du logo Xcrackz

## 🎨 Étape 1 : Créer votre logo

### Outils recommandés (gratuits) :
1. **Canva** : https://canva.com
   - Chercher "App Icon" ou "Logo"
   - Dimensions : 512x512px
   
2. **Figma** : https://figma.com (plus professionnel)
   - Créer un carré 512x512px
   - Exporter en PNG

3. **LogoMakr** : https://logomakr.com
   - Simple et rapide

### Recommandations de design pour Xcrackz :
- **Couleur principale** : Bleu #0066FF
- **Fond** : Blanc ou transparent
- **Style** : Moderne, minimaliste
- **Idées** :
  - Lettre "X" stylisée en bleu
  - Combinaison X + icône de route/véhicule
  - Forme géométrique moderne

## 📦 Étape 2 : Préparer vos fichiers

Vous devez créer **2 fichiers PNG** :

### 1. `logo.png` (Logo complet)
- **Taille** : 512x512px minimum
- **Fond** : Blanc ou transparent
- **Usage** : Icône principale de l'app
- **Placement** : `assets/icons/logo.png`

### 2. `logo_foreground.png` (Logo adaptatif Android)
- **Taille** : 512x512px
- **Fond** : Transparent obligatoire
- **Marges** : Laisser 20% de marge autour du logo
- **Usage** : Pour les icônes adaptatives Android (forme ronde/carrée)
- **Placement** : `assets/icons/logo_foreground.png`

## 🚀 Étape 3 : Placer vos fichiers

Copiez vos 2 fichiers PNG dans ce dossier :
```
mobile_flutter/finality_app/assets/icons/
├── logo.png (512x512px)
└── logo_foreground.png (512x512px avec fond transparent)
```

## ⚙️ Étape 4 : Générer les icônes

Une fois vos fichiers en place, exécutez cette commande dans le terminal :

```bash
cd mobile_flutter/finality_app
flutter pub get
flutter pub run flutter_launcher_icons
```

Ou demandez-moi de le faire pour vous !

## 📋 Ce qui sera généré automatiquement :

L'outil créera toutes ces tailles pour Android :
- `mipmap-mdpi` (48x48)
- `mipmap-hdpi` (72x72)
- `mipmap-xhdpi` (96x96)
- `mipmap-xxhdpi` (144x144)
- `mipmap-xxxhdpi` (192x192)

Plus les icônes adaptatives pour Android 8.0+ :
- Icône ronde
- Icône carrée arrondie
- Icône carrée

## 🔄 Rebuild de l'APK

Après génération des icônes :
```bash
flutter clean
flutter build apk --release
```

## ✅ Vérification

Installez l'APK sur votre téléphone et vérifiez :
- Le logo apparaît correctement sur l'écran d'accueil
- Le logo est net (pas pixelisé)
- Les couleurs sont bonnes
- Pas de bords blancs indésirables

## 💡 Conseils

1. **Format PNG** obligatoire (pas JPG)
2. **Fond transparent** pour logo_foreground.png
3. **Qualité maximale** (pas de compression)
4. **Test sur plusieurs formes** : cercle, carré arrondi, carré

---

**Besoin d'aide ?** Dites-moi simplement "génère les icônes" une fois vos fichiers en place !
