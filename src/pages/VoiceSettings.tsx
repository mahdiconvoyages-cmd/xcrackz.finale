import { useState, useEffect } from 'react';
import { Volume2, Mic, PlayCircle, Settings, CheckCircle } from 'lucide-react';
import VoiceAssistantService from '../services/VoiceAssistantService';

interface VoiceOption {
  voice: SpeechSynthesisVoice;
  quality: 'premium' | 'high' | 'medium' | 'standard';
  type: string;
}

export default function VoiceSettings() {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [pitch, setPitch] = useState(1.05);
  const [rate, setRate] = useState(0.95);
  const [volume, setVolume] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadVoices();
    loadSavedSettings();

    // Recharger les voix si elles changent
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const loadVoices = () => {
    const availableVoices = window.speechSynthesis.getVoices();
    const frenchVoices = availableVoices.filter(voice => 
      voice.lang.toLowerCase().startsWith('fr')
    );

    const categorizedVoices: VoiceOption[] = frenchVoices.map(voice => {
      const name = voice.name.toLowerCase();
      let quality: 'premium' | 'high' | 'medium' | 'standard' = 'standard';
      let type = 'Standard';

      // Catégoriser par qualité
      if (name.includes('neural') || name.includes('wavenet')) {
        quality = 'premium';
        type = 'Neural';
      } else if (name.includes('google') || name.includes('premium') || name.includes('enhanced')) {
        quality = 'high';
        type = 'Premium';
      } else if (!voice.localService) {
        quality = 'medium';
        type = 'Cloud';
      }

      return { voice, quality, type };
    });

    // Trier par qualité
    categorizedVoices.sort((a, b) => {
      const qualityOrder = { premium: 0, high: 1, medium: 2, standard: 3 };
      return qualityOrder[a.quality] - qualityOrder[b.quality];
    });

    setVoices(categorizedVoices);
  };

  const loadSavedSettings = () => {
    const saved = localStorage.getItem('clara_voice_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      setSelectedVoice(settings.voiceName || '');
      setPitch(settings.pitch || 1.05);
      setRate(settings.rate || 0.95);
      setVolume(settings.volume || 1.0);

      // Appliquer au service
      VoiceAssistantService.setConfig({
        pitch: settings.pitch,
        rate: settings.rate,
        volume: settings.volume,
      });
    }
  };

  const saveSettings = (voiceName?: string, newPitch?: number, newRate?: number, newVolume?: number) => {
    const settings = {
      voiceName: voiceName !== undefined ? voiceName : selectedVoice,
      pitch: newPitch !== undefined ? newPitch : pitch,
      rate: newRate !== undefined ? newRate : rate,
      volume: newVolume !== undefined ? newVolume : volume,
    };

    localStorage.setItem('clara_voice_settings', JSON.stringify(settings));
    
    VoiceAssistantService.setConfig({
      pitch: settings.pitch,
      rate: settings.rate,
      volume: settings.volume,
    });
  };

  const testVoice = async (voiceOption?: VoiceOption) => {
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      const testText = "Bonjour ! Je suis Clara, votre assistante virtuelle xCrackz. Comment puis-je vous aider aujourd'hui ?";
      
      if (voiceOption) {
        // Tester une voix spécifique
        const utterance = new SpeechSynthesisUtterance(testText);
        utterance.voice = voiceOption.voice;
        utterance.pitch = pitch;
        utterance.rate = rate;
        utterance.volume = volume;
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
      } else {
        // Tester avec les paramètres actuels
        await VoiceAssistantService.speak(testText, { pitch, rate, volume });
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Erreur test voix:', error);
      setIsPlaying(false);
    }
  };

  const handleVoiceSelect = (voiceName: string) => {
    setSelectedVoice(voiceName);
    saveSettings(voiceName);
  };

  const handlePitchChange = (value: number) => {
    setPitch(value);
    saveSettings(undefined, value);
  };

  const handleRateChange = (value: number) => {
    setRate(value);
    saveSettings(undefined, undefined, value);
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    saveSettings(undefined, undefined, undefined, value);
  };

  const getQualityBadge = (quality: string) => {
    const badges = {
      premium: { text: 'PREMIUM', color: 'from-purple-500 to-pink-500', icon: '✨' },
      high: { text: 'HAUTE QUALITÉ', color: 'from-teal-500 to-cyan-500', icon: '⭐' },
      medium: { text: 'CLOUD', color: 'from-blue-500 to-indigo-500', icon: '☁️' },
      standard: { text: 'STANDARD', color: 'from-slate-500 to-slate-600', icon: '🔊' },
    };
    return badges[quality as keyof typeof badges] || badges.standard;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">Paramètres Vocaux de Clara</h1>
              <p className="text-slate-600">Personnalisez la voix de votre assistante</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Sélection de voix */}
          <div className="backdrop-blur-xl bg-white/90 rounded-3xl p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <Mic className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-black text-slate-900">Choisir une Voix</h2>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {voices.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Chargement des voix...</p>
              ) : (
                voices.map((voiceOption, index) => {
                  const badge = getQualityBadge(voiceOption.quality);
                  const isSelected = selectedVoice === voiceOption.voice.name;

                  return (
                    <div
                      key={index}
                      onClick={() => handleVoiceSelect(voiceOption.voice.name)}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50 shadow-lg'
                          : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900">{voiceOption.voice.name}</h3>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mb-2">
                            {voiceOption.voice.lang} • {voiceOption.voice.localService ? 'Local' : 'Cloud'}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r ${badge.color}`}>
                              {badge.icon} {badge.text}
                            </span>
                            <span className="text-xs font-medium text-slate-600">
                              {voiceOption.type}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            testVoice(voiceOption);
                          }}
                          disabled={isPlaying}
                          className="flex-shrink-0 p-2 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-700 transition-colors disabled:opacity-50"
                        >
                          <PlayCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Réglages avancés */}
          <div className="space-y-6">
            {/* Test général */}
            <div className="backdrop-blur-xl bg-white/90 rounded-3xl p-6 shadow-xl border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <Volume2 className="w-6 h-6 text-teal-600" />
                <h2 className="text-xl font-black text-slate-900">Tester la Configuration</h2>
              </div>
              <button
                onClick={() => testVoice()}
                disabled={isPlaying}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-4 rounded-xl font-black text-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPlaying ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Lecture en cours...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-6 h-6" />
                    Tester la voix
                  </>
                )}
              </button>
            </div>

            {/* Pitch */}
            <div className="backdrop-blur-xl bg-white/90 rounded-3xl p-6 shadow-xl border border-slate-200">
              <div className="mb-4">
                <label className="text-sm font-bold text-slate-900 mb-2 block">
                  Tonalité (Pitch) : {pitch.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.05"
                  value={pitch}
                  onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Grave (0.5)</span>
                  <span>Normal (1.0)</span>
                  <span>Aigu (2.0)</span>
                </div>
              </div>
            </div>

            {/* Rate */}
            <div className="backdrop-blur-xl bg-white/90 rounded-3xl p-6 shadow-xl border border-slate-200">
              <div className="mb-4">
                <label className="text-sm font-bold text-slate-900 mb-2 block">
                  Vitesse (Rate) : {rate.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.05"
                  value={rate}
                  onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Lent (0.5)</span>
                  <span>Normal (1.0)</span>
                  <span>Rapide (2.0)</span>
                </div>
              </div>
            </div>

            {/* Volume */}
            <div className="backdrop-blur-xl bg-white/90 rounded-3xl p-6 shadow-xl border border-slate-200">
              <div className="mb-4">
                <label className="text-sm font-bold text-slate-900 mb-2 block">
                  Volume : {Math.round(volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Muet (0%)</span>
                  <span>Moyen (50%)</span>
                  <span>Max (100%)</span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="backdrop-blur-xl bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong className="text-blue-900">💡 Astuce :</strong> Les voix marquées <strong>PREMIUM</strong> (Google Neural/WaveNet) 
                offrent la meilleure qualité et le rendu le plus naturel. Elles sont disponibles sur Chrome et Edge avec une connexion internet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
