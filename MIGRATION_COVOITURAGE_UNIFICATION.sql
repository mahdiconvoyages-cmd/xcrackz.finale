-- ============================================
-- MIGRATION : UNIFICATION COVOITURAGE WEB/MOBILE
-- Création tables carpooling_messages et carpooling_ratings
-- Date: 21 Octobre 2025
-- ============================================

-- =====================
-- 1. TABLE: carpooling_messages
-- =====================
CREATE TABLE IF NOT EXISTS carpooling_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES carpooling_trips(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_carpooling_messages_trip 
  ON carpooling_messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_carpooling_messages_sender 
  ON carpooling_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_carpooling_messages_receiver 
  ON carpooling_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_carpooling_messages_created 
  ON carpooling_messages(created_at DESC);

-- RLS Policies
ALTER TABLE carpooling_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their messages" ON carpooling_messages;
CREATE POLICY "Users can view their messages" ON carpooling_messages
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS "Users can send messages" ON carpooling_messages;
CREATE POLICY "Users can send messages" ON carpooling_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark messages as read" ON carpooling_messages;
CREATE POLICY "Users can mark messages as read" ON carpooling_messages
  FOR UPDATE USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- =====================
-- 2. TABLE: carpooling_ratings
-- =====================
CREATE TABLE IF NOT EXISTS carpooling_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES carpooling_trips(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rated_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  friendliness_rating INTEGER CHECK (friendliness_rating >= 1 AND friendliness_rating <= 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  comment TEXT,
  tags TEXT[],
  role TEXT CHECK (role IN ('driver', 'passenger')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Un utilisateur ne peut noter qu'une seule fois par trajet/personne
  UNIQUE(trip_id, rater_id, rated_user_id)
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_carpooling_ratings_trip 
  ON carpooling_ratings(trip_id);
CREATE INDEX IF NOT EXISTS idx_carpooling_ratings_rated_user 
  ON carpooling_ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_carpooling_ratings_rater 
  ON carpooling_ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_carpooling_ratings_created 
  ON carpooling_ratings(created_at DESC);

-- RLS Policies
ALTER TABLE carpooling_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view ratings" ON carpooling_ratings;
CREATE POLICY "Anyone can view ratings" ON carpooling_ratings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create ratings" ON carpooling_ratings;
CREATE POLICY "Users can create ratings" ON carpooling_ratings
  FOR INSERT WITH CHECK (rater_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their ratings" ON carpooling_ratings;
CREATE POLICY "Users can update their ratings" ON carpooling_ratings
  FOR UPDATE USING (rater_id = auth.uid())
  WITH CHECK (rater_id = auth.uid());

-- =====================
-- 3. MIGRATION DONNÉES (SI tables 'ride_*' existent)
-- =====================

-- Vérifier si tables ride_* existent et migrer
DO $$
BEGIN
  -- Migrer ride_messages → carpooling_messages
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ride_messages') THEN
    INSERT INTO carpooling_messages (
      id, trip_id, sender_id, receiver_id, message, is_read, created_at
    )
    SELECT 
      id, 
      ride_id AS trip_id,  -- Renommer ride_id → trip_id
      sender_id, 
      recipient_id AS receiver_id,  -- Renommer recipient_id → receiver_id
      message, 
      COALESCE(read, FALSE) AS is_read,
      created_at
    FROM ride_messages
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Messages migrés de ride_messages vers carpooling_messages';
  END IF;

  -- Migrer ride_ratings → carpooling_ratings
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ride_ratings') THEN
    INSERT INTO carpooling_ratings (
      id, trip_id, rater_id, rated_user_id, rating, 
      punctuality_rating, friendliness_rating, cleanliness_rating,
      comment, tags, role, created_at
    )
    SELECT 
      id, 
      ride_id AS trip_id,
      reviewer_id AS rater_id,
      reviewee_id AS rated_user_id,
      overall_rating AS rating,
      punctuality_rating,
      friendliness_rating,
      cleanliness_rating,
      comment,
      tags,
      role,
      created_at
    FROM ride_ratings
    ON CONFLICT (trip_id, rater_id, rated_user_id) DO NOTHING;
    
    RAISE NOTICE 'Ratings migrés de ride_ratings vers carpooling_ratings';
  END IF;
END $$;

-- =====================
-- 4. VUES UTILITAIRES
-- =====================

-- Ajouter colonnes manquantes à carpooling_trips si nécessaire
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'carpooling_trips' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE carpooling_trips ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Colonne updated_at ajoutée à carpooling_trips';
  END IF;
END $$;

-- Vue: Stats utilisateur covoiturage
CREATE OR REPLACE VIEW carpooling_user_stats AS
SELECT 
  u.id AS user_id,
  COUNT(DISTINCT t.id) FILTER (WHERE t.driver_id = u.id) AS trips_as_driver,
  COUNT(DISTINCT b.id) FILTER (WHERE b.passenger_id = u.id AND b.status = 'confirmed') AS trips_as_passenger,
  ROUND(AVG(r.rating) FILTER (WHERE r.rated_user_id = u.id)::numeric, 2) AS avg_rating,
  COUNT(r.id) FILTER (WHERE r.rated_user_id = u.id) AS total_ratings
FROM auth.users u
LEFT JOIN carpooling_trips t ON t.driver_id = u.id
LEFT JOIN carpooling_bookings b ON b.passenger_id = u.id
LEFT JOIN carpooling_ratings r ON r.rated_user_id = u.id
GROUP BY u.id;

-- Vue: Conversations actives (derniers messages par conversation)
CREATE OR REPLACE VIEW carpooling_active_conversations AS
WITH latest_messages AS (
  SELECT DISTINCT ON (trip_id, LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))
    id,
    trip_id,
    sender_id,
    receiver_id,
    message,
    created_at,
    is_read
  FROM carpooling_messages
  ORDER BY 
    trip_id, 
    LEAST(sender_id, receiver_id), 
    GREATEST(sender_id, receiver_id),
    created_at DESC
)
SELECT 
  lm.id,
  lm.trip_id,
  lm.sender_id,
  lm.receiver_id,
  lm.message AS last_message,
  lm.created_at AS last_message_at,
  lm.is_read AS last_message_read,
  t.departure_city,
  t.arrival_city,
  t.departure_datetime
FROM latest_messages lm
JOIN carpooling_trips t ON t.id = lm.trip_id;

-- =====================
-- 5. FONCTIONS UTILITAIRES
-- =====================

-- Fonction: Obtenir le nombre de messages non lus
CREATE OR REPLACE FUNCTION get_unread_messages_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM carpooling_messages
    WHERE receiver_id = user_uuid AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Marquer conversation comme lue
CREATE OR REPLACE FUNCTION mark_conversation_as_read(
  p_trip_id UUID,
  p_other_user_id UUID,
  p_current_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE carpooling_messages
  SET is_read = TRUE
  WHERE trip_id = p_trip_id
    AND sender_id = p_other_user_id
    AND receiver_id = p_current_user_id
    AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- 6. TRIGGERS
-- =====================

-- Trigger: Mise à jour updated_at sur carpooling_trips quand nouveau message
CREATE OR REPLACE FUNCTION update_trip_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE carpooling_trips
  SET updated_at = NOW()
  WHERE id = NEW.trip_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_trip_on_message ON carpooling_messages;
CREATE TRIGGER trigger_update_trip_on_message
  AFTER INSERT ON carpooling_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_on_message();

-- Trigger: Mise à jour stats utilisateur après rating
CREATE OR REPLACE FUNCTION update_user_stats_on_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour le profil avec la nouvelle moyenne
  UPDATE profiles
  SET 
    rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM carpooling_ratings
      WHERE rated_user_id = NEW.rated_user_id
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM carpooling_ratings
      WHERE rated_user_id = NEW.rated_user_id
    )
  WHERE id = NEW.rated_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_stats_on_rating ON carpooling_ratings;
CREATE TRIGGER trigger_update_user_stats_on_rating
  AFTER INSERT OR UPDATE ON carpooling_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_rating();

-- =====================
-- 7. COMMENTAIRES DOCUMENTATION
-- =====================

COMMENT ON TABLE carpooling_messages IS 'Messages entre conducteurs et passagers pour un trajet de covoiturage';
COMMENT ON TABLE carpooling_ratings IS 'Évaluations et notes après un trajet de covoiturage';
COMMENT ON VIEW carpooling_user_stats IS 'Statistiques agrégées par utilisateur (trajets, notes moyennes)';
COMMENT ON VIEW carpooling_active_conversations IS 'Derniers messages par conversation (trip + 2 utilisateurs)';

-- =====================
-- 8. VÉRIFICATION FINAL
-- =====================

-- Afficher le résumé
DO $$
DECLARE
  msg_count INTEGER;
  rating_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO msg_count FROM carpooling_messages;
  SELECT COUNT(*) INTO rating_count FROM carpooling_ratings;
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'MIGRATION COVOITURAGE TERMINÉE';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'carpooling_messages: % enregistrements', msg_count;
  RAISE NOTICE 'carpooling_ratings: % enregistrements', rating_count;
  RAISE NOTICE '===========================================';
END $$;

-- =====================
-- 9. FONCTIONS RPC CRÉDITS
-- =====================

-- Fonction: Déduire crédits (pour réservations confirmées)
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Vérifier le solde actuel
  SELECT credits INTO current_credits
  FROM user_credits
  WHERE user_id = p_user_id;
  
  IF current_credits IS NULL THEN
    RAISE EXCEPTION 'User credits record not found for user %', p_user_id;
  END IF;
  
  IF current_credits < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits. Current: %, Required: %', current_credits, p_amount;
  END IF;
  
  -- Déduire les crédits
  UPDATE user_credits
  SET 
    credits = credits - p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RAISE NOTICE 'Déduit % crédits pour user %. Nouveau solde: %', p_amount, p_user_id, (current_credits - p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Ajouter crédits (pour remboursements)
CREATE OR REPLACE FUNCTION add_credits(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_credits (user_id, credits, created_at, updated_at)
  VALUES (p_user_id, p_amount, NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET 
    credits = user_credits.credits + p_amount,
    updated_at = NOW();
  
  RAISE NOTICE 'Ajouté % crédits pour user %', p_amount, p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Obtenir solde crédits
CREATE OR REPLACE FUNCTION get_user_credits(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  user_credits_amount INTEGER;
BEGIN
  SELECT credits INTO user_credits_amount
  FROM user_credits
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(user_credits_amount, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Vérifier si utilisateur a assez de crédits
CREATE OR REPLACE FUNCTION has_sufficient_credits(p_user_id UUID, p_required_amount INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(credits, 0) >= p_required_amount
    FROM user_credits
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- MIGRATION TERMINÉE ✅
-- =====================
