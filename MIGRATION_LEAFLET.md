# 🔄 GUIDE DE MIGRATION - Remplacer Google Maps/Mapbox par Leaflet

## 🎯 OBJECTIF
Remplacer tous les usages de Google Maps et Mapbox (tracking) par Leaflet

---

## 📋 FICHIERS À MODIFIER

### Web (3 fichiers)
1. ✅ `src/components/RealTimeTracking.tsx` - Google Maps → Leaflet
2. ✅ `src/pages/PublicTracking.tsx` - Mapbox → Leaflet
3. ✅ `src/pages/TrackingEnriched.tsx` - MapboxTracking → LeafletTracking

### Mobile (1 fichier)
4. ✅ `mobile/src/screens/GPSTrackingScreen.tsx` - Google Maps → Leaflet WebView

---

## 🔧 MIGRATION ÉTAPE PAR ÉTAPE

### 1. RealTimeTracking.tsx

**AVANT** (Google Maps) :
```tsx
import React, { useEffect, useRef } from 'react';

const map = new google.maps.Map(mapContainerRef.current, {
  center: { lat: pickupLat, lng: pickupLng },
  zoom: 13,
});

const marker = new google.maps.Marker({
  position: { lat, lng },
  map,
});
```

**APRÈS** (Leaflet) :
```tsx
import LeafletTracking from './LeafletTracking';

<LeafletTracking
  pickupLat={pickup.latitude}
  pickupLng={pickup.longitude}
  pickupAddress={pickup.address}
  deliveryLat={delivery.latitude}
  deliveryLng={delivery.longitude}
  deliveryAddress={delivery.address}
  driverLat={driverPosition?.latitude}
  driverLng={driverPosition?.longitude}
  driverName={driver.name}
  vehiclePlate={vehicle.plate}
  status={mission.status}
  height="600px"
/>
```

**Changements** :
- ❌ Supprimer : `google.maps.Map`, `google.maps.Marker`
- ✅ Ajouter : `import LeafletTracking`
- ✅ Remplacer : JSX complet

---

### 2. PublicTracking.tsx

**AVANT** (Mapbox) :
```tsx
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const map = new mapboxgl.Map({
  container: mapContainerRef.current,
  style: 'mapbox://styles/mapbox/navigation-day-v1',
  center: [lng, lat],
  zoom: 13,
});

new mapboxgl.Marker({ color: '#10b981' })
  .setLngLat([lng, lat])
  .addTo(map);
```

**APRÈS** (Leaflet) :
```tsx
import LeafletTracking from '../components/LeafletTracking';

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

**Changements** :
- ❌ Supprimer : imports Mapbox, token, Map, Marker
- ❌ Supprimer : useRef, useEffect pour map
- ✅ Ajouter : `import LeafletTracking`
- ✅ Remplacer : JSX complet

---

### 3. TrackingEnriched.tsx

**AVANT** :
```tsx
import MapboxTracking from '../components/MapboxTracking';

<MapboxTracking
  pickupLat={mission.pickup_latitude}
  pickupLng={mission.pickup_longitude}
  deliveryLat={mission.delivery_latitude}
  deliveryLng={mission.delivery_longitude}
  driverLat={driverPosition?.latitude}
  driverLng={driverPosition?.longitude}
/>
```

**APRÈS** :
```tsx
import LeafletTracking from '../components/LeafletTracking';

<LeafletTracking
  pickupLat={mission.pickup_latitude}
  pickupLng={mission.pickup_longitude}
  pickupAddress={mission.pickup_address}
  deliveryLat={mission.delivery_latitude}
  deliveryLng={mission.delivery_longitude}
  deliveryAddress={mission.delivery_address}
  driverLat={driverPosition?.latitude}
  driverLng={driverPosition?.longitude}
  driverName={mission.driver?.name || 'Chauffeur'}
  vehiclePlate={mission.vehicle_plate}
  status={mission.status}
  height="600px"
/>
```

**Changements** :
- ❌ `MapboxTracking` → ✅ `LeafletTracking`
- ✅ Ajouter props : addresses, driverName, vehiclePlate, status

---

### 4. GPSTrackingScreen.tsx (Mobile)

**AVANT** (react-native-maps) :
```tsx
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

<MapView
  provider={PROVIDER_GOOGLE}
  style={styles.map}
  customMapStyle={mapStyle}
  initialRegion={{
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }}
>
  <Marker coordinate={{ latitude, longitude }} />
  <Polyline coordinates={routePoints} strokeColor="#14b8a6" />
</MapView>
```

**APRÈS** (WebView + Leaflet) :
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
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.marker([${currentLocation.latitude}, ${currentLocation.longitude}]).addTo(map);
    
    // Communication avec React Native
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'mapReady'
    }));
  </script>
</body>
</html>
`;

<WebView
  source={{ html: generateMapHTML() }}
  style={{ flex: 1 }}
  onMessage={(event) => {
    const data = JSON.parse(event.nativeEvent.data);
    // Handle messages
  }}
/>
```

**Changements** :
- ❌ Supprimer : react-native-maps, PROVIDER_GOOGLE
- ✅ Ajouter : react-native-webview
- ✅ Générer : HTML avec Leaflet
- ✅ Communication : postMessage pour updates temps réel

---

## 📦 DÉPENDANCES

### À désinstaller (optionnel)
```bash
# Web
npm uninstall mapbox-gl

# Mobile
npm uninstall react-native-maps
```

### Déjà installées ✅
```bash
# Web
leaflet@1.9.4
react-leaflet@4.2.1
@types/leaflet

# Mobile
react-native-webview (déjà présent)
```

---

## 🧪 TESTS APRÈS MIGRATION

### Web - PublicTracking
1. Naviguer vers `/tracking/public/{id}`
2. Vérifier :
   - ✅ Carte charge correctement
   - ✅ Marqueurs départ/livraison visibles
   - ✅ Itinéraire affiché
   - ✅ Position chauffeur mise à jour
   - ✅ Contrôles fonctionnent

### Mobile - GPSTracking
1. Lancer app mobile
2. Naviguer vers GPSTracking
3. Vérifier :
   - ✅ Carte charge dans WebView
   - ✅ Position actuelle affichée
   - ✅ Tracé du parcours visible
   - ✅ Stats mises à jour

---

## ⚠️ POINTS D'ATTENTION

### Leaflet vs Google Maps

**Différences** :
| Feature | Google Maps | Leaflet |
|---------|-------------|---------|
| Coût | 200€/mois | 0€ |
| Limites | 28k requêtes/mois | Aucune |
| Tuiles | Google | OpenStreetMap |
| Routing | Inclus | Manuel (polyline) |
| 3D | Oui | Non |
| Performance | Moyen | Excellent |

**Avantages Leaflet** :
- ✅ Plus léger (40KB vs 200KB+)
- ✅ Plus rapide
- ✅ Pas de clé API
- ✅ Hautement personnalisable
- ✅ Open-source

**Limitations** :
- ❌ Pas de navigation turn-by-turn (utiliser Mapbox pour ça)
- ❌ Pas de vue 3D
- ❌ Routing simple (ligne droite entre points)

---

## 🚀 SCRIPT DE MIGRATION AUTOMATIQUE

Créer `migrate-to-leaflet.sh` :

```bash
#!/bin/bash

echo "🔄 Migration Google Maps/Mapbox → Leaflet"

# Backup
cp src/components/RealTimeTracking.tsx src/components/RealTimeTracking.tsx.backup
cp src/pages/PublicTracking.tsx src/pages/PublicTracking.tsx.backup

# Remplacer imports
find src -name "*.tsx" -exec sed -i 's/mapbox-gl/leaflet/g' {} \;
find src -name "*.tsx" -exec sed -i 's/google.maps/L/g' {} \;

echo "✅ Migration terminée ! Vérifiez les fichiers manuellement."
```

---

## 📝 CHECKLIST DE MIGRATION

### Préparation
- [ ] Backup des fichiers existants
- [ ] Leaflet installé
- [ ] LeafletTracking.tsx créé

### Web
- [ ] RealTimeTracking.tsx migré
- [ ] PublicTracking.tsx migré
- [ ] TrackingEnriched.tsx migré
- [ ] Tests fonctionnels OK

### Mobile
- [ ] GPSTrackingScreen.tsx migré (WebView)
- [ ] Communication postMessage OK
- [ ] Tests sur device OK

### Nettoyage
- [ ] Supprimer imports Mapbox/Google
- [ ] Supprimer variables d'env (MAPBOX_TOKEN)
- [ ] Update documentation

---

## 💡 CONSEILS

1. **Tester progressivement** - Un fichier à la fois
2. **Garder les backups** - Jusqu'à validation complète
3. **Vérifier les props** - Adapter selon vos besoins
4. **Optimiser les performances** - Lazy load si nécessaire
5. **Documenter les changements** - Pour l'équipe

---

## 🎯 RÉSULTAT ATTENDU

Après migration complète :

- ✅ **0€/mois** de coût APIs tracking
- ✅ **Performances améliorées** (Leaflet plus léger)
- ✅ **Pas de limites** de quotas
- ✅ **Open-source** et personnalisable
- ✅ **RGPD compliant** (pas de tracking Google)

**Économie totale : 2,400€/an** 🎉

---

**Besoin d'aide ?** Consultez :
- [Documentation Leaflet](https://leafletjs.com/reference.html)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [OPTIMISATION_COMPLETE.md](./OPTIMISATION_COMPLETE.md)
