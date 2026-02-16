import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM'
);

async function radicalSolution() {
  console.log('\n🔥 SOLUTION RADICALE - SIMPLIFICATION TOTALE\n');
  console.log('Au lieu d\'utiliser la table contacts, on va utiliser directement profiles\n');

  // 1. Modifier la structure des assignations
  console.log('1️⃣ Modification de mission_assignments pour ne plus dépendre de contacts\n');
  
  // Ajouter une colonne assignee_email si elle n'existe pas
  console.log('   📝 Structure actuelle de mission_assignments:');
  const { data: assignments } = await supabase
    .from('mission_assignments')
    .select('*')
    .limit(1);
  
  if (assignments && assignments.length > 0) {
    console.log('   Colonnes:', Object.keys(assignments[0]).join(', '));
  }

  // 2. Plan de migration
  console.log('\n\n2️⃣ PLAN DE MIGRATION:\n');
  console.log('   A. Garder mission_assignments.user_id (ID du profil assigné)');
  console.log('   B. Garder mission_assignments.contact_id (pour historique)');
  console.log('   C. Dans le frontend, charger directement depuis profiles au lieu de contacts\n');

  // 3. Test : charger les missions pour mahdi.convoyages DIRECTEMENT
  const mahdiConvoyagesUserId = 'c37f15d6-545a-4792-9697-de03991b4f17';
  
  console.log('3️⃣ TEST : Charger missions pour mahdi.convoyages SANS passer par contacts:\n');
  
  const { data: missions, error } = await supabase
    .from('mission_assignments')
    .select(`
      *,
      mission:missions(*),
      assignee:profiles!mission_assignments_user_id_fkey(email, id),
      assigner:profiles!mission_assignments_assigned_by_fkey(email, id)
    `)
    .eq('user_id', mahdiConvoyagesUserId);
  
  console.log(`   Résultat: ${missions?.length || 0} mission(s)`);
  if (error) console.error('   Erreur:', error);
  
  if (missions && missions.length > 0) {
    console.log('\n   ✅ MISSION TROUVÉE!\n');
    console.table(missions.map(m => ({
      mission: m.mission?.reference,
      assignee: m.assignee?.email,
      assigner: m.assigner?.email,
      status: m.status
    })));
    console.log('\n   🎉 Cette requête FONCTIONNE!\n');
  } else {
    console.log('   ❌ Aucune mission (vérifier RLS)\n');
  }

  // 4. Solution pour le frontend
  console.log('\n4️⃣ SOLUTION FRONTEND:\n');
  console.log('   Dans TeamMissions.tsx:');
  console.log('   ');
  console.log('   // Au lieu de charger contacts:');
  console.log('   const loadContacts = async () => {');
  console.log('     const { data } = await supabase');
  console.log('       .from(\'profiles\')  // ✅ Directement profiles');
  console.log('       .select(\'id, email\')');
  console.log('       .neq(\'id\', user.id);  // Tous sauf soi-même');
  console.log('     setContacts(data);');
  console.log('   };\n');
  console.log('   ');
  console.log('   // Pour assigner:');
  console.log('   const insertData = {');
  console.log('     mission_id: selectedMission.id,');
  console.log('     contact_id: null,  // ❌ On s\'en fout');
  console.log('     user_id: selectedProfileId,  // ✅ Directement l\'ID du profil');
  console.log('     assigned_by: user.id');
  console.log('   };\n');
  console.log('   ');
  console.log('   // Pour charger missions reçues:');
  console.log('   const { data } = await supabase');
  console.log('     .from(\'mission_assignments\')');
  console.log('     .select(\'*, mission:missions(*), assignee:profiles!mission_assignments_user_id_fkey(*)\')');
  console.log('     .eq(\'user_id\', user.id);\n');

  console.log('\n5️⃣ AVANTAGES:\n');
  console.log('   ✅ Plus de doublon de contacts');
  console.log('   ✅ Plus de invited_user_id vs user_id');
  console.log('   ✅ Une seule source de vérité : profiles');
  console.log('   ✅ Système ultra-simple et robuste\n');

  console.log('\n💡 DOIS-JE IMPLÉMENTER CETTE SOLUTION ?\n');
}

radicalSolution()
  .then(() => {
    console.log('✅ Analyse terminée\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
