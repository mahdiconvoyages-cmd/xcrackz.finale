# 🔄 SYNCHRONISATION WEB ↔ MOBILE TEMPS RÉEL

## 🎯 OBJECTIF

Synchroniser **toutes les données** entre web et mobile en temps réel :
- ✅ Missions (créer, modifier, supprimer)
- ✅ Assignations (assigner, accepter, refuser)
- ✅ Positions GPS (tracking temps réel)
- ✅ Statuts missions (pending → in_progress → completed)
- ✅ Notifications push (OneSignal)

---

## 🔔 PARTIE 1 : NOTIFICATIONS PUSH (ONESIGNAL)

### Configuration OneSignal

**1. Créer compte OneSignal** (GRATUIT)

1. Aller sur https://onesignal.com
2. Créer compte gratuit
3. Créer nouvelle app "Finality"
4. Sélectionner plateformes : Web + Mobile

**2. Configuration Web**

```javascript
// Dans index.html ou App.tsx (web)
<script src="https://cdn.onesignal.com/sdks/OneSignalSDK.js" async=""></script>
<script>
  window.OneSignal = window.OneSignal || [];
  OneSignal.push(function() {
    OneSignal.init({
      appId: "VOTRE_ONESIGNAL_APP_ID",
    });
  });
</script>
```

**3. Configuration Mobile (React Native)**

Déjà fait ! ✅ Fichier : `src/services/OneSignalService.ts`

---

## 📡 PARTIE 2 : SUPABASE REALTIME (SYNCHRONISATION)

### Activer Realtime sur toutes les tables

```sql
-- Activer Realtime sur missions
ALTER PUBLICATION supabase_realtime ADD TABLE missions;

-- Activer Realtime sur mission_assignments
ALTER PUBLICATION supabase_realtime ADD TABLE mission_assignments;

-- Activer Realtime sur mission_locations
ALTER PUBLICATION supabase_realtime ADD TABLE mission_locations;

-- Activer Realtime sur profiles
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
```

---

## 🌐 PARTIE 3 : WEB - SYNCHRONISATION TEMPS RÉEL

### Service de Synchronisation Web

Créer : `src/services/realtimeSync.ts`

```typescript
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

class RealtimeSync {
  private channels: RealtimeChannel[] = [];

  /**
   * Écouter les changements sur missions
   */
  subscribeToMissions(callback: (payload: any) => void) {
    const channel = supabase
      .channel('missions-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'missions',
        },
        (payload) => {
          console.log('🔄 Mission changed:', payload);
          callback(payload);
        }
      )
      .subscribe();

    this.channels.push(channel);
    return channel;
  }

  /**
   * Écouter les changements sur assignments
   */
  subscribeToAssignments(userId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel('assignments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mission_assignments',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 Assignment changed:', payload);
          callback(payload);
        }
      )
      .subscribe();

    this.channels.push(channel);
    return channel;
  }

  /**
   * Écouter les positions GPS temps réel
   */
  subscribeToLocations(missionIds: string[], callback: (payload: any) => void) {
    const channel = supabase
      .channel('locations-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mission_locations',
        },
        (payload) => {
          // Filtrer uniquement les missions qui nous intéressent
          if (missionIds.includes(payload.new.mission_id)) {
            console.log('📍 New location:', payload);
            callback(payload);
          }
        }
      )
      .subscribe();

    this.channels.push(channel);
    return channel;
  }

  /**
   * Nettoyer toutes les subscriptions
   */
  unsubscribeAll() {
    this.channels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.channels = [];
  }
}

export const realtimeSync = new RealtimeSync();
```

### Utilisation dans TeamMissions.tsx (Web)

```typescript
import { useEffect } from 'react';
import { realtimeSync } from '../services/realtimeSync';

// Dans le composant
useEffect(() => {
  // Subscribe aux changements
  const missionChannel = realtimeSync.subscribeToMissions((payload) => {
    // Refresh la liste des missions
    loadMissions();
  });

  const assignmentChannel = realtimeSync.subscribeToAssignments(userId, (payload) => {
    // Refresh les assignments
    loadReceivedAssignments();
    
    // Afficher notification
    if (payload.eventType === 'INSERT') {
      showNotification('Nouvelle mission assignée !');
    }
  });

  return () => {
    realtimeSync.unsubscribeAll();
  };
}, [userId]);
```

---

## 📱 PARTIE 4 : MOBILE - SYNCHRONISATION TEMPS RÉEL

### Service déjà existant

✅ Fichier : `src/hooks/useUnreadAssignmentsCount.ts`

Étendre pour toutes les tables :

```typescript
// Créer : src/hooks/useRealtimeSync.ts

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtimeSync(userId: string) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // Subscribe missions
    const missionsChannel = supabase
      .channel('missions-sync')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'missions' },
        () => setLastUpdate(new Date())
      )
      .subscribe();

    // Subscribe assignments
    const assignmentsChannel = supabase
      .channel('assignments-sync')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'mission_assignments', filter: `user_id=eq.${userId}` },
        (payload) => {
          setLastUpdate(new Date());
          
          // Notification locale
          if (payload.eventType === 'INSERT') {
            Notifications.scheduleNotificationAsync({
              content: {
                title: '🚗 Nouvelle Mission',
                body: 'Une mission vous a été assignée',
              },
              trigger: null,
            });
          }
        }
      )
      .subscribe();

    // Subscribe locations
    const locationsChannel = supabase
      .channel('locations-sync')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mission_locations' },
        () => setLastUpdate(new Date())
      )
      .subscribe();

    return () => {
      supabase.removeChannel(missionsChannel);
      supabase.removeChannel(assignmentsChannel);
      supabase.removeChannel(locationsChannel);
    };
  }, [userId]);

  return lastUpdate;
}
```

### Utilisation dans TeamMissionsScreen (Mobile)

```typescript
import { useRealtimeSync } from '../hooks/useRealtimeSync';

function TeamMissionsScreen() {
  const lastUpdate = useRealtimeSync(userId);

  useEffect(() => {
    // Refresh automatique quand lastUpdate change
    loadMissions();
    loadReceivedAssignments();
  }, [lastUpdate]);

  // Reste du code...
}
```

---

## 🗺️ PARTIE 5 : ALTERNATIVE GRATUITE À GOOGLE MAPS

### Option 1 : OpenStreetMap + React-Leaflet (WEB)

**Installation** :
```bash
npm install react-leaflet leaflet
npm install -D @types/leaflet
```

**Remplacer Google Maps** :

```typescript
// src/components/MapView.tsx
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export function MapView({ missions }) {
  return (
    <MapContainer 
      center={[48.8566, 2.3522]} 
      zoom={13} 
      style={{ height: '100%', width: '100%' }}
    >
      {/* Tiles GRATUITS OpenStreetMap */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Marqueurs */}
      {missions.map(mission => (
        <Marker 
          key={mission.id}
          position={[mission.last_latitude, mission.last_longitude]}
        >
          <Popup>
            <strong>{mission.reference}</strong><br />
            {mission.assignee_name}
          </Popup>
        </Marker>
      ))}

      {/* Lignes de route */}
      {missions.map(mission => (
        mission.pickup_lat && mission.delivery_lat && (
          <Polyline
            key={`route-${mission.id}`}
            positions={[
              [mission.pickup_lat, mission.pickup_lng],
              [mission.last_latitude, mission.last_longitude],
              [mission.delivery_lat, mission.delivery_lng],
            ]}
            color="#14b8a6"
            dashArray="5, 5"
          />
        )
      ))}
    </MapContainer>
  );
}
```

**Avantages** :
- ✅ 100% GRATUIT
- ✅ Pas de limite d'utilisation
- ✅ Pas d'API key nécessaire
- ✅ Open source

### Option 2 : Mapbox (Alternative)

**Gratuit jusqu'à 50,000 chargements/mois**

```bash
npm install react-map-gl mapbox-gl
```

```typescript
import Map, { Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

<Map
  mapboxAccessToken="pk.YOUR_FREE_TOKEN"
  initialViewState={{
    longitude: 2.3522,
    latitude: 48.8566,
    zoom: 13
  }}
  style={{width: '100%', height: '100%'}}
  mapStyle="mapbox://styles/mapbox/streets-v12"
>
  {/* Marqueurs */}
</Map>
```

### Option 3 : React Native Maps SANS Google (MOBILE)

**Utiliser OpenStreetMap** :

```typescript
// mobile - Pas besoin Google Maps API Key
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

<MapView
  provider={PROVIDER_DEFAULT} // Utilise Apple Maps sur iOS, OSM sur Android
  style={styles.map}
  initialRegion={{
    latitude: 48.8566,
    longitude: 2.3522,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  }}
>
  {/* Marqueurs */}
</MapView>
```

**Sur Android** : Utilise OpenStreetMap automatiquement (GRATUIT)  
**Sur iOS** : Utilise Apple Maps (GRATUIT)

---

## 🔔 PARTIE 6 : NOTIFICATIONS PUSH COMPLÈTES

### Créer Supabase Edge Function

**Fichier** : `supabase/functions/send-notification/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');

serve(async (req) => {
  try {
    const { userId, title, message, data } = await req.json();

    // Envoyer notification via OneSignal
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [userId],
        headings: { en: title },
        contents: { en: message },
        data: data,
      }),
    });

    const result = await response.json();
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### Trigger automatique sur assignment

```sql
-- Créer fonction trigger
CREATE OR REPLACE FUNCTION notify_new_assignment()
RETURNS TRIGGER AS $$
DECLARE
  mission_ref TEXT;
  assigner_name TEXT;
BEGIN
  -- Récupérer infos mission
  SELECT reference INTO mission_ref
  FROM missions
  WHERE id = NEW.mission_id;

  -- Récupérer nom assigneur
  SELECT full_name INTO assigner_name
  FROM profiles
  WHERE id = NEW.assigned_by;

  -- Appeler Edge Function
  PERFORM net.http_post(
    url := 'https://bfrkthzovwpjrvqktdjn.supabase.co/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'userId', NEW.user_id::text,
      'title', '🚗 Nouvelle Mission',
      'message', assigner_name || ' vous a assigné ' || mission_ref,
      'data', jsonb_build_object(
        'type', 'new_assignment',
        'mission_id', NEW.mission_id,
        'assignment_id', NEW.id
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer trigger
CREATE TRIGGER on_assignment_created
  AFTER INSERT ON mission_assignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_assignment();
```

---

## 📊 TABLEAU DE SYNCHRONISATION

| Événement | Web → Mobile | Mobile → Web | Notification |
|-----------|--------------|--------------|--------------|
| Mission créée | ✅ Realtime | ✅ Realtime | ❌ |
| Mission assignée | ✅ Realtime | ✅ Realtime | ✅ Push |
| Statut changé | ✅ Realtime | ✅ Realtime | ✅ Push |
| GPS position | ✅ Realtime | ✅ Realtime | ❌ |
| Assignment accepté | ✅ Realtime | ✅ Realtime | ✅ Push |
| Mission complétée | ✅ Realtime | ✅ Realtime | ✅ Push |

---

## 🚀 DÉPLOIEMENT

### 1. Activer Realtime Supabase

```sql
-- Exécuter dans Supabase SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE missions;
ALTER PUBLICATION supabase_realtime ADD TABLE mission_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE mission_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
```

### 2. Créer compte OneSignal

1. https://onesignal.com → Sign Up
2. Créer app "Finality"
3. Noter APP_ID et API_KEY

### 3. Configurer Web

```javascript
// Dans public/index.html
<script src="https://cdn.onesignal.com/sdks/OneSignalSDK.js" async=""></script>
<script>
  window.OneSignal = window.OneSignal || [];
  OneSignal.push(function() {
    OneSignal.init({
      appId: "VOTRE_APP_ID",
      notifyButton: {
        enable: true,
      },
    });
  });
</script>
```

### 4. Mobile déjà configuré ✅

Fichier : `src/services/OneSignalService.ts`

---

## 💡 AVANTAGES

### Synchronisation Temps Réel
- ✅ Pas de refresh manuel
- ✅ Changements instantanés
- ✅ Expérience fluide
- ✅ Économie batterie (pas de polling)

### Maps Gratuites
- ✅ OpenStreetMap : 0€, illimité
- ✅ Leaflet : Open source
- ✅ Pas d'API key
- ✅ Même qualité

### Notifications Push
- ✅ OneSignal gratuit : 10,000 utilisateurs
- ✅ Web + Mobile + iOS
- ✅ Analytics inclus
- ✅ Segmentation

---

## 📝 FICHIERS À CRÉER

1. **Web** :
   - `src/services/realtimeSync.ts` (service sync)
   - `src/components/MapView.tsx` (Leaflet)
   - Modifier `index.html` (OneSignal)

2. **Mobile** :
   - `src/hooks/useRealtimeSync.ts` (hook sync)
   - Modifier `TeamMissionsScreen.tsx` (utiliser hook)
   - Modifier `TeamMapScreen.tsx` (enlever Google Maps key)

3. **Supabase** :
   - `supabase/functions/send-notification/index.ts`
   - SQL triggers (notifications auto)

---

## ✅ RÉSUMÉ

**Synchronisation** : ✅ Supabase Realtime (gratuit)  
**Notifications** : ✅ OneSignal (gratuit jusqu'à 10k users)  
**Maps Web** : ✅ OpenStreetMap + Leaflet (100% gratuit)  
**Maps Mobile** : ✅ Provider DEFAULT (Apple Maps/OSM gratuit)  

**TOUT GRATUIT, TOUT EN TEMPS RÉEL ! 🚀**
