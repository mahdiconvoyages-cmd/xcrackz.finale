// fix-encoding.js - Script de correction d'encodage UTF-8
const fs = require('fs');
const path = require('path');

// Map de tous les remplacements nécessaires
const replacements = new Map([
  // Lettres accentuées minuscules
  ['├®', 'é'],
  ['├á', 'à'],
  ['├¿', 'ï'],
  ['├¬', 'ê'],
  ['├´', 'ô'],
  ['├╗', 'û'],
  ['├º', 'ù'],
  ['├⌐', 'ç'],
  ['Ã©', 'é'],
  ['Ã¨', 'è'],
  ['Ã ', 'à'],
  ['Ã¢', 'â'],
  ['Ã´', 'ô'],
  ['Ã®', 'î'],
  ['Ã»', 'û'],
  ['Ã¼', 'ü'],
  ['Ã§', 'ç'],
  ['Ã«', 'ë'],
  ['Ã¯', 'ï'],
  ['Ã¿', 'ÿ'],
  
  // Lettres accentuées majuscules
  ['Ã‰', 'É'],
  ['Ãˆ', 'È'],
  ['Ã€', 'À'],
  ['Ã‡', 'Ç'],
  ['ÃŠ', 'Ê'],
  ['Ã"', 'Ô'],
  ['Ã‹', 'Ë'],
  
  // Symboles et emojis
  ['ÔÇó', '•'],
  ['Ô£à', '✓'],
  ['ÔØî', '❌'],
  ['­ƒôï', '📝'],
  ['­ƒô®', '📞'],
  ['­ƒÜ¿', '❌'],
  ['­ƒÜü', '✅'],
  ['­ƒÖ¥', '💡'],
  ['­ƒÆ░', '🎉'],
  ['­ƒÄë', '💰'],
  ['­ƒôä', '📄'],
  ['­ƒÆ│', '💳'],
  ['ÔÅ▒´©Å', '🎯'],
  ['ÔåÆ', '→'],
  ['ÔåÉ', '←'],
  ['Ôåæ', '↑'],
  ['ÔåôThe', '↓'],
  ['ÔçÆ', '⇒'],
  ['ÔçÉ', '⇐'],
  ['ÔçæThe', '⇑'],
  ['Ôçô', '⇓'],
  ['ÔùÅ', '■'],
  ['Ôùï', '□'],
  ['ÔùåThe', '▪'],
  ['Ôùç', '▫'],
  ['Ôûá', '▬'],
  ['Ôûí', '▲'],
  ['Ôû¬', '▼'],
  ['Ôû½', '◆'],
]);

// Phrases complètes connues avec erreurs
const phraseReplacements = new Map([
  ['r├®fl├®chir', 'réfléchir'],
  ['├®quipe support', 'équipe support'],
  ['d├®tails', 'détails'],
  ['cr├®├®', 'créé'],
  ['priorit├®', 'priorité'],
  ['r├®pondra', 'répondra'],
  ['d├®lais', 'délais'],
  ['g├®n├®ralement', 'généralement'],
  ['├®t├® cr├®├®', 'été créé'],
  ['probl├¿me rencontr├®', 'problème rencontré'],
  ['d├®j├á essay├®', 'déjà essayé'],
  ['r├®sultat', 'résultat'],
  ['Types ├®tendus', 'Types étendus'],
  ['Ast├®risques', 'Astérisques'],
  ['G├®rer', 'Gérer'],
  ['derni├¿re', 'dernière'],
  ['affich├®', 'affiché'],
  ['D├®crivez pr├®cis├®ment', 'Décrivez précisément'],
  ['rencontr├®', 'rencontré'],
  ['essay├®', 'essayé'],
  ['Am├®liorer', 'Améliorer'],
  ['caract├¿res', 'caractères'],
  ['exp├®rience', 'expérience'],
  ['compl├¿te', 'complète'],
  ['Cr├®er', 'Créer'],
  ['pr├®sents', 'présents'],
  ['Mettre ├á jour', 'Mettre à jour'],
  ['V├®rifier', 'Vérifier'],
  ['n├®cessaire', 'nécessaire'],
  ['connect├®', 'connecté'],
  ['D├®sol├®', 'Désolé'],
  ['r├®essayer', 'réessayer'],
  ['bas├®e', 'basée'],
  ['ex├®cuter', 'exécuter'],
  ['succ├¿s', 'succès'],
  ['Num├®ro', 'Numéro'],
  ['Cr├®dit d├®duit', 'Crédit déduit'],
  ['t├®l├®charger', 'télécharger'],
  ['rÃ©el', 'réel'],
  ['Ã‰couter', 'Écouter'],
  ['sÃ©lectionnÃ©e', 'sélectionnée'],
  ['crÃ©Ã©es', 'créées'],
  ['assignÃ©es', 'assignées'],
  ['TerminÃ©e', 'Terminée'],
  ['AnnulÃ©e', 'Annulée'],
  ['copiÃ©', 'copié'],
  ['CoordonnÃ©es', 'Coordonnées'],
  ['coordonnÃ©es', 'coordonnées'],
  ['dÃ©finies', 'définies'],
  ['dÃ©part', 'départ'],
  ['arrivÃ©e', 'arrivée'],
  ['estimÃ©e', 'estimée'],
  ['dÃ©taillÃ©e', 'détaillée'],
]);

function fixEncoding(content) {
  let fixed = content;
  
  // D'abord, corriger les phrases complètes
  phraseReplacements.forEach((correct, wrong) => {
    const regex = new RegExp(escapeRegExp(wrong), 'g');
    fixed = fixed.replace(regex, correct);
  });
  
  // Ensuite, corriger les caractères individuels
  replacements.forEach((correct, wrong) => {
    const regex = new RegExp(escapeRegExp(wrong), 'g');
    fixed = fixed.replace(regex, correct);
  });
  
  return fixed;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fixFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixed = fixEncoding(content);
    
    if (content !== fixed) {
      fs.writeFileSync(filePath, fixed, 'utf8');
      const changes = content.length - fixed.length;
      console.log(`✅ Corrigé: ${path.basename(filePath)} (${Math.abs(changes)} changements)`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Erreur sur ${filePath}:`, error.message);
    return false;
  }
}

function walkDirectory(dir, filePattern = /\.(ts|tsx)$/) {
  const files = [];
  
  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        // Ignorer node_modules et .git
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
          walk(fullPath);
        }
      } else if (entry.isFile() && filePattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

// Point d'entrée
const srcDir = path.join(__dirname, 'src');
console.log('🔍 Recherche des fichiers TypeScript dans src/...\n');

const files = walkDirectory(srcDir);
console.log(`📁 ${files.length} fichiers trouvés\n`);

let fixedCount = 0;
files.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log('\n═══════════════════════════════════════');
console.log(`✨ Terminé! ${fixedCount}/${files.length} fichiers corrigés`);
console.log('═══════════════════════════════════════');
