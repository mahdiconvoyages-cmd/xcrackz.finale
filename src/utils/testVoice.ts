/**
 * Utilitaire de test pour la synthèse vocale
 * Pour l'utiliser, ouvrez la console du navigateur et tapez:
 * testVoiceSetup()
 */

import VoiceAssistantService from '../services/VoiceAssistantService';

export function testVoiceSetup() {
  console.log('🧪 === TEST DE CONFIGURATION VOCALE ===');
  
  // 1. Vérifier le support
  const supported = VoiceAssistantService.isSupported();
  console.log('1. Support navigateur:', supported ? '✅ OUI' : '❌ NON');
  
  if (!supported) {
    console.error('❌ Votre navigateur ne supporte pas la synthèse vocale');
    console.log('💡 Essayez Chrome, Edge ou Safari');
    return;
  }
  
  // 2. Lister toutes les voix disponibles
  const allVoices = VoiceAssistantService.getAvailableVoices();
  console.log(`2. Voix disponibles: ${allVoices.length} au total`);
  console.table(allVoices.map(v => ({
    name: v.name,
    lang: v.lang,
    local: v.localService ? '🏠 Local' : '☁️ Cloud',
    default: v.default ? '⭐ Défaut' : ''
  })));
  
  // 3. Voix françaises
  const frenchVoices = VoiceAssistantService.getFrenchVoices();
  console.log(`3. Voix françaises: ${frenchVoices.length}`);
  if (frenchVoices.length > 0) {
    console.log('🇫🇷 Voix françaises disponibles:');
    frenchVoices.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.name} (${v.lang})`);
    });
  } else {
    console.warn('⚠️ Aucune voix française trouvée');
  }
  
  // 3b. Voix féminines françaises
  const femaleVoices = VoiceAssistantService.getFemaleVoices();
  console.log(`\n👩 Voix FÉMININES françaises: ${femaleVoices.length}`);
  if (femaleVoices.length > 0) {
    console.log('💃 Voix féminines françaises disponibles:');
    femaleVoices.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.name} (${v.lang}) ${v.localService ? '🏠' : '☁️'}`);
    });
  } else {
    console.log('ℹ️ Aucune voix explicitement féminine détectée');
    console.log('   → Le système utilisera la meilleure voix française disponible');
  }
  
  // 4. Configuration actuelle
  const config = VoiceAssistantService.getConfig();
  console.log('4. Configuration actuelle:', config);
  
  // 5. Test de parole
  console.log('5. Test de parole en cours...');
  console.log('🔊 Vous devriez entendre: "Bonjour, je suis votre assistante vocale professionnelle."');
  
  VoiceAssistantService.onSpeakStart(() => {
    console.log('✅ Début de la parole');
  });
  
  VoiceAssistantService.onSpeakEnd(() => {
    console.log('✅ Fin de la parole - Test réussi !');
  });
  
  VoiceAssistantService.speak('Bonjour, je suis votre assistante vocale professionnelle. Je parle de manière naturelle et agréable.')
    .then(() => {
      console.log('🎉 === TEST TERMINÉ AVEC SUCCÈS ===');
    })
    .catch((error) => {
      console.error('❌ Erreur lors du test:', error);
      console.log('💡 Vérifiez que le volume de votre système n\'est pas à 0');
      console.log('💡 Vérifiez que votre navigateur n\'est pas en mode silencieux');
    });
}

export function testFrenchVoices() {
  console.log('🇫🇷 === TEST DES VOIX FRANÇAISES ===');
  
  const frenchVoices = VoiceAssistantService.getFrenchVoices();
  
  if (frenchVoices.length === 0) {
    console.warn('❌ Aucune voix française trouvée');
    return;
  }
  
  console.log(`Nombre de voix françaises: ${frenchVoices.length}`);
  
  const testText = 'Bonjour, je suis une voix de synthèse vocale.';
  
  frenchVoices.forEach((voice, index) => {
    setTimeout(() => {
      console.log(`\n🔊 Test de la voix ${index + 1}/${frenchVoices.length}:`);
      console.log(`   Nom: ${voice.name}`);
      console.log(`   Langue: ${voice.lang}`);
      console.log(`   Local: ${voice.localService ? 'Oui' : 'Non'}`);
      
      VoiceAssistantService.speak(testText)
        .then(() => console.log(`   ✅ Test de ${voice.name} terminé`))
        .catch(err => console.error(`   ❌ Erreur avec ${voice.name}:`, err));
    }, index * 4000); // 4 secondes entre chaque test
  });
}

export function configureVoice(options: {
  rate?: number;
  pitch?: number;
  volume?: number;
}) {
  console.log('⚙️ Configuration de la voix:', options);
  VoiceAssistantService.setConfig(options);
  
  console.log('✅ Configuration mise à jour');
  console.log('🧪 Test avec la nouvelle configuration...');
  
  VoiceAssistantService.speak('Configuration vocale mise à jour.')
    .then(() => console.log('✅ Test terminé'))
    .catch(err => console.error('❌ Erreur:', err));
}

// Exemples de configurations
export const voicePresets = {
  normal: { rate: 1.0, pitch: 1.0, volume: 1.0 },
  fast: { rate: 1.5, pitch: 1.0, volume: 1.0 },
  slow: { rate: 0.7, pitch: 1.0, volume: 1.0 },
  deep: { rate: 0.9, pitch: 0.7, volume: 1.0 },
  high: { rate: 1.0, pitch: 1.3, volume: 1.0 },
  natural: { rate: 1.1, pitch: 1.0, volume: 1.0 },
};

// Exposer dans window pour accès facile depuis la console
if (typeof window !== 'undefined') {
  (window as any).testVoiceSetup = testVoiceSetup;
  (window as any).testFrenchVoices = testFrenchVoices;
  (window as any).configureVoice = configureVoice;
  (window as any).voicePresets = voicePresets;
  (window as any).VoiceAssistantService = VoiceAssistantService;
  
  console.log('🎙️ Utilitaires vocaux chargés !');
  console.log('📝 Commandes disponibles:');
  console.log('   • testVoiceSetup() - Tester la configuration');
  console.log('   • testFrenchVoices() - Tester toutes les voix françaises');
  console.log('   • configureVoice({rate: 1.2, pitch: 0.9}) - Configurer la voix');
  console.log('   • voicePresets - Voir les préréglages disponibles');
  console.log('   • VoiceAssistantService - Accès direct au service');
}

export default {
  testVoiceSetup,
  testFrenchVoices,
  configureVoice,
  voicePresets,
};
