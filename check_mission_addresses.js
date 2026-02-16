import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM'
);

async function checkMissionAddresses() {
  console.log('\n🔍 VÉRIFICATION DES ADRESSES DES MISSIONS ASSIGNÉES\n');

  const mahdi199409UserId = '427508b8-95a6-4801-9238-04150e185d22';

  const { data: assignments } = await supabase
    .from('mission_assignments')
    .select(`
      id,
      missions(
        reference,
        pickup_address,
        delivery_address,
        pickup_date,
        delivery_date,
        vehicle_brand,
        vehicle_model,
        status
      )
    `)
    .eq('user_id', mahdi199409UserId);

  console.log(`📦 ${assignments?.length || 0} mission(s) assignée(s) à mahdi199409@gmail.com\n`);

  if (assignments && assignments.length > 0) {
    console.table(assignments.map(a => ({
      référence: a.missions?.reference,
      pickup: a.missions?.pickup_address?.substring(0, 40) || '❌ NULL',
      delivery: a.missions?.delivery_address?.substring(0, 40) || '❌ NULL',
      pickup_date: a.missions?.pickup_date || '❌ NULL',
      véhicule: `${a.missions?.vehicle_brand || '?'} ${a.missions?.vehicle_model || '?'}`,
      status: a.missions?.status
    })));

    // Compter les missions avec adresses manquantes
    const missingPickup = assignments.filter(a => !a.missions?.pickup_address).length;
    const missingDelivery = assignments.filter(a => !a.missions?.delivery_address).length;

    console.log('\n📊 STATISTIQUES:');
    console.log(`   ${missingPickup} mission(s) sans adresse de départ`);
    console.log(`   ${missingDelivery} mission(s) sans adresse d'arrivée\n`);

    if (missingPickup > 0 || missingDelivery > 0) {
      console.log('⚠️ PROBLÈME IDENTIFIÉ:');
      console.log('   Ces missions ont été créées avec des adresses NULL/vides');
      console.log('   ');
      console.log('💡 SOLUTIONS:');
      console.log('   1. Remplir les adresses manuellement dans la base de données');
      console.log('   2. Supprimer ces missions et les recréer correctement');
      console.log('   3. Modifier le formulaire pour rendre les adresses obligatoires\n');
    }

    // Afficher les détails complets d'une mission problématique
    const problematicMission = assignments.find(a => !a.missions?.pickup_address || !a.missions?.delivery_address);
    if (problematicMission) {
      console.log('\n📋 DÉTAILS D\'UNE MISSION PROBLÉMATIQUE:\n');
      console.log(JSON.stringify(problematicMission.missions, null, 2));
    }
  }
}

checkMissionAddresses()
  .then(() => {
    console.log('\n✅ Vérification terminée\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
