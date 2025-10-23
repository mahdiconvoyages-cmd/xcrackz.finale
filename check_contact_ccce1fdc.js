import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM'
);

async function checkContact() {
  console.log('\n🔍 Vérification du contact ccce1fdc...\n');

  // Chercher ce contact spécifique
  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', 'ccce1fdc-73b8-4e2d-a3a7-c59be8df9ea9')
    .single();

  if (contact) {
    console.log('Contact trouvé:');
    console.table({
      id: contact.id,
      email: contact.email,
      name: contact.name,
      user_id: contact.user_id,
      is_active: contact.is_active
    });

    // Vérifier à quel profil il appartient
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', contact.user_id)
      .single();

    console.log('\nProfil lié:');
    console.table({
      id: profile.id,
      email: profile.email
    });

    if (contact.email === profile.email) {
      console.log('\n✅ Contact cohérent (email = profil)');
    } else {
      console.log('\n❌ INCOHÉRENT: Contact email ≠ Profil email');
      console.log('   Contact email:', contact.email);
      console.log('   Profil email:', profile.email);
    }
  } else {
    console.log('❌ Contact ccce1fdc non trouvé');
  }

  // Afficher TOUS les contacts
  console.log('\n\n📋 TOUS les contacts:');
  const { data: allContacts } = await supabase
    .from('contacts')
    .select('id, email, name, user_id, is_active')
    .order('email');

  console.table(allContacts);
}

checkContact()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
