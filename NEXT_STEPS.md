# 🚀 PROCHAINES ÉTAPES - Configuration et Tests

## 📋 ÉTAPES IMMÉDIATES

### 1️⃣ Configuration Mapbox (5 minutes)

```powershell
# 1. Créer un compte Mapbox (gratuit)
# Aller sur : https://account.mapbox.com/auth/signup/

# 2. Obtenir le token
# Aller sur : https://account.mapbox.com/access-tokens/
# Copier le "Default public token" qui commence par pk.

# 3. Configurer .env.local
cd c:\Users\mahdi\Documents\Finality-okok

# Créer le fichier (PowerShell)
@"
VITE_MAPBOX_TOKEN=YOUR_MAPBOX_TOKEN_HERE
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
"@ | Out-File -FilePath .env.local -Encoding UTF8

# 4. Redémarrer le serveur
npm run dev
```

**✅ Validation** : Ouvrir http://localhost:5173/tracking → Carte doit s'afficher

---

### 2️⃣ Créer une Mission Test (2 minutes)

```sql
-- Dans Supabase SQL Editor
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
  (SELECT id FROM auth.users LIMIT 1), -- Votre user_id
  'GPS-TEST-001',
  'in_progress', -- Important : doit être 'in_progress'
  'Tesla',
  'Model 3',
  'GPS-001',
  'Champs-Élysées, Paris',
  'Tour Eiffel, Paris',
  NOW(),
  48.8698, -- Champs-Élysées
  2.3078,
  48.8584, -- Tour Eiffel
  2.2945
);
```

**✅ Validation** : 
- Aller sur `/tracking`
- Sélectionner mission GPS-TEST-001
- Carte 3D doit s'afficher avec Point A (Champs) et Point B (Eiffel)

---

### 3️⃣ Tester Realtime (5 minutes)

```javascript
// Dans la console du navigateur (F12)

// 1. Récupérer l'ID de la mission test
const missions = await supabase.from('missions').select('*').eq('reference', 'GPS-TEST-001');
const missionId = missions.data[0].id;
console.log('Mission ID:', missionId);

// 2. Créer le canal
const testChannel = supabase.channel(`mission:${missionId}:gps`);

// 3. S'abonner
testChannel.on('broadcast', { event: 'gps_update' }, (payload) => {
  console.log('✅ Position reçue:', payload.payload);
});

testChannel.subscribe((status) => {
  console.log('📡 Channel status:', status);
  
  if (status === 'SUBSCRIBED') {
    console.log('✅ Prêt à recevoir des positions !');
    
    // 4. Simuler un déplacement
    let lat = 48.8698;
    let lng = 2.3078;
    let bearing = 135;
    
    const interval = setInterval(() => {
      // Se déplacer vers la Tour Eiffel
      lat -= 0.0005;
      lng -= 0.0005;
      bearing += 5;
      
      testChannel.send({
        type: 'broadcast',
        event: 'gps_update',
        payload: {
          lat,
          lng,
          timestamp: Date.now(),
          bearing: bearing % 360,
          speed: 13.5
        }
      });
      
      console.log(`📍 Position envoyée: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      
      // Arrêter après 20 positions (40 secondes)
      if (lat < 48.860) {
        clearInterval(interval);
        console.log('🏁 Simulation terminée');
      }
    }, 2000); // Toutes les 2 secondes
  }
});
```

**✅ Validation** :
- Console : "📡 Channel status: SUBSCRIBED"
- Console toutes les 2s : "📍 Position envoyée: ..."
- Carte : Marqueur chauffeur apparaît et se déplace
- Carte : Tracé bleu s'allonge
- Indicateur "Mise à jour en temps réel" visible (vert pulsant)

---

### 4️⃣ Intégrer dans Mobile (20 minutes)

#### A. Modifier InspectionDepartureScreen

```powershell
# Ouvrir le fichier
code mobile\src\screens\InspectionDepartureScreen.tsx
```

Ajouter en haut du fichier :
```typescript
import { gpsTrackingService } from '../services/gps-tracking';
```

Dans la fonction `handleStartMission` :
```typescript
const handleStartMission = async () => {
  try {
    // 1. Démarrer GPS
    await gpsTrackingService.startTracking(missionId, 2000);
    console.log('✅ GPS tracking started');
    
    // 2. Mettre à jour mission (code existant)
    // ... votre code actuel
    
  } catch (error) {
    console.error('Erreur GPS:', error);
  }
};
```

#### B. Modifier InspectionArrivalScreen

```powershell
code mobile\src\screens\InspectionArrivalScreen.tsx
```

Ajouter :
```typescript
import { gpsTrackingService } from '../services/gps-tracking';
import { useEffect } from 'react';

// Dans le composant
useEffect(() => {
  // Cleanup si on quitte l'écran
  return () => {
    if (gpsTrackingService.isActive()) {
      gpsTrackingService.stopTracking();
    }
  };
}, []);

const handleCompleteMission = async () => {
  try {
    // 1. Arrêter GPS
    await gpsTrackingService.stopTracking();
    console.log('✅ GPS tracking stopped');
    
    // 2. Terminer mission (code existant)
    // ... votre code actuel
    
  } catch (error) {
    console.error('Erreur:', error);
  }
};
```

#### C. Tester sur mobile

```powershell
cd mobile
npm start

# Presser 'i' pour iOS ou 'a' pour Android
```

**✅ Validation** :
- Lancer une inspection départ
- Console : "✅ GPS tracking started"
- Console toutes les 2s : "GPS position published"
- Sur web : Positions apparaissent en temps réel

---

## 🧪 TESTS RECOMMANDÉS

### Test 1 : Carte statique (sans GPS)

**Objectif** : Vérifier que la carte s'affiche correctement

1. Aller sur `/tracking`
2. Sélectionner mission GPS-TEST-001
3. Vérifier :
   - ✅ Carte 3D visible
   - ✅ Point A (Champs-Élysées) vert
   - ✅ Point B (Tour Eiffel) rouge
   - ✅ Ligne bleue entre A et B
   - ✅ Légende en bas à gauche
   - ✅ Bâtiments 3D visibles (zoom 15+)

---

### Test 2 : Realtime Web → Web

**Objectif** : Tester le canal Realtime

1. Ouvrir 2 onglets sur `/tracking`
2. Dans console onglet 1 : script de simulation (voir étape 3️⃣)
3. Dans onglet 2 : vérifier que le marqueur se déplace

**✅ Validation** : Les 2 onglets voient le même déplacement

---

### Test 3 : Mobile → Web (End-to-End)

**Objectif** : Test complet du flow

1. **Web** : Ouvrir `/tracking`, sélectionner mission
2. **Mobile** : Lancer inspection départ
3. **Mobile** : Se déplacer physiquement (marcher/voiture)
4. **Web** : Voir le marqueur se déplacer en temps réel

**✅ Validation** :
- Position mise à jour toutes les 2s
- Tracé GPS s'allonge
- Pas de décalage > 5 secondes

---

### Test 4 : Permissions GPS

**Objectif** : Vérifier gestion des permissions

1. Désinstaller l'app mobile
2. Réinstaller
3. Lancer inspection
4. Popup permission doit apparaître
5. Accepter → GPS démarre
6. Refuser → Message d'erreur clair

---

### Test 5 : Performance Batterie

**Objectif** : Mesurer consommation

1. Charger téléphone à 100%
2. Démarrer inspection avec GPS
3. Laisser tourner 1 heure
4. Vérifier batterie restante

**✅ Acceptable** : -10 à -15% en 1 heure

---

### Test 6 : Cleanup

**Objectif** : Vérifier arrêt automatique

1. Démarrer inspection
2. GPS actif (voir console)
3. Quitter l'écran (back button)
4. Vérifier console : "GPS tracking stopped"

**✅ Validation** : Pas de tracking "orphelin"

---

## 🐛 SI PROBLÈME

### Carte blanche

```powershell
# Vérifier token
cat .env.local | Select-String "MAPBOX"

# Token doit commencer par pk.
# Si vide ou invalide, refaire étape 1️⃣
```

---

### Pas de positions reçues

```javascript
// Console web
const { data, error } = await supabase.from('missions').select('id, status').eq('reference', 'GPS-TEST-001');
console.log('Mission:', data, error);

// Status DOIT être 'in_progress'
// Si 'pending', faire :
await supabase.from('missions').update({ status: 'in_progress' }).eq('reference', 'GPS-TEST-001');
```

---

### Erreur GPS mobile

```typescript
// Vérifier permissions
import * as Location from 'expo-location';

const { status } = await Location.requestForegroundPermissionsAsync();
console.log('Permission:', status); // Doit être 'granted'

const enabled = await Location.hasServicesEnabledAsync();
console.log('GPS enabled:', enabled); // Doit être true
```

---

## 📊 MÉTRIQUES DE SUCCÈS

Avant de valider l'intégration, vérifier :

- [ ] Token Mapbox configuré
- [ ] Carte 3D s'affiche sans erreur
- [ ] Marqueurs A/B visibles
- [ ] Simulation Realtime fonctionne
- [ ] Tracking mobile démarre/arrête
- [ ] Positions arrivent sur web < 3s
- [ ] Tracé GPS s'affiche
- [ ] Pas d'erreur console
- [ ] Cleanup automatique fonctionne
- [ ] Batterie < 15%/h

---

## 🎯 TIMELINE ESTIMÉE

| Étape | Temps | Difficulté |
|-------|-------|------------|
| Configuration Mapbox | 5 min | ⭐ Facile |
| Mission test | 2 min | ⭐ Facile |
| Test Realtime web | 5 min | ⭐⭐ Moyen |
| Intégration mobile | 20 min | ⭐⭐⭐ Moyen |
| Tests complets | 30 min | ⭐⭐ Moyen |
| **TOTAL** | **~1h** | |

---

## 📞 SUPPORT

Si blocage :
1. Consulter `MAPBOX_GPS_GUIDE.md` (troubleshooting)
2. Vérifier `TESTS_GPS_MAPBOX.md` (scénarios)
3. Consulter `MAPBOX_COMPLETE_SUMMARY.md` (résumé)

---

## ✅ COMMENCER MAINTENANT

```powershell
# Étape 1 : Configurer Mapbox
# → Aller sur https://account.mapbox.com/
# → Copier le token
# → Ajouter dans .env.local

# Étape 2 : Tester
npm run dev
# → Ouvrir http://localhost:5173/tracking

# Étape 3 : Créer mission test (voir SQL plus haut)

# Étape 4 : Tester Realtime (voir code JS plus haut)

# Étape 5 : Intégrer mobile

# 🎉 TERMINÉ !
```

---

**Prêt à commencer ? Suivez les étapes dans l'ordre ! 🚀**
