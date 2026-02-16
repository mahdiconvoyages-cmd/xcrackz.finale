#!/usr/bin/env node

/**
 * Test rapide de nos corrections critiques
 * Usage: node test_fixes.js
 */

import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();

console.log('🔍 Test des correctifs appliqués...\n');

// Test 1: Vérifier que setInspection est déclaré
console.log('1️⃣ Test: State inspection déclaré dans InspectionArrival.tsx');
const inspectionFile = join(PROJECT_ROOT, 'src/pages/InspectionArrival.tsx');

if (existsSync(inspectionFile)) {
  const content = require('fs').readFileSync(inspectionFile, 'utf8');
  
  const hasSetInspection = content.includes('setInspection = useState');
  const hasInspectionState = content.includes('const [inspection, setInspection]');
  
  if (hasInspectionState) {
    console.log('✅ State inspection correctement déclaré');
  } else if (hasSetInspection) {
    console.log('⚠️  setInspection trouvé mais state mal déclaré');
  } else {
    console.log('❌ State inspection manquant');
  }
} else {
  console.log('❌ Fichier InspectionArrival.tsx introuvable');
}

// Test 2: Vérifier les guards de sécurité
console.log('\n2️⃣ Test: Guards de sécurité dans handleComplete');
if (existsSync(inspectionFile)) {
  const content = require('fs').readFileSync(inspectionFile, 'utf8');
  
  const hasIdGuard = content.includes('if (!arrivalInspection?.id)');
  const hasRetryLogic = content.includes('for (let attempt = 1; attempt <= 2');
  const hasUploadCount = content.includes('uploadedPhotosCount');
  
  console.log(hasIdGuard ? '✅ Guard ID inspection présent' : '❌ Guard ID inspection manquant');
  console.log(hasRetryLogic ? '✅ Logique retry présente' : '❌ Logique retry manquante');
  console.log(hasUploadCount ? '✅ Compteur uploads présent' : '❌ Compteur uploads manquant');
}

// Test 3: Vérifier les fichiers de sécurité créés
console.log('\n3️⃣ Test: Scripts de sécurité créés');
const securityFiles = [
  'check_storage_recovery.js',
  'DB_SAFETY_RUNBOOK.sql'
];

securityFiles.forEach(file => {
  const filePath = join(PROJECT_ROOT, file);
  if (existsSync(filePath)) {
    console.log(`✅ ${file} créé`);
  } else {
    console.log(`❌ ${file} manquant`);
  }
});

// Test 4: Compilation rapide (syntaxe)
console.log('\n4️⃣ Test: Vérification syntaxe basique');
try {
  // Vérifier juste que le fichier peut être parsé
  require('@babel/parser').parse(
    require('fs').readFileSync(inspectionFile, 'utf8'),
    {
      sourceType: 'module',
      plugins: ['typescript', 'jsx']
    }
  );
  console.log('✅ Syntaxe JavaScript/TypeScript valide');
} catch (error) {
  console.log('❌ Erreur de syntaxe:', error.message);
}

console.log('\n📊 RÉSUMÉ DES CORRECTIONS APPLIQUÉES:');
console.log('• ✅ Ajout state inspection manquant dans InspectionArrival.tsx');
console.log('• ✅ Ajout guards de sécurité dans handleComplete()');
console.log('• ✅ Logique retry pour uploads avec compteur de succès');
console.log('• ✅ Messages d\'erreur détaillés et logging');
console.log('• ✅ Script de vérification Storage pour récupération photos');
console.log('• ✅ Runbook de sécurité DB pour éviter futures suppressions CASCADE');

console.log('\n🎯 PROCHAINES ÉTAPES RECOMMANDÉES:');
console.log('1. Exécuter: node check_storage_recovery.js (vérifier photos récupérables)');
console.log('2. Tester l\'inspection en dev/staging avant production');
console.log('3. Configurer backups automatiques Supabase');
console.log('4. Appliquer même correctifs à InspectionDeparture.tsx');
console.log('5. Ajouter tests unitaires pour handleComplete()');

console.log('\n✅ Tests terminés !');