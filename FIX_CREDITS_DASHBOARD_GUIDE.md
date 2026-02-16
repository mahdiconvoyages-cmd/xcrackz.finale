# 🐛 Fix Dashboard Mobile - Crédits et Abonnement à 0

## 🔍 Problème
Le dashboard mobile affiche **0 crédit** et **aucun abonnement**, alors que les données existent dans la base.

## 🎯 Causes Possibles

### 1. **Colonne `profiles.credits` non initialisée**
- La table `profiles` a une colonne `credits` 
- Mais certains utilisateurs ont `NULL` au lieu de `0`
- Le hook `useCredits` retourne `0` par défaut

### 2. **Désynchronisation `user_credits` ↔ `profiles.credits`**
- **Ancien système** : `user_credits.balance` (table dédiée)
- **Nouveau système** : `profiles.credits` (colonne dans profiles)
- Les deux doivent être synchronisés

### 3. **Abonnements expirés non marqués**
- Certains abonnements ont `status = 'active'` mais `end_date` passée
- Dashboard cherche `status = 'active'` uniquement

## ✅ Solution - Exécuter le Script SQL

### Étape 1 : Appliquer le Fix SQL
```bash
# Dans Supabase SQL Editor
Exécuter: FIX_CREDITS_DASHBOARD.sql
```

### Ce que le script fait :
1. ✅ Initialise `profiles.credits = 0` pour tous les utilisateurs
2. ✅ Synchronise `profiles.credits` avec `user_credits.balance`
3. ✅ Marque les abonnements expirés (`end_date < NOW()`)
4. ✅ Crée un trigger automatique pour synchronisation future
5. ✅ Affiche un rapport complet

## 📊 Vérification Post-Fix

### Mobile - DashboardScreenNew.tsx
Le dashboard utilise le hook `useCredits` :

```typescript
const { credits, loading, refreshCredits } = useCredits();

// Affiche dans la carte "Crédits disponibles"
<Text>{credits}</Text>
```

### Hook useCredits (mobile/src/hooks/useCredits.ts)
```typescript
// Charge depuis profiles.credits
const { data } = await supabase
  .from('profiles')
  .select('credits')
  .eq('id', user.id)
  .single();

// Realtime sur profiles
.on('postgres_changes', { table: 'profiles', filter: `id=eq.${user.id}` })
```

### Abonnement
```typescript
// Charge depuis subscriptions
const { data } = await supabase
  .from('subscriptions')
  .select('plan_name, status, end_date')
  .eq('user_id', user.id)
  .eq('status', 'active')
  .maybeSingle();
```

## 🔧 Debug Manuel

### 1. Vérifier un utilisateur spécifique
```sql
-- Remplacer YOUR_USER_ID par l'ID réel
SELECT 
    p.id,
    p.email,
    p.credits as profile_credits,
    uc.balance as user_credits_balance,
    s.plan_name,
    s.status as subscription_status,
    s.end_date
FROM profiles p
LEFT JOIN user_credits uc ON uc.user_id = p.id
LEFT JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active'
WHERE p.id = 'YOUR_USER_ID';
```

### 2. Logs Console Mobile
Dans `DashboardScreenNew.tsx`, chercher :
```
🎯 Dashboard: credits = X loading = false
🎯 Dashboard: user.id = xxx-xxx-xxx
```

Si `credits = 0` mais l'utilisateur a des crédits en base → problème de sync

### 3. Tester Realtime
```typescript
// Dans useCredits.ts
console.log('💰 Crédits mis à jour (realtime profiles):', payload.new.credits);
```

Si ce log n'apparaît jamais → Realtime pas activé sur `profiles`

## 🚀 Rebuild Nécessaire ?

**❌ NON** - Aucune modification du code mobile nécessaire

**✅ Solution côté SQL uniquement :**
1. Exécuter `FIX_CREDITS_DASHBOARD.sql`
2. Fermer/rouvrir l'app mobile
3. Crédits et abonnement s'affichent

## 📱 Test APK Actuel

L'APK `FleetCheck-FINAL-20251109-122923.apk` contient déjà :
- ✅ Hook `useCredits` avec realtime
- ✅ Chargement depuis `profiles.credits`
- ✅ Affichage abonnement

**Il suffit d'appliquer le fix SQL pour que tout fonctionne.**

## 🔄 Synchronisation Future

Le trigger créé garantit que :
```
user_credits.balance (mise à jour)
    ↓
    Trigger automatique
    ↓
profiles.credits (synchronisé)
    ↓
    Realtime
    ↓
Mobile (mis à jour instantanément)
```

## 📝 Notes Importantes

### Système de Crédits
- **Source de vérité** : `profiles.credits` (depuis 8 nov 2025)
- **Table legacy** : `user_credits` (encore utilisée par certaines fonctions)
- **Synchronisation** : Bidirectionnelle via triggers

### Abonnements
- **Table** : `subscriptions`
- **Statuts** : `active`, `expired`, `cancelled`
- **Vérification** : `status = 'active' AND (end_date IS NULL OR end_date > NOW())`

## ⚡ Action Immédiate

```sql
-- Exécuter dans Supabase SQL Editor
\i FIX_CREDITS_DASHBOARD.sql
```

Puis dans le mobile :
1. Fermer l'app complètement
2. Rouvrir
3. Dashboard affiche maintenant les crédits et l'abonnement ✅
