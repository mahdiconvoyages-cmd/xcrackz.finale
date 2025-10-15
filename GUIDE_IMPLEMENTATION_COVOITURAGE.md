# 📖 Guide d'Implémentation - Système de Covoiturage xCrackz

## 📅 Date : 11 octobre 2025
## 🎯 Objectif : Déployer un système de covoiturage complet type BlaBlaCar

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Migration Base de Données](#migration-base-de-données)
4. [Configuration RLS](#configuration-rls)
5. [Installation Frontend](#installation-frontend)
6. [Tests & Validation](#tests--validation)
7. [Déploiement](#déploiement)

---

## 🎯 VUE D'ENSEMBLE

### Système de Paiement

**Principe hybride unique** :
- 💳 **2 crédits** pour publier un trajet (conducteur)
- 💳 **2 crédits** pour réserver un trajet (passager)
- 💶 **Espèces** payées directement au conducteur le jour J
- ✅ **0€ de frais** supplémentaires
- 🎁 **0% de commission** pour la plateforme

### Fonctionnalités Principales

✅ **Côté Conducteur** :
- Publication de trajets (coût : 2 crédits)
- Gestion des réservations
- Validation/Refus des passagers
- Annulation de trajets
- Système de notation

✅ **Côté Passager** :
- Recherche avancée avec 9 filtres
- Réservation instantanée (⚡)
- Messagerie (min 20 caractères)
- Annulation (remboursement si > 24h)
- Système de notation

✅ **Règles BlaBlaCar** :
- Prix min : 2€/place
- Prix max : (distance × 0,15€) + 5€
- Message obligatoire (20 caractères min)
- Crédits bloqués puis déduits
- Préférences : animaux, fumeur, chat level, bagages

---

## ⚙️ PRÉREQUIS

### Technologies Requises

```json
{
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "supabase": "^2.0.0",
  "lucide-react": "^0.263.0",
  "tailwindcss": "^3.0.0"
}
```

### Crédits xCrackz

- Système de crédits déjà en place dans `profiles.credits`
- Nouveau champ nécessaire : `profiles.blocked_credits`

---

## 🗄️ MIGRATION BASE DE DONNÉES

### Étape 1 : Créer les Tables

```sql
-- ============================================
-- TABLE : carpooling_trips
-- ============================================

CREATE TABLE IF NOT EXISTS carpooling_trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Informations trajet
  departure_address TEXT NOT NULL,
  departure_city TEXT NOT NULL,
  departure_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  arrival_address TEXT NOT NULL,
  arrival_city TEXT NOT NULL,
  
  -- Places et prix
  total_seats INTEGER NOT NULL CHECK (total_seats BETWEEN 1 AND 8),
  available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
  price_per_seat DECIMAL(10, 2) NOT NULL CHECK (price_per_seat >= 2),
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed', 'full')),
  
  -- Préférences BlaBlaCar
  allows_pets BOOLEAN DEFAULT false,
  allows_smoking BOOLEAN DEFAULT false,
  allows_music BOOLEAN DEFAULT true,
  chat_level TEXT DEFAULT 'blabla' CHECK (chat_level IN ('bla', 'blabla', 'blablabla')),
  max_two_back BOOLEAN DEFAULT false,
  luggage_size TEXT DEFAULT 'medium' CHECK (luggage_size IN ('small', 'medium', 'large', 'xl')),
  instant_booking BOOLEAN DEFAULT false,
  
  -- Description optionnelle
  description TEXT,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_carpooling_trips_driver ON carpooling_trips(driver_id);
CREATE INDEX idx_carpooling_trips_departure_city ON carpooling_trips(departure_city);
CREATE INDEX idx_carpooling_trips_arrival_city ON carpooling_trips(arrival_city);
CREATE INDEX idx_carpooling_trips_departure_date ON carpooling_trips(departure_datetime);
CREATE INDEX idx_carpooling_trips_status ON carpooling_trips(status);

-- ============================================
-- TABLE : carpooling_bookings
-- ============================================

CREATE TABLE IF NOT EXISTS carpooling_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES carpooling_trips(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Réservation
  seats_booked INTEGER NOT NULL CHECK (seats_booked >= 1),
  total_price DECIMAL(10, 2) NOT NULL,
  trip_price DECIMAL(10, 2) NOT NULL,
  credit_cost INTEGER DEFAULT 2,
  
  -- Statut BlaBlaCar
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- En attente validation conducteur
    'confirmed',    -- Confirmé (si instant booking OU accepté)
    'rejected',     -- Refusé par conducteur
    'cancelled',    -- Annulé par passager
    'completed',    -- Trajet terminé
    'no_show'       -- Passager absent
  )),
  
  -- Message obligatoire (min 20 caractères)
  message TEXT NOT NULL CHECK (char_length(message) >= 20),
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_carpooling_bookings_trip ON carpooling_bookings(trip_id);
CREATE INDEX idx_carpooling_bookings_passenger ON carpooling_bookings(passenger_id);
CREATE INDEX idx_carpooling_bookings_status ON carpooling_bookings(status);

-- ============================================
-- MISE À JOUR : profiles
-- ============================================

-- Ajouter champ blocked_credits pour les réservations en cours
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS blocked_credits INTEGER DEFAULT 0 CHECK (blocked_credits >= 0);

COMMENT ON COLUMN profiles.blocked_credits IS 'Crédits bloqués pour réservations covoiturage en attente';
```

### Étape 2 : Fonctions & Triggers

```sql
-- ============================================
-- FONCTION : Mise à jour automatique updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour carpooling_trips
CREATE TRIGGER update_carpooling_trips_updated_at
  BEFORE UPDATE ON carpooling_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour carpooling_bookings
CREATE TRIGGER update_carpooling_bookings_updated_at
  BEFORE UPDATE ON carpooling_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FONCTION : Mise à jour places disponibles
-- ============================================

CREATE OR REPLACE FUNCTION update_trip_available_seats()
RETURNS TRIGGER AS $$
BEGIN
  -- Réduire places disponibles lors d'une confirmation
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE carpooling_trips
    SET available_seats = available_seats - NEW.seats_booked
    WHERE id = NEW.trip_id;
  END IF;
  
  -- Restaurer places lors d'une annulation
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status IN ('cancelled', 'rejected') THEN
    UPDATE carpooling_trips
    SET available_seats = available_seats + OLD.seats_booked
    WHERE id = OLD.trip_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seats_on_booking
  AFTER INSERT OR UPDATE ON carpooling_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_available_seats();

-- ============================================
-- FONCTION : Marquer trajet FULL si complet
-- ============================================

CREATE OR REPLACE FUNCTION check_trip_full()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE carpooling_trips
  SET status = CASE
    WHEN available_seats = 0 THEN 'full'
    WHEN available_seats > 0 AND status = 'full' THEN 'active'
    ELSE status
  END
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_full_status
  AFTER UPDATE OF available_seats ON carpooling_trips
  FOR EACH ROW
  EXECUTE FUNCTION check_trip_full();
```

---

## 🔒 CONFIGURATION RLS (Row Level Security)

### Étape 3 : Activer RLS

```sql
-- ============================================
-- ACTIVER RLS
-- ============================================

ALTER TABLE carpooling_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpooling_bookings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES : carpooling_trips
-- ============================================

-- Lecture : Tout le monde peut voir les trajets actifs
CREATE POLICY "Trajets publics lisibles"
  ON carpooling_trips
  FOR SELECT
  TO authenticated
  USING (status IN ('active', 'full'));

-- Création : Utilisateur authentifié + 2 crédits minimum
CREATE POLICY "Créer un trajet"
  ON carpooling_trips
  FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND credits >= 2
    )
  );

-- Modification : Seulement son propre trajet
CREATE POLICY "Modifier son trajet"
  ON carpooling_trips
  FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- Suppression : Seulement son propre trajet
CREATE POLICY "Supprimer son trajet"
  ON carpooling_trips
  FOR DELETE
  TO authenticated
  USING (driver_id = auth.uid());

-- ============================================
-- POLICIES : carpooling_bookings
-- ============================================

-- Lecture : Voir ses propres réservations OU les réservations de ses trajets
CREATE POLICY "Voir réservations"
  ON carpooling_bookings
  FOR SELECT
  TO authenticated
  USING (
    passenger_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM carpooling_trips
      WHERE carpooling_trips.id = carpooling_bookings.trip_id
        AND carpooling_trips.driver_id = auth.uid()
    )
  );

-- Création : Utilisateur authentifié + 2 crédits minimum
CREATE POLICY "Créer réservation"
  ON carpooling_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    passenger_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND credits >= 2
    ) AND
    char_length(message) >= 20
  );

-- Modification : Seulement ses propres réservations
CREATE POLICY "Modifier réservation"
  ON carpooling_bookings
  FOR UPDATE
  TO authenticated
  USING (passenger_id = auth.uid())
  WITH CHECK (passenger_id = auth.uid());

-- Modification conducteur : Accepter/Refuser les réservations de ses trajets
CREATE POLICY "Conducteur gérer réservations"
  ON carpooling_bookings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM carpooling_trips
      WHERE carpooling_trips.id = carpooling_bookings.trip_id
        AND carpooling_trips.driver_id = auth.uid()
    )
  );
```

---

## 💻 INSTALLATION FRONTEND

### Étape 4 : Ajouter la Route

**Fichier : `src/App.tsx`**

```tsx
import CovoiturageModern from './pages/CovoiturageModern';

// Dans les routes
<Route path="/covoiturage" element={<CovoiturageModern />} />
```

### Étape 5 : Ajouter au Menu

**Dans votre navigation** :

```tsx
<Link to="/covoiturage" className="nav-item">
  <Car className="w-5 h-5" />
  <span>Covoiturage</span>
</Link>
```

### Étape 6 : Vérifier les Dépendances

```bash
# Si lucide-react n'est pas installé
npm install lucide-react

# Vérifier Tailwind CSS
npm list tailwindcss
```

---

## ✅ TESTS & VALIDATION

### Étape 7 : Tests Fonctionnels

#### Test 1 : Publication de Trajet

**Prérequis** : Utilisateur avec au moins 2 crédits

1. ✅ Se connecter
2. ✅ Aller sur `/covoiturage`
3. ✅ Cliquer "Publier un trajet"
4. ✅ Remplir le formulaire :
   - Départ : Paris
   - Arrivée : Lyon
   - Date : Demain 10h00
   - Places : 3
   - Prix : 25€
   - Préférences : Animaux ✓, Non-fumeur ✓
   - Chat level : BlaBla
5. ✅ Soumettre (vérifier déduction 2 crédits)
6. ✅ Vérifier apparition dans "Mes trajets"

**Résultat attendu** :
```
✅ Trajet publié avec succès !
💳 2 crédits xCrackz déduits
💶 Vous recevrez le paiement en espèces de vos passagers
```

#### Test 2 : Réservation de Places

**Prérequis** : Utilisateur avec au moins 2 crédits

1. ✅ Se connecter avec un autre compte
2. ✅ Rechercher "Paris" → "Lyon"
3. ✅ Cliquer sur un trajet
4. ✅ Sélectionner 2 places
5. ✅ Écrire message de 20+ caractères :
   ```
   Bonjour ! Je souhaite réserver 2 places pour ce trajet. 
   Nous sommes ponctuel et respectueux.
   ```
6. ✅ Confirmer (vérifier blocage 2 crédits)
7. ✅ Vérifier apparition dans "Mes réservations"

**Résultat attendu** :
```
✅ Réservation effectuée !
💳 2 crédits xCrackz bloqués
💶 50,00€ à payer en espèces au conducteur le jour du trajet
⏳ En attente de validation du conducteur...
```

#### Test 3 : Validation Message Court

1. ✅ Essayer de réserver avec message < 20 caractères
2. ✅ Vérifier affichage erreur

**Résultat attendu** :
```
❌ Votre message doit contenir au moins 20 caractères 
   pour présenter votre demande au conducteur.
```

#### Test 4 : Crédits Insuffisants

1. ✅ Se connecter avec compte 0 crédit
2. ✅ Essayer de publier un trajet

**Résultat attendu** :
```
⚠️ Crédits insuffisants !
Vous avez besoin de 2 crédits xCrackz pour publier un trajet.
Rendez-vous dans la boutique pour acheter des crédits.
```

#### Test 5 : Prix Minimum

1. ✅ Essayer de publier trajet à 1€/place
2. ✅ Vérifier validation

**Résultat attendu** :
```
❌ Le prix minimum est de 2€ par place (règle BlaBlaCar)
```

#### Test 6 : Date Passée

1. ✅ Essayer de publier trajet hier
2. ✅ Vérifier validation

**Résultat attendu** :
```
❌ Impossible de publier un trajet dans le passé
```

#### Test 7 : Filtres Avancés

1. ✅ Ouvrir filtres avancés
2. ✅ Cocher "Animaux acceptés"
3. ✅ Cocher "Non-fumeur uniquement"
4. ✅ Prix max : 30€
5. ✅ Rechercher
6. ✅ Vérifier que seuls les trajets matching s'affichent

#### Test 8 : Réservation Instantanée

1. ✅ Publier trajet avec "Réservation instantanée" ⚡
2. ✅ Réserver depuis autre compte
3. ✅ Vérifier statut = "confirmed" automatiquement

**Résultat attendu** :
```
✅ Réservation effectuée !
⚡ Réservation instantanée confirmée !
```

---

## 📊 VÉRIFICATIONS BASE DE DONNÉES

### Requêtes de Contrôle

```sql
-- Vérifier les trajets actifs
SELECT 
  departure_city,
  arrival_city,
  departure_datetime,
  price_per_seat,
  available_seats,
  status
FROM carpooling_trips
WHERE status = 'active'
ORDER BY departure_datetime;

-- Vérifier les réservations
SELECT 
  b.status,
  b.seats_booked,
  b.total_price,
  b.credit_cost,
  t.departure_city,
  t.arrival_city
FROM carpooling_bookings b
JOIN carpooling_trips t ON b.trip_id = t.id
ORDER BY b.created_at DESC;

-- Vérifier crédits bloqués
SELECT 
  id,
  full_name,
  credits,
  blocked_credits,
  credits - blocked_credits AS available_credits
FROM profiles
WHERE blocked_credits > 0;

-- Statistiques
SELECT 
  COUNT(*) AS total_trips,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN status = 'full' THEN 1 ELSE 0 END) AS full,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
FROM carpooling_trips;
```

---

## 🚀 DÉPLOIEMENT

### Étape 8 : Checklist Production

#### 1. Base de Données

- [ ] Exécuter migration SQL sur Supabase production
- [ ] Vérifier création tables (carpooling_trips, carpooling_bookings)
- [ ] Vérifier ajout colonne blocked_credits dans profiles
- [ ] Activer RLS sur les 2 tables
- [ ] Créer toutes les policies
- [ ] Tester policies avec 2 comptes différents
- [ ] Vérifier triggers (update_updated_at, update_seats, check_full)

#### 2. Frontend

- [ ] Vérifier compilation sans erreur TypeScript
- [ ] Tester responsive mobile (320px → 1920px)
- [ ] Vérifier icons Lucide React chargées
- [ ] Tester navigation /covoiturage
- [ ] Vérifier gradients Tailwind s'affichent
- [ ] Tester dark mode (si applicable)

#### 3. Tests End-to-End

- [ ] Créer 3 comptes test (A, B, C)
- [ ] A publie un trajet (vérifier -2 crédits)
- [ ] B réserve 2 places (vérifier 2 crédits bloqués)
- [ ] A voit la réservation de B
- [ ] A accepte la réservation de B
- [ ] Vérifier places disponibles A.trip -= 2
- [ ] C réserve dernière place
- [ ] Vérifier statut trajet = "full"
- [ ] B annule (> 24h)
- [ ] Vérifier 2 crédits recrédités à B
- [ ] Vérifier places restaurées dans trip A

#### 4. Performance

- [ ] Vérifier index créés (EXPLAIN ANALYZE)
- [ ] Tester avec 100+ trajets
- [ ] Vérifier temps recherche < 200ms
- [ ] Optimiser requêtes si nécessaire

#### 5. Sécurité

- [ ] RLS activé sur TOUTES les tables
- [ ] Impossible de réserver son propre trajet
- [ ] Impossible de dépasser available_seats
- [ ] Message min 20 caractères enforced DB
- [ ] Prix min 2€ enforced DB
- [ ] Statuts valides enforced DB (CHECK)

#### 6. UX/UI

- [ ] Messages d'erreur clairs
- [ ] Loading states affichés
- [ ] Empty states avec CTAs
- [ ] Toast notifications (succès/erreur)
- [ ] Confirmations avant actions critiques
- [ ] Breadcrumbs / retour facile

---

## 🔧 MAINTENANCE & ÉVOLUTION

### Phase 2 : Fonctionnalités Futures

**Messagerie Interne** :
- [ ] Chat temps réel entre conducteur/passager
- [ ] Masquage numéro téléphone (style BlaBlaCar)
- [ ] Historique conversations

**Système de Notation** :
- [ ] Conducteur note passagers (Ponctualité, Respect)
- [ ] Passagers notent conducteur (Conduite, Ponctualité, Convivialité)
- [ ] Calcul moyenne automatique
- [ ] Badges (Expert ⭐⭐⭐ si 50+ trajets et 4.7+)

**Vérification Profil** :
- [ ] 4 niveaux : Basique, Confirmé, Conducteur Vérifié, Expert
- [ ] Upload permis de conduire
- [ ] Upload carte grise
- [ ] Validation photo profil

**Annulations Automatiques** :
- [ ] Cron job : Rembourser crédits si conducteur annule
- [ ] Email notifications
- [ ] Push notifications mobile

**Statistiques Conducteur** :
- [ ] Dashboard avec KPIs
- [ ] Taux d'acceptation
- [ ] Taux de fiabilité
- [ ] Revenus totaux espèces

**Géolocalisation** :
- [ ] Intégration Mapbox
- [ ] Calcul distance automatique
- [ ] Prix recommandé auto-calculé
- [ ] Affichage carte itinéraire

### Scripts Utiles

**Nettoyage trajets passés** :

```sql
-- Marquer trajets passés comme completed
UPDATE carpooling_trips
SET status = 'completed'
WHERE departure_datetime < NOW()
  AND status IN ('active', 'full');

-- Débloquer crédits réservations passées
UPDATE profiles p
SET 
  blocked_credits = blocked_credits - (
    SELECT COALESCE(SUM(credit_cost), 0)
    FROM carpooling_bookings b
    JOIN carpooling_trips t ON b.trip_id = t.id
    WHERE b.passenger_id = p.id
      AND t.departure_datetime < NOW() - INTERVAL '7 days'
      AND b.status IN ('pending', 'confirmed')
  );
```

**Rapport activité quotidien** :

```sql
SELECT 
  DATE(created_at) AS date,
  COUNT(*) FILTER (WHERE status = 'active') AS new_trips,
  COUNT(*) FILTER (WHERE status = 'full') AS full_trips,
  SUM(total_seats - available_seats) AS seats_booked
FROM carpooling_trips
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 📞 SUPPORT

### Documentation Complète

- **Règles BlaBlaCar** : Voir `COVOITURAGE_REGLES_BLABLACAR.md`
- **Code Source** : `src/pages/CovoiturageModern.tsx`
- **Migrations SQL** : Ci-dessus dans ce guide

### Points de Contact

- **Technique** : Vérifier erreurs console navigateur
- **Base de données** : Vérifier logs Supabase
- **Performance** : Utiliser Supabase Performance Insights

---

## ✅ CHECKLIST FINALE DÉPLOIEMENT

```
[ ] Migration SQL exécutée
[ ] RLS configuré
[ ] Route /covoiturage ajoutée
[ ] Menu navigation mis à jour
[ ] Tests 1-8 passés avec succès
[ ] Performance validée (< 200ms)
[ ] Sécurité vérifiée
[ ] Documentation à jour
[ ] Équipe formée
[ ] Monitoring activé
```

---

## 🎉 FÉLICITATIONS !

Votre système de covoiturage est prêt à l'emploi !

**Rappel système de paiement** :
- 💳 2 crédits pour publier (conducteur)
- 💳 2 crédits pour réserver (passager)
- 💶 Espèces au conducteur le jour J
- ✅ Simple, transparent, efficace !

**Prochaines étapes** :
1. Tester avec utilisateurs bêta
2. Collecter feedback
3. Implémenter Phase 2 (notation, messagerie)
4. Marketing et communication

Bon covoiturage ! 🚗💨
