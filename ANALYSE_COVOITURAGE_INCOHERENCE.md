# 🚨 INCOHÉRENCE CRITIQUE : Système Covoiturage Web vs Mobile

**Date:** 21 Octobre 2025  
**Découverte:** Audit pré-build des tables

---

## ❌ PROBLÈME MAJEUR : Tables Différentes

### **WEB** utilise :
```typescript
// src/pages/Covoiturage.tsx
.from('carpooling_trips')      // Trajets
.from('carpooling_bookings')   // Réservations  
.from('user_credits')          // Crédits
```

### **MOBILE** utilise :
```typescript
// mobile/src/screens/CovoituragePublish.tsx
.from('rides')                 // Trajets ❌
.from('ride_reservations')     // Réservations ❌
.from('ride_messages')         // Messages ❌
.from('ride_ratings')          // Notes ❌
```

---

## 🔍 Analyse des Fichiers

### **WEB (1 fichier)**
- **src/pages/Covoiturage.tsx** (1500+ lignes)
  - Tables: `carpooling_trips`, `carpooling_bookings`, `user_credits`
  - Recherche trajets
  - Réservation
  - Gestion crédits

### **MOBILE (7 fichiers)**

1. **CovoiturageScreen.tsx** (461 lignes)
   - Page d'accueil/présentation
   - Navigation vers fonctionnalités

2. **CovoituragePublish.tsx**
   - Publication trajets → `rides` table ❌
   - Devrait utiliser `carpooling_trips`

3. **CovoiturageMyTrips.tsx**
   - Mes trajets → `rides` + `ride_reservations` ❌
   - Devrait utiliser `carpooling_trips` + `carpooling_bookings`

4. **CovoiturageTripDetails.tsx**
   - Détails trajet → `rides` + `ride_reservations` ❌
   - Foreign key: `rides_driver_id_fkey`

5. **CovoiturageMessages.tsx**
   - Messagerie → `ride_messages` ❌
   - Table n'existe probablement pas sur Web

6. **CovoiturageRateUser.tsx**
   - Notation → `ride_ratings` ❌
   - Table n'existe probablement pas sur Web

7. **CovoiturageUserProfile.tsx**
   - Profil utilisateur
   - Stats: `total_rides_as_driver`, `total_rides_as_passenger`

---

## ⚠️ CONSÉQUENCES

### 🔴 **Isolation Totale des Données**
- Trajet publié sur Mobile → N'apparaît PAS sur Web
- Trajet publié sur Web → N'apparaît PAS sur Mobile
- Réservations complètement séparées
- Messages inexistants côté Web

### 🔴 **Incohérence Fonctionnelle**
- Web: Système crédit (`user_credits`)
- Mobile: Aucune gestion crédit visible
- Mobile: Messages + Ratings (absents Web ?)

### 🔴 **Problème de Synchronisation**
- Impossible de partager les trajets entre plateformes
- Utilisateur Web ne voit pas trajets Mobile et vice-versa

---

## ✅ SOLUTION : UNIFICATION COMPLÈTE

### **Option 1 : Utiliser les Tables WEB (RECOMMANDÉ)**

Remplacer dans TOUS les fichiers Mobile :

```typescript
// ❌ ANCIEN (Mobile)
.from('rides')
.from('ride_reservations')  
.from('ride_messages')
.from('ride_ratings')

// ✅ NOUVEAU (Unifié)
.from('carpooling_trips')
.from('carpooling_bookings')
.from('carpooling_messages')      // À créer si besoin
.from('carpooling_ratings')       // À créer si besoin
```

### **Structure Unifiée**

#### **Table : `carpooling_trips`** (Trajets)
```sql
id UUID PRIMARY KEY
driver_id UUID REFERENCES auth.users(id)
departure_city TEXT
arrival_city TEXT
departure_date TIMESTAMPTZ
departure_time TEXT
available_seats INTEGER
price_per_seat DECIMAL
vehicle_info JSONB {brand, model, color, plate}
description TEXT
status TEXT ('published', 'in_progress', 'completed', 'cancelled')
created_at TIMESTAMPTZ
```

#### **Table : `carpooling_bookings`** (Réservations)
```sql
id UUID PRIMARY KEY
trip_id UUID REFERENCES carpooling_trips(id)
passenger_id UUID REFERENCES auth.users(id)
seats_reserved INTEGER
status TEXT ('pending', 'confirmed', 'cancelled')
payment_method TEXT ('credits', 'cash')
credits_used INTEGER
created_at TIMESTAMPTZ
```

#### **Table : `carpooling_messages`** (Messages - À créer)
```sql
id UUID PRIMARY KEY
trip_id UUID REFERENCES carpooling_trips(id)
sender_id UUID REFERENCES auth.users(id)
receiver_id UUID REFERENCES auth.users(id)
message TEXT
read BOOLEAN DEFAULT FALSE
created_at TIMESTAMPTZ
```

#### **Table : `carpooling_ratings`** (Notes - À créer)
```sql
id UUID PRIMARY KEY
trip_id UUID REFERENCES carpooling_trips(id)
rater_id UUID REFERENCES auth.users(id)
rated_user_id UUID REFERENCES auth.users(id)
rating INTEGER CHECK (rating >= 1 AND rating <= 5)
comment TEXT
created_at TIMESTAMPTZ
```

#### **Table : `user_credits`** (Déjà existe Web)
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
credits INTEGER DEFAULT 0
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

---

## 📋 FICHIERS À MODIFIER (Mobile)

### 1️⃣ **CovoituragePublish.tsx**
```typescript
// Ligne 127
// ❌ AVANT
.from('rides')

// ✅ APRÈS  
.from('carpooling_trips')
```

### 2️⃣ **CovoiturageMyTrips.tsx**
```typescript
// Ligne 46, 64
// ❌ AVANT
.from('rides')
.from('ride_reservations')

// ✅ APRÈS
.from('carpooling_trips')
.from('carpooling_bookings')
```

### 3️⃣ **CovoiturageTripDetails.tsx**
```typescript
// Ligne 79, 92, 153, 191, 212, 229
// ❌ AVANT
.from('rides')
.from('ride_reservations')

// ✅ APRÈS
.from('carpooling_trips')
.from('carpooling_bookings')

// Foreign key à renommer:
// driver:profiles!rides_driver_id_fkey(...)
// → driver:profiles!carpooling_trips_driver_id_fkey(...)
```

### 4️⃣ **CovoiturageMessages.tsx**
```typescript
// Ligne 92, 101
// ❌ AVANT
.from('ride_messages')
ride:rides(departure_city, arrival_city, departure_date)

// ✅ APRÈS
.from('carpooling_messages')
trip:carpooling_trips(departure_city, arrival_city, departure_date)
```

### 5️⃣ **CovoiturageRateUser.tsx**
```typescript
// Ligne 83
// ❌ AVANT
.from('ride_ratings')

// ✅ APRÈS
.from('carpooling_ratings')
```

### 6️⃣ **CovoiturageUserProfile.tsx**
```typescript
// Variables à renommer pour clarté:
total_rides_as_driver → total_trips_as_driver
total_rides_as_passenger → total_trips_as_passenger
```

---

## 🗄️ MIGRATIONS SQL REQUISES

### **Migration 1 : Créer tables manquantes**

```sql
-- Messages covoiturage
CREATE TABLE IF NOT EXISTS carpooling_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES carpooling_trips(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_carpooling_messages_trip ON carpooling_messages(trip_id);
CREATE INDEX idx_carpooling_messages_sender ON carpooling_messages(sender_id);
CREATE INDEX idx_carpooling_messages_receiver ON carpooling_messages(receiver_id);

-- Notifications messages
ALTER TABLE carpooling_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their messages" ON carpooling_messages
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages" ON carpooling_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Notes/Ratings covoiturage
CREATE TABLE IF NOT EXISTS carpooling_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES carpooling_trips(id) ON DELETE CASCADE,
  rater_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rated_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, rater_id, rated_user_id)
);

CREATE INDEX idx_carpooling_ratings_trip ON carpooling_ratings(trip_id);
CREATE INDEX idx_carpooling_ratings_rated_user ON carpooling_ratings(rated_user_id);

ALTER TABLE carpooling_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings" ON carpooling_ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can create ratings" ON carpooling_ratings
  FOR INSERT WITH CHECK (rater_id = auth.uid());
```

### **Migration 2 : Migrer données existantes (SI rides existe)**

```sql
-- SEULEMENT si table 'rides' existe et contient des données
-- Vérifier d'abord:
SELECT COUNT(*) FROM rides;

-- Si > 0, migrer:
INSERT INTO carpooling_trips (
  id, driver_id, departure_city, arrival_city, 
  departure_date, departure_time, available_seats, 
  price_per_seat, vehicle_info, description, status, created_at
)
SELECT 
  id, driver_id, departure_city, arrival_city,
  departure_date, departure_time, available_seats,
  price_per_seat, vehicle_info, description, status, created_at
FROM rides
ON CONFLICT (id) DO NOTHING;

-- Migrer réservations
INSERT INTO carpooling_bookings (
  id, trip_id, passenger_id, seats_reserved, 
  status, payment_method, credits_used, created_at
)
SELECT 
  id, trip_id, passenger_id, seats_reserved,
  status, payment_method, credits_used, created_at
FROM ride_reservations
ON CONFLICT (id) DO NOTHING;

-- Migrer messages
INSERT INTO carpooling_messages (
  id, trip_id, sender_id, receiver_id, message, read, created_at
)
SELECT 
  id, trip_id, sender_id, receiver_id, message, read, created_at
FROM ride_messages
ON CONFLICT (id) DO NOTHING;

-- Migrer ratings
INSERT INTO carpooling_ratings (
  id, trip_id, rater_id, rated_user_id, rating, comment, created_at
)
SELECT 
  id, trip_id, rater_id, rated_user_id, rating, comment, created_at
FROM ride_ratings
ON CONFLICT (id) DO NOTHING;
```

---

## 📊 COMPARATIF AVANT/APRÈS

### **AVANT (Incohérent)**
| Fonctionnalité | Web | Mobile |
|----------------|-----|--------|
| Trajets | `carpooling_trips` | `rides` ❌ |
| Réservations | `carpooling_bookings` | `ride_reservations` ❌ |
| Messages | ❌ N'existe pas | `ride_messages` |
| Ratings | ❌ N'existe pas | `ride_ratings` |
| Crédits | `user_credits` ✅ | ❌ Non géré |
| **Sync** | ❌ **IMPOSSIBLE** | ❌ **IMPOSSIBLE** |

### **APRÈS (Unifié)**
| Fonctionnalité | Web | Mobile |
|----------------|-----|--------|
| Trajets | `carpooling_trips` ✅ | `carpooling_trips` ✅ |
| Réservations | `carpooling_bookings` ✅ | `carpooling_bookings` ✅ |
| Messages | `carpooling_messages` ✅ | `carpooling_messages` ✅ |
| Ratings | `carpooling_ratings` ✅ | `carpooling_ratings` ✅ |
| Crédits | `user_credits` ✅ | `user_credits` ✅ |
| **Sync** | ✅ **TEMPS RÉEL** | ✅ **TEMPS RÉEL** |

---

## 🎯 AVANTAGES DE L'UNIFICATION

### ✅ **Synchronisation Complète**
- Trajet publié sur Mobile → Visible sur Web instantanément
- Réservation Web → Notification Mobile temps réel
- Messages synchronisés partout

### ✅ **Expérience Utilisateur Cohérente**
- Mêmes données partout
- Historique complet accessible Web + Mobile
- Ratings/Messages partagés

### ✅ **Maintenance Simplifiée**
- 1 seule base de données
- 1 seule logique métier
- Moins de bugs potentiels

### ✅ **Évolutivité**
- Ajout fonctionnalités simultané Web/Mobile
- RLS Supabase centralisé
- Realtime sync facile

---

## 🚀 PLAN D'ACTION

### **Phase 1 : Vérification Base de Données**
```sql
-- 1. Vérifier si tables 'rides' existent
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('rides', 'ride_reservations', 'ride_messages', 'ride_ratings');

-- 2. Vérifier si carpooling_trips existe
SELECT COUNT(*) FROM carpooling_trips;
```

### **Phase 2 : Créer Tables Manquantes**
- Exécuter Migration 1 (carpooling_messages, carpooling_ratings)

### **Phase 3 : Migrer Données (si nécessaire)**
- Si tables `rides` contiennent des données → Exécuter Migration 2

### **Phase 4 : Modifier Code Mobile**
- CovoituragePublish.tsx
- CovoiturageMyTrips.tsx
- CovoiturageTripDetails.tsx
- CovoiturageMessages.tsx
- CovoiturageRateUser.tsx

### **Phase 5 : Tests**
- Publier trajet sur Mobile → Vérifier affichage Web
- Réserver sur Web → Vérifier notification Mobile
- Messages bidirectionnels

### **Phase 6 : Nettoyage (Optionnel)**
```sql
-- Supprimer anciennes tables si migration OK
DROP TABLE IF EXISTS ride_ratings CASCADE;
DROP TABLE IF EXISTS ride_messages CASCADE;
DROP TABLE IF EXISTS ride_reservations CASCADE;
DROP TABLE IF EXISTS rides CASCADE;
```

---

## 📝 RÉSUMÉ CRITIQUE

**PROBLÈME :** Web et Mobile utilisent des tables COMPLÈTEMENT DIFFÉRENTES pour le covoiturage

**IMPACT :** Aucune synchronisation possible, données isolées, expérience fragmentée

**SOLUTION :** Unifier sur tables Web (`carpooling_*`), créer tables manquantes (messages/ratings), modifier 5 fichiers Mobile

**TEMPS ESTIMÉ :** 30-45 minutes

**PRIORITÉ :** 🔴 CRITIQUE - À faire AVANT le build APK

---

**Status:** ⏳ EN ATTENTE DE DÉCISION
