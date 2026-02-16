# 🔄 Système de Renouvellement Automatique

## 📋 Vue d'ensemble

L'admin peut maintenant **choisir** quels utilisateurs recevront automatiquement des crédits chaque mois.

---

## ✅ Modifications Apportées

### 1. **Base de Données**
**Fichier** : `ADD_AUTO_RENEW_SYSTEM.sql`

- ✅ Colonne `auto_renew` ajoutée à la table `subscriptions`
- ✅ Fonction `distribute_subscription_credits()` mise à jour (respecte auto_renew)
- ✅ Fonction `toggle_auto_renew(user_id, enable)` créée
- ✅ Vue `admin_auto_renew_status` pour l'admin
- ✅ Tous les abonnements existants : `auto_renew = true` par défaut

### 2. **Interface Admin Web**
**Fichier** : `src/pages/Admin.tsx`

- ✅ Icône ⚡ (Zap) pour activer/désactiver l'auto-renouvellement
- ✅ Fonction `handleToggleAutoRenew()` 
- ✅ Interface `UserWithCredits` mise à jour
- ✅ Requête `loadAllUsers()` récupère `auto_renew`

---

## 🎯 Utilisation Admin

### Tableau des Utilisateurs

Chaque utilisateur avec abonnement actif a maintenant **4 boutons** :

| Icône | Couleur | Action |
|-------|---------|--------|
| ⚡ **Zap** | Jaune (activé) / Gris (désactivé) | Toggle auto-renouvellement |
| 🎁 **Gift** | Teal | Prolonger/Modifier |
| ❌ **XCircle** | Rouge | Annuler abonnement |

**Workflow** :
1. Cliquer sur ⚡ pour **activer** → Icône jaune ✅
2. Cliquer à nouveau pour **désactiver** → Icône grise ⏸️

---

## 🔧 Fonctions SQL

### Activer/Désactiver Auto-Renouvellement
```sql
-- Activer
SELECT toggle_auto_renew('user_id_here', true);

-- Désactiver
SELECT toggle_auto_renew('user_id_here', false);
```

### Distribution Automatique (Cron)
```sql
-- Distribue UNIQUEMENT aux abonnements avec auto_renew = true
SELECT distribute_subscription_credits();
```

### Voir le Statut
```sql
SELECT * FROM admin_auto_renew_status;
```

---

## 📊 Résultat Attendu

**Avant** :
- Tous les abonnements actifs recevaient automatiquement des crédits

**Après** :
- ✅ Seulement les abonnements avec `auto_renew = true` reçoivent des crédits
- ⏸️ Les autres gardent leur abonnement SANS recevoir de crédits mensuels
- 🎛️ L'admin contrôle qui reçoit quoi

---

## 🚀 Déploiement

### Étape 1 : SQL
1. Ouvrez **Supabase SQL Editor**
2. Collez le contenu de `ADD_AUTO_RENEW_SYSTEM.sql`
3. **Exécutez**

### Étape 2 : Vérification
```sql
-- Voir qui a auto_renew activé
SELECT email, plan, auto_renew 
FROM admin_auto_renew_status;
```

### Étape 3 : Web (Déjà fait)
- `Admin.tsx` mis à jour ✅
- Push vers Git → Vercel déploie automatiquement

---

## 🧪 Test

1. Connectez-vous en tant qu'**admin**
2. Allez dans **Gestion des Utilisateurs**
3. Trouvez un utilisateur avec abonnement actif
4. Cliquez sur ⚡ → **Icône devient jaune** (activé)
5. Cliquez à nouveau → **Icône devient grise** (désactivé)

### Test Distribution
```sql
-- Exécuter manuellement
SELECT * FROM distribute_subscription_credits();
```

**Résultat** : Seulement les utilisateurs avec ⚡ jaune reçoivent des crédits.

---

## 💡 Cas d'Usage

### Abonnement "Gelé"
Client paye son abonnement mais veut **acheter des crédits à l'unité** :
- ⏸️ Désactiver auto-renew
- Abonnement reste actif (accès aux fonctionnalités)
- Pas de distribution automatique de crédits

### Abonnement Normal
Client veut ses crédits mensuels automatiquement :
- ✅ Activer auto-renew
- Reçoit ses crédits chaque mois

### Client VIP
Client a payé 1 an d'avance :
- ✅ Activer auto-renew
- Reçoit ses crédits tous les mois pendant 12 mois

---

## 📅 Automatisation (Recommandé)

**Créer un Cron Job Supabase** :
1. Database → **Cron Jobs** (pg_cron)
2. Nouveau job : **"Monthly Credit Distribution"**
3. Schedule : `0 0 1 * *` (1er de chaque mois à minuit)
4. Commande :
```sql
SELECT distribute_subscription_credits();
```

---

## ✅ Checklist Finale

- [x] SQL : Colonne auto_renew créée
- [x] SQL : Fonction distribute_subscription_credits() mise à jour
- [x] SQL : Fonction toggle_auto_renew() créée
- [x] SQL : Vue admin_auto_renew_status créée
- [x] Web : Interface Admin avec icône ⚡
- [x] Web : Fonction handleToggleAutoRenew()
- [x] Web : loadAllUsers() récupère auto_renew
- [ ] SQL : Script exécuté dans Supabase
- [ ] Web : Code déployé (git push)
- [ ] Test : Toggle auto_renew fonctionne
- [ ] Cron : Job configuré (optionnel)

---

🎉 **L'admin a maintenant un contrôle total sur les renouvellements automatiques !**
