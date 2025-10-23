import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM'
);

async function verifyWhoSeesWhat() {
  console.log('\n🔍 VÉRIFICATION: Qui devrait voir quelles missions\n');

  const users = {
    mahdiConvoyages: { id: 'c37f15d6-545a-4792-9697-de03991b4f17', email: 'mahdi.convoyages@gmail.com' },
    mahdiBenamor: { id: '784dd826-62ae-4d94-81a0-618953d63010', email: 'mahdi.benamor1994@gmail.com' },
    convoiExpress: { id: 'b5adbb76-c33f-45df-a236-649564f63af5', email: 'convoiexpress95@gmail.com' }
  };

  // Toutes les assignations
  const { data: allAssignments } = await supabase
    .from('mission_assignments')
    .select(`
      id,
      user_id,
      assigned_by,
      status,
      missions(reference, user_id)
    `)
    .order('assigned_at', { ascending: false });

  console.log('📋 TOUTES LES ASSIGNATIONS:\n');
  console.table(allAssignments?.map(a => ({
    mission: a.missions?.reference,
    assigné_à: Object.values(users).find(u => u.id === a.user_id)?.email || 'INCONNU',
    assigné_par: Object.values(users).find(u => u.id === a.assigned_by)?.email || 'INCONNU',
    mission_owner: Object.values(users).find(u => u.id === a.missions?.user_id)?.email || 'INCONNU',
    status: a.status
  })));

  // Pour chaque utilisateur
  for (const [name, user] of Object.entries(users)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${user.email.toUpperCase()}`);
    console.log(`${'='.repeat(60)}\n`);

    // 1. Missions créées par cet utilisateur
    const { data: ownedMissions } = await supabase
      .from('missions')
      .select('id, reference')
      .eq('user_id', user.id);

    console.log(`1️⃣ Missions CRÉÉES par ${user.email}:`);
    console.log(`   ${ownedMissions?.length || 0} mission(s)`);
    if (ownedMissions && ownedMissions.length > 0) {
      ownedMissions.forEach(m => console.log(`   - ${m.reference}`));
    }

    // 2. Missions ASSIGNÉES À cet utilisateur
    const { data: receivedAssignments } = await supabase
      .from('mission_assignments')
      .select(`
        id,
        missions(reference),
        assigner:profiles!mission_assignments_assigned_by_fkey(email)
      `)
      .eq('user_id', user.id);

    console.log(`\n2️⃣ Missions ASSIGNÉES À ${user.email}:`);
    console.log(`   ${receivedAssignments?.length || 0} mission(s)`);
    if (receivedAssignments && receivedAssignments.length > 0) {
      receivedAssignments.forEach(a => {
        console.log(`   - ${a.missions?.reference} (par ${a.assigner?.email})`);
      });
    }

    // 3. Missions qu'il a ASSIGNÉES à d'autres
    const { data: givenAssignments } = await supabase
      .from('mission_assignments')
      .select(`
        id,
        missions(reference),
        assignee:profiles!mission_assignments_user_id_fkey(email)
      `)
      .eq('assigned_by', user.id);

    console.log(`\n3️⃣ Missions ASSIGNÉES PAR ${user.email}:`);
    console.log(`   ${givenAssignments?.length || 0} assignation(s)`);
    if (givenAssignments && givenAssignments.length > 0) {
      givenAssignments.forEach(a => {
        console.log(`   - ${a.missions?.reference} (à ${a.assignee?.email})`);
      });
    }
  }

  console.log('\n\n💡 CONCLUSION:\n');
  console.log('Dans l\'onglet "Mes Missions" (received), chaque utilisateur devrait voir');
  console.log('UNIQUEMENT les missions de la section "2️⃣ Missions ASSIGNÉES À..."');
}

verifyWhoSeesWhat()
  .then(() => {
    console.log('\n✅ Vérification terminée\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
