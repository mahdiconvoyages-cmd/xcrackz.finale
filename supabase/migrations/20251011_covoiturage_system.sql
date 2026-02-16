-- ============================================
-- MIGRATION COVOITURAGE xCrackz
-- Date : 11 octobre 2025
-- Système : 2 crédits publication + 2 crédits réservation + espèces
-- ============================================

-- ============================================
-- ÉTAPE 0 : NETTOYAGE (si tables existent déjà)
-- ============================================

-- Supprimer les anciennes tables si elles existent
DROP TABLE IF EXISTS carpooling_bookings CASCADE;
DROP TABLE IF EXISTS carpooling_trips CASCADE;

-- ============================================
-- ÉTAPE 1 : CRÉER LES TABLES
-- ============================================

-- Table des trajets de covoiturage
CREATE TABLE carpooling_trips (
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
  price_per_seat DECIMAL(10, 2) NOT NULL CHECK (price_per_seat >= 2.00),
  
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

-- Commentaires
COMMENT ON TABLE carpooling_trips IS 'Trajets de covoiturage publiés par les conducteurs';
COMMENT ON COLUMN carpooling_trips.price_per_seat IS 'Prix minimum 2€ par place (règle BlaBlaCar)';
COMMENT ON COLUMN carpooling_trips.chat_level IS 'Niveau bavardage : bla (silencieux), blabla (normal), blablabla (très bavard)';
COMMENT ON COLUMN carpooling_trips.instant_booking IS 'Réservation instantanée sans validation conducteur';

-- Index pour performance
CREATE INDEX idx_carpooling_trips_driver ON carpooling_trips(driver_id);
CREATE INDEX idx_carpooling_trips_departure_city ON carpooling_trips(departure_city);
CREATE INDEX idx_carpooling_trips_arrival_city ON carpooling_trips(arrival_city);
CREATE INDEX idx_carpooling_trips_departure_date ON carpooling_trips(departure_datetime);
CREATE INDEX idx_carpooling_trips_status ON carpooling_trips(status);
CREATE INDEX idx_carpooling_trips_search ON carpooling_trips(departure_city, arrival_city, departure_datetime) WHERE status = 'active';

-- Table des réservations
CREATE TABLE carpooling_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES carpooling_trips(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Réservation
  seats_booked INTEGER NOT NULL CHECK (seats_booked >= 1),
  total_price DECIMAL(10, 2) NOT NULL,
  trip_price DECIMAL(10, 2) NOT NULL,
  credit_cost INTEGER DEFAULT 2 CHECK (credit_cost >= 0),
  
  -- Statut BlaBlaCar
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- En attente validation conducteur
    'confirmed',    -- Confirmé (si instant booking OU accepté)
    'rejected',     -- Refusé par conducteur
    'cancelled',    -- Annulé par passager
    'completed',    -- Trajet terminé
    'no_show'       -- Passager absent
  )),
  
  -- Message obligatoire (min 20 caractères règle BlaBlaCar)
  message TEXT NOT NULL CHECK (char_length(message) >= 20),
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contrainte : Un passager ne peut pas réserver plusieurs fois le même trajet
  UNIQUE(trip_id, passenger_id)
);

-- Commentaires
COMMENT ON TABLE carpooling_bookings IS 'Réservations de covoiturage par les passagers';
COMMENT ON COLUMN carpooling_bookings.credit_cost IS 'Nombre de crédits bloqués pour cette réservation (2 par défaut)';
COMMENT ON COLUMN carpooling_bookings.message IS 'Message au conducteur (minimum 20 caractères obligatoire)';
COMMENT ON COLUMN carpooling_bookings.total_price IS 'Prix total en espèces à payer au conducteur le jour du trajet';

-- Index
CREATE INDEX idx_carpooling_bookings_trip ON carpooling_bookings(trip_id);
CREATE INDEX idx_carpooling_bookings_passenger ON carpooling_bookings(passenger_id);
CREATE INDEX idx_carpooling_bookings_status ON carpooling_bookings(status);

-- ============================================
-- ÉTAPE 2 : AJOUTER COLONNE CRÉDITS BLOQUÉS
-- ============================================

-- Ajouter champ blocked_credits pour les réservations en cours
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS blocked_credits INTEGER DEFAULT 0 CHECK (blocked_credits >= 0);

COMMENT ON COLUMN profiles.blocked_credits IS 'Crédits bloqués pour réservations covoiturage en attente (remboursables si annulation > 24h)';

-- ============================================
-- ÉTAPE 3 : FONCTIONS & TRIGGERS
-- ============================================

-- Fonction : Mise à jour automatique updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour carpooling_trips
DROP TRIGGER IF EXISTS update_carpooling_trips_updated_at ON carpooling_trips;
CREATE TRIGGER update_carpooling_trips_updated_at
  BEFORE UPDATE ON carpooling_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour carpooling_bookings
DROP TRIGGER IF EXISTS update_carpooling_bookings_updated_at ON carpooling_bookings;
CREATE TRIGGER update_carpooling_bookings_updated_at
  BEFORE UPDATE ON carpooling_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction : Mise à jour places disponibles automatiquement
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

DROP TRIGGER IF EXISTS update_seats_on_booking ON carpooling_bookings;
CREATE TRIGGER update_seats_on_booking
  AFTER INSERT OR UPDATE ON carpooling_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_available_seats();

-- Fonction : Marquer trajet FULL si complet, ACTIVE si places libérées
CREATE OR REPLACE FUNCTION check_trip_full()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE carpooling_trips
  SET status = CASE
    WHEN available_seats = 0 AND status = 'active' THEN 'full'
    WHEN available_seats > 0 AND status = 'full' THEN 'active'
    ELSE status
  END
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_full_status ON carpooling_trips;
CREATE TRIGGER check_full_status
  AFTER UPDATE OF available_seats ON carpooling_trips
  FOR EACH ROW
  EXECUTE FUNCTION check_trip_full();

-- ============================================
-- ÉTAPE 4 : ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS
ALTER TABLE carpooling_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpooling_bookings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES : carpooling_trips
-- ============================================

-- Supprimer anciennes policies si elles existent
DROP POLICY IF EXISTS "Trajets publics lisibles" ON carpooling_trips;
DROP POLICY IF EXISTS "Créer un trajet" ON carpooling_trips;
DROP POLICY IF EXISTS "Modifier son trajet" ON carpooling_trips;
DROP POLICY IF EXISTS "Supprimer son trajet" ON carpooling_trips;

-- Lecture : Tout le monde peut voir les trajets actifs ou complets
CREATE POLICY "Trajets publics lisibles"
  ON carpooling_trips
  FOR SELECT
  TO authenticated
  USING (status IN ('active', 'full'));

-- Création : Utilisateur authentifié (vérification crédits côté client)
CREATE POLICY "Créer un trajet"
  ON carpooling_trips
  FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid());

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

-- Supprimer anciennes policies si elles existent
DROP POLICY IF EXISTS "Voir réservations" ON carpooling_bookings;
DROP POLICY IF EXISTS "Créer réservation" ON carpooling_bookings;
DROP POLICY IF EXISTS "Modifier réservation passager" ON carpooling_bookings;
DROP POLICY IF EXISTS "Modifier réservation conducteur" ON carpooling_bookings;

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

-- Création : Utilisateur authentifié + message 20 chars + pas son propre trajet (vérification crédits côté client)
CREATE POLICY "Créer réservation"
  ON carpooling_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    passenger_id = auth.uid() AND
    char_length(message) >= 20 AND
    NOT EXISTS (
      SELECT 1 FROM carpooling_trips
      WHERE carpooling_trips.id = trip_id
        AND carpooling_trips.driver_id = auth.uid()
    )
  );

-- Modification passager : Seulement ses propres réservations (annulation)
CREATE POLICY "Modifier réservation passager"
  ON carpooling_bookings
  FOR UPDATE
  TO authenticated
  USING (passenger_id = auth.uid())
  WITH CHECK (passenger_id = auth.uid());

-- Modification conducteur : Accepter/Refuser les réservations de ses trajets
CREATE POLICY "Modifier réservation conducteur"
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

-- ============================================
-- ÉTAPE 5 : VÉRIFICATIONS
-- ============================================

-- Vérifier création tables
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('carpooling_trips', 'carpooling_bookings')
ORDER BY table_name;

-- Vérifier colonne blocked_credits
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name = 'blocked_credits';

-- Vérifier triggers
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table IN ('carpooling_trips', 'carpooling_bookings')
ORDER BY event_object_table, trigger_name;

-- Vérifier RLS activé
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('carpooling_trips', 'carpooling_bookings');

-- Vérifier policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('carpooling_trips', 'carpooling_bookings')
ORDER BY tablename, policyname;

-- ============================================
-- MIGRATION TERMINÉE ✅
-- ============================================

-- Afficher résumé
DO $$
BEGIN
  RAISE NOTICE '✅ Migration covoiturage terminée !';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tables créées :';
  RAISE NOTICE '   - carpooling_trips (avec 7 index)';
  RAISE NOTICE '   - carpooling_bookings (avec 3 index)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Colonne ajoutée :';
  RAISE NOTICE '   - profiles.blocked_credits';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Triggers créés :';
  RAISE NOTICE '   - update_carpooling_trips_updated_at';
  RAISE NOTICE '   - update_carpooling_bookings_updated_at';
  RAISE NOTICE '   - update_seats_on_booking';
  RAISE NOTICE '   - check_full_status';
  RAISE NOTICE '';
  RAISE NOTICE '📊 RLS Policies :';
  RAISE NOTICE '   - 4 policies sur carpooling_trips';
  RAISE NOTICE '   - 4 policies sur carpooling_bookings';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Prochaine étape :';
  RAISE NOTICE '   Tester sur http://localhost:5173/covoiturage';
  RAISE NOTICE '';
  RAISE NOTICE '💳 Système de paiement :';
  RAISE NOTICE '   - 2 crédits pour publier un trajet';
  RAISE NOTICE '   - 2 crédits pour réserver un trajet';
  RAISE NOTICE '   - Paiement en espèces au conducteur';
END $$;
