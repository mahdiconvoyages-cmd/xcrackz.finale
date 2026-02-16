# 🧪 GUIDE DE TEST - NAVIGATION GPS

## 🎯 Objectif
Tester l'intégration complète de la navigation GPS Mapbox avec monitoring quota.

---

## ✅ PRÉ-REQUIS

### 1. Configuration
- [x] Token Mapbox dans `.env` : `EXPO_PUBLIC_MAPBOX_TOKEN`
- [x] Migration SQL exécutée : `20251012_create_navigation_sessions.sql`
- [x] Dashboard monitoring installé : `MONITORING_DASHBOARD_SQL.sql`
- [x] Service NavigationService créé
- [x] InspectionGPSScreen intégré

### 2. Vérifier token Mapbox
```bash
# Dans mobile/
cat .env | grep MAPBOX_TOKEN
```

Résultat attendu :
```
EXPO_PUBLIC_MAPBOX_TOKEN=YOUR_MAPBOX_TOKEN_HERE
```

### 3. Vérifier migration SQL
```sql
-- Dans Supabase SQL Editor
SELECT COUNT(*) FROM navigation_sessions;
-- Devrait retourner 0 (table vide au départ)

SELECT * FROM get_current_month_navigation_stats();
-- Devrait montrer quota 0/25000
```

---

## 🚀 ÉTAPES DE TEST

### TEST 1 : Démarrage App Mobile

```bash
# Terminal 1
cd mobile
npx expo start --clear
```

**Résultat attendu** :
```
✅ Metro bundler démarré sur http://localhost:8081
✅ App accessible via Expo Go ou simulateur
```

**En cas d'erreur** :
```bash
# Nettoyer cache
taskkill /F /IM node.exe 2>$null
npx expo start --clear --reset-cache
```

---

### TEST 2 : Navigation vers InspectionGPSScreen

1. **Ouvrir l'app** sur device/simulateur
2. **Se connecter** avec compte existant
3. **Ouvrir une mission** (status: in_progress)
4. **Cliquer sur inspection GPS**

**Résultat attendu** :
```
✅ Position actuelle affichée
✅ Point de départ (pickup) affiché
✅ Point d'arrivée (delivery) affiché
✅ Boutons Waze / Google Maps / Navigation Intégrée visibles
```

**Screenshot** :
```
┌─────────────────────────────────┐
│  📍 Ma Position                 │
│  48.856613, 2.352222           │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  🟢 Point de Départ             │
│  123 Rue de Paris, 75001        │
│  [Waze] [Google Maps]          │
│  [🧭 Navigation Intégrée]       │ ← NOUVEAU
└─────────────────────────────────┘
```

---

### TEST 3 : Démarrer Navigation Intégrée

1. **Cliquer** sur "🧭 Navigation Intégrée"
2. **Observer** :
   - Loader affiché (ActivityIndicator)
   - Calcul route en cours

**Logs console attendus** :
```javascript
// NavigationService.ts
✅ Quota vérifié: 0/25000 sessions (0%)
✅ Cache checked: route_2.352222,48.856613_2.389222,48.873613
❌ Cache miss (pas encore de cache)
📡 Appel Mapbox Directions API...
✅ Route calculée: 5.2 km, 12 min
✅ Session navigation créée: abc-123-def-456
✅ Route mise en cache (TTL: 1h)
```

**Navigation vers NavigationScreen** :
```
✅ Transition vers écran de navigation
✅ Carte Mapbox affichée
✅ Itinéraire tracé en bleu
✅ Position actuelle centrée
✅ Instructions de navigation visibles
```

---

### TEST 4 : Vérifier Session en Base de Données

```sql
-- Supabase SQL Editor

-- Voir sessions actives
SELECT 
  id,
  mission_id,
  status,
  distance_meters,
  estimated_duration_seconds,
  from_cache,
  created_at
FROM navigation_sessions
ORDER BY created_at DESC
LIMIT 1;
```

**Résultat attendu** :
```
id: abc-123-def-456
mission_id: mission-xyz
status: active
distance_meters: 5200
estimated_duration_seconds: 720 (12 min)
from_cache: FALSE (première fois)
created_at: 2025-10-12 14:35:22
```

---

### TEST 5 : Monitoring Quota

```sql
-- Dashboard principal
SELECT * FROM navigation_current_month_dashboard;
```

**Résultat attendu** :
```
total_sessions: 1
sessions_api: 1 (non-cache)
mapbox_quota_utilise: 1
mapbox_quota_restant: 24999
mapbox_quota_percent: 0.00%
statut_quota: ✅ OK - Sous 60%
cout_additionnel_usd: 0
```

---

### TEST 6 : Test Cache (2ème Navigation)

1. **Quitter** la navigation (bouton retour)
2. **Retourner** à InspectionGPSScreen
3. **Recliquer** "🧭 Navigation Intégrée" (même destination)

**Logs console attendus** :
```javascript
✅ Quota vérifié: 1/25000 sessions
✅ Cache checked: route_2.352222,48.856613_2.389222,48.873613
✅ Cache HIT! (route récupérée du cache)
✅ Session navigation créée: def-456-ghi-789
⚡ Pas d'appel Mapbox API (économie!)
```

**Vérification SQL** :
```sql
SELECT * FROM navigation_current_month_dashboard;
```

**Résultat attendu** :
```
total_sessions: 2
sessions_cache: 1 (cache hit!)
sessions_api: 1 (toujours 1, pas augmenté!)
mapbox_quota_utilise: 1 (pas changé grâce au cache)
cache_hit_rate_percent: 50% (1/2)
```

✅ **SUCCÈS** : Cache fonctionne, économie de quota !

---

### TEST 7 : Test Progression Navigation

1. **Laisser** la navigation active
2. **Simuler** mouvement (ou se déplacer réellement)

**Logs attendus (toutes les 5s)** :
```javascript
// NavigationService.updateProgress()
📍 Position: 48.857123, 2.353456
📏 Distance restante: 4800 m
⏱️ Temps restant: 10 min
📊 Progression: 8%
✅ Session mise à jour
```

**Vérification SQL** :
```sql
SELECT 
  distance_remaining_meters,
  duration_remaining_seconds,
  percent_complete,
  last_update
FROM navigation_sessions
WHERE status = 'active'
ORDER BY last_update DESC
LIMIT 1;
```

**Résultat attendu** :
```
distance_remaining_meters: 4800
duration_remaining_seconds: 600 (10 min)
percent_complete: 8
last_update: 2025-10-12 14:37:45 (mis à jour)
```

---

### TEST 8 : Test Arrivée Destination

1. **Arriver** à < 30 mètres de la destination
2. **Observer** alerte arrivée

**Comportement attendu** :
```
✅ Détection arrivée (distance < 30m)
🎉 Alert "Vous êtes arrivé !"
✅ Session marquée 'completed'
✅ Navigation terminée
```

**Vérification SQL** :
```sql
SELECT 
  status,
  ended_at,
  percent_complete
FROM navigation_sessions
WHERE id = 'abc-123-def-456';
```

**Résultat attendu** :
```
status: completed
ended_at: 2025-10-12 14:48:12
percent_complete: 100
```

---

### TEST 9 : Test Quota Warnings

**Simuler quota élevé** (pour test dev uniquement) :

```sql
-- ATTENTION: Uniquement en dev/staging, PAS en production!

-- Insérer 20,000 sessions fictives (80%)
INSERT INTO navigation_sessions (mission_id, distance_meters, estimated_duration_seconds, status, from_cache)
SELECT 
  (SELECT id FROM missions LIMIT 1),
  (RANDOM() * 10000 + 1000)::NUMERIC,
  (RANDOM() * 1800 + 300)::INTEGER,
  'completed',
  FALSE -- sessions API
FROM generate_series(1, 20000);
```

**Redémarrer navigation** :

**Logs attendus** :
```javascript
⚠️ WARNING: Quota Mapbox à 80%: 20001/25000 sessions
```

**Insérer 4,000 de plus (96%)** :
```sql
INSERT INTO navigation_sessions (mission_id, distance_meters, estimated_duration_seconds, status, from_cache)
SELECT 
  (SELECT id FROM missions LIMIT 1),
  (RANDOM() * 10000 + 1000)::NUMERIC,
  (RANDOM() * 1800 + 300)::INTEGER,
  'completed',
  FALSE
FROM generate_series(1, 4000);
```

**Logs attendus** :
```javascript
🚨 CRITIQUE: Quota Mapbox à 96%: 24001/25000 sessions
```

**Alert dans l'app** :
```
⚠️ Badge rouge affiché
"96% quota Mapbox utilisé"
```

**Nettoyer après test** :
```sql
-- Supprimer sessions de test
DELETE FROM navigation_sessions 
WHERE created_at >= NOW() - INTERVAL '5 minutes';
```

---

### TEST 10 : Test Blocage Quota 100%

**Simuler quota dépassé** :

```sql
-- Insérer 5,000 sessions de plus (total 25,001)
INSERT INTO navigation_sessions (mission_id, distance_meters, estimated_duration_seconds, status, from_cache)
SELECT 
  (SELECT id FROM missions LIMIT 1),
  5000,
  600,
  'completed',
  FALSE
FROM generate_series(1, 5000);
```

**Essayer navigation** :

**Résultat attendu** :
```
🚨 Erreur bloquante
Alert: "Quota Mapbox mensuel atteint. Réessayez le mois prochain."
❌ Navigation refusée
✅ Fallback suggéré: Waze/Google Maps
```

**Nettoyer** :
```sql
DELETE FROM navigation_sessions 
WHERE distance_meters = 5000 AND estimated_duration_seconds = 600;
```

---

## 📊 DASHBOARD DE TEST

### Requêtes de vérification

```sql
-- 1. Quota actuel
SELECT 
  mapbox_quota_utilise || ' / 25000' as quota,
  mapbox_quota_percent || '%' as pourcentage,
  statut_quota
FROM navigation_current_month_dashboard;

-- 2. Cache efficiency
SELECT 
  cache_hit_rate_percent || '%' as "Cache Hit Rate",
  sessions_cache || ' cache / ' || sessions_api || ' API' as "Répartition"
FROM navigation_current_month_dashboard;

-- 3. Dernières sessions
SELECT 
  DATE(created_at) as jour,
  COUNT(*) as sessions,
  COUNT(*) FILTER (WHERE from_cache = TRUE) as cache,
  COUNT(*) FILTER (WHERE from_cache = FALSE) as api
FROM navigation_sessions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY jour DESC;

-- 4. Projection fin de mois
SELECT * FROM get_navigation_quota_projection();
```

---

## ✅ CHECKLIST FINALE

### Fonctionnalités de base
- [ ] App démarre sans erreur
- [ ] Token Mapbox configuré
- [ ] InspectionGPSScreen affiche bouton navigation
- [ ] Clic bouton démarre navigation
- [ ] Carte Mapbox affichée
- [ ] Itinéraire tracé

### Monitoring quota
- [ ] Session créée en BDD
- [ ] Quota incrémenté (0 → 1)
- [ ] Dashboard affiche stats correctes
- [ ] Cache fonctionne (2ème nav = cache hit)

### Progression
- [ ] Position mise à jour toutes les 5s
- [ ] Distance restante décrémente
- [ ] Pourcentage augmente
- [ ] Instructions à jour

### Arrivée
- [ ] Détection arrivée < 30m
- [ ] Alert affichée
- [ ] Session marquée 'completed'

### Alertes
- [ ] Warning à 80% quota
- [ ] Critique à 96% quota
- [ ] Blocage à 100% quota
- [ ] Fallback Waze/Google Maps proposé

---

## 🐛 TROUBLESHOOTING

### Erreur: "Configuration Mapbox invalide"
```bash
# Vérifier token
cd mobile
cat .env | grep MAPBOX

# Redémarrer avec cache clear
npx expo start --clear
```

### Erreur: "Cannot find module NavigationService"
```bash
# Vérifier fichier existe
ls src/services/NavigationService.ts

# Rebuild
taskkill /F /IM node.exe
npx expo start --clear
```

### Quota ne s'incrémente pas
```sql
-- Vérifier session créée
SELECT * FROM navigation_sessions ORDER BY created_at DESC LIMIT 1;

-- Vérifier RLS activée
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'navigation_sessions';
```

### Cache ne fonctionne pas
```javascript
// Dans NavigationService.ts, ajouter logs
console.log('Cache key:', cacheKey);
console.log('Cached route:', cachedRoute);

// Vérifier AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
const keys = await AsyncStorage.getAllKeys();
console.log('Cache keys:', keys);
```

---

## 🎯 RÉSULTATS ATTENDUS

### Performance
- ✅ Calcul route: < 1s
- ✅ Navigation: fluide 60 FPS
- ✅ Cache hit: route instantanée
- ✅ Mise à jour position: 5s interval

### Quota
- ✅ 1 session = 1 quota (sans cache)
- ✅ 2ème session = 0 quota (cache hit)
- ✅ Alertes déclenchées aux seuils
- ✅ Blocage effectif à 100%

### UX
- ✅ Bouton navigation visible
- ✅ Loader pendant calcul
- ✅ Transition fluide vers map
- ✅ Instructions claires
- ✅ Arrivée détectée

---

**Status test** : ⏳ En attente d'exécution

**Prochaine étape** : Démarrer TEST 1 (npx expo start)
