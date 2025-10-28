-- ============================================
-- TEST AVEC LE VRAI CODE
-- ============================================

SELECT join_mission_with_code(
    'XZ-UZ6-37L',
    '784dd826-62ae-4d94-81a0-618953d63010'::uuid
) as resultat;
