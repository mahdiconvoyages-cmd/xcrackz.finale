import { createClient } from '@supabase/supabase-js';

// Connexion avec Service Role Key (bypass RLS)
const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM'
);

async function fixDatabase() {
  console.log('\n🔍 ===== DIAGNOSTIC COMPLET =====\n');

  // ========================================
  // ÉTAPE 1: Voir TOUS les profils
  // ========================================
  console.log('1️⃣ TOUS les profils Auth:');
  const { data: profiles, error: errProfiles } = await supabase
    .from('profiles')
    .select('id, email, created_at')
    .order('email');
  
  if (errProfiles) {
    console.error('❌ Erreur profiles:', errProfiles);
    return;
  }
  console.table(profiles);

  // ========================================
  // ÉTAPE 2: Voir TOUS les contacts
  // ========================================
  console.log('\n2️⃣ TOUS les contacts:');
  const { data: contacts, error: errContacts } = await supabase
    .from('contacts')
    .select('id, email, name, user_id, is_active, created_at')
    .order('email');
  
  if (errContacts) {
    console.error('❌ Erreur contacts:', errContacts);
    return;
  }
  console.table(contacts);

  // ========================================
  // ÉTAPE 3: Contacts en doublon
  // ========================================
  console.log('\n3️⃣ Contacts en doublon (groupés par email):');
  const contactsByEmail = {};
  contacts.forEach(c => {
    if (!contactsByEmail[c.email]) contactsByEmail[c.email] = [];
    contactsByEmail[c.email].push(c);
  });
  
  Object.entries(contactsByEmail).forEach(([email, list]) => {
    if (list.length > 1) {
      console.log(`\n❌ DOUBLON: ${email} (${list.length} contacts)`);
      console.table(list);
    }
  });

  // ========================================
  // ÉTAPE 4: Focus mahdi.convoyages
  // ========================================
  console.log('\n4️⃣ Focus mahdi.convoyages@gmail.com:');
  const mahdilConvoyages = contacts.filter(c => c.email === 'mahdi.convoyages@gmail.com');
  const mahdilProfile = profiles.find(p => p.email === 'mahdi.convoyages@gmail.com');
  
  console.log('Profil:', mahdilProfile);
  console.log('Contacts trouvés:', mahdilConvoyages.length);
  console.table(mahdilConvoyages);

  // ========================================
  // ÉTAPE 5: Voir assignations existantes
  // ========================================
  console.log('\n5️⃣ Assignations existantes:');
  const { data: assignments } = await supabase
    .from('mission_assignments')
    .select(`
      id,
      mission_id,
      contact_id,
      user_id,
      assigned_by,
      assigned_at,
      contacts(email, user_id)
    `)
    .order('assigned_at', { ascending: false })
    .limit(10);
  
  console.table(assignments);

  // ========================================
  // ÉTAPE 6: CORRECTION - Supprimer mauvais contacts
  // ========================================
  console.log('\n\n🔧 ===== CORRECTION EN COURS =====\n');

  const correctUserId = 'c37f15d6-545a-4792-9697-de03991b4f17';
  const wrongContactIds = mahdilConvoyages
    .filter(c => c.user_id !== correctUserId)
    .map(c => c.id);

  if (wrongContactIds.length > 0) {
    console.log(`6️⃣ Suppression de ${wrongContactIds.length} mauvais contact(s):`);
    console.log('IDs à supprimer:', wrongContactIds);

    // Supprimer assignations liées
    const { data: deletedAssignments, error: errAssign } = await supabase
      .from('mission_assignments')
      .delete()
      .in('contact_id', wrongContactIds)
      .select();
    
    console.log(`   ✅ ${deletedAssignments?.length || 0} assignations supprimées`);
    if (errAssign) console.error('   ❌ Erreur assignations:', errAssign);

    // Supprimer contacts
    const { data: deletedContacts, error: errContact } = await supabase
      .from('contacts')
      .delete()
      .in('id', wrongContactIds)
      .select();
    
    console.log(`   ✅ ${deletedContacts?.length || 0} contacts supprimés`);
    if (errContact) console.error('   ❌ Erreur contacts:', errContact);
  } else {
    console.log('6️⃣ Aucun mauvais contact à supprimer ✅');
  }

  // ========================================
  // ÉTAPE 7: Vérifier qu'il reste UN SEUL contact correct
  // ========================================
  console.log('\n7️⃣ Vérification du contact mahdi.convoyages:');
  const { data: finalContacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('email', 'mahdi.convoyages@gmail.com');
  
  console.table(finalContacts);

  if (finalContacts.length === 0) {
    console.log('\n⚠️ Aucun contact trouvé - Création...');
    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert([{
        email: 'mahdi.convoyages@gmail.com',
        name: 'Mahdi Convoyages',
        user_id: correctUserId,
        role: 'driver',
        is_active: true
      }])
      .select();
    
    if (error) {
      console.error('❌ Erreur création:', error);
    } else {
      console.log('✅ Contact créé:', newContact);
    }
  } else if (finalContacts.length === 1) {
    const contact = finalContacts[0];
    if (contact.user_id === correctUserId) {
      console.log('✅ PARFAIT - 1 seul contact avec le BON user_id');
    } else {
      console.log('❌ ERREUR - Contact avec mauvais user_id:', contact.user_id);
    }
  } else {
    console.log(`❌ ERREUR - ${finalContacts.length} contacts trouvés (devrait être 1)`);
  }

  // ========================================
  // ÉTAPE 8: Vérifier TOUS les contacts (1 par email)
  // ========================================
  console.log('\n\n8️⃣ ÉTAT FINAL - Tous les contacts:');
  const { data: allFinalContacts } = await supabase
    .from('contacts')
    .select('id, email, user_id, is_active')
    .order('email');
  
  console.table(allFinalContacts);

  // Vérifier doublons
  const finalEmailCounts = {};
  allFinalContacts.forEach(c => {
    finalEmailCounts[c.email] = (finalEmailCounts[c.email] || 0) + 1;
  });

  console.log('\n9️⃣ Nombre de contacts par email:');
  console.table(finalEmailCounts);

  const doublons = Object.entries(finalEmailCounts).filter(([_, count]) => count > 1);
  if (doublons.length > 0) {
    console.log('\n❌ DOUBLONS RESTANTS:', doublons);
  } else {
    console.log('\n✅ AUCUN DOUBLON - Base de données propre!');
  }

  console.log('\n\n🎉 ===== CORRECTION TERMINÉE =====\n');
}

fixDatabase()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
