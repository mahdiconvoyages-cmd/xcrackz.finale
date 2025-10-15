/**
 * Voice Assistant Service - Web Speech API
 * Gestion de la reconnaissance vocale et de la synthèse vocale
 * 
 * AMÉLIORATIONS v2:
 * - Intégration du Speech Enhancer (correction automatique)
 * - Intégration du Email Reader (prononciation emails)
 * - Intégration du Data Validator (données réelles uniquement)
 */

import { enhanceSpeechTranscription } from './claraSpeechEnhancer';
import { prepareEmailForReading, generateSSML } from './claraEmailReader';

// Types pour Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface VoiceConfig {
  language?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
}

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

class VoiceAssistantService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  
  private config: VoiceConfig = {
    language: 'fr-FR',
    pitch: 1.05,  // Légèrement plus aigu pour une voix féminine professionnelle
    rate: 0.95,   // Débit naturel et fluide (ni trop lent, ni trop rapide)
    volume: 1.0,  // Volume optimal
  };

  // Callbacks
  private onResultCallback?: (result: VoiceRecognitionResult) => void;
  private onErrorCallback?: (error: Error) => void;
  private onStartCallback?: () => void;
  private onEndCallback?: () => void;
  private onSpeakStartCallback?: () => void;
  private onSpeakEndCallback?: () => void;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeRecognition();
    this.loadSavedConfig();
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  private loadSavedConfig() {
    try {
      const saved = localStorage.getItem('clara_voice_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.pitch) this.config.pitch = settings.pitch;
        if (settings.rate) this.config.rate = settings.rate;
        if (settings.volume) this.config.volume = settings.volume;
        console.log('🎙️ Paramètres vocaux chargés:', this.config);
      }
    } catch (error) {
      console.error('Erreur chargement paramètres vocaux:', error);
    }
  }

  setConfig(config: Partial<VoiceConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig(): VoiceConfig {
    return { ...this.config };
  }

  // ============================================
  // RECONNAISSANCE VOCALE (SPEECH-TO-TEXT)
  // ============================================

  private initializeRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('⚠️ Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    
    if (!this.recognition) return;

    // Configuration pour mode Push-to-Talk (maintenir pour parler)
    this.recognition.continuous = true;  // Continu tant que le bouton est maintenu
    this.recognition.interimResults = true;
    this.recognition.lang = this.config.language || 'fr-FR';

    this.recognition.onstart = () => {
      console.log('🎤 Voice recognition started (Push-to-Talk mode)');
      this.isListening = true;
      this.onStartCallback?.();
    };

    this.recognition.onend = () => {
      console.log('🎤 Voice recognition ended');
      this.isListening = false;
      this.onEndCallback?.();
    };

    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const rawTranscript = result[0].transcript;
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;

      // ✨ AMÉLIORATION: Correction automatique de la transcription
      const enhanced = enhanceSpeechTranscription(rawTranscript);
      const transcript = enhanced.enhanced;

      if (import.meta.env.DEV && enhanced.corrections.length > 0) {
        console.log('✨ [Speech Enhancer] Corrections appliquées:', enhanced.corrections);
        console.log('📝 Avant:', rawTranscript);
        console.log('✅ Après:', transcript);
        console.log('🎯 Confiance:', enhanced.confidence);
      }

      console.log(`🎤 Result: "${transcript}" (${isFinal ? 'final' : 'interim'})`);

      this.onResultCallback?.({
        transcript,
        confidence: Math.min(confidence, enhanced.confidence / 100),
        isFinal,
      });
    };

    this.recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      this.isListening = false;
      this.onErrorCallback?.(new Error(event.error));
    };
  }

  startListening(): void {
    if (!this.recognition) {
      throw new Error('Speech Recognition not supported');
    }

    if (this.isListening) {
      console.warn('⚠️ Already listening');
      return;
    }

    // Stop speaking if active
    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    try {
      this.recognition.lang = this.config.language || 'fr-FR';
      this.recognition.start();
    } catch (error) {
      console.error('❌ Error starting recognition:', error);
      throw error;
    }
  }

  stopListening(): void {
    if (!this.recognition || !this.isListening) {
      return;
    }

    try {
      this.recognition.stop();
    } catch (error) {
      console.error('❌ Error stopping recognition:', error);
    }
  }

  // ============================================
  // SYNTHÈSE VOCALE (TEXT-TO-SPEECH)
  // ============================================

  speak(text: string, options?: Partial<VoiceConfig>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech Synthesis not supported'));
        return;
      }

      // Stop any ongoing speech
      this.stopSpeaking();

      // Stop listening if active
      if (this.isListening) {
        this.stopListening();
      }

      // Attendre que les voix soient chargées
      const speak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = options?.language || this.config.language || 'fr-FR';
        utterance.pitch = options?.pitch || this.config.pitch || 1.05;
        utterance.rate = options?.rate || this.config.rate || 0.95;
        utterance.volume = options?.volume || this.config.volume || 1.0;

        // Sélectionner la MEILLEURE voix française disponible
        const voices = this.synthesis.getVoices();
        
        console.log('🎙️ Available voices:', voices.map(v => ({
          name: v.name,
          lang: v.lang,
          local: v.localService
        })));
        
        // === PRIORITÉ 1 : Voix Google Neural/WaveNet (MEILLEURE QUALITÉ) ===
        const googleNeuralVoices = voices.filter(voice => {
          const name = voice.name.toLowerCase();
          const lang = voice.lang.toLowerCase();
          return lang.startsWith('fr') && 
                 (name.includes('google') && (name.includes('neural') || name.includes('wavenet') || name.includes('studio')));
        });
        
        // === PRIORITÉ 2 : Voix Google françaises standards (TRÈS BONNE QUALITÉ) ===
        const googleStandardVoices = voices.filter(voice => {
          const name = voice.name.toLowerCase();
          const lang = voice.lang.toLowerCase();
          return lang.startsWith('fr') && name.includes('google');
        });
        
        // === PRIORITÉ 3 : Voix Cloud Premium (Microsoft Azure, Amazon Polly) ===
        const cloudPremiumVoices = voices.filter(voice => {
          const name = voice.name.toLowerCase();
          const lang = voice.lang.toLowerCase();
          const isFrench = lang.startsWith('fr');
          const isPremium = name.includes('neural') ||
                           name.includes('premium') || 
                           name.includes('enhanced') || 
                           name.includes('poly') ||
                           name.includes('azure') ||
                           name.includes('denise') ||
                           name.includes('lea') ||
                           name.includes('celine');
          return isFrench && isPremium && !voice.localService;
        });
        
        // === PRIORITÉ 4 : Voix féminines françaises Cloud ===
        const femaleFrenchCloudVoices = voices.filter(voice => {
          const name = voice.name.toLowerCase();
          const lang = voice.lang.toLowerCase();
          const isFrench = lang.startsWith('fr');
          const isFemale = name.includes('female') || 
                          name.includes('femme') || 
                          name.includes('amelie') ||
                          name.includes('celine') ||
                          name.includes('marie') ||
                          name.includes('julie') ||
                          name.includes('lea') ||
                          name.includes('clara') ||
                          name.includes('pauline') ||
                          name.includes('denise');
          return isFrench && isFemale && !voice.localService;
        });
        
        // === PRIORITÉ 5 : Toutes les voix Cloud françaises ===
        const allCloudFrenchVoices = voices.filter(voice => {
          const lang = voice.lang.toLowerCase();
          return lang.startsWith('fr') && !voice.localService;
        });
        
        // === PRIORITÉ 6 : Voix locales françaises de qualité ===
        const localQualityVoices = voices.filter(voice => {
          const name = voice.name.toLowerCase();
          const lang = voice.lang.toLowerCase();
          const isFrench = lang.startsWith('fr');
          const isQuality = name.includes('amelie') ||
                           name.includes('thomas') ||
                           name.includes('enhanced') ||
                           voice.name.includes('Microsoft');
          return isFrench && isQuality;
        });
        
        // === PRIORITÉ 7 : Toutes les voix françaises ===
        const allFrenchVoices = voices.filter(voice => 
          voice.lang.toLowerCase().startsWith('fr')
        );
        
        // Sélectionner dans l'ordre de priorité
        let selectedVoice = null;
        let voiceType = '';
        
        if (googleNeuralVoices.length > 0) {
          selectedVoice = googleNeuralVoices[0];
          voiceType = '✨ GOOGLE NEURAL/WAVENET (QUALITÉ MAXIMALE)';
        } else if (googleStandardVoices.length > 0) {
          selectedVoice = googleStandardVoices[0];
          voiceType = '⭐ GOOGLE STANDARD (TRÈS HAUTE QUALITÉ)';
        } else if (cloudPremiumVoices.length > 0) {
          selectedVoice = cloudPremiumVoices[0];
          voiceType = '� CLOUD PREMIUM (HAUTE QUALITÉ)';
        } else if (femaleFrenchCloudVoices.length > 0) {
          selectedVoice = femaleFrenchCloudVoices[0];
          voiceType = '👩 VOIX FÉMININE CLOUD (BONNE QUALITÉ)';
        } else if (allCloudFrenchVoices.length > 0) {
          selectedVoice = allCloudFrenchVoices[0];
          voiceType = '☁️ VOIX CLOUD FRANÇAISE';
        } else if (localQualityVoices.length > 0) {
          selectedVoice = localQualityVoices[0];
          voiceType = '💻 VOIX LOCALE DE QUALITÉ';
        } else if (allFrenchVoices.length > 0) {
          selectedVoice = allFrenchVoices[0];
          voiceType = '🔊 VOIX FRANÇAISE STANDARD';
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          console.log(`🎙️ ${voiceType}:`, {
            name: selectedVoice.name,
            lang: selectedVoice.lang,
            local: selectedVoice.localService,
            pitch: utterance.pitch,
            rate: utterance.rate
          });
        } else {
          console.warn('⚠️ Aucune voix française trouvée, utilisation de la voix par défaut');
        }

        utterance.onstart = () => {
          console.log('🔊 Speaking started');
          this.isSpeaking = true;
          this.onSpeakStartCallback?.();
        };

        utterance.onend = () => {
          console.log('🔊 Speaking ended');
          this.isSpeaking = false;
          this.onSpeakEndCallback?.();
          resolve();
        };

        utterance.onerror = (event) => {
          console.error('❌ Speech synthesis error:', event);
          this.isSpeaking = false;
          reject(new Error(event.error));
        };

        this.synthesis.speak(utterance);
      };

      // Les voix peuvent ne pas être chargées immédiatement
      const voices = this.synthesis.getVoices();
      if (voices.length === 0) {
        // Attendre l'événement voiceschanged
        this.synthesis.onvoiceschanged = () => {
          speak();
        };
        // Timeout au cas où l'événement ne se déclenche pas
        setTimeout(speak, 100);
      } else {
        speak();
      }
    });
  }

  stopSpeaking(): void {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      console.log('🔊 Speaking stopped');
    }
  }

  pauseSpeaking(): void {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.pause();
      console.log('🔊 Speaking paused');
    }
  }

  resumeSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.resume();
      console.log('🔊 Speaking resumed');
    }
  }

  // ============================================
  // LECTURE D'EMAILS (NOUVEAU v2)
  // ============================================

  /**
   * 📧 Lit un email avec prononciation améliorée
   * Utilise claraEmailReader pour formater correctement
   */
  speakEmail(emailContent: {
    from: string;
    fromName?: string;
    to: string;
    subject: string;
    body: string;
    date?: Date;
    attachments?: string[];
    isHtml?: boolean;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Préparer l'email pour la lecture
        const readable = prepareEmailForReading(emailContent);
        
        // Générer le SSML (ou utiliser le texte simple pour Web Speech API)
        const ssml = generateSSML(readable);
        
        // Note: Web Speech API ne supporte pas SSML nativement
        // On utilise le texte simple avec pauses naturelles
        const textToSpeak = [
          readable.intro,
          readable.subject,
          readable.body,
          readable.metadata,
        ].filter(Boolean).join('. ');

        if (import.meta.env.DEV) {
          console.log('📧 [Email Reader] Email préparé pour lecture');
          console.log('SSML (référence):', ssml);
          console.log('Texte simple:', textToSpeak);
          console.log('Informations à épeler:', readable.spelling);
        }

        // Lire l'email (vitesse adaptée)
        this.speak(textToSpeak, {
          rate: readable.prosody.body === 'slow' ? 0.85 : 0.95,
        }).then(resolve).catch(reject);

      } catch (error: any) {
        console.error('❌ [Email Reader] Erreur:', error);
        reject(error);
      }
    });
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }

  getFrenchVoices(): SpeechSynthesisVoice[] {
    return this.getAvailableVoices().filter(voice => voice.lang.startsWith('fr'));
  }

  getFemaleVoices(): SpeechSynthesisVoice[] {
    const voices = this.getAvailableVoices();
    return voices.filter(voice => {
      const name = voice.name.toLowerCase();
      const isFrench = voice.lang.startsWith('fr');
      const isFemale = name.includes('female') || 
                      name.includes('femme') || 
                      name.includes('woman') ||
                      // Noms féminins courants
                      name.includes('amelie') ||
                      name.includes('celine') ||
                      name.includes('marie') ||
                      name.includes('julie') ||
                      name.includes('sophie') ||
                      name.includes('aurelie') ||
                      name.includes('lea') ||
                      name.includes('alice') ||
                      name.includes('emma') ||
                      name.includes('clara') ||
                      name.includes('pauline') ||
                      name.includes('hortense') ||
                      name.includes('denise') ||
                      name.includes('eloise');
      return isFrench && isFemale;
    });
  }

  isSupported(): boolean {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SpeechRecognition && !!this.synthesis;
  }

  isListeningActive(): boolean {
    return this.isListening;
  }

  isSpeakingActive(): boolean {
    return this.isSpeaking;
  }

  // ============================================
  // DEBUG & TESTING
  // ============================================

  testVoice(): void {
    console.log('🧪 Testing voice synthesis...');
    const voices = this.getAvailableVoices();
    console.log(`📢 ${voices.length} voices available`);
    
    const frenchVoices = this.getFrenchVoices();
    console.log(`🇫🇷 ${frenchVoices.length} French voices:`, frenchVoices.map(v => v.name));
    
    const femaleVoices = this.getFemaleVoices();
    console.log(`👩 ${femaleVoices.length} Female French voices:`, femaleVoices.map(v => v.name));
    
    this.speak('Bonjour, je suis votre assistante vocale. Je parle français de manière naturelle et professionnelle.')
      .then(() => console.log('✅ Voice test completed'))
      .catch(err => console.error('❌ Voice test failed:', err));
  }

  // ============================================
  // CALLBACKS
  // ============================================

  onResult(callback: (result: VoiceRecognitionResult) => void) {
    this.onResultCallback = callback;
  }

  onError(callback: (error: Error) => void) {
    this.onErrorCallback = callback;
  }

  onStart(callback: () => void) {
    this.onStartCallback = callback;
  }

  onEnd(callback: () => void) {
    this.onEndCallback = callback;
  }

  onSpeakStart(callback: () => void) {
    this.onSpeakStartCallback = callback;
  }

  onSpeakEnd(callback: () => void) {
    this.onSpeakEndCallback = callback;
  }
}

export default new VoiceAssistantService();
