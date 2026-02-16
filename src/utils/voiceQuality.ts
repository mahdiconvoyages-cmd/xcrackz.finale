/**
 * Script pour améliorer la qualité vocale
 * Ajoute des voix Google premium dans Chrome
 */

// Fonction pour détecter le navigateur
export function detectBrowser() {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome') && !userAgent.includes('edge')) {
    return 'Chrome';
  } else if (userAgent.includes('edge')) {
    return 'Edge';
  } else if (userAgent.includes('firefox')) {
    return 'Firefox';
  } else if (userAgent.includes('safari')) {
    return 'Safari';
  }
  return 'Unknown';
}

// Fonction pour vérifier la qualité des voix disponibles
export function checkVoiceQuality() {
  const voices = window.speechSynthesis.getVoices();
  const browser = detectBrowser();
  
  console.log('🌐 Navigateur détecté:', browser);
  console.log(`📢 ${voices.length} voix disponibles`);
  
  // Compter les voix premium
  const googleVoices = voices.filter(v => 
    v.name.toLowerCase().includes('google') || 
    v.name.toLowerCase().includes('wavenet') ||
    v.name.toLowerCase().includes('neural')
  );
  
  const onlineVoices = voices.filter(v => !v.localService);
  const frenchVoices = voices.filter(v => v.lang.startsWith('fr'));
  
  console.log(`\n📊 Qualité des voix:`);
  console.log(`  ⭐ Voix Google/Neural: ${googleVoices.length}`);
  console.log(`  ☁️ Voix Cloud: ${onlineVoices.length}`);
  console.log(`  🇫🇷 Voix françaises: ${frenchVoices.length}`);
  
  // Recommandations
  if (googleVoices.length === 0) {
    console.warn('\n⚠️ AUCUNE VOIX GOOGLE DÉTECTÉE');
    console.log('💡 Pour une voix VRAIMENT naturelle:');
    console.log('   1. Utilisez Google Chrome (pas Edge, Firefox ou Safari)');
    console.log('   2. Les voix Google sont 10x plus naturelles');
    console.log('   3. Elles nécessitent une connexion Internet');
    
    if (browser !== 'Chrome') {
      console.log(`\n🔴 Vous utilisez ${browser}`);
      console.log('✅ SOLUTION: Ouvrez cette page dans Google Chrome');
      console.log('   → Les voix seront automatiquement meilleures!');
    }
  } else {
    console.log('\n✅ Voix Google disponibles - Excellente qualité!');
  }
  
  // Afficher les meilleures voix françaises
  const bestFrenchVoices = frenchVoices
    .filter(v => !v.localService || v.name.toLowerCase().includes('google'))
    .slice(0, 5);
    
  if (bestFrenchVoices.length > 0) {
    console.log('\n🏆 Meilleures voix françaises disponibles:');
    bestFrenchVoices.forEach((v, i) => {
      const quality = v.localService ? '🏠 Local' : '☁️ Cloud (Meilleur)';
      console.log(`   ${i + 1}. ${v.name} - ${quality}`);
    });
  }
  
  return {
    browser,
    total: voices.length,
    google: googleVoices.length,
    online: onlineVoices.length,
    french: frenchVoices.length,
    quality: googleVoices.length > 0 ? 'EXCELLENT' : onlineVoices.length > 0 ? 'BON' : 'MOYEN'
  };
}

// Fonction pour forcer le rechargement des voix
export function reloadVoices() {
  return new Promise((resolve) => {
    console.log('🔄 Rechargement des voix...');
    
    // Forcer le rechargement
    window.speechSynthesis.cancel();
    
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log(`✅ ${voices.length} voix chargées`);
        resolve(voices);
      }
    };
    
    // Essayer immédiatement
    loadVoices();
    
    // Ou attendre l'événement
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    // Timeout après 2 secondes
    setTimeout(loadVoices, 2000);
  });
}

// Test avec la meilleure voix disponible
export async function testBestVoice() {
  console.log('🧪 Test de la meilleure voix disponible...\n');
  
  await reloadVoices();
  const quality = checkVoiceQuality();
  
  console.log(`\n🎯 Qualité globale: ${quality.quality}`);
  
  const voices = window.speechSynthesis.getVoices();
  const frenchVoices = voices.filter(v => v.lang.startsWith('fr'));
  
  // Trouver la meilleure voix
  let bestVoice = frenchVoices.find(v => 
    v.name.toLowerCase().includes('google') || 
    v.name.toLowerCase().includes('wavenet') ||
    v.name.toLowerCase().includes('neural')
  );
  
  if (!bestVoice) {
    bestVoice = frenchVoices.find(v => !v.localService);
  }
  
  if (!bestVoice) {
    bestVoice = frenchVoices[0];
  }
  
  if (!bestVoice) {
    console.error('❌ Aucune voix française trouvée!');
    return;
  }
  
  console.log(`\n🎙️ Test avec: ${bestVoice.name}`);
  console.log(`   Type: ${bestVoice.localService ? '🏠 Local' : '☁️ Cloud'}`);
  console.log(`   Langue: ${bestVoice.lang}`);
  
  const utterance = new SpeechSynthesisUtterance(
    "Bonjour, je suis une assistante vocale. " +
    "Cette voix est-elle naturelle et agréable à écouter ?"
  );
  
  utterance.voice = bestVoice;
  utterance.rate = 1.15;  // Dynamique
  utterance.pitch = 1.1;  // Féminin
  utterance.volume = 1.0;
  
  utterance.onstart = () => console.log('🔊 Lecture en cours...');
  utterance.onend = () => console.log('✅ Test terminé\n');
  utterance.onerror = (e) => console.error('❌ Erreur:', e);
  
  window.speechSynthesis.speak(utterance);
}

// Guide d'installation des voix
export function showVoiceInstallGuide() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🎙️  GUIDE: Obtenir une VRAIE voix naturelle             ║
╚════════════════════════════════════════════════════════════╝

🎯 SOLUTION #1: Utiliser Google Chrome (RECOMMANDÉ)
   → Chrome a des voix Google WaveNet intégrées
   → Qualité PROFESSIONNELLE (comme une vraie personne)
   → Aucune installation nécessaire
   → Nécessite Internet
   
   ✅ Ouvrez: chrome://settings/
   ✅ Cherchez: "Voix"
   ✅ Les voix Google sont automatiques!

🎯 SOLUTION #2: Activer les voix en ligne
   Sur Chrome:
   1. Paramètres → Accessibilité
   2. Activer "Voix naturelles en ligne"
   3. Sélectionner une voix française
   
🎯 SOLUTION #3: Installer Microsoft Edge Speech (Windows)
   1. Ouvrir: edge://settings/accessibility
   2. Télécharger les voix "Natural"
   3. Choisir "Microsoft Marie" ou "Microsoft Hortense"

🎯 SOLUTION #4: macOS (Voix Apple Premium)
   1. Préférences Système → Accessibilité
   2. Contenu audio → Voix
   3. Télécharger "Amelie" ou "Thomas" (Haute Qualité)

📊 COMPARAISON DE QUALITÉ:
   ⭐⭐⭐⭐⭐ Google WaveNet (Chrome)
   ⭐⭐⭐⭐   Microsoft Edge Natural
   ⭐⭐⭐⭐   Voix Apple Premium
   ⭐⭐⭐     Voix système standard
   ⭐⭐       Voix robotique de base

🔍 VÉRIFIER VOS VOIX ACTUELLES:
   Tapez: checkVoiceQuality()
  `);
}

// Exposer dans window
if (typeof window !== 'undefined') {
  (window as any).detectBrowser = detectBrowser;
  (window as any).checkVoiceQuality = checkVoiceQuality;
  (window as any).reloadVoices = reloadVoices;
  (window as any).testBestVoice = testBestVoice;
  (window as any).showVoiceInstallGuide = showVoiceInstallGuide;
  
  console.log('🎙️ Utilitaires de qualité vocale chargés!');
  console.log('📝 Commandes disponibles:');
  console.log('   • checkVoiceQuality() - Vérifier la qualité des voix');
  console.log('   • testBestVoice() - Tester la meilleure voix');
  console.log('   • showVoiceInstallGuide() - Guide d\'installation');
  console.log('   • detectBrowser() - Voir votre navigateur');
  console.log('   • reloadVoices() - Recharger les voix');
}

export default {
  detectBrowser,
  checkVoiceQuality,
  reloadVoices,
  testBestVoice,
  showVoiceInstallGuide,
};
