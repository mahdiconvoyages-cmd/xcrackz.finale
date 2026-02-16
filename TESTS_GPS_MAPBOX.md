# 🧪 Guide de Test - Mapbox GPS Tracking

## ✅ TESTS À EFFECTUER

### 1️⃣ Test Web - Configuration Mapbox

**Objectif** : Vérifier que le token Mapbox fonctionne

```bash
# 1. Créer le fichier .env.local
cd c:\Users\mahdi\Documents\Finality-okok
echo "VITE_MAPBOX_TOKEN=YOUR_TOKEN_HERE" > .env.local
echo "VITE_SUPABASE_URL=YOUR_SUPABASE_URL" >> .env.local
echo "VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY" >> .env.local

# 2. Démarrer le serveur
npm run dev

# 3. Ouvrir http://localhost:5173/tracking
```

**Résultat attendu** :
- ✅ Page de tracking s'affiche
- ✅ Liste des missions actives visible
- ✅ Sélection d'une mission fonctionne
- ✅ Si mission en cours : carte Mapbox 3D visible
- ✅ Si mission en attente : message "Mission en attente"

**Résultats possibles** :
- ❌ Carte blanche → Token Mapbox invalide
- ❌ Erreur console "accessToken required" → Token manquant
- ✅ Carte 3D avec bâtiments → Token OK !

---

### 2️⃣ Test Web - Supabase Realtime

**Objectif** : Vérifier que le canal Realtime fonctionne

**Méthode 1 : Console navigateur**

```javascript
// 1. Ouvrir DevTools (F12)
// 2. Aller dans Console
// 3. Créer un canal de test

const testChannel = supabase.channel('mission:test-123:gps');

testChannel.on('broadcast', { event: 'gps_update' }, (payload) => {
  console.log('✅ Message reçu:', payload);
});

testChannel.subscribe((status) => {
  console.log('📡 Channel status:', status);
  
  if (status === 'SUBSCRIBED') {
    // Envoyer un message test
    testChannel.send({
      type: 'broadcast',
      event: 'gps_update',
      payload: {
        lat: 48.8566,
        lng: 2.3522,
        timestamp: Date.now(),
        bearing: 45
      }
    });
  }
});
```

**Résultat attendu** :
```
📡 Channel status: SUBSCRIBED
✅ Message reçu: { payload: { lat: 48.8566, lng: 2.3522, ... } }
```

**Méthode 2 : Avec une vraie mission**

```sql
-- 1. Dans Supabase SQL Editor, créer une mission test
INSERT INTO missions (
  user_id,
  reference,
  status,
  vehicle_brand,
  vehicle_model,
  vehicle_plate,
  pickup_address,
  delivery_address,
  pickup_date,
  pickup_lat,
  pickup_lng,
  delivery_lat,
  delivery_lng
) VALUES (
  'your-user-id',
  'TEST-GPS-001',
  'in_progress',
  'Tesla',
  'Model 3',
  'TEST-123',
  '1 Avenue des Champs-Élysées, Paris',
  'Tour Eiffel, Paris',
  NOW(),
  48.8698,
  2.3078,
  48.8584,
  2.2945
) RETURNING id;
```

```javascript
// 2. Dans la console, avec le vrai ID de mission
const missionId = 'le-vrai-id-retourné';
const channel = supabase.channel(`mission:${missionId}:gps`);

channel.on('broadcast', { event: 'gps_update' }, (payload) => {
  console.log('✅ Position reçue:', payload.payload);
});

channel.subscribe((status) => {
  console.log('Status:', status);
  
  if (status === 'SUBSCRIBED') {
    // Simuler un déplacement du chauffeur
    let lat = 48.8698;
    let lng = 2.3078;
    
    setInterval(() => {
      lat += 0.0001; // Se déplacer vers le sud
      lng += 0.0001; // Se déplacer vers l'est
      
      channel.send({
        type: 'broadcast',
        event: 'gps_update',
        payload: {
          lat,
          lng,
          timestamp: Date.now(),
          bearing: 135,
          speed: 13.5
        }
      });
      
      console.log('📍 Position envoyée:', { lat, lng });
    }, 2000); // Toutes les 2 secondes
  }
});
```

**Résultat attendu** :
- ✅ Marqueur chauffeur apparaît sur la carte
- ✅ Marqueur se déplace toutes les 2 secondes
- ✅ Tracé GPS s'allonge
- ✅ Indicateur "Mise à jour en temps réel" visible

---

### 3️⃣ Test Mobile - Permissions GPS

**Objectif** : Vérifier que les permissions fonctionnent

```bash
cd mobile
npm start
# Puis presser 'i' pour iOS ou 'a' pour Android
```

**Dans l'app mobile** :

```typescript
// Ajouter temporairement dans App.tsx ou un écran de test
import * as Location from 'expo-location';
import { Button, Alert } from 'react-native';

const TestGPSPermissions = () => {
  const testPermissions = async () => {
    try {
      // 1. Demander permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission refusée');
        return;
      }
      
      // 2. Vérifier si GPS activé
      const enabled = await Location.hasServicesEnabledAsync();
      console.log('GPS enabled:', enabled);
      
      if (!enabled) {
        Alert.alert('GPS désactivé');
        return;
      }
      
      // 3. Obtenir position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation
      });
      
      console.log('Position:', location.coords);
      Alert.alert('Succès', `Lat: ${location.coords.latitude}, Lng: ${location.coords.longitude}`);
      
    } catch (error) {
      console.error('Erreur GPS:', error);
      Alert.alert('Erreur', error.message);
    }
  };
  
  return <Button title="Tester GPS" onPress={testPermissions} />;
};
```

**Résultat attendu** :
- ✅ Popup demande permission
- ✅ Alert avec coordonnées GPS
- ✅ Console log avec lat/lng

**Erreurs possibles** :
- ❌ "Permission refusée" → Utilisateur a cliqué "Non"
- ❌ "GPS désactivé" → Activer localisation dans paramètres
- ❌ "Location services are not enabled" → Paramètres système

---

### 4️⃣ Test Mobile - Service GPS Tracking

**Objectif** : Tester le service `gps-tracking.ts`

```typescript
// Dans un écran de test
import { gpsTrackingService } from '../services/gps-tracking';
import { Button, View, Text } from 'react-native';
import { useState } from 'react';

const TestGPSTracking = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [status, setStatus] = useState('');
  
  const startTest = async () => {
    try {
      setStatus('Démarrage...');
      
      // Démarrer avec un ID de test
      await gpsTrackingService.startTracking('test-mission-123', 2000);
      
      setIsTracking(true);
      setStatus('✅ Tracking actif');
      
    } catch (error) {
      setStatus('❌ Erreur: ' + error.message);
    }
  };
  
  const stopTest = async () => {
    await gpsTrackingService.stopTracking();
    setIsTracking(false);
    setStatus('Arrêté');
  };
  
  return (
    <View style={{ padding: 20 }}>
      <Text>{status}</Text>
      <Text>Tracking: {isTracking ? 'Actif' : 'Inactif'}</Text>
      
      <Button 
        title="Démarrer" 
        onPress={startTest} 
        disabled={isTracking}
      />
      
      <Button 
        title="Arrêter" 
        onPress={stopTest} 
        disabled={!isTracking}
      />
    </View>
  );
};
```

**Résultat attendu** :
- ✅ Logs dans console : "GPS tracking started for mission test-mission-123"
- ✅ Logs toutes les 2s : "GPS position published: { lat: ..., lng: ... }"
- ✅ Vérifier dans Supabase Dashboard → Realtime → Channels actifs

---

### 5️⃣ Test Intégration Complète (End-to-End)

**Objectif** : Tester le flow complet mobile → web

**Setup** :
1. Web ouvert sur `/tracking`
2. Mobile avec l'app lancée
3. Mission créée en DB avec `status = 'in_progress'`

**Steps** :

1. **Sur web** :
   ```typescript
   // Sélectionner la mission dans la liste
   // Vérifier que la carte 3D s'affiche
   // Console : "Realtime channel status: SUBSCRIBED"
   ```

2. **Sur mobile** :
   ```typescript
   // Dans InspectionDeparture
   await gpsTrackingService.startTracking(missionId, 2000);
   // Console : "GPS tracking started"
   // Console : "GPS position published: ..."
   ```

3. **Sur web** :
   ```typescript
   // Console toutes les 2s : "GPS update received: { lat, lng, ... }"
   // Carte : Marqueur chauffeur se déplace
   // Carte : Tracé GPS s'allonge
   ```

4. **Vérifications** :
   - ✅ Point A (vert) affiché
   - ✅ Point B (rouge) affiché
   - ✅ Marqueur chauffeur (cyan) visible et animé
   - ✅ Tracé bleu entre positions
   - ✅ Indicateur "Temps réel" en haut à gauche
   - ✅ Légende en bas à gauche

5. **Sur mobile** :
   ```typescript
   // Terminer la mission
   await gpsTrackingService.stopTracking();
   // Console : "GPS tracking stopped"
   ```

6. **Sur web** :
   ```typescript
   // Plus de mises à jour GPS
   // Dernière position reste affichée
   ```

---

### 6️⃣ Test Performance

**Objectif** : Vérifier la consommation batterie et réseau

**Méthode** :
```typescript
// Dans gps-tracking.ts, ajouter des métriques
let positionCount = 0;
let startTime = Date.now();

this.publishPosition = (location) => {
  positionCount++;
  const elapsed = (Date.now() - startTime) / 1000; // secondes
  const rate = positionCount / elapsed;
  
  console.log(`📊 Stats: ${positionCount} positions en ${elapsed}s (${rate.toFixed(2)}/s)`);
  
  // ... reste du code
};
```

**Résultat attendu** :
- ✅ ~0.5 positions/seconde (1 toutes les 2s)
- ✅ Batterie : -5 à -10% par heure
- ✅ Données réseau : ~1KB/position → 1.8KB/min → 108KB/h

---

### 7️⃣ Test Cas Limites

**1. Mission sans coordonnées GPS**
```sql
UPDATE missions SET pickup_lat = NULL, pickup_lng = NULL WHERE id = 'test-id';
```
**Résultat attendu** : Message "Coordonnées GPS manquantes"

**2. Perte de connexion réseau**
- Activer mode avion
- GPS continue de fonctionner localement
- Désactiver mode avion → messages envoyés en batch

**3. App en arrière-plan**
- Mettre l'app en background
- GPS continue (si permissions background activées)
- Revenir en foreground → tracking toujours actif

**4. Tracking multiple**
```typescript
await gpsTrackingService.startTracking('mission-1', 2000);
await gpsTrackingService.startTracking('mission-2', 2000); // Warning
```
**Résultat attendu** : Console warning "GPS tracking already started"

---

## 📋 CHECKLIST VALIDATION

Avant de déployer, vérifier :

- [ ] Token Mapbox valide dans `.env.local`
- [ ] Carte 3D s'affiche correctement
- [ ] Marqueurs A/B visibles
- [ ] Permissions GPS mobile accordées
- [ ] Service `gps-tracking.ts` démarre/arrête
- [ ] Positions publiées toutes les 2s
- [ ] Canal Realtime subscribed
- [ ] Positions reçues sur web
- [ ] Marqueur chauffeur se déplace
- [ ] Tracé GPS s'allonge
- [ ] Cleanup automatique fonctionne
- [ ] Pas d'erreurs console
- [ ] Performance acceptable (< 10% batterie/h)

---

## 🐛 DEBUGGING AVANCÉ

### Vérifier Supabase Realtime

```sql
-- Dans Supabase SQL Editor
SELECT * FROM realtime.channels;
SELECT * FROM realtime.messages ORDER BY inserted_at DESC LIMIT 10;
```

### Logs détaillés

```typescript
// Web (TrackingEnriched.tsx)
useEffect(() => {
  const channel = supabase.channel(`mission:${selectedMission.id}:gps`);
  
  channel.on('broadcast', { event: 'gps_update' }, (payload) => {
    console.log('📍 [WEB] Position:', payload.payload);
    console.log('⏰ [WEB] Timestamp:', new Date(payload.payload.timestamp));
    console.log('🕐 [WEB] Latency:', Date.now() - payload.payload.timestamp, 'ms');
  });
}, [selectedMission]);

// Mobile (gps-tracking.ts)
this.publishPosition = (location) => {
  const position = { /* ... */ };
  
  console.log('📍 [MOBILE] Envoi position:', position);
  console.log('🌍 [MOBILE] Accuracy:', position.accuracy, 'm');
  console.log('⚡ [MOBILE] Speed:', position.speed, 'm/s');
  
  this.channel.send({ /* ... */ });
};
```

### Network Inspector

Dans Chrome DevTools :
1. Onglet Network
2. Filter : WS (WebSocket)
3. Chercher connexion Supabase Realtime
4. Voir messages broadcast en temps réel

---

**Tests réussis = Intégration prête ! 🎉**
