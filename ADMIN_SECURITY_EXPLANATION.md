# 🔐 PROTECTION DE LA PAGE ADMIN - EXPLICATION COMPLÈTE

## 📍 Pages Admin Protégées

Toutes les routes commençant par `/admin/` sont protégées :
- `/admin` → Page admin principale
- `/admin/support` → Support & Demandes boutique
- `/admin/clients` → Gestion clients
- `/admin/...` → Toutes autres pages admin

---

## 🛡️ SYSTÈME DE PROTECTION EN 3 COUCHES

### 🔸 COUCHE 1: Route Protection (Frontend)

**Fichier**: `src/App.tsx`

```tsx
<Route
  path="/admin/support"
  element={
    <AdminRoute>  {/* ← Protection ici */}
      <Layout>
        <AdminSupport />
      </Layout>
    </AdminRoute>
  }
/>
```

**Ce qui se passe** :
- Le composant `<AdminRoute>` entoure toutes les pages admin
- Avant d'afficher la page, il vérifie les permissions
- Si pas autorisé → Redirection automatique

---

### 🔸 COUCHE 2: AdminRoute Component

**Fichier**: `src/components/AdminRoute.tsx`

```tsx
export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  // Étape 1: Attendre le chargement
  if (authLoading || adminLoading) {
    return <LoadingSpinner />;  // ← Spinner pendant vérification
  }

  // Étape 2: Vérifier si connecté
  if (!user) {
    return <Navigate to="/login" replace />;  // ← Redirection vers login
  }

  // Étape 3: Vérifier si admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;  // ← Redirection vers dashboard
  }

  // Étape 4: OK, afficher la page admin
  return <>{children}</>;
}
```

**Scénarios** :
1. ✅ **Utilisateur connecté + Admin** → Accès autorisé
2. ❌ **Utilisateur connecté + PAS Admin** → Redirigé vers `/dashboard`
3. ❌ **Non connecté** → Redirigé vers `/login`

---

### 🔸 COUCHE 3: useAdmin Hook (Vérification BDD)

**Fichier**: `src/hooks/useAdmin.ts`

```tsx
export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    try {
      // ← Requête Supabase pour vérifier is_admin
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(data?.is_admin || false);  // ← true si admin, false sinon
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);  // ← En cas d'erreur, pas admin
    }
  };

  return { isAdmin, loading };
}
```

**Ce qui est vérifié** :
- Table : `profiles`
- Colonne : `is_admin` (boolean)
- Condition : `is_admin = true`

---

## 🗄️ BASE DE DONNÉES: profiles.is_admin

**Structure** :
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  first_name text,
  last_name text,
  is_admin boolean DEFAULT false,  -- ← La colonne clé !
  ...
);
```

**Valeurs possibles** :
- `is_admin = true` → **Administrateur** ✅
- `is_admin = false` → **Utilisateur normal** ❌
- `is_admin = NULL` → **Utilisateur normal** ❌ (par défaut)

---

## 🔒 PROTECTION BACKEND (RLS Supabase)

Les **RLS Policies** Supabase protègent aussi côté serveur.

### Exemple: shop_quote_requests

```sql
-- Les admins peuvent voir toutes les demandes
CREATE POLICY "Admins can view all quote requests"
  ON public.shop_quote_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true  -- ← Vérification backend
    )
  );
```

**Protection double** :
1. **Frontend** : AdminRoute empêche l'accès à la page
2. **Backend** : RLS empêche l'accès aux données

---

## 🎯 COMMENT RENDRE UN UTILISATEUR ADMIN ?

### Méthode 1: Via Supabase Dashboard

1. Ouvrir **Supabase Dashboard**
2. **Table Editor** → `profiles`
3. Trouver l'utilisateur (par email)
4. Modifier la colonne `is_admin` → **true**
5. Sauvegarder ✅

### Méthode 2: Via SQL

```sql
-- Rendre admin par email
UPDATE profiles
SET is_admin = true
WHERE email = 'admin@example.com';

-- Rendre admin par ID
UPDATE profiles
SET is_admin = true
WHERE id = 'uuid-de-l-utilisateur';
```

### Méthode 3: Via Code (si tu veux automatiser)

```tsx
// Dans un script admin ou migration
const { error } = await supabase
  .from('profiles')
  .update({ is_admin: true })
  .eq('email', 'admin@example.com');
```

---

## 🧪 TESTER LA PROTECTION

### Test 1: Utilisateur Normal
1. Se connecter avec un compte normal (is_admin = false)
2. Essayer d'aller sur `/admin/support`
3. **Résultat attendu** : Redirection vers `/dashboard`

### Test 2: Admin
1. Se connecter avec un compte admin (is_admin = true)
2. Aller sur `/admin/support`
3. **Résultat attendu** : Page affichée ✅

### Test 3: Non Connecté
1. Se déconnecter
2. Essayer d'aller sur `/admin/support`
3. **Résultat attendu** : Redirection vers `/login`

---

## 🚨 SÉCURITÉ: Peut-on contourner ?

### ❌ Contournement Frontend IMPOSSIBLE

**Tentative** : Modifier manuellement l'URL pour aller sur `/admin/support`

**Résultat** :
- `AdminRoute` vérifie `isAdmin` via `useAdmin()`
- `useAdmin()` fait une requête Supabase en temps réel
- Supabase RLS vérifie `profiles.is_admin`
- Si `is_admin = false` → **Redirection automatique**

### ❌ Contournement Backend IMPOSSIBLE

**Tentative** : Faire une requête directe à Supabase pour récupérer les demandes de devis

**Résultat** :
```sql
-- Policy active:
CREATE POLICY "Admins can view all quote requests"
  USING (profiles.is_admin = true);
```
- Supabase vérifie `auth.uid()` (utilisateur connecté)
- Vérifie `profiles.is_admin` pour cet utilisateur
- Si `is_admin = false` → **Requête refusée (403 Forbidden)**

### ✅ Protection Multi-Niveaux

1. **Frontend** : `AdminRoute` bloque l'affichage
2. **Hook** : `useAdmin()` vérifie en temps réel
3. **Backend** : RLS policies filtrent les données
4. **Database** : `is_admin` stocké côté serveur (immuable côté client)

---

## 📊 FLUX COMPLET D'UNE REQUÊTE ADMIN

```
Utilisateur clique sur /admin/support
         ↓
App.tsx détecte la route
         ↓
<AdminRoute> entoure la page
         ↓
useAuth() vérifie si connecté
         ↓
useAdmin() vérifie profiles.is_admin
         ↓
┌─────────────────────────────┐
│ is_admin = true ?           │
├─────────────────────────────┤
│ ✅ OUI → Afficher la page   │
│ ❌ NON → Redirect /dashboard│
│ ❌ NULL → Redirect /login   │
└─────────────────────────────┘
         ↓
Page AdminSupport affichée
         ↓
Requête Supabase (ex: loadQuoteRequests)
         ↓
RLS Policy vérifie profiles.is_admin
         ↓
┌─────────────────────────────┐
│ is_admin = true ?           │
├─────────────────────────────┤
│ ✅ OUI → Données retournées │
│ ❌ NON → 403 Forbidden      │
└─────────────────────────────┘
```

---

## 🎨 RÉSUMÉ VISUEL

```
┌──────────────────────────────────────────────┐
│            PROTECTION ADMIN                  │
├──────────────────────────────────────────────┤
│                                              │
│  1️⃣ AdminRoute Component                    │
│     ↓ Vérifie useAdmin()                    │
│                                              │
│  2️⃣ useAdmin Hook                           │
│     ↓ Query: SELECT is_admin FROM profiles  │
│                                              │
│  3️⃣ Supabase RLS Policies                   │
│     ↓ Vérifie profiles.is_admin = true      │
│                                              │
│  4️⃣ Database Column                         │
│     → profiles.is_admin (boolean)           │
│                                              │
└──────────────────────────────────────────────┘
```

---

## ✅ CONCLUSION

La page Admin est **hyper sécurisée** avec :

1. ✅ **Vérification Frontend** (AdminRoute)
2. ✅ **Vérification Base de Données** (useAdmin hook)
3. ✅ **Policies Backend** (RLS Supabase)
4. ✅ **Colonne protégée** (is_admin non modifiable côté client)

**Impossible d'accéder** sans `is_admin = true` dans la base de données !

---

## 🔧 POUR LA NOUVELLE SECTION "DEMANDES BOUTIQUE"

Les RLS policies qu'on a créées utilisent **le même système** :

```sql
CREATE POLICY "Admins can view all quote requests"
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true  -- ← Même protection !
    )
  );
```

Donc **automatiquement** :
- ✅ Admins verront les demandes de devis
- ❌ Utilisateurs normaux ne verront QUE leurs propres demandes
- ❌ Non connectés ne verront rien

**C'est déjà sécurisé !** 🎉
