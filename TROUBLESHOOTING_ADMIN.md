# 🔧 Dépannage - Erreurs Admin

## ❌ Erreur : "Erreur lors de la création de l'abonnement"

### Diagnostic

L'erreur peut avoir plusieurs causes. Voici comment identifier et résoudre le problème :

### 1. **Vérifier que la migration a été appliquée**

**Test rapide :**
```sql
-- Dans Supabase SQL Editor
SELECT * FROM subscriptions LIMIT 1;
```

**Si erreur "relation does not exist" :**
- ❌ La table n'existe pas
- ✅ Solution : Appliquer la migration

```bash
# Méthode 1 : Via CLI
supabase db push

# Méthode 2 : Copier/coller le SQL
# Ouvrir : supabase/migrations/20251010034917_create_subscriptions_and_admin_features.sql
# Copier tout le contenu dans Supabase SQL Editor
# Exécuter
```

### 2. **Vérifier les permissions RLS**

**Test :**
```sql
-- Vérifier que vous êtes admin
SELECT id, email, is_admin FROM profiles WHERE id = auth.uid();
```

**Si `is_admin = false` :**
```sql
-- Se donner le rôle admin
UPDATE profiles SET is_admin = true WHERE id = auth.uid();
```

**Vérifier les policies RLS :**
```sql
-- Voir toutes les policies sur subscriptions
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'subscriptions';
```

### 3. **Tester manuellement l'insertion**

**Créer un abonnement de test :**
```sql
-- Remplacer USER_ID par un vrai ID de votre table profiles
INSERT INTO subscriptions (user_id, plan, status, current_period_end, payment_method, assigned_by)
VALUES (
  'USER_ID_A_REMPLACER',
  'pro',
  'active',
  now() + interval '30 days',
  'manual',
  auth.uid()
);
```

**Si ça fonctionne :**
- ✅ Les permissions sont OK
- ❌ Le problème vient du code frontend

**Si erreur "new row violates row-level security policy" :**
- ❌ Vous n'êtes pas admin
- ✅ Solution : `UPDATE profiles SET is_admin = true WHERE id = auth.uid();`

### 4. **Vérifier les logs du navigateur**

1. Ouvrir la **Console** (F12)
2. Cliquer sur "Ajouter abonnement"
3. Regarder les erreurs rouges

**Erreurs communes :**

**"Cannot read property 'id' of null"**
- Session expirée
- Solution : Se reconnecter

**"permission denied for table subscriptions"**
- Pas admin
- Solution : Mettre `is_admin = true`

**"duplicate key value violates unique constraint"**
- L'utilisateur a déjà un abonnement
- Le code devrait gérer ça automatiquement (update au lieu de insert)
- Si l'erreur persiste : vérifier le code

**"column X does not exist"**
- Migration non appliquée ou incomplète
- Solution : Réappliquer la migration

### 5. **Message d'erreur détaillé**

Le code a été amélioré pour afficher les détails de l'erreur :

```javascript
alert(`Erreur création: ${error.message}\n\nDétails: ${JSON.stringify(error)}\n\nAssurez-vous que la migration a été appliquée.`);
```

**Chercher dans le message :**
- `"code": "42501"` = Permission denied → Pas admin
- `"code": "42P01"` = Table does not exist → Migration non appliquée
- `"code": "23505"` = Duplicate key → User a déjà un abonnement (bug du code)
- `"code": "23503"` = Foreign key violation → `user_id` n'existe pas

### 6. **Vérifier la structure de la table**

```sql
-- Voir toutes les colonnes de subscriptions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;
```

**Colonnes attendues :**
- `id` (uuid)
- `user_id` (uuid)
- `plan` (text)
- `status` (text)
- `current_period_start` (timestamptz)
- `current_period_end` (timestamptz)
- `cancel_at_period_end` (boolean)
- `payment_method` (text)
- `assigned_by` (uuid)
- `notes` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Si des colonnes manquent :**
- La migration est incomplète
- Solution : Supprimer la table et réappliquer
```sql
DROP TABLE IF EXISTS subscriptions CASCADE;
-- Puis réexécuter la migration
```

### 7. **Tester avec un autre utilisateur**

Parfois le problème est spécifique à un utilisateur :

1. Créer un nouvel utilisateur de test
2. Essayer de lui attribuer un abonnement
3. Si ça fonctionne → Le problème était avec l'utilisateur précédent

**Vérifier l'utilisateur problématique :**
```sql
SELECT * FROM profiles WHERE id = 'USER_ID_PROBLEMATIQUE';
```

Vérifier qu'il n'y a pas :
- De caractères spéciaux dans l'email
- De données corrompues

### 8. **Réinitialisation complète**

**EN DERNIER RECOURS :**

```sql
-- ⚠️ ATTENTION: Supprime TOUTES les données d'abonnements

-- 1. Supprimer les tables
DROP TABLE IF EXISTS subscription_history CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;

-- 2. Réexécuter la migration complète
-- Copier/coller le contenu de :
-- supabase/migrations/20251010034917_create_subscriptions_and_admin_features.sql

-- 3. Vérifier que tout est OK
SELECT * FROM subscriptions;
SELECT * FROM subscription_history;

-- 4. Réessayer dans l'interface
```

## ✅ Checklist de Résolution

1. [ ] Migration appliquée (`supabase db push`)
2. [ ] Compte est admin (`is_admin = true`)
3. [ ] Table subscriptions existe
4. [ ] RLS policies créées
5. [ ] Test manuel d'insertion fonctionne
6. [ ] Console navigateur sans erreur
7. [ ] Session utilisateur valide (reconnecté)
8. [ ] Aucun abonnement en double

## 🆘 Si Rien ne Fonctionne

**Obtenir un diagnostic complet :**

```sql
-- 1. Vérifier auth
SELECT
  'User ID: ' || auth.uid() as info
UNION ALL
SELECT 'User Email: ' || email FROM auth.users WHERE id = auth.uid()
UNION ALL
SELECT 'Is Admin: ' || is_admin::text FROM profiles WHERE id = auth.uid();

-- 2. Vérifier tables
SELECT
  'Subscriptions table: ' ||
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions')
  THEN 'EXISTS' ELSE 'MISSING' END as info
UNION ALL
SELECT
  'History table: ' ||
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_history')
  THEN 'EXISTS' ELSE 'MISSING' END;

-- 3. Vérifier RLS
SELECT
  'RLS on subscriptions: ' ||
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'subscriptions' AND rowsecurity = true
  ) THEN 'ENABLED' ELSE 'DISABLED' END as info;

-- 4. Compter policies
SELECT
  'Policies count: ' || COUNT(*)::text
FROM pg_policies
WHERE tablename = 'subscriptions';
```

**Copier les résultats et les envoyer pour support.**

## 📝 Message d'Erreur Type et Solution

### "Cannot read properties of null"
```
Cause: Session expirée ou utilisateur non connecté
Solution: Se reconnecter à l'application
```

### "permission denied for table subscriptions"
```
Cause: L'utilisateur n'est pas admin ou RLS mal configuré
Solution:
1. UPDATE profiles SET is_admin = true WHERE id = auth.uid();
2. Vérifier que les policies RLS existent
```

### "relation subscriptions does not exist"
```
Cause: Migration non appliquée
Solution: Exécuter la migration
```

### "duplicate key value violates unique constraint"
```
Cause: L'utilisateur a déjà un abonnement (UNIQUE sur user_id)
Solution: Le code devrait automatiquement faire un UPDATE
Si l'erreur persiste, supprimer l'abonnement existant:
DELETE FROM subscriptions WHERE user_id = 'USER_ID';
```

### "violates check constraint subscriptions_plan_check"
```
Cause: Plan invalide (pas dans la liste autorisée)
Solution: Utiliser un des plans valides:
- free, starter, basic, pro, business, enterprise
```

### "violates check constraint subscriptions_status_check"
```
Cause: Status invalide
Solution: Utiliser un des status valides:
- active, canceled, expired, trial
```

## 🔍 Logs Utiles

**Activer les logs détaillés :**

Dans le code (temporairement pour debug) :
```typescript
console.log('Selected user:', selectedUser);
console.log('Grant plan:', grantPlan);
console.log('Duration:', grantDuration);
console.log('Current user:', currentUser);
console.log('Existing sub:', existingSub);
```

**Voir les queries Supabase dans la console :**
Les erreurs Supabase sont automatiquement loggées avec `console.error()`.

---

**Besoin d'aide ?** Fournir :
1. Le message d'erreur complet
2. Les logs de la console (F12)
3. Le résultat du diagnostic SQL ci-dessus
4. La version de Supabase utilisée
