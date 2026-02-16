import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM'
);

async function debugMissingMissions() {
  console.log('\n🔍 DEBUG: Pourquoi les missions ne s\'affichent PAS dans l\'interface\n');

  const mahdiConvoyagesUserId = 'c37f15d6-545a-4792-9697-de03991b4f17';

  // 1. Vérifier que les assignations existent
  console.log('1️⃣ Assignations pour mahdi.convoyages dans la DB:\n');
  
  const { data: assignments, error } = await supabase
    .from('mission_assignments')
    .select(`
      id,
      mission_id,
      user_id,
      status,
      missions(reference, pickup_address, delivery_address),
      assignee:profiles!mission_assignments_user_id_fkey(email),
      assigner:profiles!mission_assignments_assigned_by_fkey(email)
    `)
    .eq('user_id', mahdiConvoyagesUserId);

  console.log(`   Résultat: ${assignments?.length || 0} mission(s)`);
  if (error) {
    console.error('   ❌ Erreur:', error);
    return;
  }

  if (assignments && assignments.length > 0) {
    console.table(assignments.map(a => ({
      id_court: a.id.substring(0, 8),
      mission: a.missions?.reference,
      pickup: a.missions?.pickup_address?.substring(0, 30) + '...',
      assignee: a.assignee?.email,
      assigner: a.assigner?.email,
      status: a.status
    })));
  }

  // 2. Vérifier s'il y a des champs NULL qui pourraient bloquer
  console.log('\n2️⃣ Vérification des champs NULL:\n');
  
  const nullFields = assignments?.filter(a => 
    !a.missions || !a.assignee || !a.assigner
  );

  if (nullFields && nullFields.length > 0) {
    console.log(`   ⚠️ ${nullFields.length} assignation(s) avec champs NULL`);
    console.table(nullFields.map(a => ({
      id: a.id.substring(0, 8),
      has_mission: !!a.missions,
      has_assignee: !!a.assignee,
      has_assigner: !!a.assigner
    })));
  } else {
    console.log('   ✅ Tous les champs sont remplis');
  }

  // 3. Tester la requête EXACTE du frontend
  console.log('\n3️⃣ Test de la requête EXACTE du frontend:\n');
  
  const { data: frontendTest, error: frontendError } = await supabase
    .from('mission_assignments')
    .select(`
      *,
      mission:missions(*),
      assignee:profiles!mission_assignments_user_id_fkey(email, id),
      assigner:profiles!mission_assignments_assigned_by_fkey(email, id)
    `)
    .eq('user_id', mahdiConvoyagesUserId)
    .order('assigned_at', { ascending: false });

  console.log(`   Résultat: ${frontendTest?.length || 0} mission(s)`);
  if (frontendError) {
    console.error('   ❌ Erreur:', frontendError);
  }

  if (frontendTest && frontendTest.length > 0) {
    console.log('\n   ✅ La requête fonctionne!\n');
    console.log('   Détails de la première mission:');
    console.log(JSON.stringify(frontendTest[0], null, 2));
  }

  // 4. Diagnostic final
  console.log('\n\n4️⃣ DIAGNOSTIC:\n');
  
  if (!assignments || assignments.length === 0) {
    console.log('   ❌ PROBLÈME: Aucune assignation dans la base');
  } else if (!frontendTest || frontendTest.length === 0) {
    console.log('   ❌ PROBLÈME: Assignations existent mais la requête frontend ne les trouve pas');
    console.log('   🔍 Vérifier les RLS policies');
  } else {
    console.log('   ✅ Les assignations existent ET la requête fonctionne');
    console.log('   🔍 Le problème est dans le FRONTEND (React)');
    console.log('   ');
    console.log('   Causes possibles:');
    console.log('   - Cache navigateur');
    console.log('   - État React non mis à jour');
    console.log('   - Condition d\'affichage incorrecte');
    console.log('   - receivedAssignments.length === 0 malgré les données');
  }
}

debugMissingMissions()
  .then(() => {
    console.log('\n✅ Debug terminé\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
