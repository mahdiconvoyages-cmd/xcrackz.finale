# 🔍 VÉRIFICATION BASE DE DONNÉES SUPABASE

## 📊 Projet actuel
- **URL** : https://bfrkthzovwpjrvqktdjn.supabase.co
- **Project Ref** : bfrkthzovwpjrvqktdjn

---

## ✅ Requêtes de vérification à exécuter dans Supabase SQL Editor

### 1️⃣ Vérifier si les tables OneSignal existent

```sql
-- Vérifier l'existence des tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_devices', 'notification_logs')
ORDER BY table_name;
```

**Résultat attendu** :
- Si les tables existent : 2 lignes (user_devices, notification_logs)
- Si elles n'existent pas : 0 ligne → **Il faut exécuter la migration**

---

### 2️⃣ Vérifier les vues de monitoring

```sql
-- Vérifier l'existence des vues
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'notification%' OR table_name = 'active_devices'
ORDER BY table_name;
```

**Résultat attendu** :
- active_devices
- notification_stats_by_type
- notification_stats_by_user
- notification_timeline_hourly

---

### 3️⃣ Vérifier la fonction get_notification_summary

```sql
-- Vérifier l'existence de la fonction
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_notification_summary';
```

**Résultat attendu** :
- Si existe : 1 ligne (get_notification_summary, FUNCTION)
- Sinon : 0 ligne

---

### 4️⃣ Vérifier toutes les tables existantes

```sql
-- Lister toutes les tables publiques
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

### 5️⃣ Vérifier les Edge Functions Secrets

```sql
-- Aller dans Dashboard → Settings → Edge Functions → Secrets
-- Vérifier la présence de :
-- - ONESIGNAL_APP_ID
-- - ONESIGNAL_API_KEY
```

---

## 📋 ACTIONS EN FONCTION DES RÉSULTATS

### ✅ Si les tables EXISTENT déjà
→ **OneSignal est configuré !** Il suffit de :
1. Vérifier les secrets Edge Functions
2. Déployer l'Edge Function `send-notification`
3. Tester l'app

### ❌ Si les tables N'EXISTENT PAS
→ **Exécuter la migration** :
1. Ouvrir : https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn/editor
2. Copier le fichier `supabase/migrations/20250201_create_notification_tables.sql`
3. Exécuter dans SQL Editor

---

## 🎯 INSTRUCTIONS

1. **Ouvrir** : https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn/editor
2. **Exécuter** les requêtes ci-dessus (1️⃣ à 4️⃣)
3. **Me donner les résultats** pour que je sache quoi faire ensuite

---

**Prêt à vérifier ?** 🚀
