/**
 * Script de vérification et récupération des photos
 * Priorité 1: Lister les fichiers dans le bucket inspection-photos
 * Usage: node check_storage_recovery.js
 */

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase (à adapter avec vos vraies clés)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStorageRecovery() {
  console.log('🔍 Vérification des fichiers dans le bucket inspection-photos...\n');
  
  try {
    // 1. Lister tous les fichiers dans le bucket
    const { data: files, error: listError } = await supabase.storage
      .from('inspection-photos')
      .list('inspections', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (listError) {
      console.error('❌ Erreur lors du listing des fichiers:', listError);
      return;
    }

    if (!files || files.length === 0) {
      console.log('❌ Aucun fichier trouvé dans le bucket inspection-photos/inspections');
      console.log('   Les photos ont probablement été supprimées du Storage aussi.');
      return;
    }

    console.log(`✅ ${files.length} fichier(s) trouvé(s) dans le Storage:\n`);
    
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   Taille: ${(file.metadata?.size || 0 / 1024).toFixed(2)} KB`);
      console.log(`   Créé: ${file.created_at}`);
      console.log('');
    });

    // 2. Vérifier l'état de la table inspection_photos
    const { data: photosInDB, error: dbError } = await supabase
      .from('inspection_photos')
      .select('id, photo_url, photo_type, created_at')
      .limit(10);

    if (dbError) {
      console.error('❌ Erreur lors de la vérification de la table:', dbError);
      return;
    }

    console.log(`📊 Table inspection_photos contient ${photosInDB?.length || 0} enregistrement(s)\n`);

    if (photosInDB && photosInDB.length > 0) {
      console.log('✅ Certains enregistrements existent encore dans la base:');
      photosInDB.forEach((photo, index) => {
        console.log(`${index + 1}. ${photo.photo_type} - ${photo.photo_url}`);
      });
    } else {
      console.log('❌ Aucun enregistrement dans inspection_photos (CASCADE deletion confirmée)');
    }

    // 3. Suggestions de récupération
    console.log('\n🔧 PLAN DE RÉCUPÉRATION:');
    
    if (files.length > 0 && (!photosInDB || photosInDB.length === 0)) {
      console.log('1. Les fichiers existent dans Storage mais pas les références DB');
      console.log('2. Vous pouvez créer un script de ré-association:');
      console.log('   - Parser les noms de fichiers pour extraire inspection_id et photo_type');
      console.log('   - Vérifier quelles inspections existent encore dans vehicle_inspections');
      console.log('   - Réinsérer les enregistrements dans inspection_photos');
      console.log('\n📝 Script de récupération automatique possible');
    } else if (files.length === 0) {
      console.log('1. ❌ Perte totale - Storage et DB vidés');
      console.log('2. Seule option: restaurer depuis backup Supabase');
      console.log('3. Vérifier: Dashboard Supabase > Backups > Point-in-time recovery');
    } else {
      console.log('1. ✅ Données cohérentes - pas de récupération nécessaire');
    }

  } catch (error) {
    console.error('💥 Erreur générale:', error);
    console.log('\n🔧 Actions à faire manuellement:');
    console.log('1. Vérifier vos variables d\'environnement Supabase');
    console.log('2. Se connecter au Dashboard Supabase pour inspection manuelle');
    console.log('3. Vérifier les backups disponibles');
  }
}

// Exécution
checkStorageRecovery().then(() => {
  console.log('\n✅ Vérification terminée');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});