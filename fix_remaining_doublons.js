import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM'
);

async function fixDoublons() {
  console.log('\n🔧 CORRECTION DES DOUBLONS RESTANTS\n');

  // Profils attendus
  const expectedMappings = {
    'convoiexpress95@gmail.com': 'b5adbb76-c33f-45df-a236-649564f63af5',
    'mahdi.benamor1994@gmail.com': '784dd826-62ae-4d94-81a0-618953d63010',
    'mahdi.convoyages@gmail.com': 'c37f15d6-545a-4792-9697-de03991b4f17'
  };

  // Charger tous les contacts
  const { data: allContacts } = await supabase
    .from('contacts')
    .select('*')
    .order('email, created_at');

  console.log('📋 Contacts actuels:');
  console.table(allContacts.map(c => ({
    email: c.email,
    user_id_court: c.user_id.substring(0, 8) + '...',
    correct: c.user_id === expectedMappings[c.email] ? '✅' : '❌',
    created_at: c.created_at
  })));

  // Identifier et supprimer les mauvais contacts
  const wrongContacts = allContacts.filter(c => 
    c.user_id !== expectedMappings[c.email]
  );

  if (wrongContacts.length > 0) {
    console.log(`\n🗑️ Suppression de ${wrongContacts.length} mauvais contact(s):\n`);
    
    for (const contact of wrongContacts) {
      console.log(`   - ${contact.email} (user_id: ${contact.user_id.substring(0, 8)}... ❌)`);
      
      // Supprimer assignations
      const { data: deletedAssignments } = await supabase
        .from('mission_assignments')
        .delete()
        .eq('contact_id', contact.id)
        .select();
      
      console.log(`     → ${deletedAssignments?.length || 0} assignation(s) supprimée(s)`);
      
      // Supprimer contact
      await supabase
        .from('contacts')
        .delete()
        .eq('id', contact.id);
      
      console.log(`     → Contact supprimé`);
    }
  }

  // Vérifier les contacts manquants et les créer
  console.log('\n\n📝 Vérification des contacts manquants:\n');
  
  const { data: remainingContacts } = await supabase
    .from('contacts')
    .select('email, user_id');

  for (const [email, expectedUserId] of Object.entries(expectedMappings)) {
    const exists = remainingContacts.find(c => 
      c.email === email && c.user_id === expectedUserId
    );

    if (!exists) {
      console.log(`   ⚠️ Contact manquant: ${email} → Création...`);
      
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert([{
          email: email,
          name: email,
          user_id: expectedUserId,
          role: 'driver',
          is_active: true
        }])
        .select();
      
      if (error) {
        console.error(`   ❌ Erreur création ${email}:`, error);
      } else {
        console.log(`   ✅ Contact créé: ${email}`);
      }
    } else {
      console.log(`   ✅ ${email} → OK`);
    }
  }

  // État final
  console.log('\n\n✅ ÉTAT FINAL:\n');
  const { data: finalContacts } = await supabase
    .from('contacts')
    .select('id, email, user_id, is_active')
    .order('email');

  console.table(finalContacts.map(c => ({
    email: c.email,
    user_id: c.user_id,
    correct: c.user_id === expectedMappings[c.email] ? '✅' : '❌',
    is_active: c.is_active
  })));

  // Vérifier doublons
  const emailCounts = {};
  finalContacts.forEach(c => {
    emailCounts[c.email] = (emailCounts[c.email] || 0) + 1;
  });

  const doublons = Object.entries(emailCounts).filter(([_, count]) => count > 1);
  
  if (doublons.length > 0) {
    console.log('\n❌ DOUBLONS RESTANTS:', doublons);
  } else {
    console.log('\n🎉 PARFAIT - Aucun doublon, tous les contacts sont corrects!');
  }
}

fixDoublons()
  .then(() => {
    console.log('\n✅ Correction terminée\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
