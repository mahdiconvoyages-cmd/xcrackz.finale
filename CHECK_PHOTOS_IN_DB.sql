-- ============================================
-- VÉRIFIER LES PHOTOS DANS LA BASE DE DONNÉES
-- ============================================

-- 1. Compter les photos par inspection
SELECT 
    'Total photos' as info,
    COUNT(*) as count
FROM inspection_photos;

-- 2. Voir les dernières photos uploadées
SELECT 
    id,
    inspection_id,
    photo_type,
    photo_url,
    created_at
FROM inspection_photos
ORDER BY created_at DESC
LIMIT 10;

-- 3. Vérifier les photos par type d'inspection
SELECT 
    vi.inspection_type,
    COUNT(ip.id) as photo_count
FROM vehicle_inspections vi
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
GROUP BY vi.inspection_type;

-- 4. Lister les inspections avec leurs photos
SELECT 
    vi.id as inspection_id,
    vi.inspection_type,
    vi.created_at as inspection_date,
    m.reference as mission_ref,
    COUNT(ip.id) as photo_count,
    string_agg(ip.photo_type, ', ') as photo_types
FROM vehicle_inspections vi
LEFT JOIN missions m ON m.id = vi.mission_id
LEFT JOIN inspection_photos ip ON ip.inspection_id = vi.id
GROUP BY vi.id, vi.inspection_type, vi.created_at, m.reference
ORDER BY vi.created_at DESC
LIMIT 20;

-- 5. Vérifier le format des URLs
SELECT 
    photo_url,
    CASE 
        WHEN photo_url LIKE 'http%' THEN '✅ URL complète'
        WHEN photo_url LIKE 'inspections/%' THEN '⚠️ Path seulement'
        ELSE '❌ Format inconnu'
    END as url_format,
    created_at
FROM inspection_photos
ORDER BY created_at DESC
LIMIT 10;
