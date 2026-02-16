import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM'
);

async function fixMahdi199409Assignments() {
  console.log('\n🔧 CORRECTION DES ASSIGNATIONS POUR mahdi199409@gmail.com\n');

  const correctUserId = '427508b8-95a6-4801-9238-04150e185d22';

  // 1. Trouver toutes les assignations incorrectes
  const { data: wrongAssignments } = await supabase
    .from('mission_assignments')
    .select(`
      id,
      user_id,
      missions(reference),
      contacts(email)
    `)
    .eq('contacts.email', 'mahdi199409@gmail.com')
    .neq('user_id', correctUserId);

  if (wrongAssignments && wrongAssignments.length > 0) {
    console.log(`⚠️ ${wrongAssignments.length} assignation(s) avec mauvais user_id:\n`);
    console.table(wrongAssignments.map(a => ({
      id: a.id.substring(0, 8),
      mission: a.missions?.reference,
      current_user_id: a.user_id?.substring(0, 8),
      should_be: correctUserId.substring(0, 8)
    })));

    // 2. Corriger chaque assignation
    console.log('\n🔄 Correction en cours...\n');
    
    for (const assignment of wrongAssignments) {
      const { error } = await supabase
        .from('mission_assignments')
        .update({ user_id: correctUserId })
        .eq('id', assignment.id);
      
      if (error) {
        console.error(`❌ Erreur ${assignment.id}:`, error);
      } else {
        console.log(`✅ ${assignment.missions?.reference}: ${assignment.user_id.substring(0, 8)} → ${correctUserId.substring(0, 8)}`);
      }
    }
  } else {
    console.log('✅ Toutes les assignations ont déjà le bon user_id');
  }

  // 3. Vérifier le résultat
  console.log('\n\n📊 VÉRIFICATION FINALE:\n');
  
  const { data: allAssignments } = await supabase
    .from('mission_assignments')
    .select(`
      id,
      user_id,
      missions(reference),
      assignee:profiles!mission_assignments_user_id_fkey(email)
    `)
    .eq('user_id', correctUserId);

  console.log(`mahdi199409@gmail.com devrait voir ${allAssignments?.length || 0} mission(s):\n`);
  
  if (allAssignments && allAssignments.length > 0) {
    console.table(allAssignments.map(a => ({
      mission: a.missions?.reference,
      assignee: a.assignee?.email,
      user_id_ok: a.user_id === correctUserId ? '✅' : '❌'
    })));
    
    console.log('\n🎉 PARFAIT! mahdi199409@gmail.com peut maintenant se connecter');
    console.log(`   et voir ces ${allAssignments.length} mission(s) dans "Mes Missions"\n`);
  }
}

fixMahdi199409Assignments()
  .then(() => {
    console.log('✅ Correction terminée\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
