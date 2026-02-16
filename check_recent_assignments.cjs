const { createClient } = require('@supabase/supabase-js');

// Hardcoded car dotenv pas installé
const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzQwMzg1MywiZXhwIjoyMDQ4OTc5ODUzfQ.hB04VKJkv-pGnhCzOCCTEXGbMaJKvTY3y6LHT0oJtm0'
);

async function checkRecentAssignments() {
  console.log('🔍 Vérification des dernières assignations...\n');
  
  // Charger les 10 dernières assignations avec toutes les infos
  const { data: assignments, error } = await supabase
    .from('mission_assignments')
    .select(`
      id,
      user_id,
      assigned_by,
      mission_id,
      assigned_at,
      mission:missions(
        id,
        reference,
        pickup_address,
        delivery_address,
        pickup_date,
        delivery_date,
        vehicle_brand,
        vehicle_model
      )
    `)
    .order('assigned_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log(`✅ ${assignments.length} assignations trouvées\n`);
  
  assignments.forEach((assign, index) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Assignation ${index + 1}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📋 ID: ${assign.id}`);
    console.log(`👤 User ID (assigné): ${assign.user_id}`);
    console.log(`👤 Assigned by: ${assign.assigned_by}`);
    console.log(`📅 Date: ${assign.assigned_at}`);
    
    if (assign.mission) {
      console.log(`\n📦 Mission: ${assign.mission.reference}`);
      console.log(`🚗 Véhicule: ${assign.mission.vehicle_brand} ${assign.mission.vehicle_model}`);
      console.log(`📍 Départ: ${assign.mission.pickup_address || '❌ VIDE'}`);
      console.log(`📍 Arrivée: ${assign.mission.delivery_address || '❌ VIDE'}`);
      console.log(`📅 Date départ: ${assign.mission.pickup_date || '❌ VIDE'}`);
      console.log(`📅 Date arrivée: ${assign.mission.delivery_date || '❌ VIDE'}`);
    } else {
      console.log(`\n❌ AUCUNE MISSION LIÉE !`);
    }
  });
}

checkRecentAssignments();
