# 🆘 DÉPANNAGE URGENT - Fonction toujours en 404

## Problème
Malgré la création des fonctions SQL, l'API REST retourne toujours une erreur 404.

## Cause probable
Le cache PostgREST de Supabase ne se rafraîchit pas automatiquement dans certains cas.

## ✅ SOLUTION COMPLÈTE (suivre dans l'ordre)

### 🔴 ÉTAPE 1 : Redémarrer le serveur PostgREST (CRITIQUE)

**Dans le Dashboard Supabase :**

1. Aller sur : https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn
2. Cliquer sur **Settings** (⚙️ en bas à gauche)
3. Aller dans **API**
4. Chercher un bouton **"Restart server"** ou similaire
5. **SI PAS DE BOUTON** : Continuer à l'étape 2

### 🔴 ÉTAPE 2 : Forcer le refresh via SQL (OBLIGATOIRE)

Exécuter ce script dans SQL Editor :

```sql
-- 1. Recréer la fonction avec GRANT aux deux rôles
CREATE OR REPLACE FUNCTION create_contact_invitation(
  p_inviter_id uuid,
  p_invited_user_id uuid,
  p_contact_type text,
  p_name text,
  p_email text,
  p_phone text,
  p_company text
) RETURNS json AS $$
DECLARE
  v_contact_id uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM contacts 
    WHERE user_id = p_inviter_id 
    AND invited_user_id = p_invited_user_id
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Invitation déjà envoyée');
  END IF;

  INSERT INTO contacts (
    user_id, invited_by, invited_user_id, type, name, email, phone, company,
    invitation_status, invitation_sent_at
  ) VALUES (
    p_inviter_id, p_inviter_id, p_invited_user_id, p_contact_type,
    p_name, p_email, p_phone, COALESCE(p_company, ''), 'pending', now()
  ) RETURNING id INTO v_contact_id;

  RETURN json_build_object('success', true, 'contact_id', v_contact_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Permissions pour AUTHENTICATED et ANON
GRANT EXECUTE ON FUNCTION create_contact_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION create_contact_invitation TO anon;

-- 3. Forcer le refresh
NOTIFY pgrst, 'reload schema';
```

### 🔴 ÉTAPE 3 : Attendre 2 MINUTES complètes ⏱️

Ne pas rafraîchir immédiatement. Le cache peut prendre jusqu'à 120 secondes.

### 🔴 ÉTAPE 4 : Vider TOUS les caches

**Dans le navigateur :**
- Chrome/Edge : `Ctrl + Shift + Delete` → Vider le cache
- OU ouvrir en **navigation privée** (Ctrl + Shift + N)

**Rafraîchir la page :**
- Windows : `Ctrl + F5`
- Mac : `Cmd + Shift + R`

### 🔴 ÉTAPE 5 : Vérifier l'URL de l'API

Vérifiez que vous utilisez bien la bonne URL Supabase :

**Dans `src/lib/supabase.ts` :**
```typescript
const SUPABASE_URL = 'https://bfrkthzovwpjrvqktdjn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### 🔴 ÉTAPE 6 : Tester avec curl (vérification externe)

Ouvrir PowerShell et exécuter :

```powershell
$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzgwNzgsImV4cCI6MjA3NTU1NDA3OH0.ml0TkLYk53U6CqP_iCc8XkZMusFCSI-nYOS0WyV43Nc"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "https://bfrkthzovwpjrvqktdjn.supabase.co/rest/v1/" -Headers $headers
```

**Résultat attendu :**
- Si la fonction apparaît dans la liste → **Le cache est OK**
- Si elle n'apparaît pas → **Le cache n'est pas rafraîchi**

### 🔴 ÉTAPE 7 : Solution de contournement (SI RIEN NE MARCHE)

Appeler la fonction via `supabase.rpc()` avec une syntaxe alternative :

**Modifier `src/services/contactInvitationService.ts` :**

```typescript
export const sendContactInvitation = async (...params) => {
  try {
    // Méthode 1 : Via RPC (actuel)
    const { data, error } = await supabase.rpc('create_contact_invitation', {
      p_inviter_id: params[0],
      p_invited_user_id: params[1],
      p_contact_type: params[2],
      p_name: params[3],
      p_email: params[4],
      p_phone: params[5],
      p_company: params[6]
    });

    if (error) {
      console.error('RPC Error:', error);
      
      // Méthode 2 : Fallback - Insertion directe
      console.log('Trying direct insert as fallback...');
      const { data: directData, error: directError } = await supabase
        .from('contacts')
        .insert({
          user_id: params[0],
          invited_by: params[0],
          invited_user_id: params[1],
          type: params[2],
          name: params[3],
          email: params[4],
          phone: params[5],
          company: params[6] || '',
          invitation_status: 'pending',
          invitation_sent_at: new Date().toISOString()
        })
        .select()
        .single();

      if (directError) throw directError;
      
      return {
        success: true,
        contact_id: directData.id,
        message: 'Invitation envoyée (fallback method)'
      };
    }

    return data;
  } catch (error) {
    console.error('Error sending invitation:', error);
    throw error;
  }
};
```

Cette méthode contourne le problème en insérant directement dans la table si la fonction RPC échoue.

## 🔍 Diagnostic rapide

Exécutez dans SQL Editor pour diagnostiquer :

```sql
-- Vérifier que la fonction existe
SELECT proname, pronamespace::regnamespace 
FROM pg_proc 
WHERE proname = 'create_contact_invitation';

-- Vérifier les permissions
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'create_contact_invitation';

-- Tester la fonction directement en SQL
-- (Remplacez par vos vrais UUIDs)
SELECT create_contact_invitation(
  'your-user-id'::uuid,
  'invited-user-id'::uuid,
  'customer'::text,
  'Test'::text,
  'test@test.com'::text,
  '0612345678'::text,
  'Company'::text
);
```

## 📞 Dernier recours

Si RIEN ne fonctionne après 5 minutes :

1. **Créer un nouveau projet Supabase** (gratuit)
2. **Migrer les données** avec l'export/import SQL
3. **Mettre à jour** les clés API dans le code

C'est rare, mais parfois le cache PostgREST peut être corrompu.

---

**Prochaine étape** : Dites-moi quel résultat vous obtenez à l'ÉTAPE 6 (test curl).
