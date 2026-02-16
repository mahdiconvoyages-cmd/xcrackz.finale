import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM'
);

async function fixAssignments() {
  console.log('\n🔧 CORRECTION DES ASSIGNATIONS AVEC MAUVAIS USER_ID\n');

  // 1. Récupérer toutes les assignations avec contacts
  const { data: assignments } = await supabase
    .from('mission_assignments')
    .select(`
      id,
      user_id,
      contact_id,
      contacts(email, invited_user_id)
    `);

  console.log(`📋 ${assignments.length} assignation(s) trouvée(s)\n`);

  // 2. Trouver celles où user_id != contact.invited_user_id
  const toFix = assignments.filter(a => {
    if (!a.contacts?.invited_user_id) return false;
    return a.user_id !== a.contacts.invited_user_id;
  });

  console.log(`⚠️ ${toFix.length} assignation(s) à corriger:\n`);

  if (toFix.length > 0) {
    console.table(toFix.map(a => ({
      id: a.id.substring(0, 8),
      contact_email: a.contacts.email,
      current_user_id: a.user_id?.substring(0, 8),
      should_be: a.contacts.invited_user_id?.substring(0, 8)
    })));

    // 3. Corriger chaque assignation
    console.log('\n🔄 Correction en cours...\n');
    
    for (const assignment of toFix) {
      const { error } = await supabase
        .from('mission_assignments')
        .update({ user_id: assignment.contacts.invited_user_id })
        .eq('id', assignment.id);
      
      if (error) {
        console.error(`❌ Erreur correction ${assignment.id}:`, error);
      } else {
        console.log(`✅ ${assignment.contacts.email}: ${assignment.user_id.substring(0, 8)} → ${assignment.contacts.invited_user_id.substring(0, 8)}`);
      }
    }
  }

  // 4. Vérifier le résultat
  console.log('\n\n📊 VÉRIFICATION FINALE:\n');
  
  const { data: fixed } = await supabase
    .from('mission_assignments')
    .select(`
      id,
      user_id,
      missions(reference),
      contacts(email, invited_user_id)
    `)
    .order('assigned_at', { ascending: false })
    .limit(10);

  const allCorrect = fixed.every(a => 
    !a.contacts?.invited_user_id || a.user_id === a.contacts.invited_user_id
  );

  console.table(fixed.map(a => ({
    mission: a.missions?.reference,
    contact: a.contacts?.email,
    user_id: a.user_id?.substring(0, 8),
    invited_id: a.contacts?.invited_user_id?.substring(0, 8) || 'NULL',
    coherent: (!a.contacts?.invited_user_id || a.user_id === a.contacts.invited_user_id) ? '✅' : '❌'
  })));

  if (allCorrect) {
    console.log('\n🎉 PARFAIT! Toutes les assignations sont cohérentes!\n');
  } else {
    console.log('\n⚠️ Il reste des incohérences\n');
  }
}

fixAssignments()
  .then(() => {
    console.log('✅ Correction terminée\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
