# 📋 Plans et Crédits - Configuration Finale

## 💰 Plans d'Abonnement

| Plan | Prix | Crédits/Mois | Utilisation |
|------|------|--------------|-------------|
| **Free** | Gratuit | 0 | Test uniquement |
| **Starter** | - | 10 | Dev/Test |
| **Basic** | 19.99€ | **25** | Petites entreprises |
| **Pro** | 49.99€ | **100** | Professionnels |
| **Business** | 79.99€ | **500** | Grandes entreprises |
| **Enterprise** | 79.99€ | **500** | Entreprises |

---

## 🔄 Distribution des Crédits

### Automatique (Mensuel)
La fonction SQL `distribute_subscription_credits()` distribue automatiquement les crédits tous les 30 jours.

### Manuel (Admin)
Le panel admin permet d'attribuer des abonnements avec les crédits correspondants.

---

## 📝 Fichiers Mis à Jour

### 1. **Admin Panel Web**
**Fichier** : `src/pages/Admin.tsx`

```typescript
const planCredits = {
  'basic': 25,        // 19.99€/mois
  'pro': 100,         // 49.99€/mois
  'business': 500,    // 79.99€/mois
  'enterprise': 500   // 79.99€/mois
};
```

### 2. **Fonction SQL Distribution**
**Fichier** : `FIX_CREDITS_SUBSCRIPTION_INCOHERENCE.sql`

```sql
CASE s.plan
    WHEN 'basic' THEN 25
    WHEN 'pro' THEN 100
    WHEN 'business' THEN 500
    WHEN 'enterprise' THEN 500
END
```

### 3. **Fonction SQL Renouvellement Manuel**
```sql
-- renew_user_credits(user_id)
-- Même mapping que ci-dessus
```

---

## 🎯 Actions Effectuées

✅ Web Admin : Crédits mis à jour (25, 100, 500)
✅ SQL distribute_subscription_credits() : Mis à jour
✅ SQL renew_user_credits() : Mis à jour
✅ Documentation créée

---

## ⚠️ Important

### Mise à Jour SQL Requise
Pour que les futures distributions automatiques utilisent les bonnes valeurs, **ré-exécutez le fichier SQL** :

```sql
-- Exécuter dans Supabase SQL Editor
-- Fichier: FIX_CREDITS_SUBSCRIPTION_INCOHERENCE.sql
```

Cela mettra à jour les fonctions SQL avec les nouvelles valeurs de crédits.

---

## 🧪 Vérification

### Test Attribution Admin
1. Attribuer abonnement **Pro** (30 jours)
2. ✅ Devrait donner **100 crédits** (pas 50)

### Test Attribution Admin
1. Attribuer abonnement **Business** (30 jours)
2. ✅ Devrait donner **500 crédits** (pas 100)

### Test Distribution Automatique
```sql
-- Vérifier qu'un abonnement actif donne les bons crédits
SELECT distribute_subscription_credits();
```

---

## 📊 Résumé des Changements

| Avant | Après | Plan |
|-------|-------|------|
| 25 | **25** ✅ | Basic |
| 50 | **100** 📈 | Pro |
| 100 | **500** 📈 | Business |
| 200 | **500** 📈 | Enterprise |

**Les valeurs sont maintenant alignées avec vos tarifs réels !** 🎉
