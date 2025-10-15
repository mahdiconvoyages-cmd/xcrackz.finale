# 🗺️ Guide d'Intégration Mapbox 3D avec Tracking GPS

## 📋 Résumé

Intégration complète de Mapbox GL JS avec suivi GPS en temps réel (2 secondes) utilisant Supabase Realtime.

## 🎯 Fonctionnalités

- ✅ Carte 3D avec bâtiments et terrain
- ✅ Point A (vert) et Point B (rouge) 
- ✅ Tracé GPS en bleu avec effet glow
- ✅ Icône chauffeur en temps réel avec animation pulse
- ✅ Mise à jour toutes les 2 secondes depuis mobile
- ✅ Affichage uniquement si mission en cours
- ✅ Légende interactive
- ✅ Contrôles de navigation et plein écran

## 📦 Installation

### 1. Token Mapbox

1. Créez un compte sur [mapbox.com](https://account.mapbox.com/auth/signup/)
2. Allez sur [Access Tokens](https://account.mapbox.com/access-tokens/)
3. Créez un nouveau token ou copiez le token par défaut
4. Ajoutez-le à votre fichier `.env.local` :

```bash
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbHh4eHh4eHh4In0.xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Vérifier l'installation

```powershell
# Vérifier que mapbox-gl est installé
npm list mapbox-gl

# Si absent, installer
npm install mapbox-gl
```

## 🏗️ Architecture

### Web (React)

**Composant MapboxTracking** (`src/components/MapboxTracking.tsx`)
- Affiche la carte 3D Mapbox
- Marqueurs A/B personnalisés
- Tracé GPS avec effet glow
- Marqueur chauffeur animé

**Page TrackingEnriched** (`src/pages/TrackingEnriched.tsx`)
- Liste des missions actives
- Statistiques temps réel
- Intégration MapboxTracking
- Abonnement Supabase Realtime channel

### Mobile (React Native)

**Service GPS** (`mobile/src/services/gps-tracking.ts`)
- Démarre/arrête le suivi GPS
- Publie positions via Supabase Realtime
- Intervalle configurable (défaut: 2s)

## 🚀 Utilisation

### 1. Démarrer le tracking depuis mobile

```typescript
import { gpsTrackingService } from './services/gps-tracking';

// Dans votre écran d'inspection
const handleStartInspection = async () => {
  try {
    // Démarrer le tracking GPS (toutes les 2 secondes)
    await gpsTrackingService.startTracking(missionId, 2000);
    
    // Lancer l'inspection...
  } catch (error) {
    console.error('Erreur GPS:', error);
  }
};

const handleEndInspection = async () => {
  // Arrêter le tracking
  await gpsTrackingService.stopTracking();
};
```

### 2. Voir le tracking sur web

1. Ouvrez `/tracking`
2. Sélectionnez une mission **en cours**
3. La carte 3D s'affiche automatiquement
4. Les positions GPS arrivent toutes les 2 secondes

## 📡 Canal Realtime Supabase

### Format du canal

```
mission:{missionId}:gps
```

### Format du message

```typescript
{
  type: 'broadcast',
  event: 'gps_update',
  payload: {
    lat: number,      // Latitude
    lng: number,      // Longitude
    timestamp: number, // Timestamp Unix
    bearing?: number,  // Direction (0-360°)
    speed?: number,    // Vitesse (m/s)
    accuracy?: number  // Précision (m)
  }
}
```

## 🎨 Personnalisation

### Couleurs des marqueurs

**Point A (Départ)** : Vert (#10b981)
```typescript
pickupEl.style.backgroundImage = 'url(data:image/svg+xml;base64,...)'
```

**Point B (Arrivée)** : Rouge (#ef4444)
```typescript
deliveryEl.style.backgroundImage = 'url(data:image/svg+xml;base64,...)'
```

**Chauffeur** : Cyan (#06b6d4)
```typescript
driverEl.style.backgroundImage = 'url(data:image/svg+xml;base64,...)'
```

**Tracé GPS** : Bleu (#3b82f6)
```typescript
paint: {
  'line-color': '#3b82f6',
  'line-width': 5
}
```

### Style de carte

Styles disponibles :
- `mapbox://styles/mapbox/streets-v12` (par défaut)
- `mapbox://styles/mapbox/satellite-v9`
- `mapbox://styles/mapbox/dark-v11`
- `mapbox://styles/mapbox/light-v11`
- `mapbox://styles/mapbox/navigation-day-v1`

```typescript
map.current = new mapboxgl.Map({
  style: 'mapbox://styles/mapbox/satellite-v9', // Changer ici
  // ...
});
```

### Angle de vue 3D

```typescript
map.current = new mapboxgl.Map({
  pitch: 45,  // Angle vertical (0-60)
  bearing: 0, // Rotation (0-360)
  // ...
});
```

## 🔧 Intégration dans les écrans d'inspection

### InspectionDeparture.tsx

```typescript
import { gpsTrackingService } from '../services/gps-tracking';

const handleStartMission = async () => {
  try {
    // 1. Mettre à jour le statut de la mission
    await updateMissionStatus('in_progress');
    
    // 2. Démarrer le tracking GPS
    await gpsTrackingService.startTracking(missionId, 2000);
    
    // 3. Navigation...
    navigation.navigate('InspectionArrival', { missionId });
  } catch (error) {
    console.error('Erreur:', error);
  }
};
```

### InspectionArrival.tsx

```typescript
import { gpsTrackingService } from '../services/gps-tracking';

const handleCompleteMission = async () => {
  try {
    // 1. Arrêter le tracking GPS
    await gpsTrackingService.stopTracking();
    
    // 2. Mettre à jour le statut
    await updateMissionStatus('completed');
    
    // 3. Navigation...
    navigation.navigate('Home');
  } catch (error) {
    console.error('Erreur:', error);
  }
};

// Arrêter le tracking si on quitte l'écran
useEffect(() => {
  return () => {
    gpsTrackingService.stopTracking();
  };
}, []);
```

## 📊 Permissions Mobile

### Android (`mobile/app.json`)

```json
{
  "expo": {
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    }
  }
}
```

### iOS (`mobile/app.json`)

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Nous avons besoin de votre position pour suivre la mission en temps réel",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Nous avons besoin de votre position en arrière-plan pour suivre la mission"
      }
    }
  }
}
```

## 🐛 Debugging

### Vérifier la connexion Realtime

```typescript
// Dans TrackingEnriched.tsx
const channel = supabase.channel(`mission:${selectedMission.id}:gps`);

channel.on('broadcast', { event: 'gps_update' }, (payload) => {
  console.log('✅ Position reçue:', payload);
});

channel.subscribe((status) => {
  console.log('📡 Channel status:', status); // 'SUBSCRIBED' = OK
});
```

### Vérifier l'envoi GPS

```typescript
// Dans mobile gps-tracking.ts
this.channel.send({
  type: 'broadcast',
  event: 'gps_update',
  payload: position,
});

console.log('📍 Position envoyée:', position);
```

### Logs utiles

```typescript
// Web
console.log('Mission sélectionnée:', selectedMission);
console.log('Position actuelle:', currentPosition);
console.log('Tracé GPS:', gpsRoute);

// Mobile
console.log('Tracking actif:', gpsTrackingService.isActive());
console.log('Mission ID:', gpsTrackingService.getActiveMissionId());
```

## 🚨 Problèmes Courants

### 1. Carte blanche/vide

**Cause** : Token Mapbox invalide ou manquant

**Solution** :
```bash
# Vérifier .env.local
cat .env.local | grep MAPBOX

# Ajouter le token
echo "VITE_MAPBOX_TOKEN=pk.eyJ..." >> .env.local

# Redémarrer Vite
npm run dev
```

### 2. Pas de position GPS reçue

**Cause** : Channel Realtime non souscrit ou mobile non connecté

**Solution** :
```typescript
// Vérifier dans la console web
console.log('Channel status:', channel.status);

// Vérifier dans la console mobile
console.log('Tracking active:', gpsTrackingService.isActive());
```

### 3. Mission pas affichée

**Cause** : Mission pas en statut 'in_progress'

**Solution** :
```sql
-- Vérifier le statut
SELECT id, reference, status FROM missions WHERE id = 'xxx';

-- Mettre en cours si besoin
UPDATE missions SET status = 'in_progress' WHERE id = 'xxx';
```

### 4. Permissions GPS refusées

**Cause** : Utilisateur a refusé les permissions

**Solution** :
```typescript
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') {
  Alert.alert(
    'Permission requise',
    'Activez la localisation dans les paramètres',
    [{ text: 'Ouvrir', onPress: () => Linking.openSettings() }]
  );
}
```

## 📈 Performance

### Optimisations

1. **Intervalle de tracking** : 2s = bon compromis précision/batterie
2. **Distance minimale** : 5m pour éviter updates inutiles
3. **Précision GPS** : `BestForNavigation` pour tracking optimal
4. **Désinscription** : Toujours appeler `stopTracking()` pour économiser batterie

### Limites Supabase Realtime

- Max 100 connexions simultanées (plan gratuit)
- Max 2MB/message
- ~200 messages/seconde

## ✅ Checklist de déploiement

- [ ] Token Mapbox configuré dans `.env.local`
- [ ] Permissions GPS configurées mobile (iOS + Android)
- [ ] `gpsTrackingService.startTracking()` appelé au démarrage mission
- [ ] `gpsTrackingService.stopTracking()` appelé à la fin mission
- [ ] Canal Realtime testé (web + mobile)
- [ ] Carte 3D affichée uniquement si mission en cours
- [ ] Coordonnées GPS présentes dans `missions` table
- [ ] Tests en conditions réelles (déplacement véhicule)

## 🎉 Résultat Final

- Carte 3D interactive avec bâtiments
- Point A vert (départ) et Point B rouge (arrivée)
- Tracé GPS bleu en temps réel
- Icône chauffeur 🚚 avec animation pulse
- Mise à jour toutes les 2 secondes
- Légende et contrôles intégrés
- Interface responsive et moderne

---

**Créé le** : 2024
**Technos** : Mapbox GL JS 3.x, Supabase Realtime, React 18, React Native, Expo Location
**Auteur** : Finality Team
