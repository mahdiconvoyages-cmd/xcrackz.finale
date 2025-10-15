# 🐛 Fix: Assignations de Missions Non Visibles par les Contacts

## Problème Identifié

**Symptôme:**
- Un utilisateur assigne une mission à un contact (ex: chauffeur)
- Le contact ne voit pas cette mission dans l'app mobile ni web
- L'assignation est créée dans la base mais invisible pour le contact

**Cause Root:**
Les **Row Level Security (RLS) Policies** sur `mission_assignments` n'autorisent que le créateur (`user_id`) à voir les assignations, **PAS le contact assigné**.

### Policy Problématique (AVANT):
```sql
CREATE POLICY "Users can view own assignments"
  ON mission_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());  -- ❌ Seul le créateur peut voir
```

## Architecture du Problème

### Tables Impliquées:

1. **`contacts`** - Référence des contacts (chauffeurs, clients, etc.)
   ```sql
   id UUID PRIMARY KEY
   user_id UUID REFERENCES auth.users  -- Lien avec le compte utilisateur
   name, email, phone, company
   ```

2. **`mission_assignments`** - Assignations
   ```sql
   id UUID PRIMARY KEY
   mission_id UUID REFERENCES missions
   contact_id UUID REFERENCES contacts     -- Contact assigné
   user_id UUID REFERENCES profiles        -- Créateur de l'assignation
   ```

### Flux d'Assignation:

1. **Admin** (user_id = A) crée une mission
2. **Admin** assigne la mission au **Chauffeur** (contact_id = C, user_id = B)
3. L'assignation est créée : `{ user_id: A, contact_id: C }`
4. **Problème**: Le chauffeur (B) veut voir cette assignation, mais la policy vérifie `user_id = auth.uid()`, donc `A = B` ❌ **FALSE**

### Logique Correcte:

Le chauffeur (B) doit pouvoir voir car :
- `contact_id = C`
- `contacts.id = C` AND `contacts.user_id = B` ✅

## ✅ Solution Appliquée

### Nouvelle Policy SELECT (APRÈS):
```sql
CREATE POLICY "Users and contacts can view assignments"
  ON mission_assignments
  FOR SELECT
  TO authenticated
  USING (
    -- Créateur de l'assignation
    user_id = auth.uid() 
    OR 
    -- Contact assigné (via JOIN avec contacts)
    EXISTS (
      SELECT 1 FROM contacts 
      WHERE contacts.id = mission_assignments.contact_id 
      AND contacts.user_id = auth.uid()
    )
  );
```

### Nouvelle Policy UPDATE:
```sql
CREATE POLICY "Users and contacts can update assignments"
  ON mission_assignments
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = mission_assignments.contact_id
      AND contacts.user_id = auth.uid()
    )
  );
```

## 📋 Étapes d'Application

### 1. Appliquer la Migration SQL

Ouvrez **Supabase Dashboard** → **SQL Editor** → Exécutez :

```bash
# Fichier à exécuter:
supabase/migrations/20251011_fix_rls_assignments_for_contacts.sql
```

Ou copiez-collez directement :

```sql
DROP POLICY IF EXISTS "Users can view own assignments" ON mission_assignments;
DROP POLICY IF EXISTS "Users can update own assignments" ON mission_assignments;

CREATE POLICY "Users and contacts can view assignments"
  ON mission_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM contacts 
      WHERE contacts.id = mission_assignments.contact_id 
      AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users and contacts can update assignments"
  ON mission_assignments
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = mission_assignments.contact_id
      AND contacts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = mission_assignments.contact_id
      AND contacts.user_id = auth.uid()
    )
  );
```

### 2. Vérifier que le Contact a un Compte Utilisateur

**CRITIQUE**: Le contact doit avoir un enregistrement dans `contacts` avec son `user_id`.

#### Diagnostic:
```sql
-- Trouver le compte utilisateur
SELECT id, email FROM auth.users WHERE email = 'email-du-contact@example.com';

-- Vérifier si le contact existe
SELECT * FROM contacts WHERE user_id = 'user-id-trouvé-ci-dessus';
```

#### Si le Contact N'existe Pas:
```sql
INSERT INTO contacts (user_id, type, name, email, phone, company)
VALUES (
  'user-id-du-compte',     -- UUID du compte auth.users
  'driver',                 -- Type: driver, customer, supplier
  'Nom du Contact',
  'email@example.com',
  '+33 6 12 34 56 78',
  'Société'
);
```

### 3. Tester l'Assignation

#### A. Créer une Assignation (Côté Admin)

```javascript
// Web ou Mobile (Admin)
const { error } = await supabase
  .from('mission_assignments')
  .insert({
    mission_id: 'uuid-mission',
    contact_id: 'uuid-contact',  // ID du contact dans la table contacts
    user_id: auth.uid(),          // Créateur
    assigned_by: auth.uid(),
    payment_ht: 100.00,
    commission: 10.00,
    notes: 'Test assignation'
  });
```

#### B. Vérifier Visibilité (Côté Contact)

```javascript
// Mobile ou Web (Contact assigné)
const { data, error } = await supabase
  .from('mission_assignments')
  .select(`
    *,
    mission:missions(*),
    contact:contacts(*)
  `);

console.log('Assignations visibles:', data);
// ✅ Devrait retourner l'assignation où contact_id correspond
```

## 🧪 Tests de Validation

### Test 1: Créateur voit ses assignations
```sql
-- En tant qu'admin (user_id = A)
SELECT * FROM mission_assignments WHERE user_id = auth.uid();
-- ✅ Devrait retourner toutes les assignations créées
```

### Test 2: Contact voit ses assignations
```sql
-- En tant que contact (user_id = B)
SELECT ma.* 
FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE c.user_id = auth.uid();
-- ✅ Devrait retourner les assignations où on est contact
```

### Test 3: Contact peut modifier le statut
```sql
-- En tant que contact
UPDATE mission_assignments 
SET status = 'in_progress' 
WHERE contact_id = (SELECT id FROM contacts WHERE user_id = auth.uid());
-- ✅ Devrait fonctionner
```

## 📱 Intégration Mobile

### Service Mission (Mobile)

Le fichier `mobile/src/services/missionService.ts` charge déjà correctement :

```typescript
export async function getMissionAssignments(
  userId: string
): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from('mission_assignments')
    .select(`
      *,
      mission:missions(*),
      contact:contacts(*)
    `)
    .eq('mission.user_id', userId)  // ⚠️ PROBLÈME ICI
    .order('assigned_at', { ascending: false });
}
```

**❌ Problème**: Cette requête filtre par `mission.user_id` (créateur de la mission), pas par le contact.

**✅ Correction Nécessaire**:

```typescript
export async function getMyAssignedMissions(
  userId: string
): Promise<Assignment[]> {
  // Récupérer d'abord le contact_id de l'utilisateur
  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!contact) return [];

  // Charger les assignations où on est le contact
  const { data, error } = await supabase
    .from('mission_assignments')
    .select(`
      *,
      mission:missions(*),
      contact:contacts(*)
    `)
    .eq('contact_id', contact.id)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }

  return data || [];
}
```

## 🌐 Intégration Web

Le fichier `src/pages/Missions.tsx` charge déjà correctement :

```typescript
const loadAssignments = async () => {
  const { data, error } = await supabase
    .from('mission_assignments')
    .select(`
      *,
      missions(*),
      contacts(*)
    `)
    .eq('user_id', user!.id)  // ⚠️ Filtre par créateur seulement
    .order('assigned_at', { ascending: false });
};
```

**✅ Pour Voir AUSSI les Assignations Reçues**:

```typescript
const loadAllAssignments = async () => {
  // Trouver le contact_id de l'utilisateur
  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', user!.id)
    .single();

  let query = supabase
    .from('mission_assignments')
    .select(`
      *,
      missions(*),
      contacts(*)
    `);

  // Assignations créées OU reçues
  if (contact) {
    query = query.or(`user_id.eq.${user!.id},contact_id.eq.${contact.id}`);
  } else {
    query = query.eq('user_id', user!.id);
  }

  const { data, error } = await query.order('assigned_at', { ascending: false });
  
  if (error) throw error;
  setAssignments(data || []);
};
```

## 🔍 Diagnostic des Problèmes

### Problème 1: Contact ne voit toujours rien

**Vérifications:**

1. Le contact existe-t-il dans la table `contacts` ?
```sql
SELECT * FROM contacts WHERE user_id = auth.uid();
```

2. La policy RLS est-elle active ?
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'mission_assignments' 
AND policyname = 'Users and contacts can view assignments';
```

3. L'assignation pointe-t-elle vers le bon `contact_id` ?
```sql
SELECT ma.*, c.user_id 
FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE ma.id = 'assignation-id';
```

### Problème 2: Erreur "new row violates row-level security policy"

**Cause**: La policy WITH CHECK empêche l'insertion.

**Solution**: Vérifier que `user_id = auth.uid()` lors de l'INSERT.

### Problème 3: Contact ne peut pas modifier le statut

**Vérification**: Assurer que la policy UPDATE inclut le contact :

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'mission_assignments' 
AND cmd = 'UPDATE';
```

## 📊 Résumé des Changements

| Avant | Après |
|-------|-------|
| ❌ Seul créateur voit assignations | ✅ Créateur + Contact assigné |
| ❌ Seul créateur peut modifier | ✅ Créateur + Contact peuvent modifier |
| ❌ Contact ne reçoit rien | ✅ Contact voit ses missions |
| ❌ Mobile: requête filtre mal | ✅ Ajout fonction `getMyAssignedMissions()` |
| ❌ Web: affiche créées seulement | ✅ Affiche créées ET reçues |

## 🚀 Prochaines Étapes

1. ✅ Appliquer la migration SQL dans Supabase Dashboard
2. ⏳ Mettre à jour `missionService.ts` (mobile) avec `getMyAssignedMissions()`
3. ⏳ Mettre à jour `Missions.tsx` (web) avec `loadAllAssignments()`
4. ⏳ Créer des contacts pour les comptes utilisateurs existants
5. ⏳ Tester l'assignation end-to-end

## 💡 Bonnes Pratiques

1. **Toujours créer un contact** quand un utilisateur s'inscrit
2. **Vérifier l'existence du contact** avant d'assigner
3. **Logger les erreurs RLS** pour diagnostiquer rapidement
4. **Tester avec 2 comptes** : Admin + Contact

---

**Fichiers Modifiés:**
- ✅ `supabase/migrations/20251011_fix_rls_assignments_for_contacts.sql`
- ⏳ `mobile/src/services/missionService.ts` (à mettre à jour)
- ⏳ `src/pages/Missions.tsx` (à mettre à jour)
