# ✅ Corrections Mobile - Affichage Abonnements & Crédits

## 🎯 Problème
Le mobile n'affichait pas correctement :
- Les crédits restants
- Le nom de l'abonnement
- Le nombre de jours avant expiration

**Cause** : Utilisation de tables/colonnes incorrectes + logique désynchronisée avec le web.

---

## ✅ Corrections Appliquées

### 1. **Créé Hook `useSubscription` Mobile**

**Fichier** : `mobile/src/hooks/useSubscription.ts`

```typescript
export function useSubscription(): SubscriptionStatus {
  // Lit depuis profiles.credits (crédits)
  // Lit depuis subscriptions (plan, status, current_period_end)
  // Calcule automatiquement daysRemaining
  
  return {
    hasActiveSubscription,
    plan,              // 'pro', 'basic', etc.
    creditsBalance,    // Nombre de crédits
    expiresAt,         // Date ISO d'expiration
    daysRemaining,     // Nombre de jours avant expiration
    loading
  };
}
```

**Avantages** :
- ✅ Même logique que le web
- ✅ Source unique : `profiles.credits`
- ✅ Calcul automatique des jours restants
- ✅ Realtime synchronization

---

### 2. **Corrigé Hook `useCredits` Mobile**

**Avant** ❌ :
```typescript
// Lisait user_credits.balance (incohérent)
.from('user_credits')
.select('balance')
```

**Après** ✅ :
```typescript
// Lit profiles.credits (source unique)
.from('profiles')
.select('credits')
```

---

### 3. **Mis à Jour Dashboard Mobile**

**Fichier** : `mobile/src/screens/DashboardScreenNew.tsx`

**Avant** ❌ :
```typescript
// Requête SQL manuelle dans le composant
const [subscription, setSubscription] = useState(...)
supabase.from('subscriptions').select('plan_name, status, current_period_end')

// Calcul manuel des jours
Math.ceil((new Date(subscription.current_period_end).getTime() - ...))
```

**Après** ✅ :
```typescript
// Utilise le hook unifié
const { 
  hasActiveSubscription, 
  plan, 
  daysRemaining 
} = useSubscription();

// Affichage simplifié
{hasActiveSubscription ? (
  <>
    <Text>✨ Abonnement Actif</Text>
    <Text>{plan?.toUpperCase()}</Text>
    <Text>Expire dans: {daysRemaining} jours</Text>
    <Text>Crédits: {credits}</Text>
  </>
) : (
  // Mode à la carte
)}
```

---

## 📊 Affichage Dashboard Mobile

### Carte "Crédits/Abonnement"

**Si Abonnement Actif** :
```
✨ Abonnement Actif
PRO                    <-- Nom du plan en majuscules
Expire dans: 25 jours  <-- Calculé automatiquement
Crédits: 50           <-- Crédits restants
```

**Si Pas d'Abonnement** :
```
Crédits disponibles
12                     <-- Crédits restants
Mode à la carte       <-- Indication
```

---

## 🔄 Synchronisation Automatique

### Realtime Updates

**Crédits** :
```typescript
// Hook écoute profiles.credits
supabase.channel('user_credits_${user.id}')
  .on('postgres_changes', { 
    table: 'profiles', 
    filter: `id=eq.${user.id}` 
  })
```

**Abonnements** :
```typescript
// Hook charge subscriptions à chaque changement
loadSubscriptionStatus() // Appelé automatiquement
```

---

## 🧪 Tests à Faire

### 1. Dashboard Mobile
1. Ouvrir l'app mobile
2. Voir le dashboard
3. ✅ Vérifier que l'abonnement s'affiche avec :
   - Nom correct (ex: PRO, BASIC)
   - Jours restants (ex: 25 jours)
   - Crédits corrects

### 2. Création Mission
1. Créer une mission
2. ✅ 1 crédit devrait être déduit
3. ✅ Dashboard devrait se mettre à jour automatiquement

### 3. Attribution Admin
1. Admin donne abonnement PRO 30 jours + 50 crédits
2. ✅ Mobile devrait afficher :
   - "Abonnement Actif"
   - "PRO"
   - "Expire dans: 30 jours"
   - "Crédits: 50"

---

## 📝 Architecture Finale

```
MOBILE                          SUPABASE
======                          ========
useCredits()          →         profiles.credits
  ↓
  reads: credits                triggers ↕
  realtime: profiles            
                                user_credits.balance
useSubscription()     →         
  ↓                             subscriptions
  reads: plan, status,            ↓
         current_period_end       plan, current_period_end
  calculates: daysRemaining
```

---

## ✅ Résultat

Maintenant mobile et web partagent :
- ✅ **Même source de données** : `profiles.credits`
- ✅ **Même logique** : hooks `useCredits` et `useSubscription`
- ✅ **Même affichage** : plan, crédits, jours restants
- ✅ **Synchronisation temps réel** : triggers + realtime

**Le système est unifié et cohérent entre web et mobile !** 🎉
