-- ================================================
-- SYSTÈME COVOITURAGE PROFESSIONNEL COMPLET
-- Application intégrée entre convoyeurs
-- ================================================

-- ============================================
-- 1. PROFILS CONVOYEURS DÉTAILLÉS
-- ============================================

-- Extension profil utilisateur pour convoyeurs
CREATE TABLE IF NOT EXISTS driver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Informations personnelles
  full_name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  bio TEXT,
  languages TEXT[] DEFAULT ARRAY['fr'],
  
  -- Expérience professionnelle
  experience_years INTEGER DEFAULT 0,
  total_missions_completed INTEGER DEFAULT 0,
  total_km_driven INTEGER DEFAULT 0,
  member_since TIMESTAMPTZ DEFAULT NOW(),
  
  -- Véhicules
  vehicles JSONB DEFAULT '[]', -- [{brand, model, plate, year, seats, type}]
  
  -- Statut et disponibilité
  is_available BOOLEAN DEFAULT true,
  availability_status TEXT DEFAULT 'available', -- available, busy, offline
  current_location JSONB, -- {latitude, longitude, city, updated_at}
  
  -- Vérifications et badges
  is_identity_verified BOOLEAN DEFAULT false,
  identity_verified_at TIMESTAMPTZ,
  is_license_verified BOOLEAN DEFAULT false,
  license_verified_at TIMESTAMPTZ,
  verification_documents JSONB DEFAULT '[]',
  badges TEXT[] DEFAULT ARRAY[]::TEXT[], -- professional, verified, top_rated, eco_driver
  
  -- Notation et statistiques
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  reliability_score DECIMAL(3,2) DEFAULT 100.00,
  response_time_minutes INTEGER DEFAULT 30,
  
  -- Préférences
  preferences JSONB DEFAULT '{}', -- {smoking, pets, music, conversation_level}
  
  -- Paramètres
  notification_settings JSONB DEFAULT '{"push": true, "email": true, "sms": false}',
  privacy_settings JSONB DEFAULT '{"show_phone": false, "show_location": true}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_available ON driver_profiles(is_available);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_rating ON driver_profiles(average_rating DESC);

-- ============================================
-- 2. TRAJETS PROFESSIONNELS
-- ============================================

CREATE TABLE IF NOT EXISTS carpooling_rides_pro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Conducteur
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  driver_profile_id UUID REFERENCES driver_profiles(id),
  
  -- Détails du trajet
  departure_city TEXT NOT NULL,
  departure_address TEXT,
  departure_lat DECIMAL(10,8),
  departure_lng DECIMAL(11,8),
  
  arrival_city TEXT NOT NULL,
  arrival_address TEXT,
  arrival_lat DECIMAL(10,8),
  arrival_lng DECIMAL(11,8),
  
  -- Dates et horaires
  departure_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  estimated_arrival_time TIME,
  flexible_time BOOLEAN DEFAULT false,
  
  -- Distance et durée
  distance_km INTEGER NOT NULL,
  estimated_duration_minutes INTEGER,
  
  -- Véhicule
  vehicle_brand TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_plate TEXT,
  vehicle_year INTEGER,
  total_seats INTEGER DEFAULT 4,
  available_seats INTEGER NOT NULL,
  
  -- Tarification
  price_per_seat DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  price_includes TEXT[], -- toll, fuel, insurance
  
  -- Options et préférences
  smoking_allowed BOOLEAN DEFAULT false,
  pets_allowed BOOLEAN DEFAULT false,
  music_allowed BOOLEAN DEFAULT true,
  luggage_space TEXT DEFAULT 'medium', -- small, medium, large
  conversation_level TEXT DEFAULT 'medium', -- quiet, medium, chatty
  
  -- Modes de paiement acceptés
  payment_methods TEXT[] DEFAULT ARRAY['credits', 'cash'],
  auto_accept_bookings BOOLEAN DEFAULT false,
  
  -- Statuts
  status TEXT DEFAULT 'published', -- published, in_progress, completed, cancelled
  visibility TEXT DEFAULT 'public', -- public, team_only, private
  
  -- Trajet récurrent
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB, -- {frequency: 'weekly', days: [1,3,5], until: '2025-12-31'}
  parent_ride_id UUID REFERENCES carpooling_rides_pro(id),
  
  -- Association automatique
  auto_match_enabled BOOLEAN DEFAULT true,
  matched_rides UUID[], -- IDs des trajets similaires détectés
  
  -- Suivi temps réel
  current_location JSONB,
  tracking_enabled BOOLEAN DEFAULT true,
  
  -- Notes et conditions
  notes TEXT,
  special_requirements TEXT,
  
  -- Métadonnées
  views_count INTEGER DEFAULT 0,
  bookings_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rides_pro_driver ON carpooling_rides_pro(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_pro_status ON carpooling_rides_pro(status);
CREATE INDEX IF NOT EXISTS idx_rides_pro_date ON carpooling_rides_pro(departure_date);
CREATE INDEX IF NOT EXISTS idx_rides_pro_cities ON carpooling_rides_pro(departure_city, arrival_city);
CREATE INDEX IF NOT EXISTS idx_rides_pro_available ON carpooling_rides_pro(status, available_seats) WHERE available_seats > 0;

-- ============================================
-- 3. RÉSERVATIONS ET PARTICIPATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS ride_bookings_pro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  ride_id UUID REFERENCES carpooling_rides_pro(id) ON DELETE CASCADE NOT NULL,
  passenger_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  passenger_profile_id UUID REFERENCES driver_profiles(id),
  
  -- Réservation
  seats_booked INTEGER DEFAULT 1,
  total_price DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL, -- credits, cash, card
  
  -- Statuts
  status TEXT DEFAULT 'pending', -- pending, confirmed, rejected, completed, cancelled
  confirmed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Communication
  message_to_driver TEXT,
  driver_response TEXT,
  
  -- Point de rencontre personnalisé
  custom_pickup_location JSONB,
  custom_dropoff_location JSONB,
  
  -- Validation du trajet
  departure_validation JSONB, -- {validated: true, mileage: 12000, signature, photos, timestamp}
  arrival_validation JSONB,
  
  -- Paiement
  payment_status TEXT DEFAULT 'pending', -- pending, paid, refunded
  payment_transaction_id UUID,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  
  -- Frais partagés
  shared_costs JSONB DEFAULT '{}', -- {toll: 15.50, parking: 5.00, fuel: 25.00}
  cost_split_method TEXT DEFAULT 'equal', -- equal, custom, by_distance
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_pro_ride ON ride_bookings_pro(ride_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pro_passenger ON ride_bookings_pro(passenger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pro_status ON ride_bookings_pro(status);

-- ============================================
-- 4. CHAT ET MESSAGERIE
-- ============================================

CREATE TABLE IF NOT EXISTS ride_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES carpooling_rides_pro(id) ON DELETE CASCADE NOT NULL,
  
  -- Participants
  participants UUID[] NOT NULL, -- Array of user IDs
  is_group_chat BOOLEAN DEFAULT false,
  
  -- Métadonnées
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message TEXT,
  unread_count JSONB DEFAULT '{}', -- {user_id: count}
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ride_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ride_conversations(id) ON DELETE CASCADE NOT NULL,
  
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  
  -- Pièces jointes
  attachments JSONB DEFAULT '[]', -- [{type: 'image', url: '...', name: '...'}]
  
  -- Métadonnées
  read_by UUID[] DEFAULT ARRAY[]::UUID[],
  delivered_to UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Réponse à un message
  reply_to_message_id UUID REFERENCES ride_messages(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_pro ON ride_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_pro ON ride_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_pro ON ride_messages(created_at DESC);

-- ============================================
-- 5. ÉQUIPES ET GROUPES DE CONVOYEURS
-- ============================================

CREATE TABLE IF NOT EXISTS driver_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  
  -- Propriétaire et admin
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Configuration
  is_private BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 50,
  
  -- Statistiques
  total_members INTEGER DEFAULT 1,
  total_rides_completed INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  team_id UUID REFERENCES driver_teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  role TEXT DEFAULT 'member', -- owner, admin, moderator, member
  
  -- Statut
  status TEXT DEFAULT 'active', -- pending, active, suspended, left
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  
  -- Permissions
  can_invite BOOLEAN DEFAULT false,
  can_manage_rides BOOLEAN DEFAULT false,
  can_moderate BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  team_id UUID REFERENCES driver_teams(id) ON DELETE CASCADE NOT NULL,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected, expired
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  
  responded_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. NOTATIONS ET AVIS
-- ============================================

CREATE TABLE IF NOT EXISTS ride_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  ride_id UUID REFERENCES carpooling_rides_pro(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES ride_bookings_pro(id),
  
  -- Évaluateur et évalué
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reviewed_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Notes (1-5)
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  driving_rating INTEGER CHECK (driving_rating >= 1 AND driving_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  vehicle_cleanliness_rating INTEGER CHECK (vehicle_cleanliness_rating >= 1 AND vehicle_cleanliness_rating <= 5),
  
  -- Commentaire
  comment TEXT,
  
  -- Badges attribués
  badges TEXT[], -- punctual, friendly, safe_driver, clean_car
  
  -- Visibilité
  is_public BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false, -- Vérifié par l'admin
  
  -- Réponse
  response TEXT,
  responded_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ride_id, reviewer_id, reviewed_user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_ride_pro ON ride_reviews(ride_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user_pro ON ride_reviews(reviewed_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating_pro ON ride_reviews(overall_rating DESC);

-- ============================================
-- 7. NOTIFICATIONS MULTI-CANAL
-- ============================================

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Contenu
  type TEXT NOT NULL, -- new_ride, booking_request, booking_confirmed, message, payment, review
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Données associées
  related_ride_id UUID REFERENCES carpooling_rides_pro(id),
  related_booking_id UUID REFERENCES ride_bookings_pro(id),
  related_user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  
  -- Canaux d'envoi
  channels TEXT[] DEFAULT ARRAY['push'], -- push, email, sms
  sent_via TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Statuts
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Action
  action_url TEXT,
  action_label TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_pro ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread_pro ON user_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type_pro ON user_notifications(type);

-- ============================================
-- 8. PAIEMENTS ET TRANSACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Transaction
  type TEXT NOT NULL, -- credit, debit, refund, transfer, withdrawal
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  -- Détails
  description TEXT,
  category TEXT, -- ride_payment, shared_cost, commission, bonus
  
  -- Relations
  related_ride_id UUID REFERENCES carpooling_rides_pro(id),
  related_booking_id UUID REFERENCES ride_bookings_pro(id),
  related_user_id UUID REFERENCES auth.users(id), -- Pour les transferts
  
  -- Statut
  status TEXT DEFAULT 'completed', -- pending, completed, failed, refunded
  
  -- Solde après transaction
  balance_after DECIMAL(10,2),
  
  -- Métadonnées
  payment_provider TEXT, -- stripe, internal_credits, cash
  external_transaction_id TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_pro ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type_pro ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_pro ON wallet_transactions(created_at DESC);

-- ============================================
-- 9. FAVORIS ET RÉCURRENCES
-- ============================================

CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Type de favori
  favorite_type TEXT NOT NULL, -- route, contact, location
  
  -- Itinéraire favori
  route_departure_city TEXT,
  route_arrival_city TEXT,
  route_name TEXT,
  
  -- Contact favori
  favorite_user_id UUID REFERENCES auth.users(id),
  
  -- Lieu favori
  location_name TEXT,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  location_type TEXT, -- pickup, dropoff, rest_area
  
  -- Notifications
  notify_new_rides BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recurring_ride_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Template du trajet
  template_name TEXT NOT NULL,
  departure_city TEXT NOT NULL,
  arrival_city TEXT NOT NULL,
  
  -- Récurrence
  recurrence_type TEXT NOT NULL, -- daily, weekly, monthly
  recurrence_days INTEGER[], -- [1,3,5] pour lundi, mercredi, vendredi
  departure_time TIME,
  
  -- Détails du trajet (copié dans carpooling_rides_pro)
  ride_template JSONB NOT NULL, -- Toutes les infos du trajet
  
  -- Statut
  is_active BOOLEAN DEFAULT true,
  next_creation_date DATE,
  auto_publish BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. VÉRIFICATION D'IDENTITÉ
-- ============================================

CREATE TABLE IF NOT EXISTS identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Type de vérification
  verification_type TEXT NOT NULL, -- identity_card, driver_license, passport, address_proof
  
  -- Documents
  document_front_url TEXT,
  document_back_url TEXT,
  selfie_url TEXT,
  
  -- Informations extraites
  document_number TEXT,
  full_name TEXT,
  birth_date DATE,
  expiry_date DATE,
  
  -- Statut
  status TEXT DEFAULT 'pending', -- pending, under_review, approved, rejected
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  
  -- Résultat
  rejection_reason TEXT,
  admin_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. STATISTIQUES ET RAPPORTS
-- ============================================

CREATE TABLE IF NOT EXISTS driver_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Trajets
  total_rides_as_driver INTEGER DEFAULT 0,
  total_rides_as_passenger INTEGER DEFAULT 0,
  total_km_as_driver INTEGER DEFAULT 0,
  total_km_as_passenger INTEGER DEFAULT 0,
  
  -- Revenus et dépenses
  total_earnings DECIMAL(10,2) DEFAULT 0.00,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  total_saved_by_carpooling DECIMAL(10,2) DEFAULT 0.00,
  
  -- Fiabilité
  cancellation_rate DECIMAL(5,2) DEFAULT 0.00,
  on_time_percentage DECIMAL(5,2) DEFAULT 100.00,
  response_rate DECIMAL(5,2) DEFAULT 100.00,
  
  -- Social
  total_carpoolers_met INTEGER DEFAULT 0,
  repeat_carpoolers INTEGER DEFAULT 0,
  
  -- Environnement
  co2_saved_kg DECIMAL(10,2) DEFAULT 0.00,
  
  -- Mise à jour
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. LITIGES ET SUPPORT
-- ============================================

CREATE TABLE IF NOT EXISTS ride_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  ride_id UUID REFERENCES carpooling_rides_pro(id) NOT NULL,
  booking_id UUID REFERENCES ride_bookings_pro(id),
  
  -- Parties impliquées
  filed_by UUID REFERENCES auth.users(id) NOT NULL,
  disputed_user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Litige
  category TEXT NOT NULL, -- no_show, payment, behavior, safety, other
  description TEXT NOT NULL,
  evidence_urls TEXT[],
  
  -- Statut
  status TEXT DEFAULT 'open', -- open, under_review, resolved, closed
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  
  -- Résolution
  assigned_to UUID REFERENCES auth.users(id),
  resolution TEXT,
  resolution_action TEXT, -- refund, warning, suspension, ban
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRIGGERS DE MISE À JOUR AUTOMATIQUE
-- ============================================

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur toutes les tables
DROP TRIGGER IF EXISTS update_driver_profiles_updated_at ON driver_profiles;
CREATE TRIGGER update_driver_profiles_updated_at BEFORE UPDATE ON driver_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rides_pro_updated_at ON carpooling_rides_pro;
CREATE TRIGGER update_rides_pro_updated_at BEFORE UPDATE ON carpooling_rides_pro FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_pro_updated_at ON ride_bookings_pro;
CREATE TRIGGER update_bookings_pro_updated_at BEFORE UPDATE ON ride_bookings_pro FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (ROW LEVEL SECURITY) POLICIES
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpooling_rides_pro ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_bookings_pro ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Policies pour driver_profiles
DROP POLICY IF EXISTS "Profils publics visibles par tous" ON driver_profiles;
CREATE POLICY "Profils publics visibles par tous" ON driver_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Utilisateurs peuvent créer leur profil" ON driver_profiles;
CREATE POLICY "Utilisateurs peuvent créer leur profil" ON driver_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Utilisateurs peuvent modifier leur profil" ON driver_profiles;
CREATE POLICY "Utilisateurs peuvent modifier leur profil" ON driver_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Policies pour carpooling_rides_pro
DROP POLICY IF EXISTS "Trajets publics visibles par tous" ON carpooling_rides_pro;
CREATE POLICY "Trajets publics visibles par tous" ON carpooling_rides_pro FOR SELECT USING (visibility = 'public' OR driver_id = auth.uid());
DROP POLICY IF EXISTS "Conducteurs peuvent créer des trajets" ON carpooling_rides_pro;
CREATE POLICY "Conducteurs peuvent créer des trajets" ON carpooling_rides_pro FOR INSERT WITH CHECK (auth.uid() = driver_id);
DROP POLICY IF EXISTS "Conducteurs peuvent modifier leurs trajets" ON carpooling_rides_pro;
CREATE POLICY "Conducteurs peuvent modifier leurs trajets" ON carpooling_rides_pro FOR UPDATE USING (auth.uid() = driver_id);
DROP POLICY IF EXISTS "Conducteurs peuvent supprimer leurs trajets" ON carpooling_rides_pro;
CREATE POLICY "Conducteurs peuvent supprimer leurs trajets" ON carpooling_rides_pro FOR DELETE USING (auth.uid() = driver_id);

-- Policies pour ride_bookings_pro
DROP POLICY IF EXISTS "Réservations visibles par conducteur et passager" ON ride_bookings_pro;
CREATE POLICY "Réservations visibles par conducteur et passager" ON ride_bookings_pro FOR SELECT USING (
  auth.uid() = passenger_id OR 
  auth.uid() IN (SELECT driver_id FROM carpooling_rides_pro WHERE id = ride_id)
);
DROP POLICY IF EXISTS "Passagers peuvent réserver" ON ride_bookings_pro;
CREATE POLICY "Passagers peuvent réserver" ON ride_bookings_pro FOR INSERT WITH CHECK (auth.uid() = passenger_id);
DROP POLICY IF EXISTS "Passagers et conducteurs peuvent modifier" ON ride_bookings_pro;
CREATE POLICY "Passagers et conducteurs peuvent modifier" ON ride_bookings_pro FOR UPDATE USING (
  auth.uid() = passenger_id OR 
  auth.uid() IN (SELECT driver_id FROM carpooling_rides_pro WHERE id = ride_id)
);

-- Policies pour user_notifications
DROP POLICY IF EXISTS "Utilisateurs voient leurs notifications" ON user_notifications;
CREATE POLICY "Utilisateurs voient leurs notifications" ON user_notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Utilisateurs modifient leurs notifications" ON user_notifications;
CREATE POLICY "Utilisateurs modifient leurs notifications" ON user_notifications FOR UPDATE USING (auth.uid() = user_id);

-- Policies pour wallet_transactions
DROP POLICY IF EXISTS "Utilisateurs voient leurs transactions" ON wallet_transactions;
CREATE POLICY "Utilisateurs voient leurs transactions" ON wallet_transactions FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- FONCTIONS UTILITAIRES
-- ============================================

-- Fonction: Calculer la note moyenne d'un conducteur
CREATE OR REPLACE FUNCTION calculate_driver_rating(p_user_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  v_avg_rating DECIMAL(3,2);
BEGIN
  SELECT COALESCE(AVG(overall_rating), 0.00)
  INTO v_avg_rating
  FROM ride_reviews
  WHERE reviewed_user_id = p_user_id
    AND is_public = true;
  
  UPDATE driver_profiles
  SET average_rating = v_avg_rating,
      total_reviews = (SELECT COUNT(*) FROM ride_reviews WHERE reviewed_user_id = p_user_id)
  WHERE user_id = p_user_id;
  
  RETURN v_avg_rating;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Recherche intelligente de trajets
CREATE OR REPLACE FUNCTION search_rides(
  p_departure_city TEXT DEFAULT NULL,
  p_arrival_city TEXT DEFAULT NULL,
  p_departure_date DATE DEFAULT NULL,
  p_min_seats INTEGER DEFAULT 1,
  p_max_price DECIMAL DEFAULT NULL
)
RETURNS TABLE (
  ride_id UUID,
  driver_name TEXT,
  driver_rating DECIMAL,
  departure_city TEXT,
  arrival_city TEXT,
  departure_datetime TIMESTAMPTZ,
  available_seats INTEGER,
  price_per_seat DECIMAL,
  vehicle_info TEXT,
  distance_km INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    dp.full_name,
    dp.average_rating,
    r.departure_city,
    r.arrival_city,
    (r.departure_date + r.departure_time)::TIMESTAMPTZ,
    r.available_seats,
    r.price_per_seat,
    r.vehicle_brand || ' ' || r.vehicle_model,
    r.distance_km
  FROM carpooling_rides_pro r
  JOIN driver_profiles dp ON r.driver_id = dp.user_id
  WHERE r.status = 'published'
    AND r.available_seats >= p_min_seats
    AND (p_departure_city IS NULL OR r.departure_city ILIKE '%' || p_departure_city || '%')
    AND (p_arrival_city IS NULL OR r.arrival_city ILIKE '%' || p_arrival_city || '%')
    AND (p_departure_date IS NULL OR r.departure_date = p_departure_date)
    AND (p_max_price IS NULL OR r.price_per_seat <= p_max_price)
  ORDER BY r.departure_date, r.departure_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Matching automatique de trajets similaires
CREATE OR REPLACE FUNCTION find_similar_rides(p_ride_id UUID)
RETURNS TABLE (
  similar_ride_id UUID,
  similarity_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH ride_info AS (
    SELECT departure_city, arrival_city, departure_date
    FROM carpooling_rides_pro
    WHERE id = p_ride_id
  )
  SELECT 
    r.id,
    CASE 
      WHEN r.departure_city = ri.departure_city AND r.arrival_city = ri.arrival_city THEN 100
      WHEN r.departure_city = ri.departure_city OR r.arrival_city = ri.arrival_city THEN 50
      ELSE 25
    END as similarity_score
  FROM carpooling_rides_pro r, ride_info ri
  WHERE r.id != p_ride_id
    AND r.status = 'published'
    AND r.departure_date = ri.departure_date
    AND (r.departure_city = ri.departure_city OR r.arrival_city = ri.arrival_city)
  ORDER BY similarity_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES POUR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_rides_pro_search ON carpooling_rides_pro(departure_city, arrival_city, departure_date, status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_driver_profiles_verified ON driver_profiles(is_identity_verified, is_license_verified);
CREATE INDEX IF NOT EXISTS idx_bookings_pro_payment ON ride_bookings_pro(payment_status);

-- ============================================
-- VUES POUR STATISTIQUES
-- ============================================

CREATE OR REPLACE VIEW driver_dashboard_stats AS
SELECT 
  dp.user_id,
  dp.full_name,
  dp.average_rating,
  dp.total_reviews,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'published') as active_rides,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'completed') as completed_rides,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'confirmed') as confirmed_bookings,
  COALESCE(SUM(wt.amount) FILTER (WHERE wt.type = 'credit'), 0) as total_earnings,
  ds.total_km_as_driver,
  ds.co2_saved_kg
FROM driver_profiles dp
LEFT JOIN carpooling_rides_pro r ON r.driver_id = dp.user_id
LEFT JOIN ride_bookings_pro b ON b.ride_id = r.id
LEFT JOIN wallet_transactions wt ON wt.user_id = dp.user_id
LEFT JOIN driver_statistics ds ON ds.user_id = dp.user_id
GROUP BY dp.user_id, dp.full_name, dp.average_rating, dp.total_reviews, ds.total_km_as_driver, ds.co2_saved_kg;

-- ============================================
-- DONNÉES INITIALES (OPTIONNEL)
-- ============================================

-- Créer les badges disponibles
DO $$
BEGIN
  -- Vous pouvez insérer des données de test ici si nécessaire
END $$;

-- ================================================
-- FIN DU SCHÉMA COVOITURAGE PROFESSIONNEL COMPLET
-- ================================================
