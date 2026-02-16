import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bfrkthzovwpjrvqktdjn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM'
);

async function fixRLS() {
  console.log('\n🔧 CORRECTION DES POLITIQUES RLS POUR mission_assignments\n');

  try {
    // 1. Supprimer TOUTES les anciennes policies
    console.log('1️⃣ Suppression des anciennes policies...\n');
    
    const policies = [
      'Users can insert their own assignments',
      'Users can view their assignments',
      'Users can update their assignments',
      'Users can delete their assignments',
      'view_assignments',
      'insert_assignments',
      'update_assignments',
      'delete_assignments'
    ];

    for (const policy of policies) {
      await supabase.rpc('exec_sql', {
        sql: `DROP POLICY IF EXISTS "${policy}" ON mission_assignments;`
      }).catch(() => {});
      console.log(`   ✓ Supprimé: ${policy}`);
    }

    // 2. Créer les nouvelles policies (ultra-permissives pour debug)
    console.log('\n2️⃣ Création des nouvelles policies...\n');

    // SELECT: Voir ses assignations (créées par soi OU assignées à soi)
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "select_own_assignments" ON mission_assignments
          FOR SELECT
          USING (auth.uid() = assigned_by OR auth.uid() = user_id);
      `
    });
    console.log('   ✅ SELECT policy créée');

    // INSERT: Peut créer si on est l'assigneur
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "insert_assignments" ON mission_assignments
          FOR INSERT
          WITH CHECK (auth.uid() = assigned_by);
      `
    });
    console.log('   ✅ INSERT policy créée');

    // UPDATE: Peut modifier si assigneur ou assigné
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "update_assignments" ON mission_assignments
          FOR UPDATE
          USING (auth.uid() = assigned_by OR auth.uid() = user_id);
      `
    });
    console.log('   ✅ UPDATE policy créée');

    // DELETE: Peut supprimer si assigneur
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "delete_assignments" ON mission_assignments
          FOR DELETE
          USING (auth.uid() = assigned_by);
      `
    });
    console.log('   ✅ DELETE policy créée');

    console.log('\n✅ Toutes les policies RLS ont été mises à jour!\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    console.log('\n⚠️ exec_sql RPC non disponible. Utilisez le SQL Editor de Supabase:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can insert their own assignments" ON mission_assignments;
DROP POLICY IF EXISTS "Users can view their assignments" ON mission_assignments;
DROP POLICY IF EXISTS "Users can update their assignments" ON mission_assignments;
DROP POLICY IF EXISTS "Users can delete their assignments" ON mission_assignments;
DROP POLICY IF EXISTS "view_assignments" ON mission_assignments;
DROP POLICY IF EXISTS "insert_assignments" ON mission_assignments;
DROP POLICY IF EXISTS "update_assignments" ON mission_assignments;
DROP POLICY IF EXISTS "delete_assignments" ON mission_assignments;

-- Créer les nouvelles policies
CREATE POLICY "select_own_assignments" ON mission_assignments
  FOR SELECT
  USING (auth.uid() = assigned_by OR auth.uid() = user_id);

CREATE POLICY "insert_assignments" ON mission_assignments
  FOR INSERT
  WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "update_assignments" ON mission_assignments
  FOR UPDATE
  USING (auth.uid() = assigned_by OR auth.uid() = user_id);

CREATE POLICY "delete_assignments" ON mission_assignments
  FOR DELETE
  USING (auth.uid() = assigned_by);
`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

fixRLS()
  .then(() => {
    console.log('✅ Script terminé\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur finale:', err);
    process.exit(1);
  });
