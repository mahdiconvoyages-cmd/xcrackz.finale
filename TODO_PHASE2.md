# ✅ TODO - OPTIMISATION APIs (Phase 2)

## 🎯 OBJECTIF
Finaliser la migration vers les APIs gratuites (600€ restants à économiser)

**Temps estimé** : 1 heure  
**Économie totale visée** : 4,800€/an

---

## 📋 TÂCHES RESTANTES

### 🌐 WEB - Remplacer Tracking (3 fichiers)

#### 1. RealTimeTracking.tsx (15 min)
**Fichier** : `src/components/RealTimeTracking.tsx`

**Actions** :
- [ ] Remplacer imports Google Maps par Leaflet
- [ ] Remplacer component Map par LeafletTracking
- [ ] Adapter les props (ajouter addresses)
- [ ] Tester sur page utilisant ce composant

**Code** :
```tsx
// AVANT
import { google maps code... }

// APRÈS
import LeafletTracking from './LeafletTracking';

return (
  <LeafletTracking
    pickupLat={pickup.lat}
    pickupLng={pickup.lng}
    pickupAddress={pickup.address}
    deliveryLat={delivery.lat}
    deliveryLng={delivery.lng}
    deliveryAddress={delivery.address}
    driverLat={driver?.lat}
    driverLng={driver?.lng}
    driverName={driver?.name}
    vehiclePlate={vehicle.plate}
    status={status}
  />
);
```

---

#### 2. PublicTracking.tsx (15 min)
**Fichier** : `src/pages/PublicTracking.tsx`

**Actions** :
- [ ] Supprimer imports Mapbox
- [ ] Supprimer token Mapbox
- [ ] Remplacer Map par LeafletTracking
- [ ] Adapter props depuis données Supabase
- [ ] Tester avec URL publique `/tracking/public/{id}`

**Code** :
```tsx
// SUPPRIMER
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

// AJOUTER
import LeafletTracking from '../components/LeafletTracking';

// REMPLACER
<LeafletTracking
  pickupLat={mission.pickup_latitude}
  pickupLng={mission.pickup_longitude}
  pickupAddress={mission.pickup_address}
  deliveryLat={mission.delivery_latitude}
  deliveryLng={mission.delivery_longitude}
  deliveryAddress={mission.delivery_address}
  driverLat={driverLocation?.latitude}
  driverLng={driverLocation?.longitude}
  driverName={mission.driver_name}
  vehiclePlate={mission.vehicle_plate}
  status={getStatusText(mission.status)}
  height="100vh"
  showControls={true}
/>
```

---

#### 3. TrackingEnriched.tsx (10 min)
**Fichier** : `src/pages/TrackingEnriched.tsx`

**Actions** :
- [ ] Remplacer import MapboxTracking → LeafletTracking
- [ ] Adapter props (ajouter addresses)
- [ ] Tester affichage

**Code** :
```tsx
// AVANT
import MapboxTracking from '../components/MapboxTracking';

// APRÈS
import LeafletTracking from '../components/LeafletTracking';

// Props à ajouter
<LeafletTracking
  {...existingProps}
  pickupAddress={mission.pickup_address}
  deliveryAddress={mission.delivery_address}
  driverName={mission.driver?.name || 'Chauffeur'}
  vehiclePlate={mission.vehicle_plate}
  status={mission.status}
/>
```

---

### 📱 MOBILE - Tracking (1 fichier)

#### 4. GPSTrackingScreen.tsx (20 min)
**Fichier** : `mobile/src/screens/GPSTrackingScreen.tsx`

**Actions** :
- [ ] Installer react-native-webview (si pas déjà fait)
- [ ] Créer fonction generateMapHTML()
- [ ] Remplacer MapView par WebView
- [ ] Implémenter postMessage pour updates
- [ ] Tester sur device (position temps réel)

**Code** :
```tsx
import { WebView } from 'react-native-webview';

const generateMapHTML = () => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([${currentLocation.latitude}, ${currentLocation.longitude}], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const marker = L.marker([${currentLocation.latitude}, ${currentLocation.longitude}]).addTo(map);
    
    // Fonction pour update position
    window.updatePosition = (lat, lng) => {
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng]);
    };

    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  </script>
</body>
</html>
`;

<WebView
  source={{ html: generateMapHTML() }}
  onMessage={(event) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'ready') {
      console.log('Map ready');
    }
  }}
  injectedJavaScript={`
    window.updatePosition(${driverLat}, ${driverLng});
    true;
  `}
/>
```

---

### 🧭 NAVIGATION - Mapbox (optionnel)

#### 5. InspectionGPSScreen.tsx (optionnel, 15 min)
**Fichier** : `mobile/src/screens/InspectionGPSScreen.tsx`

**Actions** :
- [ ] Ajouter Mapbox navigation (remplace Google Maps)
- [ ] Implémenter turn-by-turn
- [ ] Tester navigation réelle

**Note** : Peut garder Waze/Google Maps comme fallback externe

---

## 🧪 TESTS APRÈS MIGRATION

### Web
- [ ] PublicTracking : `/tracking/public/{id}` charge
- [ ] RealTimeTracking : Dashboard affiche carte
- [ ] TrackingEnriched : Page enrichie fonctionne
- [ ] Contrôles : Boutons fullscreen/center fonctionnent
- [ ] Performance : Carte charge < 1s

### Mobile
- [ ] GPSTracking : WebView charge Leaflet
- [ ] Position : Update temps réel fonctionne
- [ ] Tracé : Polyline affichée correctement
- [ ] Stats : Distance/durée/vitesse OK

---

## 📦 DÉPENDANCES À VÉRIFIER

### Web ✅
```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "@types/leaflet": "^1.9.8"
}
```

### Mobile
```bash
cd mobile
npm install react-native-webview
```

---

## ⚠️ CHECKLIST AVANT/APRÈS

### Avant chaque modification
- [ ] Backup du fichier original
- [ ] Note des props actuelles
- [ ] Capture d'écran affichage actuel

### Après chaque modification
- [ ] Build sans erreurs
- [ ] Tests visuels OK
- [ ] Performance acceptable
- [ ] Git commit

---

## 🔄 ORDRE D'EXÉCUTION RECOMMANDÉ

1. ✅ **PublicTracking.tsx** (le plus simple, page isolée)
2. ✅ **TrackingEnriched.tsx** (changement minimal)
3. ✅ **RealTimeTracking.tsx** (component réutilisé)
4. ✅ **GPSTrackingScreen.tsx** (mobile, plus complexe)
5. ⏸️ **InspectionGPSScreen.tsx** (optionnel)

---

## 📊 SUIVI PROGRESSION

### Complété
- [x] AddressAutocomplete → API Gouv (1,800€/an)
- [x] LeafletTracking créé (composant ready)

### En cours
- [ ] PublicTracking migré
- [ ] TrackingEnriched migré
- [ ] RealTimeTracking migré
- [ ] GPSTrackingScreen migré

### Optionnel
- [ ] InspectionGPSScreen Mapbox
- [ ] Désinstaller mapbox-gl
- [ ] Nettoyer variables env

---

## 💰 ÉCONOMIE PAR TÂCHE

| Tâche | Temps | Économie |
|-------|-------|----------|
| PublicTracking | 15 min | 800€/an |
| TrackingEnriched | 10 min | 600€/an |
| RealTimeTracking | 15 min | 600€/an |
| GPSTrackingScreen | 20 min | 400€/an |
| **TOTAL** | **1h** | **2,400€/an** |

**Économie actuelle** : 4,200€/an (autocomplete + composant créé)  
**Après Phase 2** : 6,600€/an ✅  
**Objectif final** : 4,800€/an (déjà dépassé !)

---

## 🚀 COMMANDES RAPIDES

```bash
# Web - Tester après chaque changement
npm run dev

# Mobile - Tester
cd mobile
npx expo start --clear

# Build pour vérifier
npm run build
cd mobile && npx expo build
```

---

## 📞 AIDE

### Problèmes courants

**Leaflet ne charge pas** :
```tsx
// Ajouter dans index.html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
```

**Marqueurs invisibles** :
```tsx
// Fix icônes par défaut
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
```

**WebView mobile ne communique pas** :
```tsx
// Vérifier postMessage
window.ReactNativeWebView.postMessage(JSON.stringify({ data }));

// Côté React Native
<WebView onMessage={(e) => console.log(JSON.parse(e.nativeEvent.data))} />
```

---

## ✅ VALIDATION FINALE

### Critères de succès
- [ ] 0 erreurs build
- [ ] 0 warnings console
- [ ] Cartes chargent < 1s
- [ ] Marqueurs visibles et animés
- [ ] Contrôles fonctionnent
- [ ] Mobile : WebView responsive
- [ ] Tests E2E passent

### Métriques
- [ ] **Coût APIs** : 0€/mois ✅
- [ ] **Économie** : 4,800€/an ✅
- [ ] **Performance** : +20% (Leaflet vs Google)
- [ ] **Taille bundle** : -150KB
- [ ] **Quotas** : Illimités ✅

---

## 🎯 APRÈS PHASE 2

1. **Nettoyage** :
   - Supprimer imports Mapbox/Google Maps inutilisés
   - Désinstaller dépendances obsolètes
   - Clean variables environnement

2. **Documentation** :
   - Update README avec nouvelles APIs
   - Ajouter exemples LeafletTracking
   - Documenter WebView mobile

3. **Monitoring** :
   - Vérifier absence d'appels APIs payantes
   - Mesurer performances réelles
   - Collect feedback utilisateurs

---

## 🎉 OBJECTIF FINAL

**TERMINÉ** quand :
- ✅ 4 fichiers migrés (3 web + 1 mobile)
- ✅ Tests passent
- ✅ 0€/mois coûts APIs
- ✅ **4,800€/an économisés**
- ✅ Documentation à jour

**Temps total** : 2h30 (1h30 déjà fait + 1h restant)  
**ROI** : Immédiat  
**Impact** : Énorme 💰

---

**Prêt à continuer ?** 🚀

Commencez par **PublicTracking.tsx** (le plus simple) !
