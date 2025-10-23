-- Fix des politiques RLS pour carpooling_bookings
-- Problème: Trop de politiques en conflit, certaines trop restrictives

-- Supprimer TOUTES les anciennes politiques de bookings
DROP POLICY IF EXISTS "Créer réservation" ON carpooling_bookings;
DROP POLICY IF EXISTS "Voir réservations" ON carpooling_bookings;
DROP POLICY IF EXISTS "Modifier réservation passager" ON carpooling_bookings;
DROP POLICY IF EXISTS "Modifier réservation conducteur" ON carpooling_bookings;
DROP POLICY IF EXISTS "Passengers can view own bookings" ON carpooling_bookings;
DROP POLICY IF EXISTS "Drivers can view bookings for their trips" ON carpooling_bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON carpooling_bookings;
DROP POLICY IF EXISTS "Passengers can update own bookings" ON carpooling_bookings;
DROP POLICY IF EXISTS "Drivers can update bookings for their trips" ON carpooling_bookings;
DROP POLICY IF EXISTS "Passengers can delete own bookings" ON carpooling_bookings;

-- Recréer les politiques avec permissions complètes

-- SELECT: Passagers peuvent voir leurs réservations
CREATE POLICY "Passengers can view own bookings"
  ON carpooling_bookings FOR SELECT
  TO authenticated
  USING (passenger_id = auth.uid());

-- SELECT: Conducteurs peuvent voir les réservations de leurs trajets
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

-- INSERT: Les utilisateurs peuvent créer des réservations pour n'importe quel trajet
-- MAIS ils doivent être le passenger_id
CREATE POLICY "Users can create bookings"
  ON carpooling_bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    passenger_id = auth.uid()
  );

-- UPDATE: Passagers peuvent modifier leurs propres réservations
CREATE POLICY "Passengers can update own bookings"
  ON carpooling_bookings FOR UPDATE
  TO authenticated
  USING (passenger_id = auth.uid())
  WITH CHECK (passenger_id = auth.uid());

-- UPDATE: Conducteurs peuvent modifier les réservations de leurs trajets
CREATE POLICY "Drivers can update bookings for their trips"
  ON carpooling_bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM carpooling_trips
      WHERE carpooling_trips.id = carpooling_bookings.trip_id
      AND carpooling_trips.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM carpooling_trips
      WHERE carpooling_trips.id = carpooling_bookings.trip_id
      AND carpooling_trips.driver_id = auth.uid()
    )
  );

-- DELETE: Passagers peuvent annuler leurs réservations
CREATE POLICY "Passengers can delete own bookings"
  ON carpooling_bookings FOR DELETE
  TO authenticated
  USING (passenger_id = auth.uid());

-- Vérification des politiques
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'carpooling_bookings'
ORDER BY policyname;
