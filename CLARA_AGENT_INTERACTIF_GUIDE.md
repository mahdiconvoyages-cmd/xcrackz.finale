# 🤖 CLARA - Agent IA Interactif

## 📝 Vue d'ensemble

Clara est l'assistante IA de xCrackz qui peut **interagir activement** avec votre site web. Elle ne se contente pas de répondre aux questions, elle peut **exécuter des actions concrètes**.

---

## ✅ État Actuel

### Capacités Implémentées

#### 1. **Connaissance du Projet** 🧠
- ✅ Connaît toutes les tables de la base de données
- ✅ Comprend l'architecture complète (React, Supabase, TypeScript)
- ✅ Connaît les rôles et permissions (user, driver, admin)
- ✅ Sait utiliser les API externes (Sirene, DeepSeek, Google Maps)
- ✅ Comprend le système de crédits et abonnements
- ✅ Connaît toutes les pages et fonctionnalités

**Fichiers:**
- `CLARA_KNOWLEDGE_BASE_COMPLETE.md` - Documentation complète du projet

#### 2. **Chat Conversationnel** 💬
- ✅ Interface chat dans `ChatAssistant.tsx`
- ✅ Historique de conversations sauvegardé
- ✅ Synthèse vocale (lecture des réponses)
- ✅ Reconnaissance vocale (dictée)
- ✅ Pièces jointes (fichiers, images)
- ✅ Support multi-conversations

**Fichiers:**
- `src/components/ChatAssistant.tsx`
- `src/services/aiServiceEnhanced.ts`
- `src/services/VoiceAssistantService.ts`

#### 3. **Outils Exécutables** ⚙️
Clara peut maintenant **exécuter des actions** via le service `toolsService.ts`:

**Clients:**
- ✅ `searchCompanyBySiret()` - Rechercher entreprise via API Sirene
- ✅ `createClient()` - Créer un client (particulier/entreprise)
- ✅ `searchClient()` - Rechercher un client existant
- ✅ `listClients()` - Lister tous les clients

**Facturation:**
- ✅ `generateInvoice()` - Générer facture/devis

**Missions:**
- ✅ `createMission()` - Créer une mission (vérif crédits)
- ✅ `assignMission()` - Assigner mission à chauffeur
- ✅ `suggestDriver()` - Suggérer meilleur chauffeur

**Contacts:**
- ✅ `listContacts()` - Lister contacts
- ✅ `checkDriverAvailability()` - Vérifier disponibilité

**Crédits:**
- ✅ `checkCredits()` - Vérifier solde

**Navigation:**
- ✅ `navigateToPage()` - Rediriger vers une page

**Fichiers:**
- `src/services/toolsService.ts` - Service d'outils

---

## 🔧 Améliorations à Implémenter

### Priorité 1: Intégration des Outils dans ChatAssistant

**Objectif:** Permettre à Clara d'appeler les outils automatiquement.

**Étapes:**

1. **Modifier `ChatAssistant.tsx`** pour ajouter un gestionnaire d'outils:

```typescript
import ToolsService, { ToolExecutionContext } from '../services/toolsService';

// Dans le composant ChatAssistant:
const executeToolCall = async (toolName: string, parameters: any) => {
  const ctx: ToolExecutionContext = {
    userId: user!.id,
    navigate,
    userMetadata: user!.user_metadata
  };

  let result;
  
  switch (toolName) {
    // Clients
    case 'search_company_by_siret':
      result = await ToolsService.searchCompanyBySiret(parameters.siret);
      break;
    case 'create_client':
      result = await ToolsService.createClient(ctx, parameters);
      break;
    case 'search_client':
      result = await ToolsService.searchClient(ctx, parameters.query);
      break;
    case 'list_clients':
      result = await ToolsService.listClients(ctx, parameters.type);
      break;
      
    // Facturation
    case 'generate_invoice':
      result = await ToolsService.generateInvoice(ctx, parameters);
      break;
      
    // Missions
    case 'create_mission':
      result = await ToolsService.createMission(ctx, parameters);
      break;
    case 'assign_mission':
      result = await ToolsService.assignMission(ctx, parameters);
      break;
    case 'suggest_driver':
      result = await ToolsService.suggestDriver(ctx, parameters);
      break;
      
    // Contacts
    case 'list_contacts':
      result = await ToolsService.listContacts(ctx, parameters.type);
      break;
    case 'check_driver_availability':
      result = await ToolsService.checkDriverAvailability(ctx, parameters.contact_id, parameters.date);
      break;
      
    // Crédits
    case 'check_credits':
      result = await ToolsService.checkCredits(ctx);
      break;
      
    // Navigation
    case 'navigate_to_page':
      result = await ToolsService.navigateToPage(ctx, parameters.page);
      break;
      
    default:
      result = {
        success: false,
        message: `❌ Outil inconnu: ${toolName}`
      };
  }

  return result;
};
```

2. **Modifier `aiServiceEnhanced.ts`** pour définir les outils disponibles:

```typescript
// Ajouter les définitions d'outils pour DeepSeek
const tools = [
  {
    type: 'function',
    function: {
      name: 'create_client',
      description: 'Créer un nouveau client (particulier ou entreprise)',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['individual', 'company'],
            description: 'Type de client'
          },
          first_name: {
            type: 'string',
            description: 'Prénom (particulier uniquement)'
          },
          last_name: {
            type: 'string',
            description: 'Nom (particulier uniquement)'
          },
          company_name: {
            type: 'string',
            description: 'Raison sociale (entreprise uniquement)'
          },
          siret: {
            type: 'string',
            description: 'SIRET (entreprise, 14 chiffres)'
          },
          email: {
            type: 'string',
            description: 'Email du client'
          },
          phone: {
            type: 'string',
            description: 'Téléphone du client'
          }
        },
        required: ['type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_mission',
      description: 'Créer une nouvelle mission (coût: 1 crédit)',
      parameters: {
        type: 'object',
        properties: {
          vehicle_brand: { type: 'string', description: 'Marque du véhicule' },
          vehicle_model: { type: 'string', description: 'Modèle du véhicule' },
          pickup_address: { type: 'string', description: 'Adresse de départ' },
          pickup_date: { type: 'string', description: 'Date/heure départ (ISO 8601)' },
          delivery_address: { type: 'string', description: 'Adresse d\'arrivée' },
          price: { type: 'number', description: 'Prix de la mission (HT)' }
        },
        required: ['vehicle_brand', 'vehicle_model', 'pickup_address', 'pickup_date', 'delivery_address', 'price']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'suggest_driver',
      description: 'Suggérer le meilleur chauffeur pour une mission',
      parameters: {
        type: 'object',
        properties: {
          vehicle_type: {
            type: 'string',
            enum: ['light', 'heavy_goods'],
            description: 'Type de véhicule (léger ou poids lourd)'
          },
          departure_city: { type: 'string', description: 'Ville de départ' },
          departure_date: { type: 'string', description: 'Date de départ (YYYY-MM-DD)' }
        },
        required: ['vehicle_type', 'departure_city', 'departure_date']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_credits',
      description: 'Vérifier le solde de crédits de l\'utilisateur',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_contacts',
      description: 'Lister tous les contacts',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['customer', 'driver', 'supplier', 'personal', 'all'],
            description: 'Type de contacts à lister'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigate_to_page',
      description: 'Rediriger l\'utilisateur vers une page',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: ['/dashboard', '/missions', '/billing', '/contacts', '/covoiturage', '/rapports-inspection', '/shop'],
            description: 'Page de destination'
          }
        },
        required: ['page']
      }
    }
  }
];

// Dans askAssistant, ajouter tools à l'appel DeepSeek
const response = await fetch(DEEPSEEK_API_URL, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: conversationHistory,
    temperature: 0.7,
    tools: tools, // ← AJOUTER ICI
    tool_choice: 'auto' // Clara décide si elle doit appeler un outil
  }),
});
```

3. **Gérer les réponses avec tool_calls**:

```typescript
const data = await response.json();

// Vérifier si Clara veut appeler un outil
if (data.choices[0].message.tool_calls) {
  const toolCalls = data.choices[0].message.tool_calls;
  
  for (const toolCall of toolCalls) {
    const toolName = toolCall.function.name;
    const parameters = JSON.parse(toolCall.function.arguments);
    
    // Exécuter l'outil
    const result = await executeToolCall(toolName, parameters);
    
    // Ajouter le résultat à la conversation
    conversationHistory.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      name: toolName,
      content: JSON.stringify(result)
    });
  }
  
  // Faire un 2ème appel pour obtenir la réponse finale
  const finalResponse = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: conversationHistory,
      temperature: 0.7
    }),
  });
  
  const finalData = await finalResponse.json();
  return {
    message: finalData.choices[0].message.content
  };
}
```

---

### Priorité 2: Ajouter Plus d'Outils

**Outils Manquants:**

1. **Covoiturage:**
   - `searchCarpooling()` - Rechercher trajets
   - `publishCarpooling()` - Publier trajet
   - `bookCarpooling()` - Réserver trajet
   - `listMyTrips()` - Lister mes trajets

2. **Rapports d'Inspection:**
   - `listInspectionReports()` - Lister rapports
   - `viewInspectionReport()` - Consulter rapport
   - `sendInspectionReport()` - Envoyer par email
   - `downloadInspectionPhotos()` - Télécharger photos

3. **Revenus:**
   - `getMonthlyRevenue()` - Afficher revenu du mois
   - `getRevenueDetails()` - Détails par mission

4. **Calendrier:**
   - `viewContactPlanning()` - Consulter planning contact
   - `modifyContactPlanning()` - Modifier planning
   - `getWeeklyAvailabilityStats()` - Stats disponibilité

5. **Tracking:**
   - `trackVehicle()` - Localiser véhicule
   - `estimateArrival()` - Calculer ETA

6. **Missions (compléments):**
   - `analyzeMission()` - Analyser état mission
   - `listMissionReports()` - Lister rapports missions
   - `updateMissionStatus()` - Mettre à jour statut

**Fichier à modifier:**
- `src/services/toolsService.ts`

---

### Priorité 3: Interface Utilisateur Améliorée

**Objectif:** Afficher les actions de Clara de manière visuelle.

**Composants à créer:**

1. **ActionCard.tsx** - Carte d'action exécutée:
```typescript
interface ActionCardProps {
  action: {
    type: string;
    description: string;
    status: 'pending' | 'success' | 'error';
    result?: string;
  };
}

export function ActionCard({ action }: ActionCardProps) {
  return (
    <div className={`p-4 rounded-2xl ${
      action.status === 'success' ? 'bg-green-50 border-green-200' :
      action.status === 'error' ? 'bg-red-50 border-red-200' :
      'bg-blue-50 border-blue-200'
    } border-2`}>
      <div className="flex items-center space-x-3">
        {action.status === 'success' && <CheckCircle className="w-6 h-6 text-green-600" />}
        {action.status === 'error' && <XCircle className="w-6 h-6 text-red-600" />}
        {action.status === 'pending' && <Loader className="w-6 h-6 text-blue-600 animate-spin" />}
        
        <div className="flex-1">
          <p className="font-medium text-gray-900">{action.description}</p>
          {action.result && (
            <p className="text-sm text-gray-600 mt-1">{action.result}</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

2. **ConfirmationModal.tsx** - Confirmation avant action:
```typescript
interface ConfirmationModalProps {
  action: {
    type: string;
    description: string;
    data: any;
  };
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({ action, onConfirm, onCancel }: ConfirmationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-6 max-w-md">
        <h3 className="text-xl font-bold mb-4">Confirmation requise</h3>
        <p className="text-gray-600 mb-6">{action.description}</p>
        
        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
          <pre className="text-sm text-gray-800">
            {JSON.stringify(action.data, null, 2)}
          </pre>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-xl"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
```

3. **Modifier ChatAssistant.tsx** pour utiliser ces composants:
```typescript
// Afficher les actions dans les messages
{message.actions && message.actions.length > 0 && (
  <div className="space-y-2 mt-3">
    {message.actions.map((action, idx) => (
      <ActionCard key={idx} action={action} />
    ))}
  </div>
)}
```

---

### Priorité 4: Tests et Validation

**Scénarios de test:**

1. **Test Création Client:**
   - User: "Crée un client avec le SIRET 12345678900014"
   - Clara: Appelle `searchCompanyBySiret()`
   - Clara: Affiche infos entreprise
   - Clara: Demande email/téléphone
   - User: Donne email/téléphone
   - Clara: Appelle `createClient()`
   - Clara: Confirme création

2. **Test Création Mission:**
   - User: "Crée une mission pour un BMW Série 3 de Paris à Lyon"
   - Clara: Vérifie crédits (appelle `checkCredits()`)
   - Clara: Demande détails (dates, prix)
   - User: Donne détails
   - Clara: Appelle `createMission()`
   - Clara: Confirme création + redirige vers /missions

3. **Test Suggestion Chauffeur:**
   - User: "Quel chauffeur pour cette mission ?"
   - Clara: Appelle `suggestDriver()`
   - Clara: Analyse tous les chauffeurs
   - Clara: Affiche top 3 avec scores
   - Clara: Recommande le meilleur

4. **Test Navigation:**
   - User: "Va dans ma facturation"
   - Clara: Appelle `navigateToPage('/billing')`
   - Clara: Redirige vers /billing

**Fichier de tests à créer:**
- `src/tests/clara-tools.test.ts`

---

## 📊 Métriques de Succès

### Indicateurs à suivre:

1. **Taux d'Exécution Réussie:**
   - Objectif: >95% des actions aboutissent

2. **Temps Moyen de Réponse:**
   - Objectif: <2 secondes

3. **Nombre d'Actions par Conversation:**
   - Objectif: 1-3 actions/conversation

4. **Satisfaction Utilisateur:**
   - Sondage après interaction
   - Objectif: >4.5/5

5. **Taux d'Erreur:**
   - Objectif: <5%

---

## 🚀 Roadmap

### Phase 1 (Semaine 1-2): ✅ FAIT
- [x] Knowledge base complète
- [x] Service d'outils basique
- [x] Outils clients/missions/crédits

### Phase 2 (Semaine 3-4): 🔄 EN COURS
- [ ] Intégration outils dans ChatAssistant
- [ ] Définition outils DeepSeek
- [ ] Gestion tool_calls
- [ ] Tests basiques

### Phase 3 (Semaine 5-6): 📅 PROCHAINE
- [ ] Outils covoiturage
- [ ] Outils rapports inspection
- [ ] Outils calendrier
- [ ] Interface ActionCard/ConfirmationModal

### Phase 4 (Semaine 7-8): 📅 FUTURE
- [ ] Analytics Clara
- [ ] Amélioration prompts
- [ ] Auto-apprentissage
- [ ] Multi-langues

---

## 💡 Exemples d'Utilisation

### Exemple 1: Workflow Complet Création Mission

**User:** "Clara, crée une mission"

**Clara:** "Bonjour Mahdi ! 👋 Parfait, créons une mission ensemble. Première question : quelle est la marque du véhicule ?"

**User:** "BMW"

**Clara:** "Et le modèle ?"

**User:** "Série 3"

**Clara:** "D'accord ! BMW Série 3. Maintenant, quelle est l'adresse de départ ?"

**User:** "15 rue de Rivoli, Paris"

**Clara:** "Reçu ! Et l'adresse d'arrivée ?"

**User:** "20 avenue des Champs-Élysées, Paris"

**Clara:** "Parfait. Date et heure de départ ?" 

**User:** "Demain 14h"

**Clara:** "Quel est le montant de cette mission (HT) ?"

**User:** "350€"

**Clara:** 
```
🔍 Récapitulatif:

🚗 Véhicule: BMW Série 3
📍 Départ: 15 rue de Rivoli, Paris
📍 Arrivée: 20 avenue des Champs-Élysées, Paris
📅 Date: 15 oct 2025 à 14:00
💰 Prix: 350€ HT

💳 Crédits nécessaires: 1
💳 Ton solde: 49 crédits

Confirmes-tu la création ?
```

**User:** "Oui"

**Clara:** 
*[Appelle createMission()]*
```
✅ Mission MISS-124 créée avec succès !

🎉 Revenu du mois: +350€
🎫 Crédits restants: 48

🔗 Tu peux la consulter ici: [Redirection vers /missions]
```

### Exemple 2: Suggestion de Chauffeur

**User:** "Quel chauffeur pour la mission MISS-124 ?"

**Clara:** 
*[Appelle suggestDriver()]*
```
🎯 Suggestions de chauffeurs pour MISS-124:

1. ⭐ Jean Dupont (100/100)
   ✅ Disponible le 15 oct
   ✅ Permis léger adapté
   ✅ À Paris (même ville)
   ✅ 5km du départ
   ⭐ Note: 4.8/5 (12 missions)

2. 🥈 Marie Martin (70/100)
   ✅ Disponible le 15 oct
   ✅ Permis léger adapté
   ⚠️ À Lyon (490km)
   ⭐ Note: 4.5/5 (8 missions)

3. 🥉 Pierre Durand (60/100)
   ❌ Pas disponible le 15 oct
   ✅ Permis léger adapté
   ✅ À Paris
   ⭐ Note: 4.2/5 (5 missions)

💡 Je recommande Jean Dupont.

Veux-tu lui assigner cette mission ?
```

**User:** "Oui"

**Clara:** "Parfait ! Combien Jean gagne-t-il pour cette mission (HT) ?"

**User:** "200€"

**Clara:** "Et combien tu gagnes en commission (HT) ?"

**User:** "150€"

**Clara:** 
*[Appelle assignMission()]*
```
✅ Mission MISS-124 assignée à Jean Dupont !

💰 Prestataire: 200€ HT
💸 Ta commission: 150€ HT
📊 Revenu du mois ajusté: +150€

🔔 Jean a été notifié par email.
```

---

## 📚 Ressources

### Documentation Interne
- `CLARA_KNOWLEDGE_BASE_COMPLETE.md` - Knowledge base complète
- `CLARA_TEST_GUIDE.md` - Guide de test
- `CLARA_RAPPORTS_INSPECTION_GUIDE.md` - Rapports inspection
- `CLARA_COVOITURAGE_GUIDE.md` - Covoiturage
- `CLARA_CONTACTS_PLANNING_GUIDE.md` - Planning contacts

### Code Source
- `src/components/ChatAssistant.tsx` - Interface chat
- `src/services/aiServiceEnhanced.ts` - IA Clara
- `src/services/toolsService.ts` - Outils exécutables
- `src/services/aiLimitService.ts` - Limites IA
- `src/services/VoiceAssistantService.ts` - Synthèse vocale

### API Externes
- DeepSeek: https://api.deepseek.com/docs
- API Sirene: https://api.insee.fr/catalogue/
- Google Maps: https://developers.google.com/maps

---

**Version:** 1.0  
**Dernière mise à jour:** 14 octobre 2025  
**Statut:** 🔄 En développement actif

---

## ✅ Checklist Intégration Complète

- [x] Knowledge base créée
- [x] Service d'outils créé
- [ ] Intégration outils dans ChatAssistant
- [ ] Définition tools DeepSeek
- [ ] Gestion tool_calls
- [ ] Interface ActionCard
- [ ] Interface ConfirmationModal
- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Documentation utilisateur
- [ ] Monitoring et analytics

**Prochaine étape:** Intégrer les outils dans ChatAssistant avec function calling DeepSeek.
