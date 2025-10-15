# 🎤 Voice Assistant - Agent IA Web

## ✅ Fichiers Créés

### 1. Service Voice Assistant
**Fichier** : `src/services/VoiceAssistantService.ts`

Service complet qui gère :
- 🎤 **Speech-to-Text** : Reconnaissance vocale via Web Speech API
- 🔊 **Text-to-Speech** : Synthèse vocale pour les réponses
- ⚙️ Configuration (langue, pitch, rate, volume)
- 🔄 Gestion des états (listening, speaking)

### 2. Composant UI
**Fichier** : `src/components/VoiceAssistant.tsx`

Composant React avec :
- 🎨 Bouton microphone animé (pulse quand écoute)
- 📊 Indicateurs d'état visuels
- 💬 Affichage transcript en temps réel (interim + final)
- 🛑 Bouton pour arrêter la voix
- ⚠️ Message d'avertissement si navigateur non supporté

---

## 📋 Intégration dans votre Agent IA

### Option 1 : Intégration Simple (Dans une page existante)

Ouvrez votre page Agent IA (par exemple `src/pages/AIAgentChat.tsx` ou similaire) et ajoutez :

```typescript
import { useState } from 'react';
import VoiceAssistant from '../components/VoiceAssistant';
import { sendMessageToAI } from '../services/AIService'; // Votre service IA existant

export default function AIAgentChat() {
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [showVoiceMode, setShowVoiceMode] = useState(false);

  const handleSendMessage = async (message: string): Promise<string> => {
    // Ajouter le message de l'utilisateur
    setMessages(prev => [...prev, { role: 'user', content: message }]);

    // Appeler votre API IA (DeepSeek, GPT, etc.)
    const response = await sendMessageToAI(message);

    // Ajouter la réponse de l'IA
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);

    return response;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Agent IA</h1>
        
        {/* Toggle Voice/Text Mode */}
        <button
          onClick={() => setShowVoiceMode(!showVoiceMode)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {showVoiceMode ? '💬 Mode Texte' : '🎤 Mode Vocal'}
        </button>
      </div>

      {/* Messages History */}
      <div className="space-y-4 mb-6">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-lg ${
              msg.role === 'user' 
                ? 'bg-blue-100 ml-auto max-w-[80%]' 
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <p className="text-sm font-medium mb-1">
              {msg.role === 'user' ? 'Vous' : 'Agent IA'}
            </p>
            <p>{msg.content}</p>
          </div>
        ))}
      </div>

      {/* Voice Assistant */}
      {showVoiceMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-6">
          <VoiceAssistant
            onSendMessage={handleSendMessage}
            className="max-w-2xl mx-auto"
          />
        </div>
      )}

      {/* Text Input (when not in voice mode) */}
      {!showVoiceMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="max-w-2xl mx-auto flex gap-2">
            <input
              type="text"
              placeholder="Tapez votre message..."
              className="flex-1 px-4 py-2 border rounded-lg"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  handleSendMessage(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
            <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 🎯 Utilisation Directe du Service

Si vous voulez utiliser le service directement sans le composant UI :

```typescript
import VoiceAssistantService from '../services/VoiceAssistantService';

// Configuration
VoiceAssistantService.setConfig({
  language: 'fr-FR',
  pitch: 1.0,
  rate: 0.9,
  volume: 1.0
});

// Écouter
VoiceAssistantService.onResult((result) => {
  if (result.isFinal) {
    console.log('Utilisateur a dit:', result.transcript);
    // Envoyer à l'IA...
  }
});

VoiceAssistantService.startListening();

// Parler
await VoiceAssistantService.speak("Bonjour, je suis votre assistant IA");

// Arrêter
VoiceAssistantService.stopListening();
VoiceAssistantService.stopSpeaking();
```

---

## 🌐 Compatibilité Navigateurs

| Navigateur | Speech-to-Text | Text-to-Speech |
|------------|----------------|----------------|
| Chrome     | ✅ Oui         | ✅ Oui         |
| Edge       | ✅ Oui         | ✅ Oui         |
| Safari     | ✅ Oui         | ✅ Oui         |
| Firefox    | ❌ Non         | ✅ Oui         |

**Note** : Le composant affiche automatiquement un message d'avertissement si le navigateur ne supporte pas la reconnaissance vocale.

---

## ⚙️ Configuration Avancée

### Changer la langue

```typescript
VoiceAssistantService.setConfig({ language: 'en-US' }); // Anglais
VoiceAssistantService.setConfig({ language: 'es-ES' }); // Espagnol
```

### Ajuster la voix

```typescript
VoiceAssistantService.setConfig({
  pitch: 1.2,  // Plus aigu (0.0 - 2.0)
  rate: 1.0,   // Vitesse (0.1 - 10)
  volume: 0.8  // Volume (0.0 - 1.0)
});
```

### Obtenir les voix disponibles

```typescript
const voices = VoiceAssistantService.getAvailableVoices();
const frenchVoices = VoiceAssistantService.getFrenchVoices();

console.log('Voix françaises:', frenchVoices);
```

---

## 🎤 Commandes Vocales Suggérées

Exemples de commandes que les utilisateurs peuvent dire :

### Navigation
- "Quelle est ma prochaine mission ?"
- "Où dois-je aller ?"
- "Calcule l'itinéraire"

### État
- "Affiche mes missions"
- "Quel est le statut ?"
- "Montre l'historique"

### Actions
- "Démarre la mission"
- "Termine la mission"
- "Signale un problème"

---

## 🔧 Exemple Complet

Voici un exemple complet d'intégration avec DeepSeek AI :

```typescript
import { useState } from 'react';
import VoiceAssistant from '../components/VoiceAssistant';

export default function DeepSeekVoiceChat() {
  const [conversation, setConversation] = useState<Array<{role: string, content: string}>>([]);

  const sendToDeepSeek = async (message: string): Promise<string> => {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_API_KEY'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            ...conversation,
            { role: 'user', content: message }
          ]
        })
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // Update conversation
      setConversation(prev => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      ]);

      return aiResponse;
    } catch (error) {
      console.error('DeepSeek error:', error);
      return "Désolé, une erreur s'est produite.";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          🤖 Agent IA Vocal (DeepSeek)
        </h1>

        {/* Conversation History */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 max-h-96 overflow-y-auto">
          {conversation.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div
                className={`inline-block p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Voice Assistant */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <VoiceAssistant
            onSendMessage={sendToDeepSeek}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ Checklist d'Intégration

- [x] Service VoiceAssistantService.ts créé
- [x] Composant VoiceAssistant.tsx créé
- [ ] Intégré dans votre page Agent IA
- [ ] Testé sur Chrome/Edge
- [ ] Connecté à votre API IA (DeepSeek/GPT)
- [ ] Testé la reconnaissance vocale en français
- [ ] Testé la synthèse vocale des réponses

---

## 🚀 Prochaines Étapes

1. **Ouvrez votre fichier d'Agent IA** (probablement dans `src/pages/`)
2. **Importez le composant** : `import VoiceAssistant from '../components/VoiceAssistant'`
3. **Ajoutez-le** avec le prop `onSendMessage`
4. **Testez** dans Chrome ou Edge
5. **Personnalisez** les couleurs et animations si besoin

---

**Besoin d'aide ?** Le service est prêt à l'emploi, il suffit de l'intégrer dans votre interface existante ! 🎤🔊
