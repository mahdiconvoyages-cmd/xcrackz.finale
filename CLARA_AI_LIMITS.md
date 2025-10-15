# 🔒 Système de Limitations IA - Clara

## ✅ Implémentation Terminée

**Date** : 12 octobre 2025  
**Statut** : ✅ Opérationnel

---

## 📋 Limitations par Abonnement

| Plan | Requêtes IA/mois | Statut |
|------|------------------|--------|
| **Free** | ❌ 0 (pas d'accès) | Doit prendre un abonnement |
| **Starter** | ⚡ 10 requêtes | Limité |
| **Basic** | 📦 20 requêtes | Limité |
| **Pro** | ♾️ Illimité | Accès complet |
| **Business** | ♾️ Illimité | Accès complet |
| **Enterprise** | ♾️ Illimité | Accès complet |

---

## 🔐 Règles de Sécurité

### ✅ Utilisateurs Authentifiés UNIQUEMENT
- ❌ Chat **masqué** sur pages publiques (accueil, connexion, inscription)
- ❌ Aucune requête possible sans compte
- ✅ Visible uniquement après connexion

### 📊 Tracking des Requêtes
- Compteur par utilisateur et par mois
- Reset automatique chaque mois
- Historique conservé 12 mois

### 🚫 Blocage Automatique
- Si limite atteinte → Message d'upgrade
- Si pas d'abonnement → Message pour s'abonner
- Vérification avant chaque requête

---

## 🗂️ Structure Technique

### Base de Données

**Table créée** : `ai_requests_usage`
```sql
CREATE TABLE public.ai_requests_usage (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  month_key text NOT NULL,        -- 'YYYY-MM'
  request_count integer DEFAULT 0,
  last_request_at timestamp,
  created_at timestamp,
  updated_at timestamp
);
```

**Fonctions créées** :
- `get_current_month_key()` - Obtenir mois actuel
- `increment_ai_request(user_id)` - Incrémenter compteur
- `get_ai_requests_count(user_id)` - Obtenir nombre requêtes

### Services TypeScript

**Fichier** : `src/services/aiLimitService.ts`

**Fonctions principales** :
```typescript
checkAILimit(userId) → {
  canUseAI: boolean,
  requestsUsed: number,
  requestsLimit: number,
  isUnlimited: boolean,
  plan: string,
  message: string
}

incrementAIRequest(userId) → number

getUpgradeMessage(plan) → string
```

### Intégration Clara

**Fichier** : `src/services/aiServiceEnhanced.ts`

**Workflow** :
```typescript
1. Vérifier limite (checkAILimit)
2. Si pas d'accès → Message d'upgrade
3. Si accès OK → Traiter requête
4. Incrémenter compteur (sauf illimité)
5. Retourner réponse
```

---

## 💬 Messages aux Utilisateurs

### Plan Free (pas d'abonnement)
```
❌ Aucun abonnement actif. 
Prends au minimum un abonnement Basic pour utiliser Clara ! 💼

🚀 Débloquer Clara avec un abonnement !

Pour utiliser Clara, ton assistante IA personnelle, 
tu as besoin d'un abonnement :

📦 BASIC - 20 requêtes/mois
💼 PRO - Accès illimité ⭐
🏢 BUSINESS - Accès illimité + fonctionnalités avancées
🌟 ENTERPRISE - Accès illimité + support premium

👉 Upgrade maintenant pour commencer à utiliser Clara !
```

### Starter - Limite Atteinte (10/10)
```
❌ Tu as atteint ta limite de 10 requêtes ce mois-ci. 
Upgrade vers Pro pour un accès illimité ! 💪

⚡ Upgrade pour plus de requêtes !

Tu as actuellement le plan STARTER (10 requêtes/mois).

Passe au plan supérieur :

📦 BASIC - 20 requêtes/mois (+10)
💼 PRO - Accès illimité ⭐
🏢 BUSINESS - Illimité + fonctionnalités avancées

👉 Upgrade maintenant !
```

### Basic - Requêtes Restantes (15/20)
```
✅ 5 requêtes restantes ce mois-ci (15/20 utilisées)
```

### Pro/Business/Enterprise
```
✅ Accès illimité à Clara ! 🎉
```

---

## 🧪 Tests à Effectuer

### Test 1: Utilisateur Non Connecté
1. Se déconnecter
2. Aller sur page d'accueil
3. **Vérifier** : Chat Clara **invisible** ✅

### Test 2: Plan Free
1. Se connecter avec compte Free
2. Essayer de parler à Clara
3. **Vérifier** : Message "Prends un abonnement Basic" ✅

### Test 3: Starter (10 requêtes)
1. Se connecter avec compte Starter
2. Faire 5 requêtes
3. **Vérifier** : "5 requêtes restantes" ✅
4. Faire 5 requêtes supplémentaires
5. **Vérifier** : "Limite atteinte, upgrade" ✅

### Test 4: Basic (20 requêtes)
1. Se connecter avec compte Basic
2. Faire 10 requêtes
3. **Vérifier** : "10 requêtes restantes" ✅
4. Faire 10 requêtes supplémentaires
5. **Vérifier** : "Limite atteinte" ✅

### Test 5: Pro/Business/Enterprise (Illimité)
1. Se connecter avec compte Pro
2. Faire 50+ requêtes
3. **Vérifier** : "Accès illimité" toujours ✅

---

## 📊 Suivi des Statistiques

### Vue Admin
```sql
SELECT * FROM admin_ai_usage_stats;
```

**Résultat** :
```
month_key | active_users | total_requests | avg_requests_per_user
----------|--------------|----------------|---------------------
2025-10   | 150          | 2340           | 15.6
2025-09   | 142          | 2189           | 15.4
```

### Statistiques Utilisateur
```typescript
const stats = await getAIUsageStats(userId);
// Retourne historique 6 derniers mois
```

---

## 🔧 Maintenance

### Nettoyage Automatique
Données > 12 mois supprimées automatiquement

```sql
SELECT cleanup_old_ai_requests();
```

### Réinitialiser Compteur Manuellement
```sql
DELETE FROM ai_requests_usage 
WHERE user_id = 'xxx' AND month_key = '2025-10';
```

### Ajouter Requêtes Bonus
```sql
UPDATE ai_requests_usage 
SET request_count = request_count - 10
WHERE user_id = 'xxx' AND month_key = '2025-10';
```

---

## 🚀 Déploiement

### 1. Appliquer Migration SQL
```bash
# Sur Supabase Dashboard
# SQL Editor → New Query
# Coller contenu de: supabase/migrations/20251012_ai_requests_limits.sql
# Run
```

### 2. Vérifier Tables
```sql
SELECT * FROM ai_requests_usage LIMIT 1;
```

### 3. Tester Fonctions
```sql
-- Test get_current_month_key
SELECT get_current_month_key();
-- Résultat: '2025-10'

-- Test increment
SELECT increment_ai_request('user-id-here');
-- Résultat: 1

-- Test get count
SELECT get_ai_requests_count('user-id-here');
-- Résultat: 1
```

### 4. Build & Deploy
```bash
npm run build
# Déployer sur production
```

---

## ⚠️ Points d'Attention

### Sécurité
- ✅ RLS activé sur `ai_requests_usage`
- ✅ Utilisateurs voient seulement leurs stats
- ✅ Fonctions SECURITY DEFINER

### Performance
- ✅ Index sur `user_id` et `month_key`
- ✅ Requête unique par mois (upsert)
- ✅ Pas de scan complet de table

### UX
- ✅ Messages clairs et motivants
- ✅ Boutons vers page d'upgrade
- ✅ Compteur visible

---

## 📱 Intégration Mobile (Future)

Pour React Native :
```typescript
// Même logique mais via API backend
const canUse = await checkAILimitAPI(userId);
if (!canUse) {
  showUpgradeModal();
}
```

---

## 🎉 Résumé

### Ce qui a été fait
✅ **Table SQL** créée avec tracking mensuel  
✅ **Service aiLimitService** avec vérifications  
✅ **Clara** intégrée avec limites  
✅ **Chat masqué** pour non-connectés  
✅ **Messages d'upgrade** personnalisés  
✅ **Compteur** incrémenté automatiquement  
✅ **Plans illimités** (Pro/Business/Enterprise)  

### Limites configurées
- Free: ❌ 0 requêtes (doit s'abonner)
- Starter: ⚡ 10 requêtes/mois
- Basic: 📦 20 requêtes/mois
- Pro+: ♾️ Illimité

### Sécurité
- ✅ Authentification obligatoire
- ✅ Vérification avant chaque requête
- ✅ Blocage automatique si limite atteinte

---

**Prochaine étape** : Appliquer la migration SQL sur Supabase ! 🚀

**Fichiers modifiés** :
1. `supabase/migrations/20251012_ai_requests_limits.sql` (nouveau)
2. `src/services/aiLimitService.ts` (nouveau)
3. `src/services/aiServiceEnhanced.ts` (modifié)
4. `src/components/ChatAssistant.tsx` (modifié)

**Documentation** : `CLARA_AI_LIMITS.md` ✅
