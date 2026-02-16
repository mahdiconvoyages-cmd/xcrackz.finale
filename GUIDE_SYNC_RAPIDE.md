# 🔄 GUIDE RAPIDE - SYNCHRONISATION TEMPS RÉEL

## ✅ CE QUI EST FAIT

### Fichiers créés :
1. ✅ `src/services/realtimeSync.ts` - Service sync Web
2. ✅ `mobile/src/hooks/useRealtimeSync.ts` - Hook sync Mobile
3. ✅ `src/components/OpenStreetMap.tsx` - Maps gratuites Web
4. ✅ `ACTIVER_REALTIME_SUPABASE.sql` - Script SQL Realtime
5. ✅ `install-realtime-sync.ps1` - Script installation

---

## 🚀 ACTIVATION EN 3 ÉTAPES

### ÉTAPE 1 : Installer dépendances (5 min)

```powershell
# Double-cliquer sur :
install-realtime-sync.ps1
```

Ou manuel :
```bash
# Web
npm install leaflet react-leaflet
npm install -D @types/leaflet

# Mobile
cd mobile
npm install expo-notifications
```

---

### ÉTAPE 2 : Activer Realtime Supabase (2 min)

1. Aller sur https://supabase.com/dashboard
2. Ouvrir votre projet
3. Aller dans **SQL Editor**
4. Copier/coller le contenu de `ACTIVER_REALTIME_SUPABASE.sql`
5. Cliquer **Run**

✅ Résultat attendu :
```
✅ Realtime activé sur missions
✅ Realtime activé sur mission_assignments  
✅ Realtime activé sur mission_locations
✅ Realtime activé sur profiles
```

---

### ÉTAPE 3 : Utiliser dans vos composants

#### 🌐 WEB - Exemple TeamMissions.tsx

```typescript
import { useEffect } from 'react';
import { realtimeSync } from '../services/realtimeSync';

function TeamMissions() {
  const { user } = useAuth();
  
  useEffect(() => {
    // Demander permission notifications
    realtimeSync.requestNotificationPermission();
    
    // 📋 Subscribe missions
    const missionChannel = realtimeSync.subscribeToMissions(() => {
      loadMissions(); // Refresh automatique
    });
    
    // 🎯 Subscribe assignments
    const assignmentChannel = realtimeSync.subscribeToAssignments(user.id, () => {
      loadReceivedAssignments(); // Refresh auto
    });
    
    // 🧹 Cleanup
    return () => {
      realtimeSync.unsubscribeAll();
    };
  }, [user.id]);
  
  // Reste du code...
}
```

#### 📱 MOBILE - Exemple TeamMissionsScreen.tsx

```typescript
import { useRealtimeSync } from '../hooks/useRealtimeSync';

function TeamMissionsScreen() {
  const { user } = useAuth();
  
  // 🔄 Hook de synchronisation
  const { lastUpdate, isConnected } = useRealtimeSync({
    userId: user.id,
    onMissionChange: () => loadMissions(),
    onAssignmentChange: () => loadReceivedAssignments(),
    onLocationUpdate: () => refreshMap(),
  });
  
  // Afficher statut connexion
  <View>
    {isConnected ? (
      <Text>🟢 Connecté</Text>
    ) : (
      <Text>🔴 Déconnecté</Text>
    )}
  </View>
}
```

---

## 🗺️ MAPS GRATUITES

### WEB - OpenStreetMap

```typescript
import { OpenStreetMap } from '../components/OpenStreetMap';

function MapPage() {
  const markers = [
    {
      lat: 48.8566,
      lng: 2.3522,
      label: '<b>📍 Pickup</b><br/>Adresse départ',
      color: 'green',
    },
    {
      lat: 48.8606,
      lng: 2.3376,
      label: '<b>🚗 En cours</b><br/>Mission #1234',
      color: 'red',
    },
  ];
  
  return (
    <OpenStreetMap
      center={{ lat: 48.8566, lng: 2.3522 }}
      zoom={13}
      markers={markers}
      height="600px"
    />
  );
}
```

### MOBILE - Provider DEFAULT (Gratuit)

Déjà fait ! ✅ `TeamMapScreen.tsx` utilise :
```typescript
<MapView
  provider={PROVIDER_DEFAULT} // Apple Maps (iOS) ou OSM (Android)
  // ... pas besoin Google API Key
/>
```

---

## 🔔 NOTIFICATIONS

### WEB - Browser Notifications (Natif)

Automatique ! ✅ `realtimeSync.ts` envoie déjà :
- ✅ "🚗 Nouvelle Mission" sur assignation
- ✅ "✅ Mission Acceptée" sur acceptation
- ✅ "❌ Mission Refusée" sur refus

### MOBILE - Expo Notifications (Local)

Automatique ! ✅ `useRealtimeSync.ts` envoie déjà :
- ✅ "🚗 Nouvelle Mission" sur assignation
- ✅ "✅ Mission Acceptée" sur acceptation
- ✅ "❌ Mission Refusée" sur refus

---

## 📊 TABLEAU SYNCHRONISATION

| Événement | Web ↔ Mobile | Notification Web | Notification Mobile |
|-----------|--------------|------------------|---------------------|
| Mission créée | ✅ Temps réel | ❌ | ❌ |
| Mission assignée | ✅ Temps réel | ✅ Push | ✅ Locale |
| Statut changé | ✅ Temps réel | ❌ | ❌ |
| Assignment accepté | ✅ Temps réel | ✅ Push | ✅ Locale |
| Assignment refusé | ✅ Temps réel | ✅ Push | ✅ Locale |
| GPS position | ✅ Temps réel (2s) | ❌ | ❌ |

---

## 🧪 TESTER

### Test 1 : Synchronisation Missions

1. Ouvrir web + mobile
2. Créer mission sur web
3. ✅ Doit apparaître sur mobile en < 1 seconde

### Test 2 : Assignation

1. Assigner mission depuis web
2. ✅ Notification sur mobile
3. ✅ Mission apparaît dans "Reçues"
4. Accepter sur mobile
5. ✅ Notification sur web
6. ✅ Statut change sur web

### Test 3 : GPS Temps Réel

1. Démarrer mission sur mobile
2. Ouvrir map sur web
3. ✅ Position se rafraîchit toutes les 2 secondes

---

## 💡 AVANTAGES

### Synchronisation
- ✅ Instantanée (< 1 seconde)
- ✅ Bidirectionnelle (web ↔ mobile)
- ✅ Pas de polling (économie batterie)
- ✅ Reconnexion automatique

### Maps Gratuites
- ✅ OpenStreetMap : 0€, illimité
- ✅ Pas d'API key nécessaire
- ✅ Qualité identique Google Maps
- ✅ Open source

### Notifications
- ✅ Web : Browser Notifications (natif)
- ✅ Mobile : Expo Notifications (local)
- ✅ Pas de service externe nécessaire
- ✅ Tout gratuit

---

## 🎯 RÉSULTAT FINAL

**Avant** :
- ❌ Refresh manuel
- ❌ Google Maps payant
- ❌ Pas de notifications

**Après** :
- ✅ Synchronisation temps réel automatique
- ✅ Maps 100% gratuites
- ✅ Notifications automatiques web + mobile
- ✅ Expérience fluide

**TOUT EN TEMPS RÉEL, TOUT GRATUIT ! 🚀**
