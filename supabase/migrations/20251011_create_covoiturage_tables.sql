-- =====================================================
-- COVOITURAGE TABLES - Synchronisation Web & Mobile
-- =====================================================

-- Supprimer les tables existantes si elles existent (CASCADE pour les dépendances)
DROP TABLE IF EXISTS covoiturage_messages CASCADE;
DROP TABLE IF EXISTS covoiturage_reviews CASCADE;
DROP TABLE IF EXISTS covoiturage_bookings CASCADE;
DROP TABLE IF EXISTS covoiturage_driver_profiles CASCADE;
DROP TABLE IF EXISTS covoiturage_trips CASCADE;

-- Table des trajets de covoiturage
CREATE TABLE IF NOT EXISTS covoiturage_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informations du trajet
  departure_city VARCHAR(255) NOT NULL,
  departure_address TEXT,
  departure_lat DECIMAL(10, 8),
  departure_lng DECIMAL(11, 8),
  
  arrival_city VARCHAR(255) NOT NULL,
  arrival_address TEXT,
  arrival_lat DECIMAL(10, 8),
  arrival_lng DECIMAL(11, 8),
  
  -- Date et heure
  departure_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  arrival_time TIME,
  duration INTEGER, -- en minutes
  
  -- Détails
  available_seats INTEGER NOT NULL DEFAULT 1,
  price_per_seat DECIMAL(10, 2) NOT NULL,
  total_distance INTEGER, -- en km
  
  -- Confort et options
  comfort_level VARCHAR(50) DEFAULT 'basic', -- basic, comfort, premium
  features TEXT[], -- ['wifi', 'music', 'air_conditioning', 'pets_allowed', 'luggage_space', 'silence']
  
  -- Véhicule
  vehicle_brand VARCHAR(100),
  vehicle_model VARCHAR(100),
  vehicle_color VARCHAR(50),
  vehicle_plate VARCHAR(20),
  
  -- Préférences
  max_detour INTEGER DEFAULT 0, -- détour max en km
  instant_booking BOOLEAN DEFAULT false,
  women_only BOOLEAN DEFAULT false,
  
  -- Statut
  status VARCHAR(50) DEFAULT 'published', -- published, cancelled, completed, full
  
  -- Informations complémentaires
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des réservations
CREATE TABLE IF NOT EXISTS covoiturage_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES covoiturage_trips(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Détails réservation
  seats_booked INTEGER NOT NULL DEFAULT 1,
  total_price DECIMAL(10, 2) NOT NULL,
  
  -- Statut
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  
  -- Points de rencontre personnalisés (optionnel)
  custom_pickup_address TEXT,
  custom_pickup_lat DECIMAL(10, 8),
  custom_pickup_lng DECIMAL(11, 8),
  
  custom_dropoff_address TEXT,
  custom_dropoff_lat DECIMAL(10, 8),
  custom_dropoff_lng DECIMAL(11, 8),
  
  -- Message au conducteur
  message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contrainte : pas de double réservation
  UNIQUE(trip_id, passenger_id)
);

-- Table des avis/notations
CREATE TABLE IF NOT EXISTS covoiturage_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES covoiturage_bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Note et commentaire
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  
  -- Tags positifs/négatifs
  positive_tags TEXT[], -- ['ponctuel', 'agreable', 'propre', 'conduite_sure']
  negative_tags TEXT[], -- ['en_retard', 'annulation', 'conduite_dangereuse']
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un seul avis par personne par réservation
  UNIQUE(booking_id, reviewer_id)
);

-- Table des messages
CREATE TABLE IF NOT EXISTS covoiturage_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES covoiturage_trips(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES covoiturage_bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message
  content TEXT NOT NULL,
  
  -- Statut
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des profils conducteur (stats et préférences)
CREATE TABLE IF NOT EXISTS covoiturage_driver_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Statistiques
  total_trips INTEGER DEFAULT 0,
  total_km INTEGER DEFAULT 0,
  total_passengers INTEGER DEFAULT 0,
  
  -- Moyenne des notes
  average_rating DECIMAL(3, 2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  
  -- Vérifications
  phone_verified BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  id_verified BOOLEAN DEFAULT false,
  
  -- Préférences par défaut
  default_comfort_level VARCHAR(50) DEFAULT 'basic',
  default_features TEXT[],
  
  -- Bio
  bio TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES pour performance
-- =====================================================

CREATE INDEX idx_covoiturage_trips_user_id ON covoiturage_trips(user_id);
CREATE INDEX idx_covoiturage_trips_departure_date ON covoiturage_trips(departure_date);
CREATE INDEX idx_covoiturage_trips_status ON covoiturage_trips(status);
CREATE INDEX idx_covoiturage_trips_cities ON covoiturage_trips(departure_city, arrival_city);

CREATE INDEX idx_covoiturage_bookings_trip_id ON covoiturage_bookings(trip_id);
CREATE INDEX idx_covoiturage_bookings_passenger_id ON covoiturage_bookings(passenger_id);
CREATE INDEX idx_covoiturage_bookings_status ON covoiturage_bookings(status);

CREATE INDEX idx_covoiturage_reviews_booking_id ON covoiturage_reviews(booking_id);
CREATE INDEX idx_covoiturage_reviews_reviewed_id ON covoiturage_reviews(reviewed_id);

CREATE INDEX idx_covoiturage_messages_trip_id ON covoiturage_messages(trip_id);
CREATE INDEX idx_covoiturage_messages_recipient_id ON covoiturage_messages(recipient_id);
CREATE INDEX idx_covoiturage_messages_is_read ON covoiturage_messages(is_read);

-- =====================================================
-- FUNCTIONS et TRIGGERS
-- =====================================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_covoiturage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_covoiturage_trips_updated_at
  BEFORE UPDATE ON covoiturage_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_covoiturage_updated_at();

CREATE TRIGGER update_covoiturage_bookings_updated_at
  BEFORE UPDATE ON covoiturage_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_covoiturage_updated_at();

CREATE TRIGGER update_covoiturage_driver_profiles_updated_at
  BEFORE UPDATE ON covoiturage_driver_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_covoiturage_updated_at();

-- Fonction pour mettre à jour les stats du conducteur
CREATE OR REPLACE FUNCTION update_driver_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour le profil conducteur
  INSERT INTO covoiturage_driver_profiles (user_id, total_trips)
  VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_trips = covoiturage_driver_profiles.total_trips + 1,
    total_km = covoiturage_driver_profiles.total_km + COALESCE(NEW.total_distance, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour stats conducteur
CREATE TRIGGER update_driver_stats_on_trip
  AFTER INSERT ON covoiturage_trips
  FOR EACH ROW
  WHEN (NEW.status = 'published')
  EXECUTE FUNCTION update_driver_stats();

-- Fonction pour calculer la note moyenne
CREATE OR REPLACE FUNCTION update_average_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3, 2);
  review_count INTEGER;
BEGIN
  -- Calculer la moyenne des notes pour le conducteur
  SELECT 
    COALESCE(AVG(rating), 0.00),
    COUNT(*)
  INTO avg_rating, review_count
  FROM covoiturage_reviews
  WHERE reviewed_id = NEW.reviewed_id;
  
  -- Mettre à jour le profil
  INSERT INTO covoiturage_driver_profiles (user_id, average_rating, total_reviews)
  VALUES (NEW.reviewed_id, avg_rating, review_count)
  ON CONFLICT (user_id)
  DO UPDATE SET
    average_rating = avg_rating,
    total_reviews = review_count;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour moyenne des notes
CREATE TRIGGER update_average_rating_on_review
  AFTER INSERT OR UPDATE ON covoiturage_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_average_rating();

-- Fonction pour mettre à jour le statut du trajet
CREATE OR REPLACE FUNCTION check_trip_full()
RETURNS TRIGGER AS $$
DECLARE
  total_booked INTEGER;
  available INTEGER;
BEGIN
  -- Calculer le total de places réservées
  SELECT 
    COALESCE(SUM(seats_booked), 0),
    t.available_seats
  INTO total_booked, available
  FROM covoiturage_bookings b
  JOIN covoiturage_trips t ON t.id = b.trip_id
  WHERE b.trip_id = NEW.trip_id
    AND b.status IN ('pending', 'confirmed')
  GROUP BY t.available_seats;
  
  -- Si toutes les places sont prises, marquer comme complet
  IF total_booked >= available THEN
    UPDATE covoiturage_trips
    SET status = 'full'
    WHERE id = NEW.trip_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour vérifier si trajet complet
CREATE TRIGGER check_trip_full_on_booking
  AFTER INSERT OR UPDATE ON covoiturage_bookings
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'confirmed'))
  EXECUTE FUNCTION check_trip_full();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE covoiturage_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE covoiturage_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE covoiturage_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE covoiturage_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE covoiturage_driver_profiles ENABLE ROW LEVEL SECURITY;

-- Policies pour covoiturage_trips
CREATE POLICY "Tout le monde peut voir les trajets publiés"
  ON covoiturage_trips FOR SELECT
  USING (status = 'published' OR user_id = auth.uid());

CREATE POLICY "Les utilisateurs peuvent créer leurs trajets"
  ON covoiturage_trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les conducteurs peuvent modifier leurs trajets"
  ON covoiturage_trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Les conducteurs peuvent supprimer leurs trajets"
  ON covoiturage_trips FOR DELETE
  USING (auth.uid() = user_id);

-- Policies pour covoiturage_bookings
CREATE POLICY "Les utilisateurs voient leurs réservations"
  ON covoiturage_bookings FOR SELECT
  USING (
    auth.uid() = passenger_id 
    OR EXISTS (
      SELECT 1 FROM covoiturage_trips 
      WHERE id = trip_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent réserver"
  ON covoiturage_bookings FOR INSERT
  WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Les passagers et conducteurs peuvent modifier réservations"
  ON covoiturage_bookings FOR UPDATE
  USING (
    auth.uid() = passenger_id
    OR EXISTS (
      SELECT 1 FROM covoiturage_trips
      WHERE id = trip_id AND user_id = auth.uid()
    )
  );

-- Policies pour covoiturage_reviews
CREATE POLICY "Tout le monde peut voir les avis"
  ON covoiturage_reviews FOR SELECT
  USING (true);

CREATE POLICY "Les utilisateurs peuvent laisser des avis"
  ON covoiturage_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM covoiturage_bookings b
      JOIN covoiturage_trips t ON t.id = b.trip_id
      WHERE b.id = booking_id 
      AND (b.passenger_id = auth.uid() OR t.user_id = auth.uid())
    )
  );

-- Policies pour covoiturage_messages
CREATE POLICY "Les utilisateurs voient leurs messages"
  ON covoiturage_messages FOR SELECT
  USING (auth.uid() IN (sender_id, recipient_id));

CREATE POLICY "Les utilisateurs peuvent envoyer des messages"
  ON covoiturage_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Les destinataires peuvent marquer comme lu"
  ON covoiturage_messages FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Policies pour covoiturage_driver_profiles
CREATE POLICY "Tout le monde peut voir les profils"
  ON covoiturage_driver_profiles FOR SELECT
  USING (true);

CREATE POLICY "Les utilisateurs peuvent créer leur profil"
  ON covoiturage_driver_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier leur profil"
  ON covoiturage_driver_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- DONNÉES DE DÉMO (optionnel)
-- =====================================================

-- Insérer quelques trajets de démo (à adapter avec de vrais user_id)
/*
INSERT INTO covoiturage_trips (
  user_id,
  departure_city,
  arrival_city,
  departure_date,
  departure_time,
  arrival_time,
  duration,
  available_seats,
  price_per_seat,
  total_distance,
  comfort_level,
  features,
  vehicle_brand,
  vehicle_model,
  status
) VALUES
  (
    (SELECT id FROM auth.users LIMIT 1),
    'Paris',
    'Lyon',
    CURRENT_DATE + INTERVAL '1 day',
    '14:30',
    '18:45',
    255,
    2,
    25.00,
    465,
    'comfort',
    ARRAY['wifi', 'music', 'air_conditioning'],
    'Tesla',
    'Model 3',
    'published'
  );
*/

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE covoiturage_trips IS 'Trajets de covoiturage publiés par les conducteurs';
COMMENT ON TABLE covoiturage_bookings IS 'Réservations effectuées par les passagers';
COMMENT ON TABLE covoiturage_reviews IS 'Avis et notes laissés après un trajet';
COMMENT ON TABLE covoiturage_messages IS 'Messages entre conducteurs et passagers';
COMMENT ON TABLE covoiturage_driver_profiles IS 'Profils et statistiques des conducteurs';

-- =====================================================
-- FIN
-- =====================================================
