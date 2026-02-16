import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM'
);

const profiles = {
  convoiexpress95: { id: 'b5adbb76-c33f-45df-a236-649564f63af5', email: 'convoiexpress95@gmail.com' },
  mahdibenamor: { id: '784dd826-62ae-4d94-81a0-618953d63010', email: 'mahdi.benamor1994@gmail.com' },
  mahdiconvoyages: { id: 'c37f15d6-545a-4792-9697-de03991b4f17', email: 'mahdi.convoyages@gmail.com' }
};

async function setupCollaborativeContacts() {
  console.log('\n🔧 CONFIGURATION CONTACTS POUR SYSTÈME COLLABORATIF\n');

  // Supprimer TOUS les contacts existants
  const { data: allContacts } = await supabase.from('contacts').select('id');
  for (const contact of allContacts) {
    await supabase.from('mission_assignments').delete().eq('contact_id', contact.id);
    await supabase.from('contacts').delete().eq('id', contact.id);
  }
  console.log(`✅ ${allContacts.length} contacts supprimés\n`);

  // Créer les contacts croisés
  const contactsToCreate = [
    // mahdi.benamor1994 a dans sa liste:
    {
      user_id: profiles.mahdibenamor.id,  // Propriétaire de la liste
      email: profiles.mahdiconvoyages.email,  // Email du contact
      name: 'Mahdi Convoyages',
      invited_user_id: profiles.mahdiconvoyages.id,  // ID du profil du contact
      type: 'customer',
      role: 'driver',
      is_active: true
    },
    {
      user_id: profiles.mahdibenamor.id,
      email: profiles.convoiexpress95.email,
      name: 'Convoi Express 95',
      invited_user_id: profiles.convoiexpress95.id,
      type: 'customer',
      role: 'driver',
      is_active: true
    },
    
    // mahdi.convoyages a dans sa liste:
    {
      user_id: profiles.mahdiconvoyages.id,
      email: profiles.mahdibenamor.email,
      name: 'Mahdi Ben Amor',
      invited_user_id: profiles.mahdibenamor.id,
      type: 'customer',
      role: 'driver',
      is_active: true
    },
    {
      user_id: profiles.mahdiconvoyages.id,
      email: profiles.convoiexpress95.email,
      name: 'Convoi Express 95',
      invited_user_id: profiles.convoiexpress95.id,
      type: 'customer',
      role: 'driver',
      is_active: true
    },
    
    // convoiexpress95 a dans sa liste:
    {
      user_id: profiles.convoiexpress95.id,
      email: profiles.mahdibenamor.email,
      name: 'Mahdi Ben Amor',
      invited_user_id: profiles.mahdibenamor.id,
      type: 'customer',
      role: 'driver',
      is_active: true
    },
    {
      user_id: profiles.convoiexpress95.id,
      email: profiles.mahdiconvoyages.email,
      name: 'Mahdi Convoyages',
      invited_user_id: profiles.mahdiconvoyages.id,
      type: 'customer',
      role: 'driver',
      is_active: true
    }
  ];

  console.log('📝 Création de 6 contacts (2 par utilisateur):\n');
  
  for (const contact of contactsToCreate) {
    const { data, error } = await supabase
      .from('contacts')
      .insert([contact])
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Erreur:`, error);
    } else {
      const owner = Object.values(profiles).find(p => p.id === contact.user_id);
      console.log(`✅ ${owner?.email} peut maintenant assigner à ${contact.email}`);
    }
  }

  // Vérifier
  console.log('\n\n📋 ÉTAT FINAL:\n');
  const { data: finalContacts } = await supabase
    .from('contacts')
    .select('*')
    .order('user_id, email');

  const grouped = {};
  finalContacts.forEach(c => {
    const owner = Object.values(profiles).find(p => p.id === c.user_id);
    if (!grouped[owner?.email]) grouped[owner.email] = [];
    grouped[owner.email].push(c.email);
  });

  Object.entries(grouped).forEach(([owner, contacts]) => {
    console.log(`${owner} peut assigner à:`);
    contacts.forEach(c => console.log(`  - ${c}`));
    console.log();
  });

  console.log('🎉 Configuration terminée!\n');
}

setupCollaborativeContacts()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
