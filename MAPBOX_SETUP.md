# 🗺️ CONFIGURATION MAPBOX

## 📝 Obtenir un token Mapbox (GRATUIT)

### 1. Créer un compte

1. Va sur https://www.mapbox.com/
2. Cliquer "Sign up" (gratuit)
3. Confirmer email

### 2. Obtenir le token

1. Se connecter sur https://account.mapbox.com/
2. Aller dans "Access tokens"
3. Copier le "**Default public token**"
   - Format: `pk.eyJ1Ijoi...` (commence par `pk.`)

### 3. Configurer dans l'app

**Mobile** (`mobile/src/screens/WazeGPSScreen.tsx`):
```typescript
// Ligne 13
MapboxGL.setAccessToken('pk.COLLE_TON_TOKEN_ICI');
```

**Exemple**:
```typescript
MapboxGL.setAccessToken('pk.eyJ1IjoiZmluYWxpdHkiLCJhIjoiY2x4eXo5ZDNuMGFiYTJxcGc2dTR6YzBnYiJ9.abc123...');
```

---

## 📦 Installation packages

```bash
cd mobile
npm install @rnmapbox/maps
npx expo install react-native-webview # Dépendance
```

---

## ⚙️ Configuration iOS (si tu build iOS)

**mobile/ios/Podfile**:
```ruby
pre_install do |installer|
  $RNMapboxMaps.pre_install(installer)
end

post_install do |installer|
  $RNMapboxMaps.post_install(installer)
end
```

Puis:
```bash
cd ios
pod install
```

---

## ⚙️ Configuration Android (déjà OK pour Expo)

Pas de config spéciale si tu utilises Expo Go !

---

## 🧪 Tester

```bash
cd mobile
npx expo start --clear
```

Scanner le QR code et naviguer vers GPS screen.

**Vérifier**:
- ✅ Carte Mapbox affichée
- ✅ Position actuelle (point bleu)
- ✅ Destination (drapeau rouge)
- ✅ Ligne itinéraire (bleu turquoise)

---

## 🎨 Styles disponibles

```typescript
MapboxGL.StyleURL.Street      // Vue rue (par défaut)
MapboxGL.StyleURL.Dark         // Mode nuit
MapboxGL.StyleURL.Light        // Mode clair
MapboxGL.StyleURL.Outdoors     // Extérieur
MapboxGL.StyleURL.Satellite    // Satellite
MapboxGL.StyleURL.SatelliteStreet // Satellite + rues
```

**Changer le style**:
```typescript
<MapboxGL.MapView
  styleURL={MapboxGL.StyleURL.Dark} // Mode nuit
/>
```

---

## 🆓 Limites gratuites Mapbox

```
50,000 requêtes carte / mois    ✅ GRATUIT
100,000 tiles / mois            ✅ GRATUIT
```

**Pour Finality** (100 chauffeurs):
- 10 missions/jour/chauffeur = 1000 requêtes/jour
- 30,000/mois → OK sous limite !

---

## 🔧 Troubleshooting

### Carte blanche ?
```typescript
// Vérifier le token
console.log(MapboxGL.getAccessToken());
// Doit afficher: pk.eyJ1...
```

### Erreur "Invalid token" ?
- Token mal copié (espaces, caractères manquants)
- Token commenceavec `pk.` (public), pas `sk.` (secret)

### Carte ne centre pas ?
```typescript
// Forcer le center
<MapboxGL.Camera
  ref={cameraRef}
  zoomLevel={14}
  centerCoordinate={[lon, lat]}
  animationDuration={2000}
/>
```

---

**Créé**: 11 octobre 2025  
**Status**: ✅ READY  
