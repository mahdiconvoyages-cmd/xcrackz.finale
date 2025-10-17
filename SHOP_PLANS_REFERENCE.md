# 🎯 PLANS BOUTIQUE - CRÉDITS AUTOMATIQUES

**Date:** 17 octobre 2025  
**Source:** Table `shop_items` (valeurs réelles de votre boutique)

---

## 📊 PLANS ET CRÉDITS

Quand vous attribuez un abonnement dans l'admin, **ces crédits sont ajoutés automatiquement** :

| Plan | Prix/mois | Crédits auto | Valeur crédit |
|------|-----------|--------------|---------------|
| 🟢 **STARTER** | 9,99€ | **+10 crédits** | 1€ ≈ 1 crédit |
| 🟡 **BASIC** | 19,99€ | **+25 crédits** | 1€ ≈ 1,25 crédit |
| 🔵 **PRO** | 49,99€ | **+100 crédits** | 1€ ≈ 2 crédits |
| 🟣 **BUSINESS** | 79,99€ | **+500 crédits** | 1€ ≈ 6,25 crédits |
| ⚡ **ENTERPRISE** | 119,99€ | **+1500 crédits** | 1€ ≈ 12,5 crédits |

---

## 💡 COMPARAISON AVEC L'ANCIEN SYSTÈME

### ❌ AVANT (Hard-codé - FAUX)
```typescript
const creditsPerPlan = {
  'starter': 10,      // ✅ OK
  'pro': 50,          // ❌ FAUX ! Devrait être 100
  'premium': 150,     // ❌ Plan n'existe pas
  'enterprise': 500,  // ❌ FAUX ! Devrait être 1500
};
```

**Problèmes :**
- PRO donnait 50 au lieu de 100 (50% de perte)
- ENTERPRISE donnait 500 au lieu de 1500 (66% de perte)
- BASIC et BUSINESS n'étaient pas gérés

### ✅ APRÈS (Dynamique depuis shop_items - CORRECT)
```typescript
const selectedPlan = shopPlans.find(p => p.name === grantPlan);
const creditsToAdd = selectedPlan?.credits_amount || 0;
```

**Avantages :**
- ✅ STARTER → 10 crédits
- ✅ BASIC → 25 crédits
- ✅ PRO → 100 crédits (corrigé !)
- ✅ BUSINESS → 500 crédits (nouveau)
- ✅ ENTERPRISE → 1500 crédits (corrigé !)

---

## 🎁 EXEMPLES D'ATTRIBUTION

### Scénario 1 : Abonnement STARTER (30 jours)
```
✅ Abonnement STARTER accordé !
💳 10 crédits ajoutés automatiquement
(selon boutique : 9.99€/mois)
```

### Scénario 2 : Abonnement PRO (30 jours)
```
✅ Abonnement PRO accordé !
💳 100 crédits ajoutés automatiquement
(selon boutique : 49.99€/mois)
```

### Scénario 3 : Abonnement ENTERPRISE (30 jours)
```
✅ Abonnement ENTERPRISE accordé !
💳 1500 crédits ajoutés automatiquement
(selon boutique : 119.99€/mois)
```

---

## 📈 RENTABILITÉ POUR L'UTILISATEUR

Avec 1 crédit = 1 mission :

| Plan | Crédits/mois | Prix crédit | Économie vs achat direct |
|------|--------------|-------------|---------------------------|
| STARTER | 10 | 0,99€ | - |
| BASIC | 25 | 0,80€ | 19% |
| PRO | 100 | 0,50€ | 50% |
| BUSINESS | 500 | 0,16€ | 84% |
| ENTERPRISE | 1500 | 0,08€ | 92% |

**💡 Plus l'abonnement est cher, plus le coût par crédit diminue !**

---

## 🔧 MODIFICATION DES CRÉDITS

### Pour ajuster les crédits d'un plan :

```sql
-- Exemple 1: Augmenter PRO à 150 crédits
UPDATE shop_items
SET credits_amount = 150
WHERE name = 'pro' AND item_type = 'subscription';

-- Exemple 2: Augmenter ENTERPRISE à 2000 crédits
UPDATE shop_items
SET credits_amount = 2000
WHERE name = 'enterprise' AND item_type = 'subscription';

-- Exemple 3: Ajouter un bonus temporaire (+10%)
UPDATE shop_items
SET credits_amount = FLOOR(credits_amount * 1.1)
WHERE item_type = 'subscription';
```

**L'admin utilisera automatiquement les nouvelles valeurs !**

---

## ✅ VÉRIFICATION EN SQL

Dans Supabase SQL Editor, exécutez :

```sql
-- Voir ce que l'admin va utiliser
SELECT 
  name,
  credits_amount,
  price,
  CONCAT('+', credits_amount, ' crédits pour ', price, '€/mois') as info
FROM shop_items
WHERE item_type = 'subscription' AND is_active = true
ORDER BY price;
```

**Résultat attendu :**
```
starter    | 10   | 9.99   | +10 crédits pour 9.99€/mois
basic      | 25   | 19.99  | +25 crédits pour 19.99€/mois
pro        | 100  | 49.99  | +100 crédits pour 49.99€/mois
business   | 500  | 79.99  | +500 crédits pour 79.99€/mois
enterprise | 1500 | 119.99 | +1500 crédits pour 119.99€/mois
```

---

## 🎯 RÉSUMÉ

### Ce qui a changé :
1. ✅ **BASIC** est maintenant géré (25 crédits)
2. ✅ **PRO** donne 100 crédits au lieu de 50
3. ✅ **BUSINESS** est maintenant géré (500 crédits)
4. ✅ **ENTERPRISE** donne 1500 crédits au lieu de 500
5. ✅ Source unique : `shop_items.credits_amount`

### Déploiement :
- ✅ **Frontend déployé** : https://xcrackz-aedczep1y-xcrackz.vercel.app
- ✅ **Admin synchronisé** avec shop_items
- ✅ **Modification SQL** = effet immédiat

---

**🎉 Vos utilisateurs reçoivent maintenant le bon nombre de crédits selon votre boutique !**

---

## 📝 FICHIERS

- `VERIFY_SHOP_PLANS.sql` - Script de vérification
- `SHOP_PLANS_REFERENCE.md` - Ce fichier (référence)
- `SHOP_SYNC_CORRECTION.md` - Documentation technique
