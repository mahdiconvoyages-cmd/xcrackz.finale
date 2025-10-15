# 🐛 DEBUG Clara - Guide de Dépannage

## ❌ Problème: Clara répond toujours "Oups ! 😅"

### 🔍 Étape 1: Vérifier la Console

1. **Ouvrir la console du navigateur**
   - Appuyez sur `F12`
   - Onglet "Console"

2. **Chercher les messages**
   ```
   🤖 Calling DeepSeek API...
   📡 Response status: ???
   ❌ API Error: ???
   ```

3. **Analyser l'erreur**

---

## 🔧 Solutions par Type d'Erreur

### Erreur 401 - Unauthorized
```
❌ API Error: 401 - Invalid API Key
```

**Cause**: API Key invalide ou expirée

**Solution**:
1. Vérifier la clé API dans `aiServiceEnhanced.ts`
2. Tester la clé sur [DeepSeek Platform](https://platform.deepseek.com/)
3. Régénérer une nouvelle clé si nécessaire

---

### Erreur 429 - Rate Limit
```
❌ API Error: 429 - Rate limit exceeded
```

**Cause**: Trop de requêtes, quota dépassé

**Solution**:
1. Attendre quelques minutes
2. Vérifier le quota sur [DeepSeek Dashboard](https://platform.deepseek.com/usage)
3. Augmenter le quota si nécessaire

---

### Erreur 400 - Bad Request
```
❌ API Error: 400 - Invalid request
```

**Cause**: Format de requête incorrect

**Solution**:
1. Vérifier le format des messages
2. Vérifier que `model: 'deepseek-chat'` est correct
3. Vérifier les headers

---

### Erreur CORS
```
❌ CORS error: blocked by CORS policy
```

**Cause**: Problème de configuration CORS

**Solution**:
1. L'API DeepSeek devrait accepter les requêtes du navigateur
2. Si problème persiste, créer un proxy backend
3. Ou utiliser l'API via Supabase Edge Function

---

### Erreur Network
```
❌ Network error: Failed to fetch
```

**Cause**: Problème de connexion internet ou API indisponible

**Solution**:
1. Vérifier votre connexion internet
2. Vérifier que `https://api.deepseek.com` est accessible
3. Tester avec `curl` :
   ```bash
   curl https://api.deepseek.com/v1/chat/completions
   ```

---

## 🧪 Test Manuel de l'API

### Test avec curl (Windows PowerShell)

```powershell
$headers = @{
    "Authorization" = "Bearer sk-f091258152ee4d5983ff2431b2398e43"
    "Content-Type" = "application/json"
}

$body = @{
    model = "deepseek-chat"
    messages = @(
        @{
            role = "system"
            content = "Tu es Clara, assistante IA."
        },
        @{
            role = "user"
            content = "Bonjour"
        }
    )
    temperature = 0.7
    max_tokens = 100
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://api.deepseek.com/v1/chat/completions" -Method Post -Headers $headers -Body $body
```

**Résultat attendu** :
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Bonjour ! Comment puis-je t'aider ?"
      }
    }
  ]
}
```

---

## 🔍 Vérifications Supplémentaires

### 1. Vérifier l'API Key

**Dans le fichier** `src/services/aiServiceEnhanced.ts` :
```typescript
const DEEPSEEK_API_KEY = 'sk-f091258152ee4d5983ff2431b2398e43';
```

**Tester** :
- La clé commence par `sk-`
- La clé fait ~50 caractères
- Pas d'espaces avant/après

### 2. Vérifier Supabase

**Problème possible** : Erreur lors de la récupération des données utilisateur

**Console logs à chercher** :
```
Error fetching user data
Error fetching subscription
```

**Solution** :
1. Vérifier que l'utilisateur est connecté
2. Vérifier les tables Supabase :
   - `users`
   - `subscriptions`

### 3. Vérifier le Format des Messages

**Dans la console**, vérifier :
```javascript
Messages count: X
```

Si `X = 0` → Problème de construction des messages

---

## 🛠️ Solution Temporaire: Fallback

Si l'API ne fonctionne pas, voici un fallback temporaire :

**Dans `aiServiceEnhanced.ts`**, ajouter après la ligne 150 :

```typescript
// TEMPORAIRE: Fallback si API ne répond pas
if (!response.ok) {
  console.warn('⚠️ API non disponible, utilisation du fallback');
  
  // Réponse prédéfinie selon le message
  const fallbackResponse = getFallbackResponse(userMessage);
  
  return {
    message: fallbackResponse,
    actions: await extractActions(userMessage, userId, credits),
  };
}
```

**Ajouter la fonction** :

```typescript
function getFallbackResponse(message: string): string {
  const lower = message.toLowerCase();
  
  if (lower.includes('bonjour') || lower.includes('salut')) {
    return "👋 Salut ! Je suis Clara, ton assistante IA xCrackz. Comment puis-je t'aider aujourd'hui ? 😊";
  }
  
  if (lower.includes('mission')) {
    return "Je peux t'aider à créer une mission ! 📋 J'ai besoin de:\n• L'adresse de départ\n• L'adresse d'arrivée\n• La date et l'heure";
  }
  
  if (lower.includes('facture')) {
    return "Je peux générer une facture pour toi ! 📄 Pour quel client ?";
  }
  
  if (lower.includes('où est') || lower.includes('localiser')) {
    return "Je peux localiser tes véhicules ! 🚗 Quel numéro de mission ou véhicule cherches-tu ?";
  }
  
  return "Je suis là pour t'aider ! 😊 Je peux:\n• Créer des missions\n• Localiser des véhicules\n• Générer des factures\n• Créer des rapports\n\nQue veux-tu faire ?";
}
```

---

## 📊 Checklist de Débogage

- [ ] Console ouverte (F12)
- [ ] Messages de log visibles
- [ ] Status code de la réponse noté
- [ ] Message d'erreur copié
- [ ] API Key vérifiée
- [ ] Quota DeepSeek vérifié
- [ ] Connexion internet OK
- [ ] Tables Supabase accessibles
- [ ] Utilisateur connecté

---

## 🆘 Si Rien ne Fonctionne

### Option 1: Utiliser l'Ancien Service

Temporairement, revenir à `aiService.ts` :

**Dans `ChatAssistant.tsx`** :
```typescript
// Temporairement utiliser l'ancien service
import { askXcrackzAssistant } from '../services/aiService';

// Dans handleSend()
const response = await askXcrackzAssistant(userMessage, {}, messages);
```

### Option 2: Créer une Edge Function

Déplacer l'appel API vers Supabase Edge Function pour éviter CORS :

```typescript
// supabase/functions/chat-assistant/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { message, userId } = await req.json()
  
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer sk-...',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({...})
  })
  
  return new Response(JSON.stringify(await response.json()))
})
```

---

## 📞 Contact Support

Si le problème persiste :

1. **Copier** :
   - Message d'erreur complet
   - Status code
   - Headers de la requête

2. **Vérifier** :
   - [DeepSeek Status](https://status.deepseek.com)
   - [DeepSeek Discord](https://discord.gg/deepseek)

3. **Documenter** :
   - Heure de l'erreur
   - Navigateur utilisé
   - Message envoyé à Clara

---

## ✅ Test de Validation

Une fois le problème résolu, tester :

```
1. Ouvrir chat Clara
2. Dire: "Bonjour"
3. Vérifier console:
   ✅ 🤖 Calling DeepSeek API...
   ✅ 📡 Response status: 200
   ✅ ✅ API Response received

4. Clara répond normalement
```

---

**Prochaine étape** : Ouvrez la console (F12) et testez Clara maintenant !
Les logs détaillés vous diront exactement quel est le problème. 🔍
