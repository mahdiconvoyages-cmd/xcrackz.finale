# DÉSACTIVER RLS SUR STORAGE - INTERFACE SUPABASE

## Vous ne pouvez pas désactiver RLS via SQL sur storage.objects

### Solution: Utiliser l'interface Supabase Dashboard

1. **Aller sur Supabase Dashboard**
   https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn

2. **Storage → Policies**

3. **Pour CHAQUE bucket (avatars, vehicle-images, inspection-photos):**
   
   a. Cliquer sur le bucket
   
   b. Aller dans l'onglet "Policies"
   
   c. **SUPPRIMER toutes les politiques** (cliquer sur "..." puis "Delete")
   
   d. Aller dans l'onglet "Configuration"
   
   e. **Cocher "Public bucket"**

4. **OU créer des politiques permissives:**

Pour chaque bucket, créer UNE SEULE politique:

**Nom:** `allow_all_authenticated`

**Policy definition:**
```sql
-- Pour SELECT (lecture)
(bucket_id = 'avatars'::text)

-- Pour INSERT (upload)
(bucket_id = 'avatars'::text)

-- Pour UPDATE (modification)
(bucket_id = 'avatars'::text)

-- Pour DELETE (suppression)
(bucket_id = 'avatars'::text)
```

**WITH CHECK (pour INSERT/UPDATE):**
```sql
(bucket_id = 'avatars'::text)
```

Répéter pour:
- `vehicle-images`
- `inspection-photos`
- `company-logos`
- `user-documents`

## Solution alternative: Via SQL mais simple

Essayez ce script qui crée des politiques très permissives:
