/**
 * Script pour créer les politiques RLS sur les buckets individuels
 * À exécuter via: node fix-storage-policies.js
 */

const SUPABASE_URL = 'https://bfrkthzovwpjrvqktdjn.supabase.co';
const SERVICE_ROLE_KEY = 'VOTRE_SERVICE_ROLE_KEY'; // À remplacer par votre clé service_role

const buckets = [
  'avatars',
  'vehicle-images', 
  'inspection-photos',
  'missions',
  'company-logos',
  'user-documents'
];

async function createBucketPolicies() {
  console.log('🔧 Création des politiques RLS pour les buckets...\n');

  for (const bucket of buckets) {
    try {
      // Créer politique via API REST Supabase
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_storage_policy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          bucket_name: bucket,
          policy_name: `${bucket}_allow_all`,
          definition: {
            command: 'ALL',
            roles: ['authenticated', 'anon'],
            using: 'true',
            with_check: 'true'
          }
        })
      });

      if (response.ok) {
        console.log(`✅ ${bucket}: Politique créée`);
      } else {
        const error = await response.text();
        console.log(`❌ ${bucket}: ${error}`);
      }
    } catch (error) {
      console.log(`❌ ${bucket}: ${error.message}`);
    }
  }

  console.log('\n✅ Terminé!');
  console.log('\n⚠️ Si cette méthode ne fonctionne pas non plus, vous DEVEZ:');
  console.log('1. Aller sur https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn/storage/policies');
  console.log('2. Cliquer sur chaque bucket (avatars, vehicle-images, etc.)');
  console.log('3. Cliquer "New policy" → "For full customization"');
  console.log('4. Remplir:');
  console.log('   - Policy name: allow_all');
  console.log('   - Policy command: ALL');
  console.log('   - Target roles: authenticated, anon');
  console.log('   - USING expression: true');
  console.log('   - WITH CHECK expression: true');
  console.log('5. Répéter pour les 6 buckets');
}

// Alternative: SQL direct via PostgREST
async function createPoliciesViaSQL() {
  console.log('\n🔧 Méthode alternative: SQL direct...\n');

  const sql = `
-- Supprimer les anciennes politiques sur storage.objects
DROP POLICY IF EXISTS "public_access" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_access" ON storage.objects;

-- Créer politique ultra-permissive sur storage.objects
CREATE POLICY "allow_all_operations" ON storage.objects
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Désactiver RLS temporairement (nécessite superuser)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
`;

  console.log('📋 SQL à exécuter dans Supabase SQL Editor:');
  console.log(sql);
}

console.log('='.repeat(80));
console.log('🚨 SOLUTION DÉFINITIVE POUR RLS STORAGE');
console.log('='.repeat(80));
console.log('\n⚠️ IMPORTANT: Les scripts SQL ne peuvent PAS créer de politiques sur les buckets individuels.');
console.log('⚠️ Vous devez utiliser l\'interface Supabase Dashboard.\n');

console.log('📋 ÉTAPES À SUIVRE:\n');
console.log('1. Aller sur: https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn/storage/policies\n');
console.log('2. Pour CHAQUE bucket (avatars, vehicle-images, inspection-photos, missions, company-logos, user-documents):\n');
console.log('   a) Cliquer sur le nom du bucket');
console.log('   b) Cliquer sur "New policy"');
console.log('   c) Sélectionner "For full customization"');
console.log('   d) Remplir le formulaire:');
console.log('      - Policy name: allow_all');
console.log('      - Policy command: ALL');
console.log('      - Target roles: Cocher "authenticated" ET "anon"');
console.log('      - USING expression: true');
console.log('      - WITH CHECK expression: true');
console.log('   e) Cliquer "Review"');
console.log('   f) Cliquer "Save policy"\n');
console.log('3. Répéter pour les 6 buckets\n');
console.log('4. Rafraîchir votre navigateur (Ctrl+Shift+R)');
console.log('5. Tester l\'upload d\'avatar\n');

console.log('='.repeat(80));
console.log('💡 POURQUOI LES SCRIPTS SQL NE MARCHENT PAS?');
console.log('='.repeat(80));
console.log('\nSupabase Storage a 3 niveaux de RLS:');
console.log('1. ✅ storage.objects (table) - Vos scripts ont créé des politiques ici');
console.log('2. ✅ storage.buckets (table) - Vos scripts ont créé des politiques ici');
console.log('3. ❌ Buckets individuels - NE PEUVENT PAS être créés via SQL\n');
console.log('Les politiques sur les tables parentes ne s\'appliquent PAS automatiquement aux buckets.');
console.log('Chaque bucket doit avoir ses propres politiques créées via le Dashboard.\n');

console.log('='.repeat(80));
console.log('🎯 ALTERNATIVE RAPIDE (si vous voulez éviter les politiques)');
console.log('='.repeat(80));
console.log('\nDans Supabase Dashboard → Storage → Policies:');
console.log('1. Cliquer sur "Configuration"');
console.log('2. Désactiver "Enable RLS" pour storage.objects');
console.log('3. Tous vos buckets deviennent publics sans politiques\n');
console.log('⚠️ ATTENTION: Cette solution rend TOUS les fichiers publics.\n');

createPoliciesViaSQL();
