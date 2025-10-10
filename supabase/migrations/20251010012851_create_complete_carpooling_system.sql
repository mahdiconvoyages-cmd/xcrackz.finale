/*
  # Système de Covoiturage Complet (style BlaBlaCar)

  1. Nouvelles Tables
    - `carpooling_trips` - Trajets de covoiturage
      - Informations complètes du trajet
      - Points de départ/arrivée avec coordonnées
      - Prix, places disponibles
      - Options (animaux, bagages, musique, etc.)
      - Statut et préférences
    
    - `carpooling_bookings` - Réservations
      - Lien trajet-passager
      - Nombre de places réservées
      - Statut (pending, confirmed, cancelled)
      - Prix total
    
    - `carpooling_reviews` - Avis et notes
      - Note de 1 à 5
      - Commentaire
      - Catégories (ponctualité, conduite, ambiance)
    
    - `carpooling_messages` - Messages entre utilisateurs
      - Conversation privée liée à un trajet
      - Messages texte
    
    - `carpooling_preferences` - Préférences utilisateur
      - Profil conducteur/passager
      - Véhicule
      - Préférences de voyage

  2. Sécurité
    - RLS sur toutes les tables
    - Utilisateurs voient leurs trajets et réservations
    - Messages privés entre participants
*/

-- Suppression des anciennes tables si elles existent
DROP TABLE IF EXISTS covoiturage_offers CASCADE;
DROP TABLE IF EXISTS covoiturage_bookings CASCADE;

-- Table des trajets de covoiturage
CREATE TABLE IF NOT EXISTS carpooling_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Départ
  departure_address text NOT NULL,
  departure_city text NOT NULL,
  departure_lat decimal(10, 8),
  departure_lng decimal(11, 8),
  departure_datetime timestamptz NOT NULL,
  
  -- Arrivée
  arrival_address text NOT NULL,
  arrival_city text NOT NULL,
  arrival_lat decimal(10, 8),
  arrival_lng decimal(11, 8),
  estimated_arrival timestamptz,
  
  -- Détails du trajet
  distance_km integer,
  duration_minutes integer,
  
  -- Places et prix
  total_seats integer NOT NULL DEFAULT 3,
  available_seats integer NOT NULL DEFAULT 3,
  price_per_seat decimal(10, 2) NOT NULL,
  
  -- Véhicule
  vehicle_brand text,
  vehicle_model text,
  vehicle_color text,
  vehicle_plate text,
  
  -- Options et préférences
  allows_pets boolean DEFAULT false,
  allows_smoking boolean DEFAULT false,
  allows_music boolean DEFAULT true,
  max_two_back boolean DEFAULT false,
  luggage_size text DEFAULT 'medium' CHECK (luggage_size IN ('small', 'medium', 'large')),
  
  -- Détails additionnels
  description text,
  automatic_booking boolean DEFAULT false,
  
  -- Statut
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed', 'full')),
  
  -- Métadonnées
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des réservations
CREATE TABLE IF NOT EXISTS carpooling_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES carpooling_trips(id) ON DELETE CASCADE NOT NULL,
  passenger_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Détails de la réservation
  seats_booked integer NOT NULL DEFAULT 1,
  total_price decimal(10, 2) NOT NULL,
  
  -- Statut
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  
  -- Message initial du passager
  message text,
  
  -- Dates
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(trip_id, passenger_id)
);

-- Table des avis
CREATE TABLE IF NOT EXISTS carpooling_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES carpooling_trips(id) ON DELETE CASCADE NOT NULL,
  reviewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reviewed_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Note globale
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  
  -- Notes détaillées
  punctuality_rating integer CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  driving_rating integer CHECK (driving_rating >= 1 AND driving_rating <= 5),
  friendliness_rating integer CHECK (friendliness_rating >= 1 AND friendliness_rating <= 5),
  
  -- Commentaire
  comment text,
  
  -- Métadonnées
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(trip_id, reviewer_id, reviewed_id)
);

-- Table des messages
CREATE TABLE IF NOT EXISTS carpooling_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES carpooling_trips(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Contenu
  message text NOT NULL,
  
  -- Statut
  is_read boolean DEFAULT false,
  read_at timestamptz,
  
  -- Métadonnées
  created_at timestamptz DEFAULT now()
);

-- Table des préférences utilisateur
CREATE TABLE IF NOT EXISTS carpooling_user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Type d'utilisateur
  is_driver boolean DEFAULT false,
  is_passenger boolean DEFAULT true,
  
  -- Profil conducteur
  driver_bio text,
  driver_experience_years integer,
  preferred_music_genre text,
  conversation_level text CHECK (conversation_level IN ('quiet', 'average', 'talkative')),
  
  -- Véhicule par défaut
  default_vehicle_brand text,
  default_vehicle_model text,
  default_vehicle_color text,
  default_vehicle_plate text,
  
  -- Préférences de voyage
  prefers_women_only boolean DEFAULT false,
  prefers_verified_only boolean DEFAULT false,
  
  -- Métadonnées
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_trips_departure_city ON carpooling_trips(departure_city);
CREATE INDEX IF NOT EXISTS idx_trips_arrival_city ON carpooling_trips(arrival_city);
CREATE INDEX IF NOT EXISTS idx_trips_departure_date ON carpooling_trips(departure_datetime);
CREATE INDEX IF NOT EXISTS idx_trips_status ON carpooling_trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON carpooling_trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trip ON carpooling_bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger ON carpooling_bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON carpooling_bookings(status);
CREATE INDEX IF NOT EXISTS idx_messages_trip ON carpooling_messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON carpooling_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON carpooling_messages(receiver_id);

-- Fonction pour calculer la note moyenne d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_average_rating(user_uuid uuid)
RETURNS decimal AS $$
  SELECT ROUND(AVG(rating)::decimal, 1)
  FROM carpooling_reviews
  WHERE reviewed_id = user_uuid;
$$ LANGUAGE sql STABLE;

-- Fonction pour compter les trajets d'un conducteur
CREATE OR REPLACE FUNCTION get_driver_trips_count(user_uuid uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM carpooling_trips
  WHERE driver_id = user_uuid
  AND status = 'completed';
$$ LANGUAGE sql STABLE;

-- Trigger pour mettre à jour available_seats
CREATE OR REPLACE FUNCTION update_trip_available_seats()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed') OR 
     (TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed') THEN
    UPDATE carpooling_trips
    SET available_seats = available_seats - NEW.seats_booked,
        updated_at = now()
    WHERE id = NEW.trip_id;
    
    UPDATE carpooling_trips
    SET status = 'full'
    WHERE id = NEW.trip_id
    AND available_seats <= 0;
  END IF;
  
  IF (TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status IN ('cancelled', 'rejected')) THEN
    UPDATE carpooling_trips
    SET available_seats = available_seats + OLD.seats_booked,
        status = 'active',
        updated_at = now()
    WHERE id = OLD.trip_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trip_seats
  AFTER INSERT OR UPDATE ON carpooling_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_available_seats();

-- RLS Policies
ALTER TABLE carpooling_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpooling_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpooling_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpooling_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpooling_user_preferences ENABLE ROW LEVEL SECURITY;

-- Trips: Tout le monde peut voir les trajets actifs
CREATE POLICY "Anyone can view active trips"
  ON carpooling_trips FOR SELECT
  TO authenticated
  USING (status IN ('active', 'full'));

CREATE POLICY "Drivers can view own trips"
  ON carpooling_trips FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Users can create trips"
  ON carpooling_trips FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can update own trips"
  ON carpooling_trips FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can delete own trips"
  ON carpooling_trips FOR DELETE
  TO authenticated
  USING (driver_id = auth.uid());

-- Bookings: Passagers et conducteurs peuvent voir
CREATE POLICY "Passengers can view own bookings"
  ON carpooling_bookings FOR SELECT
  TO authenticated
  USING (passenger_id = auth.uid());

CREATE POLICY "Drivers can view bookings for their trips"
  ON carpooling_bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM carpooling_trips
      WHERE carpooling_trips.id = carpooling_bookings.trip_id
      AND carpooling_trips.driver_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bookings"
  ON carpooling_bookings FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Passengers can update own bookings"
  ON carpooling_bookings FOR UPDATE
  TO authenticated
  USING (passenger_id = auth.uid())
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Drivers can update bookings for their trips"
  ON carpooling_bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM carpooling_trips
      WHERE carpooling_trips.id = carpooling_bookings.trip_id
      AND carpooling_trips.driver_id = auth.uid()
    )
  );

-- Reviews: Tout le monde peut lire, participants peuvent écrire
CREATE POLICY "Anyone can view reviews"
  ON carpooling_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Trip participants can create reviews"
  ON carpooling_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid() AND
    (
      EXISTS (
        SELECT 1 FROM carpooling_trips
        WHERE carpooling_trips.id = carpooling_reviews.trip_id
        AND (carpooling_trips.driver_id = auth.uid() OR carpooling_trips.driver_id = reviewed_id)
      ) OR
      EXISTS (
        SELECT 1 FROM carpooling_bookings
        WHERE carpooling_bookings.trip_id = carpooling_reviews.trip_id
        AND carpooling_bookings.passenger_id = auth.uid()
        AND carpooling_bookings.status = 'confirmed'
      )
    )
  );

-- Messages: Privés entre participants
CREATE POLICY "Users can view messages they sent or received"
  ON carpooling_messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON carpooling_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    (
      EXISTS (
        SELECT 1 FROM carpooling_trips
        WHERE carpooling_trips.id = carpooling_messages.trip_id
        AND (carpooling_trips.driver_id = auth.uid() OR carpooling_trips.driver_id = receiver_id)
      ) OR
      EXISTS (
        SELECT 1 FROM carpooling_bookings
        WHERE carpooling_bookings.trip_id = carpooling_messages.trip_id
        AND carpooling_bookings.passenger_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own messages"
  ON carpooling_messages FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Preferences: Chacun gère ses préférences
CREATE POLICY "Users can view own preferences"
  ON carpooling_user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view other users preferences"
  ON carpooling_user_preferences FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own preferences"
  ON carpooling_user_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
