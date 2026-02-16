# 🔧 Guide d'application de la migration Contact Invitations

## ⚠️ Problème identifié

L'application mobile utilise l'ancienne base de données Supabase :
- **URL actuelle mobile**: `https://bfrkthzovwpjrvqktdjn.supabase.co`
- **URL nouvelle (web)**: `https://lvbrzexamrsdmcfzdoyi.supabase.co`

La migration a été appliquée sur la nouvelle base, **mais PAS sur l'ancienne** que l'app mobile utilise.

## 📋 Solution : Appliquer la migration manuellement

### Étape 1 : Se connecter à Supabase (ancienne base)

1. Aller sur https://supabase.com/dashboard
2. Sélectionner le projet : **bfrkthzovwpjrvqktdjn**
3. Cliquer sur **SQL Editor** dans le menu de gauche

### Étape 2 : Exécuter le script SQL

1. Cliquer sur **+ New query**
2. Copier **TOUT le contenu** du fichier `APPLY_INVITATION_MIGRATION.sql`
3. Coller dans l'éditeur SQL
4. Cliquer sur **Run** (ou F5)

### Étape 3 : Vérifier que ça a fonctionné

Exécuter ces requêtes de vérification :

```sql
-- 1. Vérifier que les colonnes existent
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND column_name IN ('invitation_status', 'invited_by', 'invited_user_id');

-- 2. Vérifier les vues
SELECT * FROM contact_invitations_received LIMIT 5;
SELECT * FROM contact_invitations_sent LIMIT 5;

-- 3. Vérifier les fonctions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%invitation%';
```

**Résultat attendu** :
- 3 colonnes retournées (invitation_status, invited_by, invited_user_id)
- Les vues fonctionnent (même si elles sont vides)
- 3 fonctions : create_contact_invitation, accept_contact_invitation, reject_contact_invitation

### Étape 4 : Rafraîchir le cache Supabase

1. Aller dans **Settings** > **API**
2. Cliquer sur **Restart API server** (si disponible)
3. OU attendre 30 secondes que le cache se rafraîchisse automatiquement

### Étape 5 : Tester l'application mobile

1. Relancer l'app mobile
2. Aller dans **Contacts**
3. Essayer d'ajouter un contact (ça devrait envoyer une invitation)
4. L'erreur `column "type" does not exist` ne devrait plus apparaître

## 🔍 Erreurs corrigées

### Avant la migration
```
ERROR: column "type" of relation "contacts" does not exist
ERROR: column contacts.invitation_status does not exist
ERROR: Could not find table 'public.contact_invitations_received'
```

### Après la migration
✅ Toutes les colonnes existent
✅ Les vues sont créées
✅ Les fonctions sont disponibles

## 📱 Alternative : Mettre à jour l'URL Supabase mobile

Si vous voulez utiliser la **nouvelle** base de données partout :

1. Éditer `mobile/src/lib/supabase.ts`
2. Remplacer :
   ```typescript
   const SUPABASE_URL = 'https://bfrkthzovwpjrvqktdjn.supabase.co';
   ```
   par :
   ```typescript
   const SUPABASE_URL = 'https://lvbrzexamrsdmcfzdoyi.supabase.co';
   ```
3. Mettre à jour la clé API correspondante

**⚠️ ATTENTION** : Cela signifie que vous utiliserez une base de données **vide** (nouvelle).

## ✅ Checklist post-migration

- [ ] Migration SQL exécutée sans erreur
- [ ] 3 colonnes invitation_* présentes dans contacts
- [ ] 2 vues créées (invitations_received, invitations_sent)
- [ ] 3 fonctions SQL disponibles
- [ ] App mobile redémarrée
- [ ] Test d'envoi d'invitation réussi
- [ ] Badge de notification fonctionne
- [ ] Accept/Reject fonctionnent

## 🆘 En cas de problème

### Erreur "column already exists"
✅ Normal, la migration utilise `ADD COLUMN IF NOT EXISTS`

### Erreur "policy already exists"
✅ Normal, on fait `DROP POLICY IF EXISTS` avant

### La vue est vide
✅ Normal si aucune invitation n'a été envoyée

### L'erreur persiste après migration
1. Vérifier que vous êtes sur le **bon projet** Supabase (bfrkthzovwpjrvqktdjn)
2. Rafraîchir le cache API (Settings > API > Restart)
3. Attendre 1-2 minutes
4. Relancer complètement l'app mobile

---

**Date de création** : 11 Octobre 2025
**Fichier SQL** : `APPLY_INVITATION_MIGRATION.sql`
**Statut** : ✅ Prêt à être appliqué
