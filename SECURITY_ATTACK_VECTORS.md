# 🛡️ VECTEURS D'ATTAQUE & PROTECTIONS - ANALYSE COMPLÈTE

## ⚠️ Comment un attaquant POURRAIT-IL essayer de contourner la sécurité ?

Analysons **TOUTES** les tentatives possibles et pourquoi elles **ÉCHOUENT**.

---

## 🎯 ATTAQUE 1: Modifier l'URL manuellement

### 🔴 Tentative de l'attaquant :
```
Je ne suis pas admin, mais je vais taper:
http://localhost:5174/admin/support
```

### ✅ Pourquoi ça ÉCHOUE :

**Flux de sécurité** :
```tsx
// App.tsx - Route
<Route path="/admin/support" element={
  <AdminRoute>  {/* ← Checkpoint 1 */}
    <AdminSupport />
  </AdminRoute>
} />

// AdminRoute.tsx - Vérification
export default function AdminRoute({ children }) {
  const { user } = useAuth();          // ← User connecté ?
  const { isAdmin } = useAdmin();      // ← Requête BDD is_admin

  if (!user) {
    return <Navigate to="/login" />;   // ← BLOQUÉ: Pas connecté
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" />; // ← BLOQUÉ: Pas admin
  }

  return <>{children}</>;  // ← Jamais atteint si pas admin
}
```

**Résultat** :
- ❌ `useAdmin()` fait une **vraie requête Supabase**
- ❌ Supabase retourne `is_admin = false`
- ❌ **Redirection automatique** vers `/dashboard`
- 🛡️ **Page jamais affichée**

---

## 🎯 ATTAQUE 2: Modifier le code JavaScript dans le navigateur

### 🔴 Tentative de l'attaquant :
```javascript
// Dans la console Chrome DevTools
localStorage.setItem('isAdmin', 'true');
// ou
window.isAdmin = true;
```

### ✅ Pourquoi ça ÉCHOUE :

**Ce que l'attaquant ne comprend pas** :
```tsx
// useAdmin.ts - La SOURCE de vérité est la BDD
const { data } = await supabase
  .from('profiles')
  .select('is_admin')
  .eq('id', user.id)
  .maybeSingle();

setIsAdmin(data?.is_admin || false);  // ← Vient de SUPABASE, pas du localStorage
```

**Flux réel** :
1. Attaquant modifie `localStorage` ❌
2. `useAdmin()` **ignore complètement** le localStorage
3. `useAdmin()` fait une **requête HTTP à Supabase**
4. Supabase retourne `{ is_admin: false }`
5. `isAdmin` state = `false`
6. **Redirection** vers `/dashboard`

**Pourquoi c'est impossible** :
- Le state `isAdmin` vient d'une **requête serveur**, pas d'une variable locale
- Modifier des variables JS locales ne change **PAS** la base de données
- À chaque rechargement, nouvelle requête → vraie valeur récupérée

---

## 🎯 ATTAQUE 3: Modifier le code source React (DevTools)

### 🔴 Tentative de l'attaquant :
```javascript
// Dans React DevTools
// Trouver le composant AdminRoute
// Modifier le state isAdmin = true
```

### ✅ Pourquoi ça ÉCHOUE :

**Scénario** :
1. ✅ Attaquant réussit à modifier `isAdmin = true` dans React DevTools
2. ✅ La page AdminSupport s'affiche (temporairement)
3. ❌ **MAIS** quand la page fait une requête pour charger les données...

```tsx
// AdminSupport.tsx
const loadQuoteRequests = async () => {
  const { data, error } = await supabase
    .from('shop_quote_requests')
    .select('*');  // ← Requête bloquée par RLS !
    
  if (error) {
    // Error: 403 Forbidden - RLS policy failed
    console.error('Permission denied');
  }
};
```

**RLS Policy côté serveur** :
```sql
CREATE POLICY "Admins can view all quote requests"
  ON public.shop_quote_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()  -- ← auth.uid() = vrai ID utilisateur
      AND profiles.is_admin = true     -- ← Vérifié dans la BDD
    )
  );
```

**Résultat** :
- ✅ Page affichée (frontend hacké)
- ❌ **AUCUNE DONNÉE** retournée (backend protégé)
- ❌ Erreur 403 Forbidden sur toutes les requêtes
- 🛡️ **Attaquant voit une page vide**

---

## 🎯 ATTAQUE 4: Intercepter et modifier les requêtes HTTP (Proxy/Burp Suite)

### 🔴 Tentative de l'attaquant :
```
Utiliser un proxy HTTP (Burp Suite, Charles, etc.)
Intercepter la requête:
GET /rest/v1/profiles?id=eq.xxx

Modifier la réponse:
{ "is_admin": true }  ← Fausse réponse
```

### ✅ Pourquoi ça ÉCHOUE :

**Problème 1 : JWT Token**
```javascript
// Chaque requête Supabase inclut un JWT
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

// Ce JWT contient:
{
  "sub": "user-uuid",
  "email": "attacker@example.com",
  "role": "authenticated"
}
```

Le JWT est **signé par Supabase** avec une clé secrète.
- ❌ Impossible de forger un JWT valide sans la clé secrète
- ❌ Modifier le JWT → Signature invalide → Requête rejetée

**Problème 2 : RLS Policies sur TOUTES les requêtes**

Même si l'attaquant modifie la réponse `{ is_admin: true }`, quand il essaie de récupérer les données :

```sql
-- Requête de l'attaquant
SELECT * FROM shop_quote_requests;

-- Supabase exécute VRAIMENT:
SELECT * FROM shop_quote_requests
WHERE (
  -- RLS Policy appliquée automatiquement
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()  -- ← JWT vérifié ici
    AND profiles.is_admin = true     -- ← Vérifié dans la BDD
  )
);

-- Résultat: 0 lignes (is_admin = false dans la BDD)
```

**Résultat** :
- ❌ JWT empêche la falsification d'identité
- ❌ RLS policies exécutées **côté serveur PostgreSQL**
- ❌ Impossible de modifier la réponse SQL
- 🛡️ **Aucune donnée sensible retournée**

---

## 🎯 ATTAQUE 5: Injection SQL

### 🔴 Tentative de l'attaquant :
```javascript
// Essayer d'injecter du SQL malveillant
const maliciousId = "xxx' OR '1'='1";

await supabase
  .from('profiles')
  .select('is_admin')
  .eq('id', maliciousId);  // ← Injection ?
```

### ✅ Pourquoi ça ÉCHOUE :

**Supabase utilise des requêtes préparées (Prepared Statements)** :

```sql
-- Ce que l'attaquant VEUT exécuter:
SELECT is_admin FROM profiles WHERE id = 'xxx' OR '1'='1';

-- Ce que Supabase EXÉCUTE VRAIMENT:
SELECT is_admin FROM profiles WHERE id = $1;
-- Avec $1 = "xxx' OR '1'='1" (traité comme STRING littérale)

-- Résultat: Aucune ligne (UUID invalide)
```

**Protection automatique** :
- ✅ Supabase **échappe automatiquement** tous les paramètres
- ✅ Impossible d'injecter du SQL
- ✅ UUID validation (format strict)
- 🛡️ **Injection SQL impossible**

---

## 🎯 ATTAQUE 6: Créer un faux compte admin dans la BDD

### 🔴 Tentative de l'attaquant :
```sql
-- Essayer d'exécuter directement:
UPDATE profiles SET is_admin = true WHERE id = 'mon-user-id';
```

### ✅ Pourquoi ça ÉCHOUE :

**RLS Policy sur la table profiles** :
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update own profile" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id)      -- ← Peut seulement modifier SON profil
  WITH CHECK (auth.uid() = id);
```

**Ce qui se passe** :
1. Attaquant essaie : `UPDATE profiles SET is_admin = true WHERE id = 'xxx'`
2. PostgreSQL vérifie la RLS policy
3. Policy dit : "Tu peux modifier SEULEMENT **ton** profil (`auth.uid() = id`)"
4. **MAIS** la policy ne spécifie **PAS** quelles colonnes peuvent être modifiées !

**⚠️ PROBLÈME POTENTIEL DÉTECTÉ !**

La RLS actuelle permet à un utilisateur de modifier **n'importe quelle colonne** de son profil, y compris `is_admin` !

```sql
-- Ceci pourrait FONCTIONNER (si pas d'autres protections):
UPDATE profiles 
SET is_admin = true 
WHERE id = auth.uid();  -- ← Son propre ID
```

---

## 🚨 VULNÉRABILITÉ CRITIQUE: Colonne is_admin modifiable ?

### 🔴 Test de sécurité :

```javascript
// Un utilisateur normal pourrait essayer:
const { data, error } = await supabase
  .from('profiles')
  .update({ is_admin: true })
  .eq('id', user.id);

// Si ça réussit → FAILLE DE SÉCURITÉ !
```

### ✅ SOLUTIONS (à implémenter) :

#### **Solution 1: Policy stricte sur les colonnes**

```sql
-- Créer une policy séparée pour is_admin
DROP POLICY "Users can update own profile" ON public.profiles;

-- Users peuvent modifier leur profil SAUF is_admin
CREATE POLICY "Users can update own profile" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND OLD.is_admin = NEW.is_admin  -- ← is_admin ne peut PAS changer
  );

-- Seuls les admins peuvent modifier is_admin
CREATE POLICY "Only admins can modify admin status"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );
```

#### **Solution 2: Trigger PostgreSQL**

```sql
-- Empêcher la modification de is_admin via trigger
CREATE OR REPLACE FUNCTION prevent_is_admin_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Si changement de is_admin par un non-admin
  IF OLD.is_admin != NEW.is_admin THEN
    -- Vérifier si l'utilisateur actuel est admin
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    ) THEN
      RAISE EXCEPTION 'Only admins can modify admin status';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_is_admin_column
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_is_admin_modification();
```

#### **Solution 3: Column-level permissions (PostgreSQL natif)**

```sql
-- Révoquer les permissions UPDATE sur la colonne is_admin
REVOKE UPDATE (is_admin) ON profiles FROM authenticated;

-- Seul le rôle service_role peut modifier is_admin
GRANT UPDATE (is_admin) ON profiles TO service_role;
```

---

## 🔧 MIGRATION SQL DE SÉCURITÉ RECOMMANDÉE

Créons une migration pour **sécuriser la colonne is_admin** :

```sql
-- ============================================
-- MIGRATION: Protéger la colonne is_admin
-- Date: 14 octobre 2025
-- ============================================

-- Solution 1: Trigger (RECOMMANDÉ - Plus simple)
CREATE OR REPLACE FUNCTION prevent_is_admin_self_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Si l'utilisateur essaie de changer son propre is_admin
  IF OLD.is_admin != NEW.is_admin AND OLD.id = auth.uid() THEN
    -- Vérifier s'il est déjà admin
    IF NOT OLD.is_admin THEN
      RAISE EXCEPTION 'Permission denied: Cannot grant yourself admin privileges';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_is_admin_modification
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_is_admin_self_modification();

COMMENT ON FUNCTION prevent_is_admin_self_modification() IS 
'Empêche les utilisateurs de se donner eux-mêmes les droits admin';
```

---

## 🎯 ATTAQUE 7: XSS (Cross-Site Scripting)

### 🔴 Tentative de l'attaquant :
```javascript
// Injecter du JavaScript malveillant dans un champ
company_name = "<script>alert('Hacked!')</script>"
```

### ✅ Pourquoi ça ÉCHOUE :

**React échappe automatiquement** :
```tsx
// Dans Shop.tsx
<input 
  value={quoteForm.company_name}  // ← Échappé automatiquement
  onChange={(e) => setQuoteForm({...quoteForm, company_name: e.target.value})}
/>

// Affichage dans Admin
<div>{quote.company_name}</div>  
// ← React convertit < et > en &lt; et &gt;
// Résultat affiché: &lt;script&gt;alert('Hacked!')&lt;/script&gt;
```

**Protection React automatique** :
- ✅ Tous les textes sont échappés par défaut
- ✅ `<script>` devient du texte pur, pas exécuté
- ✅ Seul `dangerouslySetInnerHTML` peut exécuter du HTML (non utilisé)
- 🛡️ **XSS impossible**

---

## 🎯 ATTAQUE 8: CSRF (Cross-Site Request Forgery)

### 🔴 Tentative de l'attaquant :
```html
<!-- Site malveillant: evil.com -->
<img src="https://votre-app.supabase.co/rest/v1/profiles?id=eq.xxx" 
     onerror="fetch('https://votre-app.supabase.co/rest/v1/profiles?id=eq.xxx&is_admin=true', {method: 'PATCH'})">
```

### ✅ Pourquoi ça ÉCHOUE :

**Protection 1: JWT requis**
```
Chaque requête Supabase nécessite:
Authorization: Bearer <JWT_TOKEN>

Sans ce header → 401 Unauthorized
```

**Protection 2: CORS (Cross-Origin Resource Sharing)**
```
Supabase vérifie l'origine de la requête.
Si requête vient de evil.com → Bloquée par le navigateur
```

**Protection 3: SameSite Cookie**
```javascript
// Les cookies Supabase sont configurés avec:
Set-Cookie: sb-access-token=xxx; SameSite=Lax

// evil.com ne peut PAS envoyer les cookies automatiquement
```

**Résultat** :
- ❌ Pas de JWT dans la requête → Rejetée
- ❌ CORS bloque les requêtes cross-origin
- ❌ Cookies not sent to evil.com requests
- 🛡️ **CSRF impossible**

---

## 🎯 ATTAQUE 9: Brute Force sur les RLS Policies

### 🔴 Tentative de l'attaquant :
```javascript
// Essayer tous les UUID possibles
for (let i = 0; i < 1000000; i++) {
  await supabase
    .from('shop_quote_requests')
    .select('*')
    .eq('user_id', generateRandomUUID());
}
```

### ✅ Pourquoi ça ÉCHOUE :

**RLS Policy filtre AVANT le retour** :
```sql
-- La requête de l'attaquant
SELECT * FROM shop_quote_requests WHERE user_id = 'random-uuid';

-- Ce que PostgreSQL exécute
SELECT * FROM shop_quote_requests 
WHERE user_id = 'random-uuid'
AND (
  -- RLS Policy auto-ajoutée
  user_id = auth.uid()  -- ← auth.uid() = son propre ID
  OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Résultat: 0 lignes TOUJOURS (UUID ne matche jamais son ID)
```

**Protections supplémentaires** :
- ✅ **Rate Limiting Supabase** : Max requêtes/seconde
- ✅ **UUID espace énorme** : 2^122 possibilités (impossible à bruteforce)
- ✅ **RLS filtre côté serveur** : Pas de fuite de données
- 🛡️ **Brute force inutile**

---

## 🎯 ATTAQUE 10: Social Engineering / Phishing

### 🔴 Tentative de l'attaquant :
```
1. Créer un faux site identique
2. Envoyer email: "Votre compte a été suspendu, cliquez ici"
3. Voler login/password
4. Se connecter avec ces credentials
```

### ✅ Pourquoi ça ÉCHOUE (partiellement) :

**Si l'attaquant obtient les credentials** :
- ✅ Il peut se connecter à l'app
- ❌ **MAIS** il n'est toujours pas admin (`is_admin = false`)
- ❌ Pas d'accès aux pages admin (AdminRoute bloque)
- ❌ Pas d'accès aux données admin (RLS bloque)

**Protection maximale** :
```javascript
// RECOMMANDATION: Implémenter 2FA (Two-Factor Authentication)
// Même avec login/password, il faut un code SMS/Email
```

**Ce que l'attaquant peut faire** :
- ✅ Voir les données du compte volé (dashboard, missions, etc.)
- ❌ Accéder aux pages admin
- ❌ Modifier is_admin
- ❌ Voir les données d'autres utilisateurs

---

## 📊 MATRICE DE SÉCURITÉ - RÉSUMÉ

| Vecteur d'attaque | Risque | Protection | Status |
|------------------|--------|------------|--------|
| Modification URL | ❌ Bas | AdminRoute + useAdmin() | ✅ Protégé |
| LocalStorage hack | ❌ Bas | Requêtes serveur | ✅ Protégé |
| React DevTools | ⚠️ Moyen | RLS Backend | ✅ Protégé |
| HTTP Proxy | ⚠️ Moyen | JWT + RLS | ✅ Protégé |
| SQL Injection | ❌ Bas | Prepared Statements | ✅ Protégé |
| **is_admin self-edit** | 🔴 **ÉLEVÉ** | **⚠️ À SÉCURISER** | **❌ VULNÉRABLE** |
| XSS | ❌ Bas | React auto-escape | ✅ Protégé |
| CSRF | ❌ Bas | JWT + CORS + SameSite | ✅ Protégé |
| Brute Force | ❌ Bas | RLS + Rate Limit | ✅ Protégé |
| Social Engineering | ⚠️ Moyen | 2FA recommandé | ⚠️ Partiel |

---

## ✅ ACTIONS RECOMMANDÉES

### 🔴 URGENT - Sécuriser is_admin :

1. **Créer le trigger de protection** (voir Solution 2 ci-dessus)
2. **Tester** : Essayer de modifier son propre `is_admin`
3. **Vérifier** : Doit retourner une erreur

### ⚠️ MOYEN - Améliorer la sécurité :

1. **Implémenter 2FA** (Two-Factor Authentication)
2. **Ajouter audit logging** (qui a modifié quoi et quand)
3. **Rate limiting** sur les endpoints sensibles
4. **Email notifications** quand is_admin change

### ℹ️ OPTIONNEL - Sécurité avancée :

1. **IP Whitelisting** pour l'admin
2. **Session timeout** courte pour les admins
3. **Suspicious activity detection**
4. **Honeypots** pour détecter les attaques

---

## 🎉 CONCLUSION

### Ce qui EST sécurisé ✅ :
- ✅ Pages admin (AdminRoute)
- ✅ Données (RLS Policies)
- ✅ Authentification (JWT)
- ✅ Frontend (React auto-escape)
- ✅ SQL (Prepared Statements)

### Ce qui DOIT être sécurisé ⚠️ :
- 🔴 **Colonne `is_admin`** → Trigger à ajouter
- ⚠️ **2FA** → À implémenter
- ⚠️ **Audit logging** → À ajouter

### Niveau de sécurité global :
**8/10** - Très bon, mais la protection `is_admin` est **CRITIQUE** à implémenter !

---

**Fichier généré**: `SECURITY_ATTACK_VECTORS.md`
**Date**: 14 octobre 2025
**Recommandation**: Implémenter le trigger `prevent_is_admin_self_modification()` **immédiatement** !
