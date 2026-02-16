# 🚀 QUICK START - Navigation GPS

## ⚡ Démarrage rapide (5 minutes)

### 1️⃣ Exécuter Dashboard SQL

**Copier et exécuter dans Supabase SQL Editor** :

```sql
-- MONITORING_DASHBOARD_SQL.sql (version corrigée)

-- Nettoyage conflits
DROP VIEW IF EXISTS navigation_current_month_dashboard CASCADE;
DROP VIEW IF EXISTS navigation_daily_stats CASCADE;
DROP VIEW IF EXISTS navigation_top_missions CASCADE;
DROP VIEW IF EXISTS navigation_hourly_patterns CASCADE;
DROP TABLE IF EXISTS navigation_alerts CASCADE;

-- Vue principale
CREATE OR REPLACE VIEW navigation_current_month_dashboard AS
SELECT 
  COUNT(*)::BIGINT as total_sessions,
  COUNT(*) FILTER (WHERE status = 'active')::BIGINT as sessions_actives,
  COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as sessions_completees,
  COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT as sessions_annulees,
  COUNT(*) FILTER (WHERE from_cache = TRUE)::BIGINT as sessions_cache,
  COUNT(*) FILTER (WHERE from_cache = FALSE)::BIGINT as sessions_api,
  ROUND((COUNT(*) FILTER (WHERE from_cache = TRUE)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 1) as cache_hit_rate_percent,
  ROUND(SUM(distance_meters) / 1000, 1) as distance_totale_km,
  ROUND(AVG(distance_meters) / 1000, 1) as distance_moyenne_km,
  COUNT(*) FILTER (WHERE from_cache = FALSE)::BIGINT as mapbox_quota_utilise,
  (25000 - COUNT(*) FILTER (WHERE from_cache = FALSE))::BIGINT as mapbox_quota_restant,
  ROUND((COUNT(*) FILTER (WHERE from_cache = FALSE)::NUMERIC / 25000 * 100), 2) as mapbox_quota_percent,
  CASE 
    WHEN COUNT(*) FILTER (WHERE from_cache = FALSE) >= 25000 THEN '🚨 CRITIQUE'
    WHEN COUNT(*) FILTER (WHERE from_cache = FALSE) >= 24000 THEN '⚠️ ALERTE 96%'
    WHEN COUNT(*) FILTER (WHERE from_cache = FALSE) >= 20000 THEN '⚠️ WARNING 80%'
    ELSE '✅ OK'
  END as statut_quota
FROM navigation_sessions
WHERE created_at >= DATE_TRUNC('month', NOW());

-- Permissions
GRANT SELECT ON navigation_current_month_dashboard TO authenticated;

-- Test
SELECT * FROM navigation_current_month_dashboard;
```

**Résultat attendu** :
```
total_sessions: 0
mapbox_quota_utilise: 0
mapbox_quota_restant: 25000
statut_quota: ✅ OK
```

---

### 2️⃣ Démarrer App Mobile

```bash
# Terminal PowerShell
cd mobile
npx expo start --clear --port 8082
```

**Résultat attendu** :
```
✅ Metro Bundler started
✅ Listening on http://localhost:8082
✅ QR code affiché

Choix:
› Press a │ open Android
› Press i │ open iOS simulator  
› Press w │ open web
```

---

### 3️⃣ Tester Navigation

1. **Scanner QR code** avec Expo Go (mobile)
   - OU appuyer `a` pour Android emulator
   - OU appuyer `i` pour iOS simulator

2. **Se connecter** à l'app

3. **Ouvrir une mission** (status: in_progress)

4. **Cliquer "Inspection GPS"**

5. **Cliquer "🧭 Navigation Intégrée"**

**Résultat attendu** :
```
✅ Calcul route (< 1s)
✅ Carte Mapbox affichée
✅ Itinéraire tracé en bleu
✅ Position centrée
✅ Navigation démarrée
```

---

### 4️⃣ Vérifier Quota

```sql
-- Dans Supabase
SELECT 
  total_sessions as "Sessions",
  mapbox_quota_utilise as "Quota Utilisé",
  mapbox_quota_restant as "Restant",
  statut_quota as "Status"
FROM navigation_current_month_dashboard;
```

**Résultat après 1 navigation** :
```
Sessions: 1
Quota Utilisé: 1
Restant: 24999
Status: ✅ OK
```

---

## 🎯 Points Clés

### ✅ Déjà fait
- Configuration Mapbox ✅
- Service Navigation ✅
- Migration SQL ✅
- Intégration UI ✅
- Documentation ✅

### ⏳ En cours
- Démarrage Expo (port 8082)
- Exécution Dashboard SQL

### 📝 À faire
- Tester 1ère navigation
- Vérifier quota
- Tester cache (2ème nav)

---

## 🐛 Erreurs connues

### "Port 8081 already in use"
**Solution** :
```bash
taskkill /F /IM node.exe
npx expo start --clear --port 8082
```

### "navigation_alerts is not a view"
**Solution** : Script SQL corrigé avec `DROP TABLE IF EXISTS`

### "Cannot find NavigationService"
**Solution** :
```bash
cd mobile
npx expo start --clear --reset-cache
```

---

## 📊 Dashboard Commands

```sql
-- Quota actuel
SELECT * FROM navigation_current_month_dashboard;

-- Sessions aujourd'hui
SELECT COUNT(*) FROM navigation_sessions 
WHERE DATE(created_at) = CURRENT_DATE;

-- Dernière session
SELECT * FROM navigation_sessions 
ORDER BY created_at DESC LIMIT 1;
```

---

## 📚 Documentation

- **Installation complète** : `MAPBOX_NAVIGATION_INSTALLATION.md`
- **Tests détaillés** : `TEST_NAVIGATION.md`
- **Guide API** : `MAPBOX_NAVIGATION_GUIDE.md`
- **Résumé** : `NAVIGATION_COMPLETE_SUMMARY.md`

---

**Temps estimé** : 5 minutes  
**Prérequis** : Token Mapbox configuré ✅  
**Status** : Prêt à tester ! 🚀
