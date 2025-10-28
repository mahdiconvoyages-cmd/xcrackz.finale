-- Obtenir les codes de missions valides pour tester
SELECT 
    share_code as "Code à tester",
    reference as "Référence",
    status as "Statut",
    user_id as "Créateur ID",
    assigned_to_user_id as "Assigné à",
    CASE 
        WHEN assigned_to_user_id IS NULL THEN '✅ Disponible'
        ELSE '⚠️ Déjà assignée'
    END as "Disponibilité"
FROM missions
WHERE share_code IS NOT NULL
AND status NOT IN ('cancelled', 'completed')
ORDER BY created_at DESC
LIMIT 10;
