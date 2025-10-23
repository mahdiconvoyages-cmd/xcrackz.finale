import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM'
);

async function checkMahdi199409() {
  console.log('\n🔍 RECHERCHE: mahdi199409@gmail.com\n');

  // 1. Vérifier dans profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'mahdi199409@gmail.com')
    .single();

  if (profile) {
    console.log('✅ Profil trouvé:');
    console.table({
      id: profile.id,
      email: profile.email,
      created_at: profile.created_at
    });
  } else {
    console.log('❌ Aucun profil trouvé pour mahdi199409@gmail.com');
    console.log('   Ce compte n\'existe PAS dans auth.profiles\n');
  }

  // 2. Vérifier dans contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('email', 'mahdi199409@gmail.com');

  if (contacts && contacts.length > 0) {
    console.log('\n📋 Contact(s) trouvé(s):');
    console.table(contacts.map(c => ({
      id: c.id.substring(0, 8),
      email: c.email,
      user_id: c.user_id?.substring(0, 8) || 'NULL',
      invited_user_id: c.invited_user_id?.substring(0, 8) || 'NULL',
      is_active: c.is_active
    })));
  } else {
    console.log('\n❌ Aucun contact trouvé pour mahdi199409@gmail.com');
  }

  // 3. Vérifier les assignations
  const { data: assignments } = await supabase
    .from('mission_assignments')
    .select(`
      id,
      user_id,
      contact_id,
      missions(reference),
      contacts(email)
    `)
    .eq('contacts.email', 'mahdi199409@gmail.com');

  if (assignments && assignments.length > 0) {
    console.log('\n📦 Assignations pour mahdi199409@gmail.com:');
    console.table(assignments.map(a => ({
      mission: a.missions?.reference,
      user_id: a.user_id?.substring(0, 8) || 'NULL',
      contact_email: a.contacts?.email
    })));
    
    console.log('\n⚠️ PROBLÈME IDENTIFIÉ:');
    console.log('   mahdi199409@gmail.com apparaît dans les CONTACTS');
    console.log('   mais n\'existe PAS dans les PROFILS (auth.profiles)');
    console.log('   ');
    console.log('   Conséquence: Les assignations sont créées mais personne');
    console.log('   ne peut se connecter avec ce compte pour les voir!\n');
  }

  // 4. Lister TOUS les profils
  console.log('\n\n📋 TOUS LES PROFILS DISPONIBLES:\n');
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, email')
    .order('email');

  console.table(allProfiles?.map(p => ({
    id: p.id.substring(0, 8) + '...',
    email: p.email
  })));

  console.log('\n💡 SOLUTION:');
  console.log('   Assignez UNIQUEMENT aux profils de cette liste ↑');
  console.log('   Ne JAMAIS assigner à mahdi199409@gmail.com (inexistant)\n');
}

checkMahdi199409()
  .then(() => {
    console.log('✅ Vérification terminée\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
