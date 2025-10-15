# 🏗️ Architecture Assignation de Missions - Guide Complet

## 📚 Contexte

Le système d'assignation permet à un **Admin** (donneur d'ordre) d'assigner des missions à des **Contacts** (chauffeurs, sous-traitants, etc.).

---

## 🎯 Architecture Globale

```
┌──────────────────────────────────────────────────────────────────┐
│                         ADMIN (User A)                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  1. Créer Mission                                           │ │
│  │     INSERT INTO missions (user_id, reference, ...)          │ │
│  │     VALUES ('user-A-id', 'MIS-001', ...)                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  2. Créer Contact (Carnet d'Adresses)                       │ │
│  │     INSERT INTO contacts (user_id, email, name)             │ │
│  │     VALUES ('user-A-id', 'userB@mail.com', 'User B')        │ │
│  │     → contact_id = 'contact-123'                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  3. Assigner Mission au Contact                             │ │
│  │     INSERT INTO mission_assignments                         │ │
│  │     (mission_id, contact_id, user_id)                       │ │
│  │     VALUES ('mission-1', 'contact-123', 'user-A-id')        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

                              ↓ Email Notification ↓

┌──────────────────────────────────────────────────────────────────┐
│                      CHAUFFEUR (User B)                           │
│                  email: userB@mail.com                            │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  4. Se Connecte à l'App Mobile                              │ │
│  │     auth.uid() = 'user-B-id'                                │ │
│  │     auth.email() = 'userB@mail.com'                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  5. Charger Missions Assignées                              │ │
│  │     SELECT * FROM mission_assignments ma                    │ │
│  │     JOIN contacts c ON c.id = ma.contact_id                 │ │
│  │     WHERE c.email = 'userB@mail.com'  ✅                     │ │
│  │     (PAS c.user_id = 'user-B-id' ❌)                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📊 Structure Tables

### Table `contacts` (Carnet d'Adresses)

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,  -- ⚠️ Propriétaire du contact (Admin)
  email TEXT,             -- 🎯 Email du contact cible (Chauffeur)
  name TEXT,
  phone TEXT,
  company TEXT,
  type TEXT CHECK (type IN ('customer', 'driver', 'supplier')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Exemple de Données** :

| id | user_id (Admin) | email (Cible) | name | type |
|----|-----------------|---------------|------|------|
| `contact-123` | `user-A-id` | `userB@mail.com` | User B | driver |
| `contact-456` | `user-A-id` | `userC@mail.com` | User C | driver |
| `contact-789` | `user-D-id` | `userB@mail.com` | User B | driver |

**Points Clés** :
- `user_id` = Qui possède ce contact dans SON carnet (Admin A)
- `email` = Email du contact cible (Chauffeur B)
- Un même chauffeur peut être dans plusieurs carnets d'adresses

---

### Table `mission_assignments`

```sql
CREATE TABLE mission_assignments (
  id UUID PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES missions(id),
  contact_id UUID NOT NULL REFERENCES contacts(id),  -- 🔗 Lien vers carnet
  user_id UUID NOT NULL,  -- Créateur de l'assignation (Admin)
  payment_ht DECIMAL(10, 2),
  commission DECIMAL(10, 2),
  status TEXT DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Exemple de Données** :

| id | mission_id | contact_id | user_id (Créateur) | status |
|----|------------|------------|-------------------|--------|
| `assign-1` | `mission-1` | `contact-123` | `user-A-id` | assigned |
| `assign-2` | `mission-2` | `contact-456` | `user-A-id` | completed |

---

## 🔍 Comprendre les Différences

### ❌ ERREUR FRÉQUENTE

```tsx
// ❌ FAUX : Chercher contact avec user_id = userId connecté
const { data: contactData } = await supabase
  .from('contacts')
  .select('id')
  .eq('user_id', userId)  // ❌ userId = User B (connecté)
  .single();

// Résultat : VIDE ! Car contacts.user_id = Admin A (propriétaire)
```

**Pourquoi ça ne marche pas ?**
- User B se connecte avec `user_id = 'user-B-id'`
- Mais dans `contacts`, ce contact appartient à Admin A : `user_id = 'user-A-id'`
- La requête cherche `user_id = 'user-B-id'` → **0 résultat**

---

### ✅ SOLUTION CORRECTE

```tsx
// ✅ VRAI : Filtrer par email du user connecté
const { data: userProfile } = await supabase.auth.getUser();
const userEmail = userProfile.user.email;

const { data: assignmentsData } = await supabase
  .from('mission_assignments')
  .select(`
    *,
    missions(*),
    contacts!inner(email)  // ✅ JOIN obligatoire
  `)
  .eq('contacts.email', userEmail)  // ✅ Filtre par email
  .order('assigned_at', { ascending: false });
```

**Pourquoi ça marche ?**
- User B se connecte avec email = `userB@mail.com`
- Dans `contacts`, un enregistrement a `email = 'userB@mail.com'`
- Peu importe le `user_id` (propriétaire), on trouve l'assignation

---

## 🧪 Exemples Concrets

### Scénario 1 : Admin Assigne Mission

```sql
-- Admin A se connecte
auth.uid() = 'user-A-id'
auth.email() = 'adminA@example.com'

-- 1. Créer contact pour User B
INSERT INTO contacts (user_id, email, name, type)
VALUES ('user-A-id', 'userB@mail.com', 'Jean Dupont', 'driver');
-- → contact_id = 'contact-123'

-- 2. Créer mission
INSERT INTO missions (id, user_id, reference, ...)
VALUES ('mission-1', 'user-A-id', 'MIS-001', ...);

-- 3. Assigner mission au contact
INSERT INTO mission_assignments (mission_id, contact_id, user_id)
VALUES ('mission-1', 'contact-123', 'user-A-id');
```

---

### Scénario 2 : Chauffeur Voit Ses Missions

```sql
-- User B se connecte
auth.uid() = 'user-B-id'
auth.email() = 'userB@mail.com'

-- ❌ FAUX : Chercher avec user_id
SELECT * FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE c.user_id = 'user-B-id';
-- Résultat : VIDE (contacts.user_id = 'user-A-id')

-- ✅ VRAI : Chercher avec email
SELECT * FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE c.email = 'userB@mail.com';
-- Résultat : mission-1 (assignée par Admin A)
```

---

### Scénario 3 : Plusieurs Admins Assignent au Même Chauffeur

```sql
-- Admin A crée contact pour User B
INSERT INTO contacts VALUES ('contact-123', 'user-A-id', 'userB@mail.com', ...);

-- Admin D crée contact pour User B (même email, autre admin)
INSERT INTO contacts VALUES ('contact-789', 'user-D-id', 'userB@mail.com', ...);

-- Admin A assigne mission-1
INSERT INTO mission_assignments VALUES (..., 'mission-1', 'contact-123', 'user-A-id');

-- Admin D assigne mission-2
INSERT INTO mission_assignments VALUES (..., 'mission-2', 'contact-789', 'user-D-id');

-- User B voit LES DEUX missions
SELECT * FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE c.email = 'userB@mail.com';
-- Résultat : mission-1 (via contact-123) + mission-2 (via contact-789)
```

---

## 🔐 Row Level Security (RLS)

### Policy pour SELECT

```sql
-- Policy côté Admin : voir assignations créées
CREATE POLICY "Users can view own assignments"
  ON mission_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy côté Chauffeur : voir assignations reçues
CREATE POLICY "Contacts can view their assignments"
  ON mission_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = mission_assignments.contact_id
      AND contacts.email = auth.email()  -- ✅ Filtre par email
    )
  );
```

---

## 📱 Implémentation Mobile

### MissionsScreen.tsx (Correct)

```tsx
const loadMissions = async () => {
  // 1. Charger missions créées par l'user
  const createdData = await getMissions(userId);
  setMissions(createdData);

  // 2. Charger missions assignées à l'user (via email)
  const { data: userProfile } = await supabase.auth.getUser();
  const userEmail = userProfile.user.email;

  const { data: assignmentsData } = await supabase
    .from('mission_assignments')
    .select(`
      mission_id,
      status,
      missions(*),
      contacts!inner(email)
    `)
    .eq('contacts.email', userEmail)
    .order('assigned_at', { ascending: false });

  const receivedData = (assignmentsData || [])
    .filter((a: any) => a.missions)
    .map((a: any) => a.missions);
  
  setReceivedMissions(receivedData);
};
```

---

## ✅ Checklist de Validation

- [ ] User B se connecte avec email `userB@mail.com`
- [ ] Requête utilise `.eq('contacts.email', userEmail)`
- [ ] JOIN avec `contacts!inner(email)` est présent
- [ ] User B voit SEULEMENT missions assignées à son email
- [ ] User B ne voit PAS missions assignées à userC@mail.com
- [ ] Admin A voit ses assignations créées (user_id = Admin A)

---

## 🚀 Résumé en 3 Points

1. **`contacts.user_id`** = Propriétaire du contact (Admin)
2. **`contacts.email`** = Cible du contact (Chauffeur)
3. **Filtrer par** `.eq('contacts.email', auth.email())` pour voir missions reçues

---

**Date** : 11 octobre 2025  
**Status** : ✅ Architecture clarifiée  
**Version** : 2.0
