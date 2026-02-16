# 📌 Référence Rapide : Assignation de Missions

## 🎯 À Retenir (30s)

```
contacts.user_id  → Propriétaire du contact (Admin)  ❌ PAS le destinataire
contacts.email    → Cible du contact (Chauffeur)     ✅ Le destinataire
```

**Pour charger missions reçues** : Filtrer par `contacts.email = auth.email()`  
**PAS** par `contacts.user_id = auth.uid()`

---

## 🔧 Code à Utiliser

### Charger Missions Assignées (Mobile/Web)

```tsx
// ✅ CORRECT
const { data: userProfile } = await supabase.auth.getUser();
const userEmail = userProfile.user.email;

const { data: assignments } = await supabase
  .from('mission_assignments')
  .select(`
    *,
    missions(*),
    contacts!inner(email)  // !inner = JOIN obligatoire
  `)
  .eq('contacts.email', userEmail)  // Filtre par email
  .order('assigned_at', { ascending: false });
```

---

## 🚫 Erreurs à Éviter

### ❌ NE PAS FAIRE

```tsx
// FAUX : cherche par user_id (propriétaire du contact)
.eq('contact_id', (
  SELECT id FROM contacts WHERE user_id = auth.uid()
))
```

### ✅ À FAIRE

```tsx
// VRAI : cherche par email (cible du contact)
.eq('contacts.email', auth.email())
```

---

## 📊 Exemple SQL Direct

```sql
-- Chauffeur B se connecte (email: userB@mail.com)

-- ❌ FAUX
SELECT * FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE c.user_id = auth.uid();
-- Résultat: VIDE (user_id = Admin A, pas User B)

-- ✅ VRAI
SELECT * FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE c.email = auth.email();
-- Résultat: Toutes les missions assignées à userB@mail.com
```

---

## 🧪 Test Rapide

```sql
-- 1. Créer contact (Admin A)
INSERT INTO contacts (user_id, email, name)
VALUES ('admin-A-id', 'userB@mail.com', 'User B');
-- → contact_id = 'contact-123'

-- 2. Assigner mission
INSERT INTO mission_assignments (contact_id, mission_id, user_id)
VALUES ('contact-123', 'mission-1', 'admin-A-id');

-- 3. User B se connecte et cherche
-- ✅ Doit trouver mission-1
SELECT * FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE c.email = 'userB@mail.com';
```

---

## 📖 Documentation Complète

- **Architecture** : `ARCHITECTURE_ASSIGNATION_MISSIONS.md`
- **Fix Duplicate Keys** : `FIX_DUPLICATE_KEYS_ERROR.md`
- **Résumé Fix** : `FIX_DUPLICATE_KEYS_SUMMARY.md`

---

**Date** : 11 octobre 2025  
**Version** : 2.0
