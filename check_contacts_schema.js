import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM'
);

async function checkSchema() {
  console.log('\n🔍 ANALYSE DE LA STRUCTURE DE LA TABLE CONTACTS\n');

  // Récupérer un exemple de contact
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .limit(1);

  if (contacts && contacts.length > 0) {
    console.log('Structure d\'un contact:');
    console.log(JSON.stringify(contacts[0], null, 2));
    console.log('\nColonnes disponibles:', Object.keys(contacts[0]));
  }

  // Vérifier s'il existe une colonne "owner_id" ou similaire
  const { data: allContacts } = await supabase
    .from('contacts')
    .select('*')
    .limit(5);

  console.log('\n\n📋 Exemples de contacts:');
  console.table(allContacts?.map(c => ({
    id: c.id?.substring(0, 8) + '...',
    email: c.email,
    name: c.name,
    user_id: c.user_id?.substring(0, 8) + '...',
    invited_by: c.invited_by?.substring(0, 8) + '...' || 'null',
    type: c.type
  })));

  console.log('\n\n💡 QUESTION CLÉ:');
  console.log('Que représente contact.user_id ?');
  console.log('  Option A: ID du propriétaire de la liste de contacts (celui qui a ajouté ce contact)');
  console.log('  Option B: ID du profil de la personne contactée (le contact lui-même)');
}

checkSchema()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
