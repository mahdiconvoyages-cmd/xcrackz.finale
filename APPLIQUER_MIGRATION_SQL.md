# 🚀 Guide Express : Appliquer la Migration SQL

**Durée estimée** : 2 minutes  
**Prérequis** : Accès au Dashboard Supabase

---

## ⚡ Étapes Rapides

### 1️⃣ Accéder à Supabase Dashboard
```
https://supabase.com/dashboard
```

**Actions** :
1. Se connecter avec son compte
2. Sélectionner le projet **Finality**
3. Aller dans le menu **SQL Editor** (icône </>)

---

### 2️⃣ Ouvrir le Fichier SQL
Dans VS Code, ouvrir :
```
supabase/migrations/20251011_create_covoiturage_tables.sql
```

**Raccourci** : Ctrl+P → Taper "20251011"

---

### 3️⃣ Copier le SQL
1. Sélectionner TOUT le contenu (Ctrl+A)
2. Copier (Ctrl+C)

**Taille** : 460 lignes

---

### 4️⃣ Exécuter dans Supabase
1. Dans le SQL Editor, créer une **New query**
2. Coller le SQL (Ctrl+V)
3. Cliquer sur **Run** (ou F5)

---

### 5️⃣ Vérifier le Résultat

**Success ✅** :
```
Success. No rows returned
```

**Vérifications** :
1. Aller dans **Table Editor**
2. Vérifier la présence de 5 nouvelles tables :
   - ✅ `covoiturage_trips`
   - ✅ `covoiturage_bookings`
   - ✅ `covoiturage_reviews`
   - ✅ `covoiturage_messages`
   - ✅ `covoiturage_driver_profiles`

---

## 🔍 Vérification Détaillée

### Tables Créées

#### 1. `covoiturage_trips` (Trajets)
**Colonnes principales** :
- `id` (UUID)
- `user_id` (UUID) → Référence auth.users
- `departure_city`, `arrival_city` (VARCHAR)
- `departure_lat`, `departure_lng` (DECIMAL)
- `departure_date`, `departure_time` (DATE, TIME)
- `available_seats` (INTEGER)
- `price_per_seat` (DECIMAL)
- `status` (VARCHAR) → 'published', 'cancelled', 'completed', 'full'
- `features` (TEXT[]) → Array de features
- `comfort_level` (VARCHAR) → 'basic', 'comfort', 'premium'

**Nombre de colonnes** : ~30

---

#### 2. `covoiturage_bookings` (Réservations)
**Colonnes principales** :
- `id` (UUID)
- `trip_id` (UUID) → Référence covoiturage_trips
- `passenger_id` (UUID) → Référence auth.users
- `seats_booked` (INTEGER)
- `total_price` (DECIMAL)
- `status` (VARCHAR) → 'pending', 'confirmed', 'cancelled', 'completed'
- `custom_pickup_lat`, `custom_pickup_lng` (DECIMAL)

**Nombre de colonnes** : ~15

---

#### 3. `covoiturage_reviews` (Avis)
**Colonnes principales** :
- `id` (UUID)
- `booking_id` (UUID) → Référence covoiturage_bookings
- `reviewer_id`, `reviewed_id` (UUID) → Références auth.users
- `rating` (INTEGER) → 1 à 5
- `comment` (TEXT)
- `positive_tags`, `negative_tags` (TEXT[])

**Nombre de colonnes** : ~8

---

#### 4. `covoiturage_messages` (Messages)
**Colonnes principales** :
- `id` (UUID)
- `trip_id`, `booking_id` (UUID nullable)
- `sender_id`, `recipient_id` (UUID) → Références auth.users
- `content` (TEXT)
- `is_read` (BOOLEAN)
- `read_at` (TIMESTAMP)

**Nombre de colonnes** : ~8

---

#### 5. `covoiturage_driver_profiles` (Profils Conducteur)
**Colonnes principales** :
- `user_id` (UUID) → Référence auth.users (PRIMARY KEY)
- `total_trips`, `total_km`, `total_passengers` (INTEGER)
- `average_rating` (DECIMAL 3,2) → Ex: 4.85
- `total_reviews` (INTEGER)
- `phone_verified`, `email_verified`, `id_verified` (BOOLEAN)
- `default_comfort_level` (VARCHAR)
- `bio` (TEXT)

**Nombre de colonnes** : ~15

---

## 📊 Éléments Créés

### Indexes (10+)
```sql
idx_covoiturage_trips_user_id
idx_covoiturage_trips_departure_date
idx_covoiturage_trips_status
idx_covoiturage_trips_cities
idx_covoiturage_bookings_trip_id
idx_covoiturage_bookings_passenger_id
idx_covoiturage_bookings_status
idx_covoiturage_reviews_booking_id
idx_covoiturage_reviews_reviewed_id
idx_covoiturage_messages_trip_id
idx_covoiturage_messages_recipient_id
idx_covoiturage_messages_is_read
```

**Impact** : Recherches rapides sur villes, dates, statuts

---

### Functions (4)
```sql
update_covoiturage_updated_at()    -- Mise à jour auto de updated_at
update_driver_stats()              -- Compteur trajets et km
update_average_rating()            -- Calcul note moyenne
check_trip_full()                  -- Marquer trajet complet
```

**Impact** : Statistiques automatiques, pas de code manuel

---

### Triggers (5)
```sql
update_covoiturage_trips_updated_at
update_covoiturage_bookings_updated_at
update_covoiturage_driver_profiles_updated_at
update_driver_stats_on_trip
update_average_rating_on_review
check_trip_full_on_booking
```

**Impact** : Mise à jour automatique des données

---

### RLS Policies (15+)
**Sécurité Row Level Security** :
- Seuls les trajets publiés sont visibles
- Les conducteurs modifient seulement leurs trajets
- Les passagers voient seulement leurs réservations
- Les avis sont publics
- Les messages sont privés (expéditeur/destinataire uniquement)

**Impact** : Isolation complète des données utilisateur

---

## ✅ Test de Vérification

### Dans SQL Editor, exécuter :
```sql
-- Compter les tables créées
SELECT COUNT(*) as nb_tables
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'covoiturage_%';
```

**Résultat attendu** : `5`

---

### Vérifier les indexes :
```sql
SELECT indexname
FROM pg_indexes
WHERE tablename LIKE 'covoiturage_%'
ORDER BY indexname;
```

**Résultat attendu** : 12+ lignes

---

### Vérifier les RLS policies :
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename LIKE 'covoiturage_%'
ORDER BY tablename, policyname;
```

**Résultat attendu** : 15+ lignes

---

## 🧪 Créer un Trajet de Test (Optionnel)

```sql
-- Insérer un trajet de démo
INSERT INTO covoiturage_trips (
  user_id,
  departure_city,
  arrival_city,
  departure_date,
  departure_time,
  available_seats,
  price_per_seat,
  total_distance,
  comfort_level,
  features,
  status
) VALUES (
  auth.uid(),  -- Votre user_id actuel
  'Paris',
  'Lyon',
  CURRENT_DATE + INTERVAL '1 day',
  '14:30',
  2,
  25.00,
  465,
  'comfort',
  ARRAY['wifi', 'music', 'air_conditioning'],
  'published'
);
```

**Note** : Vous devez être connecté à Supabase pour que `auth.uid()` fonctionne

---

## 🎯 Vérification Finale

### Test depuis l'App Mobile

1. **Lancer l'app** : `npm start` dans `mobile/`
2. **Aller dans Covoiturage**
3. **Chercher** : Paris → Lyon
4. **Vérifier** :
   - ✅ Spinner "Recherche en cours..."
   - ✅ Résultats affichés OU empty state
   - ✅ Pas d'erreur dans console

### Console Logs Attendus
```
Searching trips from Paris to Lyon
[useCovoiturage] Search results: {...}
```

---

## ❌ Dépannage

### Erreur : "relation covoiturage_trips does not exist"
**Cause** : Migration pas exécutée  
**Solution** : Répéter étapes 1-4

---

### Erreur : "permission denied for table covoiturage_trips"
**Cause** : Problème RLS  
**Solution** : Vérifier que vous êtes connecté via `auth.users`

---

### Erreur : "foreign key constraint violated"
**Cause** : Tentative d'insertion sans user_id valide  
**Solution** : Utiliser `auth.uid()` ou un UUID valide de `auth.users`

---

## 📞 Support

**En cas de problème** :
1. Vérifier les logs dans SQL Editor
2. Checker la table `auth.users` existe
3. Vérifier connexion internet
4. Réessayer la migration (DROP TABLE au début = safe)

---

## 🎉 Succès !

Une fois les 5 tables créées :
- ✅ Web et Mobile sont synchronisés
- ✅ Recherche de trajets fonctionnelle
- ✅ Publication de trajets prête
- ✅ Système de réservation prêt
- ✅ Avis et messages prêts

**Next Step** : Tester l'app mobile ! 🚀

---

**Durée totale** : ~2 minutes  
**Complexité** : ⭐ Facile  
**Impact** : 🚀 Majeur

---

**Auteur** : GitHub Copilot  
**Date** : 11 Octobre 2025
