-- =============================================
-- TEST: Système de codes de partage missions
-- Objectif: Vérifier unicité, format, robustesse join et trigger
-- =============================================

-- 1) Générer 200 codes via la fonction et vérifier unicité + pattern
WITH gen AS (
	SELECT generate_share_code() AS code
	FROM generate_series(1,200)
)
SELECT 
	COUNT(*) AS total,
	COUNT(DISTINCT code) AS distinct_count,
	MIN(length(code)) AS min_len,
	MAX(length(code)) AS max_len,
	BOOL_AND(code ~ '^XZ-[A-Z2-9]{3}-[A-Z2-9]{3}$') AS all_match_pattern
FROM gen;

-- 2) Démonstration de normalisation d'entrées diverses (sans impact BDD)
WITH inputs(raw) AS (
	VALUES ('xz-abc-123'), ('XZ ABC 123'), (' xzabc123 '), ('XZ-ABC-123'), ('XZ_abC-123')
), norm AS (
	SELECT raw,
		UPPER(REGEXP_REPLACE(raw, '[^A-Za-z0-9]', '', 'g')) AS cleaned,
		-- Reconstruire format XZ-ABC-123 si 8 caractères après nettoyage
		CASE WHEN length(UPPER(REGEXP_REPLACE(raw, '[^A-Za-z0-9]', '', 'g'))) = 8
			THEN substr(UPPER(REGEXP_REPLACE(raw, '[^A-Za-z0-9]', '', 'g')),1,2)
				|| '-' || substr(UPPER(REGEXP_REPLACE(raw, '[^A-Za-z0-9]', '', 'g')),3,3)
				|| '-' || substr(UPPER(REGEXP_REPLACE(raw, '[^A-Za-z0-9]', '', 'g')),6,3)
			ELSE NULL END AS reconstructed
	FROM inputs
)
SELECT * FROM norm;

-- 3) Insertion d'une mission SANS code pour vérifier que le trigger génère share_code
--    Cette insertion échouait si des colonnes NOT NULL (ex: vehicle_brand) manquaient.
--    On fournit ici le minimum requis et on choisit un user_id existant.
WITH any_user AS (
	SELECT COALESCE(
		(SELECT user_id FROM missions WHERE user_id IS NOT NULL LIMIT 1),
		(SELECT id FROM auth.users LIMIT 1)
	) AS uid
)
INSERT INTO missions (
	user_id,
	reference,
	status,
	vehicle_brand,
	vehicle_model,
	vehicle_type,
	pickup_address,
	delivery_address
)
SELECT 
	uid,
	'TEST-CODE-' || EXTRACT(EPOCH FROM NOW())::int,
	'pending',
	'RENAULT',
	'Clio',
	'VL',
	'Adresse départ test',
	'Adresse arrivée test'
FROM any_user
RETURNING id, share_code;

-- 4) Lire les 5 derniers codes générés
SELECT share_code, reference, created_at
FROM missions 
WHERE share_code IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;

-- 5) (Optionnel) Test de la RPC de join
-- Remplacer p_user_id par un vrai utilisateur si besoin
-- SELECT join_mission_with_code('XZ-ABC-123', '00000000-0000-0000-0000-000000000000'::uuid);