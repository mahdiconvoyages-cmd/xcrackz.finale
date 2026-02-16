import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM'
);

async function watchAssignments() {
  console.log('\n🔍 SURVEILLANCE DES ASSIGNATIONS EN TEMPS RÉEL\n');
  
  setInterval(async () => {
    const { data: assignments } = await supabase
      .from('mission_assignments')
      .select(`
        id,
        user_id,
        assigned_by,
        assigned_at,
        missions(reference),
        assignee:profiles!mission_assignments_user_id_fkey(email),
        assigner:profiles!mission_assignments_assigned_by_fkey(email)
      `)
      .order('assigned_at', { ascending: false })
      .limit(5);

    console.clear();
    console.log('\n🔍 5 DERNIÈRES ASSIGNATIONS (rafraîchi toutes les 3 secondes)\n');
    console.log('Heure:', new Date().toLocaleTimeString('fr-FR'));
    console.log('\n');
    
    if (assignments && assignments.length > 0) {
      console.table(assignments.map(a => ({
        mission: a.missions?.reference,
        assigné_à: a.assignee?.email,
        assigné_par: a.assigner?.email,
        auto_assignation: a.user_id === a.assigned_by ? '⚠️ OUI' : '✅ NON',
        heure: new Date(a.assigned_at).toLocaleTimeString('fr-FR')
      })));
    }
    
    console.log('\n💡 Instructions:');
    console.log('   1. Dans votre navigateur, créez une nouvelle assignation');
    console.log('   2. Observez si elle apparaît ici');
    console.log('   3. Vérifiez le champ "assigné_à"');
    console.log('   4. Appuyez sur CTRL+C pour arrêter');
  }, 3000);
}

watchAssignments();
