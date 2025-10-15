# 🤖 CLARA - Phase 2 : Intégration Complete

## ✅ PHASE 1 TERMINÉE
- ✅ Knowledge Base créée (CLARA_KNOWLEDGE_BASE_COMPLETE.md)
- ✅ 13 outils implémentés (toolsService.ts)
- ✅ Guide d'intégration documenté (CLARA_AGENT_INTERACTIF_GUIDE.md)
- ✅ Tests documentés (CLARA_TESTS_EXAMPLES.md)
- ✅ Erreurs de BDD corrigées (vehicle_make → vehicle_brand, assigned_to → driver_id)

## 🚀 PHASE 2 : INTEGRATION EN COURS

### Étape 1 : Import et executeToolCall ✅ FAIT

**Fichier modifié:** `src/components/ChatAssistant.tsx`

**Ajouts:**
```typescript
// Import
import * as ToolsService from '../services/toolsService';

// Fonction executeToolCall (ligne 173)
const executeToolCall = async (toolName: string, toolArgs: any): Promise<ToolsService.ToolResult> => {
  // Context
  const ctx: ToolsService.ToolExecutionContext = {
    userId: user.id,
    navigate
  };
  
  // Switch pour tous les outils
  switch (toolName) {
    case 'searchCompanyBySiret': return await ToolsService.searchCompanyBySiret(toolArgs.siret);
    case 'createClient': return await ToolsService.createClient(ctx, toolArgs);
    case 'searchClient': return await ToolsService.searchClient(ctx, toolArgs.query);
    case 'listClients': return await ToolsService.listClients(ctx, toolArgs.type);
    case 'generateInvoice': return await ToolsService.generateInvoice(ctx, toolArgs);
    case 'createMission': return await ToolsService.createMission(ctx, toolArgs);
    case 'assignMission': return await ToolsService.assignMission(ctx, toolArgs);
    case 'suggestDriver': return await ToolsService.suggestDriver(ctx, toolArgs);
    case 'listContacts': return await ToolsService.listContacts(ctx, toolArgs.type);
    case 'checkDriverAvailability': return await ToolsService.checkDriverAvailability(ctx, toolArgs.contactId, toolArgs.date);
    case 'checkCredits': return await ToolsService.checkCredits(ctx);
    case 'navigateToPage': return await ToolsService.navigateToPage(ctx, toolArgs.page);
    default: return { success: false, message: `❌ Outil inconnu: ${toolName}` };
  }
};
```

---

### Étape 2 : Modifier aiServiceEnhanced.ts 📋 À FAIRE

**Objectif:** Ajouter les définitions des tools pour DeepSeek function calling

**Fichier à modifier:** `src/services/aiServiceEnhanced.ts`

**Emplacement:** Après la fonction `getSystemPrompt()`, ajouter :

```typescript
/**
 * Définitions des outils pour DeepSeek function calling
 */
const getToolsDefinitions = () => {
  return [
    // === CLIENTS ===
    {
      type: "function",
      function: {
        name: "searchCompanyBySiret",
        description: "Rechercher une entreprise française via l'API Sirene (INSEE) avec son numéro SIRET (14 chiffres). Retourne raison sociale, adresse, SIREN, etc.",
        parameters: {
          type: "object",
          properties: {
            siret: {
              type: "string",
              description: "Numéro SIRET de l'entreprise (14 chiffres)"
            }
          },
          required: ["siret"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "createClient",
        description: "Créer un nouveau client (particulier ou entreprise) dans la base de données",
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["particulier", "entreprise"],
              description: "Type de client"
            },
            name: {
              type: "string",
              description: "Nom complet (particulier) ou raison sociale (entreprise)"
            },
            email: {
              type: "string",
              description: "Email du client (optionnel)"
            },
            phone: {
              type: "string",
              description: "Téléphone du client (optionnel)"
            },
            siret: {
              type: "string",
              description: "SIRET (entreprise uniquement, 14 chiffres)"
            },
            siren: {
              type: "string",
              description: "SIREN (entreprise uniquement, 9 chiffres)"
            },
            address: {
              type: "string",
              description: "Adresse complète"
            },
            city: {
              type: "string",
              description: "Ville"
            },
            postal_code: {
              type: "string",
              description: "Code postal"
            }
          },
          required: ["type", "name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "searchClient",
        description: "Rechercher un client existant par nom, email ou SIRET",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Nom, email ou SIRET à rechercher"
            }
          },
          required: ["query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "listClients",
        description: "Lister tous les clients ou filtrer par type (particulier/entreprise)",
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["particulier", "entreprise"],
              description: "Filtrer par type de client (optionnel)"
            }
          }
        }
      }
    },
    
    // === FACTURATION ===
    {
      type: "function",
      function: {
        name: "generateInvoice",
        description: "Générer une facture ou un devis pour un client. Calcule automatiquement HT→TTC avec TVA 20%",
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["invoice", "quote"],
              description: "Type de document (facture ou devis)"
            },
            client_id: {
              type: "string",
              description: "ID du client (chercher d'abord avec searchClient)"
            },
            amount_ht: {
              type: "number",
              description: "Montant HORS TAXES en euros"
            },
            description: {
              type: "string",
              description: "Description/objet de la facture"
            },
            due_date: {
              type: "string",
              description: "Date d'échéance au format YYYY-MM-DD (optionnel)"
            }
          },
          required: ["type", "client_id", "amount_ht", "description"]
        }
      }
    },
    
    // === MISSIONS ===
    {
      type: "function",
      function: {
        name: "createMission",
        description: "Créer une nouvelle mission de transport. Vérifie automatiquement les crédits (coût: 1 crédit)",
        parameters: {
          type: "object",
          properties: {
            vehicle_brand: {
              type: "string",
              description: "Marque du véhicule (ex: Peugeot, Renault)"
            },
            vehicle_model: {
              type: "string",
              description: "Modèle du véhicule (ex: 308, Clio)"
            },
            vehicle_plate: {
              type: "string",
              description: "Plaque d'immatriculation (optionnel)"
            },
            vehicle_vin: {
              type: "string",
              description: "Numéro VIN (optionnel)"
            },
            pickup_address: {
              type: "string",
              description: "Adresse de départ complète"
            },
            pickup_date: {
              type: "string",
              description: "Date/heure de départ (format YYYY-MM-DD HH:mm)"
            },
            delivery_address: {
              type: "string",
              description: "Adresse d'arrivée complète"
            },
            delivery_date: {
              type: "string",
              description: "Date/heure d'arrivée (optionnel, format YYYY-MM-DD HH:mm)"
            },
            price: {
              type: "number",
              description: "Prix total HT de la mission en euros"
            },
            notes: {
              type: "string",
              description: "Notes supplémentaires (optionnel)"
            }
          },
          required: ["vehicle_brand", "vehicle_model", "pickup_address", "pickup_date", "delivery_address", "price"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "assignMission",
        description: "Assigner une mission à un chauffeur avec répartition du prix (prestataire + commission)",
        parameters: {
          type: "object",
          properties: {
            mission_id: {
              type: "string",
              description: "ID de la mission à assigner"
            },
            contact_id: {
              type: "string",
              description: "ID du chauffeur/contact (chercher avec listContacts)"
            },
            payment_ht: {
              type: "number",
              description: "Montant HT pour le prestataire en euros"
            },
            commission: {
              type: "number",
              description: "Commission gardée en euros (payment_ht + commission doit = prix mission)"
            }
          },
          required: ["mission_id", "contact_id", "payment_ht", "commission"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "suggestDriver",
        description: "Suggérer le meilleur chauffeur pour une mission avec scoring intelligent (disponibilité, permis, proximité)",
        parameters: {
          type: "object",
          properties: {
            mission_id: {
              type: "string",
              description: "ID de la mission (optionnel)"
            },
            vehicle_type: {
              type: "string",
              enum: ["light", "heavy_goods"],
              description: "Type de véhicule (léger ou poids lourd)"
            },
            departure_city: {
              type: "string",
              description: "Ville de départ"
            },
            departure_date: {
              type: "string",
              description: "Date de départ (format YYYY-MM-DD)"
            }
          },
          required: ["vehicle_type", "departure_city", "departure_date"]
        }
      }
    },
    
    // === CONTACTS ===
    {
      type: "function",
      function: {
        name: "listContacts",
        description: "Lister tous les contacts ou filtrer par type (client, driver, supplier)",
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["client", "driver", "supplier"],
              description: "Filtrer par type de contact (optionnel)"
            }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "checkDriverAvailability",
        description: "Vérifier la disponibilité d'un chauffeur via son calendrier",
        parameters: {
          type: "object",
          properties: {
            contactId: {
              type: "string",
              description: "ID du chauffeur"
            },
            date: {
              type: "string",
              description: "Date à vérifier (format YYYY-MM-DD)"
            }
          },
          required: ["contactId", "date"]
        }
      }
    },
    
    // === CRÉDITS ===
    {
      type: "function",
      function: {
        name: "checkCredits",
        description: "Vérifier le solde de crédits de l'utilisateur",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    },
    
    // === NAVIGATION ===
    {
      type: "function",
      function: {
        name: "navigateToPage",
        description: "Rediriger l'utilisateur vers une page de l'application",
        parameters: {
          type: "object",
          properties: {
            page: {
              type: "string",
              enum: ["/", "/missions", "/contacts", "/clients", "/invoices", "/shop", "/dashboard", "/planning", "/covoiturage", "/rapports-inspection"],
              description: "Chemin de la page"
            }
          },
          required: ["page"]
        }
      }
    }
  ];
};
```

**Ensuite, modifier la fonction `askAssistant()`:**

Localiser la ligne où on appelle l'API DeepSeek (environ ligne 400-500) et AJOUTER le paramètre `tools`:

```typescript
// AVANT (ligne ~450)
const response = await fetch(DEEPSEEK_API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: conversationHistory,
    temperature: 0.7,
    max_tokens: 2000,
  }),
});

// APRÈS (avec tools)
const response = await fetch(DEEPSEEK_API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: conversationHistory,
    temperature: 0.7,
    max_tokens: 2000,
    tools: getToolsDefinitions(), // ⭐ NOUVEAU
    tool_choice: 'auto' // ⭐ NOUVEAU - DeepSeek décide automatiquement
  }),
});
```

---

### Étape 3 : Gérer les tool_calls dans la réponse 📋 À FAIRE

**Dans aiServiceEnhanced.ts**, après avoir reçu la réponse de DeepSeek :

```typescript
const data = await response.json();
const message = data.choices[0]?.message;

// ⭐ NOUVEAU : Vérifier si DeepSeek veut utiliser des outils
if (message.tool_calls && message.tool_calls.length > 0) {
  // Retourner les tool calls pour que ChatAssistant les exécute
  return {
    message: message.content || "Je vais exécuter cette action...",
    toolCalls: message.tool_calls.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments)
    }))
  };
}

// Sinon, réponse normale
return {
  message: message.content,
  actions: [],
  documents: [],
};
```

---

### Étape 4 : Modifier handleSend dans ChatAssistant 📋 À FAIRE

**Dans `src/components/ChatAssistant.tsx`**, modifier la section qui appelle `askAssistant()` :

```typescript
// Obtenir réponse IA avec Clara
const response = await askAssistant(
  fullMessage,
  messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
  user,
  credits
);

// ⭐ NOUVEAU : Vérifier si DeepSeek veut utiliser des outils
if (response.toolCalls && response.toolCalls.length > 0) {
  // Exécuter chaque tool call
  for (const toolCall of response.toolCalls) {
    const toolResult = await executeToolCall(toolCall.name, toolCall.arguments);
    
    // Afficher le résultat à l'utilisateur
    const toolResultMsg: AIMessage = {
      role: 'assistant',
      content: toolResult.message
    };
    
    setMessages(prev => [...prev, toolResultMsg]);
    
    if (conversationId) {
      await saveMessage(conversationId, 'assistant', toolResult.message);
    }
    
    // Rediriger si nécessaire
    if (toolResult.redirect) {
      setTimeout(() => navigate(toolResult.redirect!), 1500);
    }
  }
} else {
  // Réponse normale sans tool call
  const assistantMsg: AIMessage = {
    role: 'assistant',
    content: response.message
  };
  
  setMessages(prev => [...prev, assistantMsg]);
  
  if (conversationId) {
    await saveMessage(conversationId, 'assistant', response.message);
  }
  
  await speakResponse(response.message);
}
```

---

## 📊 PROCHAINES ÉTAPES

### Étape 5 : Composants UI (Optionnel)
- Créer `ActionCard.tsx` pour afficher les actions visuellement
- Créer `ConfirmationModal.tsx` pour confirmer avant exécution

### Étape 6 : Tests
- Tester chaque outil individuellement
- Tester les workflows complets
- Vérifier la gestion d'erreurs

### Étape 7 : Outils additionnels (Phase 3)
- Covoiturage (4 outils)
- Rapports d'inspection (4 outils)
- Planning (4 outils)
- Missions avancées (4 outils)

---

## 🎯 TESTS RAPIDES À FAIRE

Une fois l'intégration terminée, teste ces phrases :

```
1. "Cherche l'entreprise avec le SIRET 12345678901234"
2. "Crée un client entreprise Apple France"
3. "Liste tous mes clients"
4. "Vérifie mes crédits"
5. "Crée une mission pour un Peugeot 308 de Paris à Lyon"
6. "Suggère-moi un chauffeur pour demain à Paris"
7. "Liste mes contacts chauffeurs"
8. "Va sur la page missions"
9. "Génère une facture de 500€ pour Apple"
```

---

## ✅ CHECKLIST D'INTÉGRATION

- [x] **Phase 1 terminée**
  - [x] Knowledge base
  - [x] 13 outils implémentés
  - [x] Erreurs BDD corrigées
  
- [x] **Étape 1** : executeToolCall créé dans ChatAssistant.tsx
- [ ] **Étape 2** : getToolsDefinitions() ajouté dans aiServiceEnhanced.ts
- [ ] **Étape 3** : Gestion tool_calls dans réponse DeepSeek
- [ ] **Étape 4** : handleSend modifié pour exécuter les tools
- [ ] **Étape 5** : Tests fonctionnels
- [ ] **Étape 6** : UI ActionCard/ConfirmationModal (optionnel)

---

## 📝 NOTES IMPORTANTES

1. **DeepSeek Function Calling** : Utilise le format standard OpenAI
2. **Contexte utilisateur** : Passé via `ToolExecutionContext` (userId, navigate)
3. **Gestion d'erreurs** : Chaque outil retourne `{ success, message, data?, redirect? }`
4. **Crédits** : Vérifiés automatiquement dans `createMission()`
5. **Navigation** : Gérée via `navigate` de React Router

---

## 🚀 COMMANDES POUR CONTINUER

Pour implémenter les étapes 2-4, il faut modifier :
1. `src/services/aiServiceEnhanced.ts` (ajouter getToolsDefinitions + gérer tool_calls)
2. `src/components/ChatAssistant.tsx` (modifier handleSend)

Veux-tu que je le fasse maintenant ? 🤖
