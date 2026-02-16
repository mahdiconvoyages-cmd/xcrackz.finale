# 🎯 Architecture SIMPLE : Assignation User-to-User

## ⚡ Résumé 30 Secondes

**Système** : Tous les users sont chauffeurs ET donneurs d'ordre  
**Assignation** : User A peut assigner mission directement à User B  
**Visibilité** : User voit missions créées OU missions assignées à lui  

**PAS** de table `contacts` séparée, tout est dans `missions` !

---

## 📊 Structure Table `missions`

```sql
CREATE TABLE missions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,           -- Qui a créé la mission
  assigned_to_user_id UUID REFERENCES auth.users, -- À qui elle est assignée
  reference TEXT,
  status TEXT,
  vehicle_brand TEXT,
  pickup_address TEXT,
  delivery_address TEXT,
  ...
);
```

### Champs Clés

| Champ | Description | Exemple |
|-------|-------------|---------|
| `user_id` | User qui a créé la mission | `user-A-id` |
| `assigned_to_user_id` | User à qui elle est assignée | `user-B-id` |

---

## 🔄 Flux d'Assignation

```
┌─────────────────────────────────────────────────┐
│  USER A (Donneur d'ordre)                        │
│  ┌──────────────────────────────────────────┐   │
│  │  1. Créer Mission                        │   │
│  │     INSERT INTO missions                 │   │
│  │     (user_id, reference, ...)            │   │
│  │     VALUES ('user-A-id', 'MIS-001', ...) │   │
│  └──────────────────────────────────────────┘   │
│                                                   │
│  ┌──────────────────────────────────────────┐   │
│  │  2. Assigner à User B                    │   │
│  │     UPDATE missions                      │   │
│  │     SET assigned_to_user_id = 'user-B-id'│   │
│  │     WHERE id = 'mission-1'               │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

                    ↓ Notification ↓

┌─────────────────────────────────────────────────┐
│  USER B (Chauffeur)                              │
│  ┌──────────────────────────────────────────┐   │
│  │  3. Voir Missions Assignées              │   │
│  │     SELECT * FROM missions               │   │
│  │     WHERE assigned_to_user_id = auth.uid()│   │
│  │     → Voit mission MIS-001 ✅             │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 🔐 RLS Policies

### SELECT (Voir missions)

```sql
CREATE POLICY "Users can view created or assigned missions"
  ON missions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()              -- Missions créées
    OR 
    assigned_to_user_id = auth.uid()  -- Missions assignées
  );
```

**Résultat** :
- User A voit missions où `user_id = user-A-id` ✅
- User B voit missions où `assigned_to_user_id = user-B-id` ✅
- User A ne voit PAS missions créées par User C ❌
- User B ne voit PAS missions assignées à User C ❌

---

### UPDATE (Modifier missions)

```sql
CREATE POLICY "Users can update created or assigned missions"
  ON missions FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR assigned_to_user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid() OR assigned_to_user_id = auth.uid()
  );
```

**Résultat** :
- User A peut modifier missions qu'il a créées ✅
- User B peut modifier missions qui lui sont assignées (ex: status) ✅

---

### DELETE (Supprimer missions)

```sql
CREATE POLICY "Users can delete own missions"
  ON missions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
```

**Résultat** :
- Seul le créateur peut supprimer ✅

---

## 📱 Code Mobile (MissionsScreen.tsx)

### Avant ❌ (Complexe avec contacts)

```tsx
// Cherche contact puis assignations...
const { data: contactData } = await supabase
  .from('contacts')
  .select('id')
  .eq('user_id', userId)
  .single();

const { data: assignments } = await supabase
  .from('mission_assignments')
  .select('...')
  .eq('contact_id', contactData.id);
```

### Après ✅ (Simple user-to-user)

```tsx
const loadMissions = async () => {
  // 1. Missions créées par l'user
  const createdData = await supabase
    .from('missions')
    .select('*')
    .eq('user_id', userId);
  
  setMissions(createdData);

  // 2. Missions assignées à l'user
  const { data: assignedData } = await supabase
    .from('missions')
    .select('*')
    .eq('assigned_to_user_id', userId);
  
  setReceivedMissions(assignedData);
};
```

**Avantages** :
- ✅ 1 seule table (`missions`)
- ✅ 2 requêtes simples
- ✅ Pas de JOIN complexe
- ✅ Pas de table `contacts` intermédiaire

---

## 🧪 Exemple Concret

### Scénario : User A assigne mission à User B

```sql
-- User A se connecte
auth.uid() = 'user-A-id'

-- 1. Créer mission
INSERT INTO missions (id, user_id, reference, status, ...)
VALUES ('mission-1', 'user-A-id', 'MIS-001', 'pending', ...);

-- 2. Assigner à User B
UPDATE missions
SET assigned_to_user_id = 'user-B-id', status = 'assigned'
WHERE id = 'mission-1';
```

**Résultat** :

| id | user_id | assigned_to_user_id | reference | status |
|----|---------|---------------------|-----------|--------|
| `mission-1` | `user-A-id` | `user-B-id` | MIS-001 | assigned |

### User A voit la mission

```sql
SELECT * FROM missions
WHERE user_id = 'user-A-id';
-- ✅ Retourne mission-1 (il l'a créée)
```

### User B voit la mission

```sql
SELECT * FROM missions
WHERE assigned_to_user_id = 'user-B-id';
-- ✅ Retourne mission-1 (elle lui est assignée)
```

### User C ne voit RIEN

```sql
SELECT * FROM missions
WHERE user_id = 'user-C-id' OR assigned_to_user_id = 'user-C-id';
-- ❌ Retourne 0 résultat (pas concerné)
```

---

## ✅ Checklist de Migration

- [x] Code mobile mis à jour (filtre par `assigned_to`)
- [ ] Migration RLS appliquée dans Supabase
- [ ] Tests : User A crée mission
- [ ] Tests : User A assigne à User B
- [ ] Tests : User B voit mission
- [ ] Tests : User C ne voit PAS mission
- [ ] Supprimer code lié à `mission_assignments` (optionnel)

---

## 🔗 Fichiers Modifiés

| Fichier | Action |
|---------|--------|
| `mobile/src/screens/MissionsScreen.tsx` | Simplifié : charge via `assigned_to` |
| `supabase/migrations/20251011_fix_missions_rls_simple.sql` | RLS policies |
| `ARCHITECTURE_SIMPLE_USER_TO_USER.md` | Cette documentation |

---

## 🚀 Prochaines Actions

### Immédiat (5 min)
```sql
-- Appliquer dans Supabase Dashboard → SQL Editor
-- Copier/coller: 20251011_fix_missions_rls_simple.sql
-- Exécuter
```

### Tests (10 min)
1. User A : Créer mission
2. User A : Assigner à User B (champ `assigned_to`)
3. User B : Vérifier mission visible
4. User C : Vérifier mission invisible

---

**Date** : 11 octobre 2025  
**Version** : Simplifiée  
**Architecture** : User-to-User Direct  
**Status** : ✅ Code Mobile Corrigé | ⏳ RLS à Appliquer
