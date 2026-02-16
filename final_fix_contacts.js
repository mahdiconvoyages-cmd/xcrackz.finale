import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM'
);

async function finalFix() {
  console.log('\n🔧 CORRECTION DÉFINITIVE FINALE\n');

  const correctMappings = {
    'convoiexpress95@gmail.com': 'b5adbb76-c33f-45df-a236-649564f63af5',
    'mahdi.benamor1994@gmail.com': '784dd826-62ae-4d94-81a0-618953d63010',
    'mahdi.convoyages@gmail.com': 'c37f15d6-545a-4792-9697-de03991b4f17'
  };

  // ÉTAPE 1: Supprimer TOUS les contacts
  console.log('1️⃣ Suppression de TOUS les contacts...');
  const { data: allContacts } = await supabase
    .from('contacts')
    .select('id');
  
  for (const contact of allContacts) {
    // Supprimer assignations
    await supabase
      .from('mission_assignments')
      .delete()
      .eq('contact_id', contact.id);
    
    // Supprimer contact
    await supabase
      .from('contacts')
      .delete()
      .eq('id', contact.id);
  }
  
  console.log(`   ✅ ${allContacts.length} contacts supprimés\n`);

  // ÉTAPE 2: Recréer les 3 contacts CORRECTS
  console.log('2️⃣ Création des 3 contacts corrects...\n');
  
  for (const [email, userId] of Object.entries(correctMappings)) {
    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert([{
        email: email,
        name: email.split('@')[0],
        user_id: userId,
        role: 'driver',
        is_active: true
      }])
      .select()
      .single();
    
    if (error) {
      console.error(`   ❌ Erreur ${email}:`, error);
    } else {
      console.log(`   ✅ ${email}`);
      console.log(`      ID: ${newContact.id}`);
      console.log(`      user_id: ${userId}\n`);
    }
  }

  // ÉTAPE 3: Vérifier l'état final
  console.log('\n3️⃣ VÉRIFICATION FINALE:\n');
  const { data: finalContacts } = await supabase
    .from('contacts')
    .select(`
      id,
      email,
      name,
      user_id,
      profiles:user_id (email)
    `)
    .order('email');

  console.table(finalContacts.map(c => ({
    email: c.email,
    user_id_short: c.user_id.substring(0, 8) + '...',
    profile_email: c.profiles?.email || 'N/A',
    coherent: c.email === c.profiles?.email ? '✅' : '❌'
  })));

  const allCoherent = finalContacts.every(c => c.email === c.profiles?.email);
  
  if (allCoherent && finalContacts.length === 3) {
    console.log('\n🎉 PARFAIT! Tous les contacts sont corrects et cohérents!');
  } else {
    console.log('\n❌ Problème persistant');
  }
}

finalFix()
  .then(() => {
    console.log('\n✅ Script terminé\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
