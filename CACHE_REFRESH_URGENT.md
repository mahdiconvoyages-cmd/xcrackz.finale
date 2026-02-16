# 🔴 ACTION URGENTE - Cache PostgREST bloqué

## Problème détecté

```
Error: Could not find the 'type' column of 'contacts' in the schema cache
```

Le cache PostgREST ne voit **AUCUNE colonne** de la table `contacts`, même les colonnes de base comme `type`.

## ✅ Solution IMMÉDIATE

### Exécuter ce script dans SQL Editor Supabase :

```sql
-- Forcer le refresh du cache
NOTIFY pgrst, 'reload schema';

-- Modifier puis restaurer pour forcer la détection
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS _temp_col text;
ALTER TABLE contacts DROP COLUMN IF EXISTS _temp_col;

-- Re-signaler
NOTIFY pgrst, 'reload schema';
```

### OU utiliser le fichier `FORCE_CACHE_REFRESH.sql`

1. Ouvrir SQL Editor dans Supabase
2. Copier TOUT le contenu de `FORCE_CACHE_REFRESH.sql`
3. Exécuter (Run)
4. **Attendre 60 secondes**

## 🔴 SI ÇA NE MARCHE PAS : Redémarrer PostgREST

### Dans Supabase Dashboard :

1. **Settings** → **Database**
2. Chercher **"Connection pooling"** ou **"PostgREST"**
3. Cliquer sur **"Restart"** si disponible

### OU contacter Supabase :

Le cache PostgREST peut parfois se bloquer complètement. Dans ce cas :

1. Aller sur https://supabase.com/dashboard/support
2. Ouvrir un ticket : "PostgREST schema cache not refreshing"
3. Mentionner le projet ID : `bfrkthzovwpjrvqktdjn`

---

**TEMPS ESTIMÉ** : 2-5 minutes
**URGENCE** : Haute (bloque toutes les invitations)
