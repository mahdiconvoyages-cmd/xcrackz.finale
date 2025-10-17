# 🎯 Audit Système de Crédits - user_credits.balance

**Date:** 17 octobre 2025  
**Objectif:** Vérifier que TOUS les systèmes utilisent `user_credits.balance` au lieu de `profiles.credits`

---

## ✅ SYSTÈMES VÉRIFIÉS ET CONFORMES

### 1. **Création de Missions** ✅
- **Fichier:** `cassa-temp/src/services/missionService.ts`
- **Lignes 143-175:** Utilise `user_credits.balance` + RPC `deduct_credits`
- **Comportement:** 
  - Vérifie le solde avant création
  - Déduit 1 crédit via `deduct_credits`
  - Message d'erreur si crédits insuffisants

### 2. **Covoiturage - Publication** ✅ CORRIGÉ
- **Fichier:** `src/pages/Covoiturage.tsx`
- **Lignes 243-298:** 
  ```typescript
  const { data: credits } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();
  
  await supabase.rpc('deduct_credits', {
    p_user_id: user.id,
    p_amount: 2,
    p_description: 'Publication trajet covoiturage'
  });
  ```
- **Comportement:** 2 crédits déduits pour publier un trajet

### 3. **Covoiturage - Réservation** ✅ CORRIGÉ
- **Fichier:** `src/pages/Covoiturage.tsx`
- **Lignes 335-392:**
  - Même système que publication
  - 2 crédits déduits pour réserver
  - Utilise RPC `deduct_credits`

### 4. **Boutique (Shop)** ✅
- **Fichier:** `src/pages/Shop.tsx`
- **Lignes 95-122:** Utilise `user_credits.balance`
- **Fonction:** `loadUserCredits()`
  - Crée automatiquement l'entrée si elle n'existe pas
  - Affiche le solde actuel
  - Gère les achats de crédits

### 5. **Dashboard** ✅
- **Fichier:** `src/pages/Dashboard.tsx`
- **Ligne 125:** `supabase.from('user_credits').select('balance')`
- **Affichage:** Statistiques avec solde de crédits

### 6. **Profile** ✅
- **Fichier:** `src/pages/Profile.tsx`
- **Lignes 113-127:** Utilise `user_credits.balance`
- **Affichage:** Solde dans les statistiques utilisateur

### 7. **Admin - Attribution Manuelle** ✅
- **Fichier:** `src/pages/Admin.tsx`
- **Lignes 450-496:** `handleGrantCredits()`
  - Lit le solde existant dans `user_credits.balance`
  - Ajoute les crédits au bon endroit
  - Met à jour ou crée l'entrée si nécessaire

### 8. **Admin - Abonnements** ✅ CORRIGÉ
- **Fichier:** `src/pages/Admin.tsx`
- **Lignes 495-585:** `handleGrantSubscription()`
- **NOUVEAU:** Attribution automatique de crédits selon le plan
  ```typescript
  const creditsPerPlan = {
    'starter': 10,
    'pro': 50,
    'premium': 150,
    'enterprise': 500,
  };
  
  await supabase.rpc('add_credits', {
    p_user_id: selectedUser.id,
    p_amount: creditsToAdd,
    p_description: `Abonnement ${grantPlan.toUpperCase()}`
  });
  ```

### 9. **Webhook Mollie (Paiements)** ✅ CORRIGÉ
- **Fichier:** `supabase/functions/mollie-webhook/index.ts`
- **Lignes 84-109:**
- **AVANT:** ❌ Utilisait `credits_balance` (colonne inexistante)
- **APRÈS:** ✅ Utilise `balance`
  ```typescript
  const { data: userCredits } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', user_id)
    .maybeSingle();
  
  await supabase
    .from('user_credits')
    .update({ balance: userCredits.balance + parseInt(credits) })
    .eq('user_id', user_id);
  ```

---

## 🗑️ SYSTÈME OBSOLÈTE À IGNORER

### ❌ `profiles.credits`
- **Colonne:** Existe dans la table `profiles`
- **Statut:** **NE PLUS UTILISER**
- **Raison:** Système centralisé avec `user_credits` pour traçabilité
- **Action:** Laisser en place mais ne jamais lire/écrire dedans

---

## 📊 FLUX DES CRÉDITS

### Entrée de crédits (ajout) :
1. **Achat boutique** → Webhook Mollie → `user_credits.balance` ✅
2. **Abonnement** → Admin panel → RPC `add_credits` → `user_credits.balance` ✅
3. **Attribution admin** → Admin panel → `user_credits.balance` ✅

### Sortie de crédits (déduction) :
1. **Création mission** → RPC `deduct_credits` → `user_credits.balance` ✅
2. **Publication covoiturage** → RPC `deduct_credits` → `user_credits.balance` ✅
3. **Réservation covoiturage** → RPC `deduct_credits` → `user_credits.balance` ✅

### Consultation :
- **Dashboard** → Lit `user_credits.balance` ✅
- **Profile** → Lit `user_credits.balance` ✅
- **Shop** → Lit `user_credits.balance` ✅
- **Admin** → Lit `user_credits(balance)` en join ✅

---

## 🔧 FONCTIONS RPC UTILISÉES

### `deduct_credits`
```sql
deduct_credits(p_user_id UUID, p_amount INTEGER, p_description TEXT)
```
- Déduit des crédits
- Crée une entrée dans `credit_transactions`
- Utilisé pour : missions, covoiturage

### `add_credits`
```sql
add_credits(p_user_id UUID, p_amount INTEGER, p_description TEXT)
```
- Ajoute des crédits
- Crée une entrée dans `credit_transactions`
- Utilisé pour : abonnements, attribution admin

---

## 🎯 RÉSUMÉ FINAL

| Système | Table utilisée | Colonne | Statut |
|---------|----------------|---------|--------|
| Missions | `user_credits` | `balance` | ✅ OK |
| Covoiturage (pub) | `user_credits` | `balance` | ✅ CORRIGÉ |
| Covoiturage (résa) | `user_credits` | `balance` | ✅ CORRIGÉ |
| Boutique | `user_credits` | `balance` | ✅ OK |
| Dashboard | `user_credits` | `balance` | ✅ OK |
| Profile | `user_credits` | `balance` | ✅ OK |
| Admin (attribution) | `user_credits` | `balance` | ✅ OK |
| Admin (abonnement) | `user_credits` | `balance` | ✅ CORRIGÉ |
| Webhook Mollie | `user_credits` | `balance` | ✅ CORRIGÉ |

---

## ✅ CONCLUSION

**TOUS les systèmes utilisent maintenant `user_credits.balance` !**

- ✅ Acheter des crédits → Mollie webhook → `user_credits.balance`
- ✅ Acheter un abonnement → Attribution auto crédits → `user_credits.balance`
- ✅ Créer une mission → Déduction → `user_credits.balance`
- ✅ Publier/réserver covoiturage → Déduction → `user_credits.balance`
- ✅ Voir le solde → Dashboard/Profile/Shop → `user_credits.balance`

**Aucune référence à `profiles.credits` dans le code actif.**

---

**Dernière mise à jour:** 17 octobre 2025, 14:30  
**Vérification par:** AI Assistant  
**Statut:** ✅ SYSTÈME UNIFIÉ ET FONCTIONNEL
