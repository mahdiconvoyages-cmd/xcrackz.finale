# 🚀 Guide Rapide - Page Admin

## ⚡ Démarrage en 3 étapes

### 1. Appliquer la migration Supabase

```sql
-- Dans Supabase SQL Editor, exécuter :
-- Le fichier : supabase/migrations/20251010034917_create_subscriptions_and_admin_features.sql
```

Ou via CLI :
```bash
supabase db push
```

### 2. Créer un compte admin

**Option A : Via Supabase Dashboard**
1. Aller dans Authentication > Users
2. Créer un nouvel utilisateur
3. Dans Table Editor > profiles
4. Trouver l'utilisateur et mettre `is_admin = true`

**Option B : Via SQL**
```sql
-- Trouver votre user_id
SELECT id, email FROM auth.users;

-- Mettre admin à true
UPDATE profiles
SET is_admin = true
WHERE id = 'VOTRE_USER_ID';
```

### 3. Tester les fonctionnalités

1. **Se connecter** avec le compte admin
2. **Naviguer** vers `/admin`
3. **Vérifier** que les statistiques s'affichent
4. **Aller** dans l'onglet "Gestion des utilisateurs"
5. **Tester** chaque fonctionnalité :

## 🧪 Checklist de Test

### ✅ Vue d'ensemble
- [ ] Les 8 KPIs s'affichent
- [ ] Les transactions récentes apparaissent
- [ ] Les animations fonctionnent

### ✅ Gestion utilisateurs
- [ ] La liste des utilisateurs se charge
- [ ] La recherche fonctionne (taper un email/nom)
- [ ] Le compteur est correct

### ✅ Actions sur utilisateurs

**Test Rôle Admin :**
- [ ] Cliquer sur bouton Shield (🛡️)
- [ ] L'utilisateur devient admin
- [ ] Badge "ADMIN" apparaît
- [ ] Re-cliquer retire le rôle

**Test Vérification :**
- [ ] Cliquer sur CheckCircle (✓)
- [ ] Badge "VÉRIFIÉ" apparaît
- [ ] Re-cliquer retire la vérification

**Test Crédits :**
- [ ] Cliquer sur le bouton + à côté des crédits
- [ ] Modal s'ouvre
- [ ] Entrer "100" crédits
- [ ] Confirmer
- [ ] Le solde est mis à jour

**Test Abonnement :**
- [ ] Cliquer sur bouton Gift (🎁) ou "Ajouter"
- [ ] Modal s'ouvre
- [ ] Sélectionner "Pro - 100 crédits"
- [ ] Mettre durée "30" jours
- [ ] Confirmer
- [ ] Badge abonnement s'affiche

**Test Ban :**
- [ ] Cliquer sur bouton AlertTriangle (⚠️)
- [ ] Entrer raison : "Test de bannissement"
- [ ] Confirmer
- [ ] Badge "BANNI" apparaît orange
- [ ] Hover sur badge montre la raison
- [ ] Re-cliquer pour débannir

**Test Suppression :**
- [ ] Cliquer sur bouton Trash (🗑️)
- [ ] Lire l'avertissement
- [ ] Annuler pour tester la protection
- [ ] Re-tenter et taper "SUPPRIMER"
- [ ] L'utilisateur est supprimé

### ✅ Suivi GPS
- [ ] Onglet "Suivi GPS" fonctionne
- [ ] Liste des missions actives
- [ ] Bouton "Voir tracking" fonctionne

### ✅ Support
- [ ] Lien "Support" affiche le compteur
- [ ] Clic redirige vers /admin/support

## 🐛 Résolution de Problèmes

### La liste utilisateurs est vide ?

**1. Vérifier les migrations :**
```sql
-- Dans Supabase SQL Editor
SELECT * FROM profiles LIMIT 5;
SELECT * FROM user_credits LIMIT 5;
SELECT * FROM subscriptions LIMIT 5;
```

**2. Créer un utilisateur test :**
```sql
-- Si aucun utilisateur, créer via Supabase Auth
-- Puis vérifier qu'un profil existe
SELECT * FROM profiles WHERE email = 'votre@email.com';
```

**3. Vérifier les permissions RLS :**
```sql
-- Vérifier que vous êtes admin
SELECT is_admin FROM profiles WHERE id = auth.uid();
```

### Les crédits ne se mettent pas à jour ?

**Vérifier la table :**
```sql
-- Voir si la table existe
SELECT * FROM user_credits;

-- Créer une entrée manuellement pour tester
INSERT INTO user_credits (user_id, balance)
VALUES ('USER_ID_ICI', 100);
```

### Les abonnements ne fonctionnent pas ?

**Vérifier la table subscriptions :**
```sql
-- Migration appliquée ?
SELECT * FROM subscriptions LIMIT 5;

-- Créer un abonnement test
INSERT INTO subscriptions (user_id, plan, status, current_period_end)
VALUES ('USER_ID_ICI', 'pro', 'active', now() + interval '30 days');
```

## 📊 Vérifier que tout fonctionne

### SQL Rapide pour Check Complet
```sql
-- 1. Compter les utilisateurs
SELECT COUNT(*) as total_users FROM profiles;

-- 2. Compter les admins
SELECT COUNT(*) as total_admins FROM profiles WHERE is_admin = true;

-- 3. Voir les abonnements actifs
SELECT
  p.email,
  s.plan,
  s.status,
  s.current_period_end
FROM subscriptions s
JOIN profiles p ON p.id = s.user_id
WHERE s.status = 'active';

-- 4. Voir les crédits
SELECT
  p.email,
  uc.balance as credits
FROM user_credits uc
JOIN profiles p ON p.id = uc.user_id
ORDER BY uc.balance DESC;

-- 5. Compter les bannissements
SELECT COUNT(*) as banned_users FROM profiles WHERE banned = true;
```

## 🎯 Fonctionnalités Clés à Montrer

### Démo rapide (5 min)
1. **Dashboard** : Montrer les KPIs et transactions
2. **Liste utilisateurs** : Recherche en live
3. **Attribution crédits** : Donner 100 crédits
4. **Attribution abonnement** : Mettre en "Pro"
5. **Bannissement** : Ban/Unban avec raison

### Démo complète (15 min)
- Tout ce qui précède +
- Promouvoir admin
- Vérifier compte
- Voir missions avec GPS
- Supprimer utilisateur (avec test annulé)
- Vérifier historique dans subscription_history

## 💡 Astuces

1. **Console du navigateur** : Ouvrir F12 pour voir les logs de debug
2. **Network tab** : Vérifier les requêtes Supabase
3. **Supabase Dashboard** : Ouvrir en parallèle pour voir les changements en direct
4. **Table Editor** : Vérifier subscription_history pour voir les traces

## ✅ Checklist Déploiement Production

Avant de déployer en production :

- [ ] Toutes les migrations appliquées
- [ ] Au moins 1 admin créé
- [ ] Toutes les fonctionnalités testées
- [ ] RLS vérifié sur toutes les tables
- [ ] Logs d'erreur vérifiés
- [ ] Build production réussi (`npm run build`)
- [ ] Variables d'environnement configurées

---

**Tout est prêt ! La page admin est 100% fonctionnelle ! 🎉**
