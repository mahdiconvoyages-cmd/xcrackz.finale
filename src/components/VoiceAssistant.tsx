import { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import VoiceAssistantService, { VoiceRecognitionResult } from '../services/VoiceAssistantService';

interface VoiceAssistantProps {
  onTranscript?: (transcript: string) => void;
  onResponse?: (response: string) => void;
  onSendMessage?: (message: string) => Promise<string>;
  className?: string;
}

export default function VoiceAssistant({ 
  onTranscript, 
  onResponse, 
  onSendMessage,
  className = '' 
}: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check browser support
    setIsSupported(VoiceAssistantService.isSupported());

    // Setup callbacks
    VoiceAssistantService.onStart(() => {
      setIsListening(true);
      setTranscript('');
      setInterimTranscript('');
    });

    VoiceAssistantService.onEnd(() => {
      setIsListening(false);
      setInterimTranscript('');
    });

    VoiceAssistantService.onResult(async (result: VoiceRecognitionResult) => {
      if (result.isFinal) {
        setTranscript(result.transcript);
        setInterimTranscript('');
        onTranscript?.(result.transcript);
        
        // Auto-send to AI agent
        if (onSendMessage) {
          await processWithAI(result.transcript);
        }
      } else {
        setInterimTranscript(result.transcript);
      }
    });

    VoiceAssistantService.onError((error: Error) => {
      console.error('Voice error:', error);
      setIsListening(false);
      setInterimTranscript('');
    });

    VoiceAssistantService.onSpeakStart(() => {
      setIsSpeaking(true);
    });

    VoiceAssistantService.onSpeakEnd(() => {
      setIsSpeaking(false);
    });

    return () => {
      VoiceAssistantService.stopListening();
      VoiceAssistantService.stopSpeaking();
    };
  }, [onSendMessage]);

  const processWithAI = async (text: string) => {
    if (!onSendMessage) return;

    try {
      setIsProcessing(true);
      const response = await onSendMessage(text);
      onResponse?.(response);

      // Speak the response
      await VoiceAssistantService.speak(response);
    } catch (error) {
      console.error('AI processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      VoiceAssistantService.stopListening();
    } else {
      VoiceAssistantService.startListening();
    }
  };

  const toggleSpeaking = () => {
    if (isSpeaking) {
      VoiceAssistantService.stopSpeaking();
    }
  };

  if (!isSupported) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <p className="text-sm text-yellow-800">
          ⚠️ La reconnaissance vocale n'est pas supportée par votre navigateur.
          <br />
          Utilisez Chrome, Edge ou Safari pour cette fonctionnalité.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Microphone Button */}
      <div className="flex justify-center">
        <button
          onClick={toggleListening}
          disabled={isProcessing || isSpeaking}
          className={`
            relative p-6 rounded-full transition-all duration-300 
            ${isListening 
              ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600'
            }
            ${(isProcessing || isSpeaking) ? 'opacity-50 cursor-not-allowed' : ''}
            disabled:opacity-50 disabled:cursor-not-allowed
            shadow-lg hover:shadow-xl
          `}
        >
          {isListening ? (
            <Mic className="w-8 h-8 text-white" />
          ) : (
            <MicOff className="w-8 h-8 text-white" />
          )}
          
          {/* Pulse animation when listening */}
          {isListening && (
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
          )}
        </button>
      </div>

      {/* Status Indicators */}
      <div className="flex justify-center gap-4">
        {isListening && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Écoute en cours...</span>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Traitement...</span>
          </div>
        )}

        {isSpeaking && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full">
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">Réponse vocale</span>
            <button
              onClick={toggleSpeaking}
              className="ml-2 p-1 hover:bg-green-200 rounded-full transition-colors"
            >
              <VolumeX className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Transcripts */}
      {(interimTranscript || transcript) && (
        <div className="space-y-2">
          {/* Interim (real-time) */}
          {interimTranscript && (
            <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">En cours de reconnaissance...</p>
              <p className="text-sm text-gray-700 italic">{interimTranscript}</p>
            </div>
          )}

          {/* Final transcript */}
          {transcript && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-600 font-medium mb-1">Vous avez dit :</p>
              <p className="text-sm text-gray-800">{transcript}</p>
            </div>
          )}
        </div>
      )}

      {/* Help text */}
      {!isListening && !transcript && !isSpeaking && (
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Cliquez sur le microphone pour parler à l'agent IA
          </p>
        </div>
      )}
    </div>
  );
}
