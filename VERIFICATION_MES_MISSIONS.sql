-- ✅ VÉRIFICATION FINALE: Mes Missions devrait fonctionner

-- Remplacez par votre email
SELECT 
  '✅ Vos contacts' as info,
  c.id as contact_id,
  c.name as nom,
  c.email,
  COUNT(ma.id) as missions_assignees
FROM contacts c
LEFT JOIN mission_assignments ma ON ma.contact_id = c.id
WHERE c.user_id = (SELECT id FROM profiles WHERE email = 'convoiexpress95@gmail.com')  -- ⚠️ VOTRE EMAIL ICI
GROUP BY c.id, c.name, c.email
ORDER BY missions_assignees DESC;

-- Résultat attendu:
-- Si vous avez 2 contacts et 3 missions totales:
-- Contact A: 2 missions
-- Contact B: 1 mission
-- → "Mes Missions" devrait afficher les 3 missions !
