-- 🔍 TEST ASSIGNATION - RÉSULTAT UNIQUE
-- Copier/coller dans Supabase SQL Editor

SELECT 
  '🔍 DIAGNOSTIC ASSIGNATION' as titre,
  
  -- 1. Table existe ?
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'mission_assignments') as colonnes_table,
  
  -- 2. RLS actif ?
  (SELECT rowsecurity FROM pg_tables 
   WHERE tablename = 'mission_assignments') as rls_actif,
  
  -- 3. Nombre de policies
  (SELECT COUNT(*) FROM pg_policies 
   WHERE tablename = 'mission_assignments') as nombre_policies,
  
  -- 4. Nombre de missions
  (SELECT COUNT(*) FROM missions) as missions_total,
  
  -- 5. Nombre de contacts
  (SELECT COUNT(*) FROM contacts) as contacts_total,
  
  -- 6. Nombre d'assignations existantes
  (SELECT COUNT(*) FROM mission_assignments) as assignations_existantes,
  
  -- 7. Diagnostic
  CASE 
    WHEN (SELECT COUNT(*) FROM contacts) = 0 
    THEN '❌ PROBLÈME: Aucun contact créé - Créez des contacts dans TeamMissions > Équipe'
    WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'mission_assignments') = 0
    THEN '❌ PROBLÈME: Table mission_assignments n''existe pas'
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'mission_assignments') < 4
    THEN '⚠️ ATTENTION: Policies RLS incomplètes'
    ELSE '✅ Configuration OK - Vérifiez erreurs JavaScript dans Console'
  END as diagnostic;
