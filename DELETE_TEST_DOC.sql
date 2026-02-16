-- Supprimer le document test
DELETE FROM inspection_documents 
WHERE id = '368a0d08-9c4e-4518-805b-ac29bc78a318';

-- Vérifier
SELECT * FROM inspection_documents ORDER BY created_at DESC LIMIT 5;
