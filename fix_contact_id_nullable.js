const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixContactIdColumn() {
  console.log('🔧 Modification de la colonne contact_id pour permettre NULL...\n');
  
  // Cette requête SQL doit être exécutée dans le Dashboard Supabase
  const sqlCommands = `
-- Permettre NULL dans la colonne contact_id
ALTER TABLE mission_assignments 
ALTER COLUMN contact_id DROP NOT NULL;

-- Vérifier la modification
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'mission_assignments' 
  AND column_name = 'contact_id';
`;

  console.log('📋 SQL à exécuter dans Supabase Dashboard:');
  console.log('='.repeat(60));
  console.log(sqlCommands);
  console.log('='.repeat(60));
  
  console.log('\n🔗 Aller sur: https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn/sql/new');
  console.log('📝 Copier/coller le SQL ci-dessus');
  console.log('▶️ Cliquer sur "Run"');
  console.log('\n✅ Après exécution, la colonne contact_id acceptera NULL');
}

fixContactIdColumn();
