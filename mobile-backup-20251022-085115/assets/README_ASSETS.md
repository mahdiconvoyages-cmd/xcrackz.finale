# 🎨 ASSETS MANQUANTS

Les assets (icônes, splash screen) sont nécessaires pour le build EAS.

## 📝 Solution Rapide

### Option 1 : Utiliser les assets par défaut Expo (RECOMMANDÉ)

Modifier `app.json` pour enlever les références aux assets manquants :

```json
{
  "expo": {
    "name": "Finality",
    "slug": "finality-app",
    // Supprimer ces lignes temporairement :
    // "icon": "./assets/icon.png",
    // "splash": { ... },
    // "android": { "adaptiveIcon": { ... } },
    // "web": { "favicon": "./assets/favicon.png" }
  }
}
```

### Option 2 : Créer des assets simples

Créer ces fichiers dans `mobile/assets/` :

1. **icon.png** (1024x1024) - Icône de l'app
2. **splash.png** (1242x2436) - Écran de démarrage
3. **adaptive-icon.png** (1024x1024) - Icône Android adaptative
4. **favicon.png** (48x48) - Favicon web

Outils en ligne :
- https://www.canva.com (gratuit)
- https://www.figma.com (gratuit)
- https://icon.kitchen (générateur d'icônes)

### Option 3 : Utiliser `npx expo-generate-assets`

```bash
cd mobile
npx expo install expo-asset
npx expo-generate-assets
```

## 🚀 Solution Immédiate

Pour builder maintenant sans attendre, je vais simplifier `app.json` pour utiliser les assets par défaut.
