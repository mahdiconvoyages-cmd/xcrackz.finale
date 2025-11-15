-- Mission de démo pour tester le système GPS style Uber Eats
-- Trajet: Paris Tour Eiffel → Château de Versailles

-- 1. Insérer une mission de test
INSERT INTO missions (
  reference,
  status,
  user_id,
  vehicle_brand,
  vehicle_model,
  vehicle_plate,
  pickup_address,
  pickup_lat,
  pickup_lng,
  pickup_date,
  delivery_address,
  delivery_lat,
  delivery_lng,
  delivery_date,
  price
) VALUES (
  'DEMO-GPS-' || to_char(now(), 'YYYYMMDD-HH24MI'),
  'in_progress', -- Mission EN COURS
  (SELECT id FROM auth.users LIMIT 1), -- Premier utilisateur
  'Tesla',
  'Model 3',
  'AB-123-CD',
  '5 Avenue Anatole France, 75007 Paris (Tour Eiffel)',
  48.858844, -- Tour Eiffel
  2.294351,
  now(),
  'Place d''Armes, 78000 Versailles (Château)',
  48.804865, -- Château de Versailles
  2.120355,
  now() + interval '45 minutes',
  89.90
)
RETURNING id;

-- Note: Copie l'ID retourné et remplace XXX ci-dessous

-- 2. Simuler un trajet GPS (points toutes les 2 minutes)
-- Remplace MISSION_ID par l'ID retourné ci-dessus

-- Point 1: Départ Tour Eiffel
INSERT INTO mission_locations (mission_id, latitude, longitude, speed, heading, accuracy, recorded_at)
VALUES ('MISSION_ID', 48.858844, 2.294351, 0, 90, 10, now() - interval '10 minutes');

-- Point 2: Invalides
INSERT INTO mission_locations (mission_id, latitude, longitude, speed, heading, accuracy, recorded_at)
VALUES ('MISSION_ID', 48.857128, 2.313239, 12.5, 85, 8, now() - interval '8 minutes');

-- Point 3: Concorde
INSERT INTO mission_locations (mission_id, latitude, longitude, speed, heading, accuracy, recorded_at)
VALUES ('MISSION_ID', 48.865633, 2.321236, 15.3, 75, 6, now() - interval '6 minutes');

-- Point 4: Périphérique Ouest
INSERT INTO mission_locations (mission_id, latitude, longitude, speed, heading, accuracy, recorded_at)
VALUES ('MISSION_ID', 48.876543, 2.275432, 22.2, 280, 12, now() - interval '4 minutes');

-- Point 5: A13 direction Versailles
INSERT INTO mission_locations (mission_id, latitude, longitude, speed, heading, accuracy, recorded_at)
VALUES ('MISSION_ID', 48.865123, 2.195876, 27.8, 260, 15, now() - interval '2 minutes');

-- Point 6: Proche Versailles (POSITION ACTUELLE)
INSERT INTO mission_locations (mission_id, latitude, longitude, speed, heading, accuracy, recorded_at)
VALUES ('MISSION_ID', 48.815234, 2.145678, 18.5, 245, 10, now());

-- 3. Générer un lien de suivi public
UPDATE missions 
SET public_tracking_link = 'https://www.xcrackz.com/tracking/' || encode(gen_random_bytes(16), 'hex')
WHERE id = 'MISSION_ID';

-- INSTRUCTIONS:
-- 1. Exécute d'abord l'INSERT mission
-- 2. Note l'ID retourné (ex: 550e8400-e29b-41d4-a716-446655440000)
-- 3. Remplace tous les 'MISSION_ID' par cet ID
-- 4. Exécute les INSERT mission_locations
-- 5. Exécute l'UPDATE pour le lien public
-- 6. Va sur http://localhost:5173/tracking
-- 7. Tu verras:
--    - Stats en temps réel (vitesse 18.5 m/s = 67 km/h)
--    - Trajet VERT parcouru (5 points)
--    - Trajet GRIS pointillé restant (vers Versailles)
--    - Marqueur animé avec halo pulsant
--    - ETA calculé par OSRM
