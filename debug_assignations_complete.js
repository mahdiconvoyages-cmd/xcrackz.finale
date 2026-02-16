import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM'
);

async function debugAssignments() {
  console.log('\n🔍 DEBUG COMPLET - Pourquoi les missions reçues ne s\'affichent pas\n');

  const mahdiConvoyagesUserId = 'c37f15d6-545a-4792-9697-de03991b4f17';
  const mahdiBenamor1994UserId = '784dd826-62ae-4d94-81a0-618953d63010';

  // 1. Vérifier les contacts
  console.log('1️⃣ CONTACTS EXISTANTS:\n');
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .order('user_id, email');
  
  console.table(contacts.map(c => ({
    id_court: c.id.substring(0, 8),
    proprietaire: c.user_id.substring(0, 8),
    email_contact: c.email,
    invited_user_id: c.invited_user_id?.substring(0, 8) || 'NULL',
    is_active: c.is_active
  })));

  // 2. Vérifier les assignations existantes
  console.log('\n2️⃣ ASSIGNATIONS EXISTANTES:\n');
  const { data: assignments } = await supabase
    .from('mission_assignments')
    .select(`
      id,
      mission_id,
      contact_id,
      user_id,
      assigned_by,
      status,
      missions(reference),
      contacts(email, user_id, invited_user_id)
    `)
    .order('assigned_at', { ascending: false })
    .limit(10);
  
  if (assignments && assignments.length > 0) {
    console.table(assignments.map(a => ({
      mission_ref: a.missions?.reference,
      contact_email: a.contacts?.email,
      user_id: a.user_id?.substring(0, 8),
      assigned_by: a.assigned_by?.substring(0, 8),
      status: a.status
    })));
  } else {
    console.log('❌ AUCUNE ASSIGNATION TROUVÉE\n');
  }

  // 3. Simuler la requête de loadReceivedAssignments pour mahdi.convoyages
  console.log('\n3️⃣ SIMULATION loadReceivedAssignments pour mahdi.convoyages:\n');
  console.log(`   User ID: ${mahdiConvoyagesUserId.substring(0, 8)}...\n`);
  
  const { data: received, error } = await supabase
    .from('mission_assignments')
    .select(`
      *,
      mission:missions(*),
      contact:contacts(*)
    `)
    .eq('user_id', mahdiConvoyagesUserId)
    .order('assigned_at', { ascending: false });
  
  console.log(`   Résultat: ${received?.length || 0} mission(s) trouvée(s)`);
  if (error) console.error('   Erreur:', error);
  
  if (received && received.length > 0) {
    console.log('\n   Détails:');
    console.table(received.map(r => ({
      mission_ref: r.mission?.reference,
      contact_email: r.contact?.email,
      user_id_match: r.user_id === mahdiConvoyagesUserId ? '✅' : '❌',
      status: r.status
    })));
  } else {
    console.log('   ❌ Aucune mission assignée avec user_id = mahdi.convoyages\n');
  }

  // 4. Vérifier s'il y a des assignations avec le mauvais user_id
  console.log('\n4️⃣ ASSIGNATIONS AVEC MAUVAIS USER_ID (contact_id au lieu de invited_user_id):\n');
  const { data: wrongAssignments } = await supabase
    .from('mission_assignments')
    .select(`
      *,
      missions(reference),
      contacts(email, user_id, invited_user_id)
    `)
    .neq('user_id', mahdiConvoyagesUserId)
    .order('assigned_at', { ascending: false });
  
  const wrongOnes = wrongAssignments?.filter(a => {
    // Vérifier si l'assignation devrait être pour mahdi.convoyages
    // (contact.invited_user_id = mahdi.convoyages mais assignation.user_id != mahdi.convoyages)
    return a.contacts?.invited_user_id === mahdiConvoyagesUserId && a.user_id !== mahdiConvoyagesUserId;
  });

  if (wrongOnes && wrongOnes.length > 0) {
    console.log(`   ⚠️ ${wrongOnes.length} assignation(s) avec mauvais user_id:\n`);
    console.table(wrongOnes.map(a => ({
      mission: a.missions?.reference,
      contact_email: a.contacts?.email,
      assignation_user_id: a.user_id?.substring(0, 8),
      invited_user_id: a.contacts?.invited_user_id?.substring(0, 8),
      probleme: 'user_id devrait être invited_user_id'
    })));
    
    console.log('\n   💡 SOLUTION: Corriger ces assignations\n');
  } else {
    console.log('   ✅ Toutes les assignations ont le bon user_id\n');
  }

  // 5. Recommandation
  console.log('\n5️⃣ DIAGNOSTIC:\n');
  
  if (!assignments || assignments.length === 0) {
    console.log('   ❌ Problème: Aucune assignation dans la base');
    console.log('   📝 Action: Créer une nouvelle assignation depuis l\'interface\n');
  } else if (!received || received.length === 0) {
    console.log('   ❌ Problème: Assignations existent mais user_id incorrect');
    console.log('   📝 Action: Corriger les assignations existantes\n');
  } else {
    console.log('   ✅ Les assignations existent avec le bon user_id');
    console.log('   📝 Vérifier le frontend (cache, RLS, etc.)\n');
  }
}

debugAssignments()
  .then(() => {
    console.log('✅ Debug terminé\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
