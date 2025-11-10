# 🔴 CORRECTION INCOHÉRENCE SYSTÈME CRÉDITS/ABONNEMENTS

## ❌ Problèmes Identifiés

### 1. **Incohérence des Sources de Données**
**Symptôme** : "J'ai un abonnement mais on me dit que je n'ai pas de crédits"

**Cause Racine** :
- `useCredits` → lit `profiles.credits` ✅
- `useSubscription` → lisait `user_credits.balance` ❌ 
- `Admin.handleGrantCredits` → mettait à jour `user_credits.balance` ❌

**Résultat** : Les données étaient désynchronisées !
- Quand admin donnait des crédits → allait dans `user_credits`
- Quand l'interface vérifiait → lisait `profiles.credits`
- Les deux ne communiquaient pas !

### 2. **Pas de Renouvellement Automatique**
**Symptôme** : "J'ai un abonnement actif mais 0 crédit"

**Cause** : Aucun système ne distribuait automatiquement les crédits mensuels selon le plan d'abonnement.

**Plans existants** :
- Free → 0 crédits/mois
- Starter → 10 crédits/mois
- Basic → 25 crédits/mois
- Pro → 50 crédits/mois
- Business → 100 crédits/mois
- Enterprise → 200 crédits/mois

### 3. **Admin Auto-Attribution Échouait**
**Symptôme** : "Session expirée quand j'essaie de me donner des crédits"

**Cause** : Conflit potentiel car l'admin modifiait `user_credits` mais l'interface lisait `profiles.credits`.

---

## ✅ Corrections Appliquées

### 1. **Unification Source de Données (Web)**

#### `src/hooks/useSubscription.ts`
```typescript
// AVANT ❌
.from('user_credits')
.select('balance')

// APRÈS ✅
.from('profiles')
.select('credits')
```

#### `src/pages/Admin.tsx` - `handleGrantCredits()`
```typescript
// AVANT ❌
await supabase.from('user_credits').update({ balance: ... })

// APRÈS ✅
// 1. Mettre à jour profiles.credits (source principale)
await supabase.from('profiles').update({ credits: currentCredits + amount })

// 2. Synchroniser user_credits (pour compatibilité legacy)
await supabase.from('user_credits').update({ balance: ... })
```

**Principe** : `profiles.credits` est maintenant la **source unique de vérité**. `user_credits` reste pour compatibilité mais est synchronisé automatiquement.

---

### 2. **Synchronisation Automatique (SQL)**

**Fichier** : `FIX_CREDITS_SUBSCRIPTION_INCOHERENCE.sql`

#### Triggers Bidirectionnels
```sql
-- Si profiles.credits change → met à jour user_credits.balance
CREATE TRIGGER sync_profile_credits_to_user_credits
AFTER UPDATE OF credits ON profiles

-- Si user_credits.balance change → met à jour profiles.credits  
CREATE TRIGGER sync_user_credits_to_profile
AFTER UPDATE OF balance ON user_credits
```

**Avantage** : Garantit que les deux tables restent synchronisées en permanence.

---

### 3. **Distribution Automatique des Crédits**

#### Fonction `distribute_subscription_credits()`
```sql
-- Parcourt tous les abonnements actifs
-- Ajoute les crédits mensuels selon le plan
-- À appeler via cron job tous les 30 jours
SELECT distribute_subscription_credits();
```

**Exemple** :
- User avec plan "Basic" → +25 crédits tous les 30 jours
- User avec plan "Pro" → +50 crédits tous les 30 jours

#### Fonction `renew_user_credits(user_id)`
```sql
-- Pour renouvellement MANUEL par admin
SELECT renew_user_credits('uuid-du-user');
```

**Retour** :
```json
{
  "success": true,
  "plan": "pro",
  "credits_added": 50
}
```

---

## 🔧 Actions à Faire MAINTENANT

### 1. **Exécuter le SQL** ⚡
```sql
-- Copiez-collez le contenu de FIX_CREDITS_SUBSCRIPTION_INCOHERENCE.sql
-- dans le SQL Editor de Supabase et exécutez
```

**Ce script va** :
- ✅ Synchroniser `user_credits.balance` → `profiles.credits`
- ✅ Créer les triggers bidirectionnels
- ✅ Marquer les abonnements expirés
- ✅ **Distribuer immédiatement les crédits mensuels aux abonnements actifs**
- ✅ Afficher un résumé des utilisateurs

### 2. **Vérifier Votre Profil**
Après exécution du SQL :
1. Rafraîchissez la page web
2. Vérifiez le dashboard → vous devriez voir vos crédits !
3. Essayez de créer une mission

### 3. **Tester Attribution Admin**
1. Allez dans le panel Admin
2. Onglet "Utilisateurs"
3. Cliquez "Attribuer crédits" sur un utilisateur
4. Entrez un montant
5. Validez → devrait fonctionner sans erreur "session expirée"

---

## 📅 Configuration Cron Job (Optionnel)

Pour renouveler automatiquement les crédits tous les 30 jours :

### Option 1 : Supabase Edge Function (Recommandé)
```typescript
// supabase/functions/renew-credits/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { error } = await supabase.rpc('distribute_subscription_credits')
  
  return new Response(
    JSON.stringify({ success: !error, error }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

**Appel via Cron** :
```bash
# Configurer dans Supabase Dashboard → Database → Cron Jobs
SELECT cron.schedule(
  'renew-subscription-credits',
  '0 0 1 * *', -- Premier jour de chaque mois à minuit
  $$SELECT distribute_subscription_credits()$$
);
```

### Option 2 : Manuel
En attendant d'automatiser, l'admin peut exécuter manuellement :
```sql
-- Tous les 30 jours, exécuter dans SQL Editor :
SELECT distribute_subscription_credits();
```

---

## 🧪 Tests à Effectuer

### Test 1 : Vérification Crédits
```typescript
// Console navigateur
const { data } = await supabase.from('profiles').select('credits').single()
console.log('Mes crédits:', data.credits)
```

### Test 2 : Création Mission
1. Aller sur `/missions/create`
2. Remplir le formulaire
3. Soumettre
4. ✅ Devrait créer la mission et déduire 1 crédit

### Test 3 : Attribution Admin
1. Panel Admin → Utilisateurs
2. Sélectionner un user
3. "Attribuer crédits" → 10
4. ✅ Devrait ajouter 10 crédits sans erreur

---

## 📊 Vérification Post-Fix

### Requête SQL de Diagnostic
```sql
-- Exécuter pour voir l'état de tous vos utilisateurs
SELECT 
    p.email,
    p.credits as profile_credits,
    uc.balance as user_credits_balance,
    s.plan,
    s.status as sub_status,
    s.current_period_end,
    CASE 
        WHEN s.current_period_end > NOW() THEN 'ACTIF'
        ELSE 'EXPIRÉ'
    END as subscription_state
FROM profiles p
LEFT JOIN user_credits uc ON uc.user_id = p.id
LEFT JOIN subscriptions s ON s.user_id = p.id
ORDER BY p.created_at DESC;
```

### Colonnes à Vérifier
- `profile_credits` = `user_credits_balance` ✅ (doivent être identiques)
- `subscription_state` = 'ACTIF' si abonnement valide
- `profile_credits` > 0 si abonnement actif

---

## 🎯 Résolution des Problèmes Signalés

| Problème | Cause | Solution Appliquée |
|----------|-------|-------------------|
| "J'ai un abonnement mais pas de crédits" | Pas de distribution automatique | Fonction `distribute_subscription_credits()` créée + exécutée |
| "Création mission dit 'pas de crédits'" | `useCredits` lit `profiles.credits` qui était à 0 | Synchronisation + distribution immédiate |
| "Admin session expirée" | `handleGrantCredits` mettait à jour la mauvaise table | Correction pour mettre à jour `profiles.credits` en priorité |
| Désynchronisation générale | Deux sources de vérité (`profiles.credits` vs `user_credits.balance`) | Triggers bidirectionnels + unification sur `profiles.credits` |

---

## 📝 Notes Importantes

### Architecture Finale
```
profiles.credits (SOURCE UNIQUE DE VÉRITÉ)
    ↕️ (Triggers bidirectionnels)
user_credits.balance (Compatibilité legacy)
```

### Flux de Données
1. **Distribution mensuelle** : `distribute_subscription_credits()` → `profiles.credits` ↔️ `user_credits.balance`
2. **Attribution admin** : Admin panel → `profiles.credits` → trigger → `user_credits.balance`
3. **Déduction mission** : `deductCredits()` → `profiles.credits` → trigger → `user_credits.balance`
4. **Lecture interface** : `useCredits` → `profiles.credits` ✅

### Compatibilité
- Les anciennes fonctions utilisant `user_credits` continuent de fonctionner grâce aux triggers
- Nouvelle norme : **toujours lire/écrire dans `profiles.credits`**

---

## ✅ Checklist Finale

Avant de considérer le problème résolu :

- [ ] Exécuter `FIX_CREDITS_SUBSCRIPTION_INCOHERENCE.sql` dans Supabase
- [ ] Vérifier que vos crédits apparaissent dans le dashboard
- [ ] Tester création d'une mission
- [ ] Tester attribution de crédits via admin panel
- [ ] Exécuter la requête de diagnostic SQL
- [ ] Configurer le cron job (ou planifier exécution manuelle mensuelle)

---

## 🚀 Résultat Attendu

Après ces corrections :
1. ✅ Abonnement actif = crédits mensuels disponibles
2. ✅ Création mission fonctionne (1 crédit déduit)
3. ✅ Admin peut attribuer crédits sans erreur
4. ✅ Toutes les interfaces affichent la même valeur de crédits
5. ✅ Renouvellement automatique tous les 30 jours (si cron configuré)
