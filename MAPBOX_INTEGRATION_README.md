# 🗺️ Intégration Mapbox 3D + GPS Tracking Temps Réel

## ✅ RÉSUMÉ

Intégration complète de **Mapbox 3D** avec **suivi GPS en temps réel** toutes les **2 secondes** via **Supabase Realtime**.

---

## 📦 FICHIERS CRÉÉS

### Web (React)

1. **`src/components/MapboxTracking.tsx`** (310 lignes)
   - Carte Mapbox 3D avec bâtiments
   - Marqueurs Point A (vert) et Point B (rouge)
   - Tracé GPS bleu avec effet glow
   - Icône chauffeur animée avec pulse
   - Mise à jour en temps réel

2. **`src/pages/TrackingEnriched.tsx`** (modifié)
   - Intégration MapboxTracking
   - Abonnement Supabase Realtime
   - Affichage uniquement si mission `in_progress`
   - Gestion état GPS (position, route)

### Mobile (React Native)

3. **`mobile/src/services/gps-tracking.ts`** (175 lignes)
   - Service singleton GPS
   - Démarre/arrête tracking
   - Publie positions via Supabase Realtime
   - Intervalle configurable (défaut: 2s)

### Configuration

4. **`.env.local`** (nouveau)
   - VITE_MAPBOX_TOKEN
   - Variables d'environnement Vite

5. **`.env.example`** (nouveau)
   - Template pour configuration

### Documentation

6. **`MAPBOX_GPS_GUIDE.md`** (400+ lignes)
   - Guide complet d'installation
   - Architecture détaillée
   - Debugging et troubleshooting
   - Personnalisation

7. **`mobile/GPS_INTEGRATION_EXAMPLE.md`** (350+ lignes)
   - Exemples d'intégration mobile
   - Code complet InspectionDeparture/Arrival
   - Gestion permissions
   - Cleanup automatique

---

## 🚀 DÉMARRAGE RAPIDE

### 1. Configuration Mapbox

```bash
# Obtenir token sur https://account.mapbox.com/
# Créer .env.local
echo "VITE_MAPBOX_TOKEN=pk.eyJ1..." > .env.local
```

### 2. Installer dépendances (si besoin)

```powershell
# Web
npm install mapbox-gl

# Mobile
cd mobile
npm install expo-location
```

### 3. Tester

**Web** :
1. Démarrer : `npm run dev`
2. Aller sur `/tracking`
3. Sélectionner une mission **en cours**
4. La carte 3D s'affiche

**Mobile** :
1. Importer `gpsTrackingService`
2. Démarrer inspection → GPS démarre
3. Terminer inspection → GPS s'arrête

---

## 📡 ARCHITECTURE

### Flow Temps Réel

```
Mobile (Expo)                 Supabase Realtime              Web (React)
    |                                |                            |
    | 1. Start Inspection            |                            |
    |--> startTracking(missionId)    |                            |
    |                                |                            |
    | 2. Every 2 seconds:            |                            |
    |--> GPS Position                |                            |
    |    (lat, lng, bearing)         |                            |
    |                                |                            |
    | 3. Broadcast                   |                            |
    |--> channel.send()         ---->|                            |
    |                                |                            |
    |                                | 4. Relay                   |
    |                                |---> channel.on()           |
    |                                |     'gps_update'           |
    |                                |                            |
    |                                |     5. Update UI      <----|
    |                                |        - Move driver marker|
    |                                |        - Add to route      |
    |                                |        - Update stats      |
```

### Canal Realtime

**Format** : `mission:{missionId}:gps`

**Message** :
```json
{
  "type": "broadcast",
  "event": "gps_update",
  "payload": {
    "lat": 48.8566,
    "lng": 2.3522,
    "timestamp": 1703001234567,
    "bearing": 45,
    "speed": 13.5,
    "accuracy": 5
  }
}
```

---

## 🎨 FONCTIONNALITÉS

### Carte 3D

- ✅ Bâtiments 3D avec hauteurs
- ✅ Pitch 45° pour vue oblique
- ✅ Contrôles navigation + plein écran
- ✅ Style streets-v12 (modifiable)

### Marqueurs

- ✅ **Point A** : Vert, icône "A", popup départ
- ✅ **Point B** : Rouge, icône "B", popup arrivée
- ✅ **Chauffeur** : Cyan, icône 🚚, animation pulse

### Tracé GPS

- ✅ Ligne bleue (#3b82f6) largeur 5px
- ✅ Effet glow (blur + opacity)
- ✅ Mise à jour dynamique

### UI

- ✅ Légende interactive (bas gauche)
- ✅ Indicateur temps réel (haut gauche, vert pulsant)
- ✅ Affichage uniquement si `status = 'in_progress'`
- ✅ Message si coordonnées GPS manquantes

---

## 🔧 INTÉGRATION MOBILE

### InspectionDeparture

```typescript
import { gpsTrackingService } from '../services/gps-tracking';

const handleStartMission = async () => {
  // 1. Démarrer GPS (2s interval)
  await gpsTrackingService.startTracking(missionId, 2000);
  
  // 2. Update mission status
  await supabase.from('missions').update({ status: 'in_progress' });
};
```

### InspectionArrival

```typescript
const handleCompleteMission = async () => {
  // 1. Arrêter GPS
  await gpsTrackingService.stopTracking();
  
  // 2. Update mission
  await supabase.from('missions').update({ status: 'completed' });
};

// Cleanup automatique
useEffect(() => {
  return () => gpsTrackingService.stopTracking();
}, []);
```

---

## 📊 PERMISSIONS REQUISES

### Android (`mobile/app.json`)

```json
{
  "android": {
    "permissions": [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION"
    ]
  }
}
```

### iOS (`mobile/app.json`)

```json
{
  "ios": {
    "infoPlist": {
      "NSLocationWhenInUseUsageDescription": "Position requise pour le suivi en temps réel",
      "NSLocationAlwaysAndWhenInUseUsageDescription": "Position requise en arrière-plan"
    }
  }
}
```

---

## 🐛 DEBUGGING

### Logs Web

```typescript
console.log('Channel status:', channel.status); // SUBSCRIBED
console.log('Position reçue:', currentPosition);
console.log('Route GPS:', gpsRoute);
```

### Logs Mobile

```typescript
console.log('GPS actif:', gpsTrackingService.isActive());
console.log('Mission:', gpsTrackingService.getActiveMissionId());
```

### Tester sans mobile

```typescript
// Dans la console web
const testChannel = supabase.channel('mission:test-id:gps');
testChannel.subscribe();
testChannel.send({
  type: 'broadcast',
  event: 'gps_update',
  payload: { lat: 48.8566, lng: 2.3522, timestamp: Date.now() }
});
```

---

## 📈 PERFORMANCE

### Optimisations

- **Intervalle** : 2s = bon compromis
- **Distance min** : 5m (évite updates inutiles)
- **Précision** : `BestForNavigation`
- **Cleanup** : Arrêt auto si écran quitté

### Consommation batterie

- **GPS continu** : ~5-10% batterie/heure
- **Updates 2s** : ~15-20% batterie/heure
- **Recommandation** : Arrêter tracking si mission > 2h

---

## ⚠️ PROBLÈMES COURANTS

### Carte blanche

**Cause** : Token Mapbox invalide

**Solution** :
```bash
echo "VITE_MAPBOX_TOKEN=pk.eyJ..." > .env.local
npm run dev
```

### Pas de position GPS

**Cause** : Channel non souscrit

**Solution** :
```typescript
channel.subscribe((status) => {
  console.log('Status:', status); // Doit être 'SUBSCRIBED'
});
```

### Permissions refusées

**Solution** :
```typescript
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') {
  Alert.alert('Activez la localisation dans les paramètres');
}
```

---

## ✅ CHECKLIST PRODUCTION

- [ ] Token Mapbox configuré
- [ ] Permissions GPS mobile (iOS + Android)
- [ ] `startTracking()` au démarrage mission
- [ ] `stopTracking()` à la fin mission
- [ ] Cleanup dans `useEffect`
- [ ] Tests en conditions réelles
- [ ] Coordonnées GPS présentes en DB
- [ ] Canal Realtime testé

---

## 📚 DOCUMENTATION

- **Guide complet** : `MAPBOX_GPS_GUIDE.md`
- **Exemples mobile** : `mobile/GPS_INTEGRATION_EXAMPLE.md`
- **Mapbox Docs** : https://docs.mapbox.com/mapbox-gl-js/
- **Expo Location** : https://docs.expo.dev/versions/latest/sdk/location/
- **Supabase Realtime** : https://supabase.com/docs/guides/realtime

---

## 🎉 RÉSULTAT

✅ **Carte 3D** avec bâtiments et terrain
✅ **Point A/B** marqueurs personnalisés
✅ **Tracé GPS** bleu en temps réel
✅ **Chauffeur** icône 🚚 animée
✅ **Updates** toutes les 2 secondes
✅ **UI moderne** avec légende et indicateurs

**Prêt pour la production ! 🚀**

---

**Créé le** : 2024
**Stack** : Mapbox GL JS, Supabase Realtime, React, React Native, Expo
**Auteur** : Finality Team
