# 🚀 Guide Rapide - Application des Migrations

## 📋 Migrations à Appliquer

Vous avez **2 migrations SQL** à exécuter dans Supabase Dashboard :

1. ✅ **Covoiturage** - Tables complètes (trajets, réservations, avis, etc.)
2. ✅ **Assignations** - Fix RLS pour visibilité des contacts

---

## 📝 Étape 1: Ouvrir Supabase Dashboard

1. Ouvrir https://supabase.com/dashboard
2. Sélectionner projet **Finality** (`bfrkthzovwpjrvqktdjn`)
3. Aller dans **SQL Editor** (menu gauche)
4. Cliquer **"New query"**

---

## 🚗 Étape 2: Migration Covoiturage (OPTIONNEL)

**Note:** Cette migration crée les tables pour le système de covoiturage. 
**N'exécutez que si vous voulez activer la fonction covoiturage !**

### Fichier à Copier
`supabase/migrations/20251011_create_covoiturage_tables.sql`

### Actions
1. Copier **TOUT** le contenu du fichier (460 lignes)
2. Coller dans SQL Editor
3. Cliquer **"Run"**

### Tables Créées
- `covoiturage_trips` - Trajets publiés
- `covoiturage_bookings` - Réservations
- `covoiturage_reviews` - Avis/notes
- `covoiturage_messages` - Messages
- `covoiturage_driver_profiles` - Profils conducteurs

### Vérification
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'covoiturage%';
```

**Attendu:** 5 tables listées ✅

---

## 🔐 Étape 3: Migration Assignations (IMPORTANT!)

**CRITIQUE:** Cette migration corrige le problème où les contacts n'ont pas vu leurs missions assignées.

### Fichier à Copier
`supabase/migrations/20251011_fix_rls_assignments_for_contacts.sql`

### Actions
1. Créer **nouvelle query** dans SQL Editor
2. Copier **TOUT** le contenu du fichier (100 lignes)
3. Coller dans SQL Editor
4. Cliquer **"Run"**

### Policies Modifiées
- ❌ DELETE `"Users can view own assignments"`
- ✅ CREATE `"Users and contacts can view assignments"`
- ❌ DELETE `"Users can update own assignments"`
- ✅ CREATE `"Users and contacts can update assignments"`

### Vérification
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'mission_assignments'
ORDER BY cmd, policyname;
```

**Attendu:**
```
DELETE | Users can delete own assignments
INSERT | Users can create own assignments
SELECT | Users and contacts can view assignments  ✅ NOUVELLE
UPDATE | Users and contacts can update assignments ✅ NOUVELLE
```

---

## 👤 Étape 4: Créer Contacts pour Utilisateurs Existants

**Important:** Pour que les utilisateurs existants puissent voir leurs assignations, ils doivent avoir un enregistrement dans la table `contacts`.

### Méthode Automatique (Tous les Users)
```sql
-- Créer un contact pour chaque utilisateur qui n'en a pas
INSERT INTO contacts (user_id, type, name, email, phone, company, is_active)
SELECT 
  u.id,
  'driver' as type,  -- ou 'customer', 'supplier'
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    SPLIT_PART(u.email, '@', 1)
  ) as name,
  u.email,
  COALESCE(u.raw_user_meta_data->>'phone', '') as phone,
  '' as company,
  true as is_active
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM contacts c WHERE c.user_id = u.id
);
```

### Méthode Manuelle (Un utilisateur)
```sql
INSERT INTO contacts (user_id, type, name, email, phone, company)
VALUES (
  'uuid-de-l-utilisateur',  -- Copier depuis auth.users
  'driver',                  -- Type: driver, customer, supplier
  'Nom Prénom',
  'email@example.com',
  '+33 6 12 34 56 78',
  'Nom de l''entreprise'
);
```

### Vérification
```sql
-- Compter combien d'users ont un contact
SELECT 
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT c.user_id) as users_with_contact,
  COUNT(DISTINCT u.id) - COUNT(DISTINCT c.user_id) as missing_contacts
FROM auth.users u
LEFT JOIN contacts c ON c.user_id = u.id;
```

**Attendu:** `missing_contacts = 0` ✅

---

## 🧪 Étape 5: Tests de Validation

### Test 1: Visibilité Assignations

**Créer une assignation test:**
```sql
-- 1. Trouver une mission
SELECT id, reference FROM missions LIMIT 1;

-- 2. Trouver un contact
SELECT id, name, email, user_id FROM contacts LIMIT 1;

-- 3. Créer assignation
INSERT INTO mission_assignments (mission_id, contact_id, user_id, assigned_by)
VALUES (
  'uuid-mission',
  'uuid-contact',
  auth.uid(),  -- Créateur
  auth.uid()
);
```

**Vérifier comme contact:**
```sql
-- Se connecter avec le compte du contact, puis:
SELECT ma.*, m.reference 
FROM mission_assignments ma
JOIN missions m ON m.id = ma.mission_id
WHERE EXISTS (
  SELECT 1 FROM contacts c 
  WHERE c.id = ma.contact_id 
  AND c.user_id = auth.uid()
);
```

**Attendu:** L'assignation apparaît ✅

### Test 2: Modification par Contact
```sql
-- En tant que contact assigné:
UPDATE mission_assignments 
SET status = 'in_progress'
WHERE contact_id = (
  SELECT id FROM contacts WHERE user_id = auth.uid()
);
```

**Attendu:** Update réussit sans erreur ✅

### Test 3: Covoiturage (si installé)
```sql
-- Insérer un trajet test
INSERT INTO covoiturage_trips (
  user_id,
  departure_city,
  arrival_city,
  departure_date,
  departure_time,
  available_seats,
  price_per_seat,
  status
) VALUES (
  auth.uid(),
  'Paris',
  'Lyon',
  CURRENT_DATE + INTERVAL '1 day',
  '14:30',
  2,
  25.00,
  'published'
);

-- Vérifier
SELECT * FROM covoiturage_trips WHERE user_id = auth.uid();
```

**Attendu:** Trajet créé et visible ✅

---

## ❓ Résolution de Problèmes

### Erreur: "relation does not exist"
**Cause:** Table pas encore créée.
**Solution:** Vérifier que vous avez exécuté la bonne migration.

### Erreur: "permission denied for table"
**Cause:** RLS bloque l'accès.
**Solution:** Vérifier que vous êtes connecté (auth.uid() retourne une valeur).

### Contact ne voit toujours pas ses assignations
**Causes possibles:**
1. Contact n'existe pas dans table `contacts` → Exécuter Étape 4
2. Policy pas appliquée → Ré-exécuter Étape 3
3. `contact_id` incorrect dans assignation → Vérifier avec:
```sql
SELECT ma.*, c.user_id, c.name
FROM mission_assignments ma
JOIN contacts c ON c.id = ma.contact_id
WHERE ma.id = 'uuid-assignation';
```

### Migration déjà exécutée
**Message:** `ERROR: relation "covoiturage_trips" already exists`
**Solution:** Normal, la migration fait déjà `DROP TABLE IF EXISTS`. Ignorer ou commenter les lignes DROP.

---

## ✅ Checklist Finale

Avant de quitter Supabase Dashboard, vérifiez:

- [ ] Tables covoiturage créées (si besoin): `covoiturage_trips`, etc.
- [ ] Policies RLS sur `mission_assignments` mises à jour
- [ ] Tous les utilisateurs ont un contact dans `contacts`
- [ ] Test assignation: contact peut voir
- [ ] Test update: contact peut modifier statut
- [ ] Aucune erreur dans Console (SQL Editor)

---

## 🔄 Après les Migrations

### Web App
1. Recharger http://localhost:5174
2. Aller dans Missions → Onglet "Équipe"
3. Vérifier que les assignations s'affichent

### Mobile App
1. Redémarrer Expo: `npx expo start`
2. Ouvrir app sur téléphone
3. Aller dans Missions
4. Vérifier que les missions assignées apparaissent

---

## 📞 Support

Si problème persiste après migrations :

1. **Exporter les logs SQL:**
   - Dans SQL Editor, copier l'output de vérification
   - Chercher les erreurs rouges

2. **Vérifier auth:**
   ```sql
   SELECT auth.uid(), auth.email();
   ```

3. **Vérifier contacts:**
   ```sql
   SELECT * FROM contacts WHERE user_id = auth.uid();
   ```

4. **Vérifier policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'mission_assignments';
   ```

---

**Temps estimé:** 10-15 minutes  
**Difficulté:** Facile (copier-coller SQL)  

*Bonne chance! 🚀*
