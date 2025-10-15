# 🗄️ MIGRATION SQL - GUIDE RAPIDE

## 📁 Fichier à exécuter

```
supabase/migrations/20251011_covoiturage_system.sql
```

---

## ⚡ EXÉCUTION RAPIDE (2 méthodes)

### Méthode 1 : Supabase Dashboard (Recommandé)

1. **Ouvrir** : https://supabase.com/dashboard
2. **Sélectionner** votre projet
3. **Cliquer** sur "SQL Editor" (dans le menu gauche)
4. **Cliquer** sur "New query"
5. **Copier-coller** tout le contenu de `20251011_covoiturage_system.sql`
6. **Cliquer** sur "Run" ▶️ (ou Ctrl+Enter)
7. **Vérifier** les messages de succès en bas

### Méthode 2 : Supabase CLI (Avancé)

```bash
# Si vous utilisez Supabase CLI
supabase db reset
supabase migration up
```

---

## ✅ CE QUI SERA CRÉÉ

### Tables (2)

**carpooling_trips** :
```
✅ id, driver_id, departure/arrival (city + address)
✅ departure_datetime, total_seats, available_seats
✅ price_per_seat (min 2€), status
✅ allows_pets, allows_smoking, allows_music
✅ chat_level, luggage_size, instant_booking
✅ description, created_at, updated_at
```

**carpooling_bookings** :
```
✅ id, trip_id, passenger_id
✅ seats_booked, total_price, credit_cost (2)
✅ status (pending, confirmed, rejected, etc.)
✅ message (min 20 chars), created_at, updated_at
```

### Colonne Ajoutée (1)

**profiles.blocked_credits** :
```sql
ALTER TABLE profiles 
ADD COLUMN blocked_credits INTEGER DEFAULT 0;
```

### Index (10 au total)

**Sur carpooling_trips** :
- driver_id
- departure_city
- arrival_city
- departure_datetime
- status
- (departure_city, arrival_city, departure_datetime) composite

**Sur carpooling_bookings** :
- trip_id
- passenger_id
- status

### Triggers (4)

1. **update_carpooling_trips_updated_at**
   - Met à jour `updated_at` automatiquement

2. **update_carpooling_bookings_updated_at**
   - Met à jour `updated_at` automatiquement

3. **update_seats_on_booking**
   - Réduit `available_seats` lors d'une confirmation
   - Restaure places lors d'une annulation

4. **check_full_status**
   - Change status → 'full' si available_seats = 0
   - Change status → 'active' si places libérées

### RLS Policies (8)

**Sur carpooling_trips** :
1. Lecture : Trajets actifs/full visibles par tous
2. Création : Nécessite 2 crédits minimum
3. Modification : Seulement son propre trajet
4. Suppression : Seulement son propre trajet

**Sur carpooling_bookings** :
1. Lecture : Voir ses réservations OU réservations de ses trajets
2. Création : 2 crédits + message 20 chars + pas son propre trajet
3. Modification passager : Annuler ses réservations
4. Modification conducteur : Accepter/refuser réservations

---

## 🔍 VÉRIFICATION POST-MIGRATION

### 1. Vérifier tables créées

```sql
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('carpooling_trips', 'carpooling_bookings');
```

**Résultat attendu** :
```
carpooling_trips    | BASE TABLE
carpooling_bookings | BASE TABLE
```

### 2. Vérifier colonne blocked_credits

```sql
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name = 'blocked_credits';
```

**Résultat attendu** :
```
blocked_credits | integer | 0
```

### 3. Vérifier triggers

```sql
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('carpooling_trips', 'carpooling_bookings');
```

**Résultat attendu** : 4 triggers

### 4. Vérifier RLS activé

```sql
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('carpooling_trips', 'carpooling_bookings');
```

**Résultat attendu** : rowsecurity = `true`

### 5. Vérifier policies

```sql
SELECT 
  tablename,
  policyname
FROM pg_policies
WHERE tablename IN ('carpooling_trips', 'carpooling_bookings');
```

**Résultat attendu** : 8 policies au total

---

## 🧪 TEST RAPIDE

### Après migration, testez :

```sql
-- Test 1 : Insérer un trajet (devrait réussir)
INSERT INTO carpooling_trips (
  driver_id,
  departure_city,
  departure_address,
  arrival_city,
  arrival_address,
  departure_datetime,
  total_seats,
  available_seats,
  price_per_seat
) VALUES (
  auth.uid(), -- Votre user ID
  'Paris',
  'Gare du Nord',
  'Lyon',
  'Gare Part-Dieu',
  NOW() + INTERVAL '2 days',
  3,
  3,
  25.00
);

-- Test 2 : Vérifier prix minimum (devrait échouer)
INSERT INTO carpooling_trips (
  driver_id,
  departure_city,
  arrival_city,
  departure_datetime,
  total_seats,
  available_seats,
  price_per_seat
) VALUES (
  auth.uid(),
  'Paris',
  'Lyon',
  NOW() + INTERVAL '2 days',
  3,
  3,
  1.50 -- ❌ Inférieur au minimum 2€
);
-- Erreur attendue : new row violates check constraint

-- Test 3 : Vérifier message minimum (devrait échouer)
INSERT INTO carpooling_bookings (
  trip_id,
  passenger_id,
  seats_booked,
  total_price,
  trip_price,
  message
) VALUES (
  'trip_id_here',
  auth.uid(),
  1,
  25.00,
  25.00,
  'Salut' -- ❌ Moins de 20 caractères
);
-- Erreur attendue : check constraint on message
```

---

## ❌ PROBLÈMES COURANTS

### Erreur : "permission denied for table profiles"

**Solution** : Vérifier que RLS est bien configuré sur `profiles`

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### Erreur : "function uuid_generate_v4() does not exist"

**Solution** : Activer extension UUID

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Erreur : "relation already exists"

**Solution** : Les tables existent déjà. Supprimer d'abord :

```sql
DROP TABLE IF EXISTS carpooling_bookings CASCADE;
DROP TABLE IF EXISTS carpooling_trips CASCADE;
-- Puis réexécuter la migration
```

---

## 🔄 ROLLBACK (Annuler la migration)

Si besoin d'annuler :

```sql
-- Supprimer policies
DROP POLICY IF EXISTS "Trajets publics lisibles" ON carpooling_trips;
DROP POLICY IF EXISTS "Créer un trajet" ON carpooling_trips;
DROP POLICY IF EXISTS "Modifier son trajet" ON carpooling_trips;
DROP POLICY IF EXISTS "Supprimer son trajet" ON carpooling_trips;
DROP POLICY IF EXISTS "Voir réservations" ON carpooling_bookings;
DROP POLICY IF EXISTS "Créer réservation" ON carpooling_bookings;
DROP POLICY IF EXISTS "Modifier réservation passager" ON carpooling_bookings;
DROP POLICY IF EXISTS "Modifier réservation conducteur" ON carpooling_bookings;

-- Supprimer tables
DROP TABLE IF EXISTS carpooling_bookings CASCADE;
DROP TABLE IF EXISTS carpooling_trips CASCADE;

-- Supprimer colonne
ALTER TABLE profiles DROP COLUMN IF EXISTS blocked_credits;

-- Supprimer triggers
DROP TRIGGER IF EXISTS update_carpooling_trips_updated_at ON carpooling_trips;
DROP TRIGGER IF EXISTS update_carpooling_bookings_updated_at ON carpooling_bookings;
DROP TRIGGER IF EXISTS update_seats_on_booking ON carpooling_bookings;
DROP TRIGGER IF EXISTS check_full_status ON carpooling_trips;

-- Supprimer fonctions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_trip_available_seats();
DROP FUNCTION IF EXISTS check_trip_full();
```

---

## 📊 RÉSUMÉ

| Action | Commande | Durée |
|--------|----------|-------|
| Copier SQL | Ctrl+C | 5s |
| Ouvrir Supabase | Web browser | 10s |
| Coller + Run | Ctrl+V + Enter | 5s |
| Vérification | Queries ci-dessus | 2min |
| **TOTAL** | | **< 3 min** |

---

## ✅ CHECKLIST

- [ ] Fichier `20251011_covoiturage_system.sql` ouvert
- [ ] Supabase Dashboard ouvert
- [ ] SQL Editor ouvert
- [ ] SQL copié-collé
- [ ] Run cliqué ▶️
- [ ] Messages de succès vus
- [ ] Tables vérifiées (2)
- [ ] Triggers vérifiés (4)
- [ ] Policies vérifiées (8)
- [ ] Colonne blocked_credits ajoutée
- [ ] Test insertion OK
- [ ] Frontend testé sur `/covoiturage`

---

## 🎉 MIGRATION TERMINÉE !

Votre base de données est prête pour le covoiturage !

**Prochaine étape** :
```
Ouvrir : http://localhost:5173/covoiturage
Tester : Publication + Réservation
```

**Système actif** :
- 💳 2 crédits pour publier
- 💳 2 crédits pour réserver
- 💶 Espèces au conducteur
- ✅ RLS sécurisé
- ✅ Validations automatiques
