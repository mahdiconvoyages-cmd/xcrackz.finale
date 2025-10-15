# 🚨 FIX URGENT - Migration Contact Invitations

## Problème
```
Error 404: Could not find the function public.create_contact_invitation in the schema cache
```

## Cause
La fonction SQL n'existe pas ou le cache PostgREST n'a pas été rafraîchi.

## ✅ Solution rapide (5 minutes)

### 1️⃣ Ouvrir Supabase SQL Editor
- Aller sur : https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn
- Cliquer sur **SQL Editor** (icône </> dans la sidebar)

### 2️⃣ Exécuter le script de correction
- Cliquer sur **+ New query**
- Copier **TOUT le contenu** de `VERIFY_AND_FIX_MIGRATION.sql`
- Coller dans l'éditeur
- Cliquer sur **Run** (ou appuyer sur F5)

### 3️⃣ Vérifier le résultat
À la fin, vous devriez voir :

```
COLONNES: 5
VUES: 2
FONCTIONS: 3

LISTE DES FONCTIONS:
- create_contact_invitation
- accept_contact_invitation
- reject_contact_invitation
```

### 4️⃣ Rafraîchir le cache API
**Option A** : Dans Supabase Dashboard
- Settings → API → **Reload schema cache** (si disponible)

**Option B** : Attendre 30-60 secondes
Le cache se rafraîchit automatiquement grâce à `NOTIFY pgrst, 'reload schema'`

### 5️⃣ Tester l'application web
- Rafraîchir la page (Ctrl + F5)
- Ouvrir la console (F12)
- Tester d'envoyer une invitation
- ✅ Vous devriez voir : "Invitation envoyée avec succès !"

## 🔍 Différences avec l'ancien script

Le nouveau script `VERIFY_AND_FIX_MIGRATION.sql` :
- ✅ **Supprime** les anciennes fonctions avant de les recréer
- ✅ **Vérifie** chaque colonne avant de l'ajouter
- ✅ **Force** le rafraîchissement du cache avec NOTIFY
- ✅ **Affiche** un résumé de vérification à la fin
- ✅ Plus **robuste** (pas d'erreur si déjà exécuté)

## ⚠️ Points importants

1. **Supprimer d'abord** : Le script fait `DROP FUNCTION IF EXISTS` avant de créer
2. **Cache PostgREST** : La commande `NOTIFY pgrst, 'reload schema'` force le rafraîchissement
3. **Idempotent** : Peut être exécuté plusieurs fois sans problème

## 🐛 Si l'erreur persiste après 2 minutes

### Redémarrer manuellement l'API Supabase
1. Dashboard → Settings → API
2. Chercher un bouton "Restart" ou "Reload"
3. Attendre 1 minute

### Vérifier que la fonction existe vraiment
```sql
SELECT proname, pronamespace::regnamespace, prosrc 
FROM pg_proc 
WHERE proname = 'create_contact_invitation';
```

Doit retourner 1 ligne avec le code de la fonction.

### Vérifier les permissions
```sql
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'create_contact_invitation';
```

Doit afficher que `authenticated` a le droit `EXECUTE`.

## 📞 Contact
Si le problème persiste après avoir suivi TOUTES les étapes ci-dessus, il peut y avoir un problème avec le service PostgREST de Supabase lui-même.

---

**Fichier à exécuter** : `VERIFY_AND_FIX_MIGRATION.sql`
**Temps estimé** : 5 minutes
**Risque** : Aucun (script idempotent)
