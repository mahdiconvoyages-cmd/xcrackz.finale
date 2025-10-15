# ⚡ CLARA - GUIDE DE TEST RAPIDE

## 🎯 Objectif

Tester les 3 améliorations de Clara en **10 minutes**

---

## ✅ FICHIERS CRÉÉS

1. **`src/services/claraSpeechEnhancer.ts`** (470 lignes)
   - Correction automatique transcriptions vocales

2. **`src/services/claraEmailReader.ts`** (450 lignes)
   - Lecture emails avec prononciation améliorée

3. **`src/services/claraDataValidator.ts`** (amélioré, 600+ lignes)
   - Validation stricte + détection données moquées

4. **`src/services/VoiceAssistantService.ts`** (modifié)
   - Intégration automatique Speech Enhancer
   - Nouvelle fonction `speakEmail()`

---

## 🧪 TEST 1 - Reconnaissance Vocale (2 min)

### Comment tester

1. **Ouvrir l'app web** (http://localhost:5173)

2. **Aller sur la page avec Clara** (ChatAssistant ou VoiceAssistant)

3. **Cliquer sur le micro** 🎤

4. **Dire (mal prononcé volontairement)**:
   - ❌ "reschershe un trajet de paris a lion"
   - ❌ "mes raport inspection"
   - ❌ "dispo du chofeur"
   - ❌ "mes trajets covoit"

5. **Vérifier dans la console**:
   ```
   ✨ [Speech Enhancer] Corrections appliquées: [...]
   📝 Avant: reschershe un trajet de paris a lion
   ✅ Après: Recherche de trajet de Paris à Lyon
   ```

### ✅ Résultat attendu

- Clara comprend malgré la mauvaise prononciation
- Console affiche les corrections (mode DEV uniquement)
- Texte affiché est corrigé automatiquement

---

## 🧪 TEST 2 - Lecture Email (3 min)

### Comment tester

1. **Ouvrir la console du navigateur** (F12)

2. **Copier/coller ce code**:

```typescript
// Importer le service
import VoiceAssistantService from './services/VoiceAssistantService';

// Test: lire un email
await VoiceAssistantService.speakEmail({
  from: 'admin@finality.fr',
  fromName: 'Service Admin',
  to: 'user@finality.fr',
  subject: 'Mission MIS-2024001',
  body: 'Nouvelle mission disponible. Contact: 0612345678. Ref: VEH-123.',
  date: new Date(),
  isHtml: false,
});
```

3. **Écouter Clara lire l'email**

### ✅ Résultat attendu

Clara doit dire (avec pauses):
> "Vous avez reçu un email de Service Admin.  
> Sujet: Mission M I S, tiret, 2 0 2 4 0 0 1.  
> Nouvelle mission disponible. Contact: téléphone: 06, 12, 34, 56, 78. Référence: V E H, tiret, 1 2 3."

**Vérifier**:
- Email épelé: "admin, arobase, finality, point, f r"
- Référence épelée: "M I S, tiret, 2 0 2 4 0 0 1"
- Téléphone formaté: "06, 12, 34, 56, 78"
- Pauses naturelles entre les phrases

---

## 🧪 TEST 3 - Détection Données Moquées (2 min)

### Comment tester

1. **Ouvrir la console du navigateur** (F12)

2. **Copier/coller ce code**:

```typescript
import { detectMockData } from './services/claraDataValidator';

// Test 1: Données suspectes
const badData = {
  id: 'test-mission-001',
  reference: 'MIS-0000',
  client: 'Client Test',
  email: 'test@test.com',
  created_at: '1970-01-01',
};

const detection = detectMockData(badData);
console.log('🚨 Données moquées détectées:', detection.isMock);
console.log('Raisons:', detection.reasons);

// Test 2: Données valides
const goodData = {
  id: 'abc123def456',
  reference: 'MIS-2024001',
  client: 'Société Transport Paris',
  email: 'contact@transport-paris.fr',
  created_at: '2024-10-12',
};

const detection2 = detectMockData(goodData);
console.log('✅ Données valides:', !detection2.isMock);
```

### ✅ Résultat attendu

**Test 1 (données suspectes)**:
```
🚨 Données moquées détectées: true
Raisons: [
  "ID avec préfixe suspect",
  "Contient le terme suspect: 'test'",
  "Email suspect: test@test.com",
  "Date suspecte (année par défaut)",
  "Référence avec pattern par défaut"
]
```

**Test 2 (données valides)**:
```
✅ Données valides: true
```

---

## 🧪 TEST 4 - Validation Complète (3 min)

### Comment tester

1. **Créer un fichier de test temporaire**: `src/test-clara.ts`

```typescript
import { 
  validateRealData, 
  validateAndRejectMock,
  formatErrorForClara 
} from './services/claraDataValidator';

// Test: Valider une vraie mission
async function testValidation() {
  const userId = 'VOTRE_USER_ID'; // Remplacer par votre ID
  
  // Test 1: Mission existante
  const result1 = await validateRealData({
    table: 'missions',
    filters: { user_id: userId },
    userId,
  });
  
  console.log('✅ Missions trouvées:', result1.isValid);
  console.log('Données:', result1.data);
  
  // Test 2: Mission inexistante
  const result2 = await validateRealData({
    table: 'missions',
    filters: { id: 'fake-id-999' },
    userId,
  });
  
  console.log('❌ Mission inexistante:', !result2.isValid);
  console.log('Message:', formatErrorForClara(result2));
}

testValidation();
```

2. **Exécuter le test**

### ✅ Résultat attendu

- Si missions existent: `isValid: true`, données affichées
- Si mission inexistante: `isValid: false`, message clair
- JAMAIS de données inventées/moquées

---

## 🎯 CHECKLIST COMPLÈTE

### Reconnaissance Vocale ✅
- [ ] Clara corrige les homophones automatiquement
- [ ] Clara reconnaît les termes métier ("covoit" → "covoiturage")
- [ ] Clara normalise la ponctuation
- [ ] Console affiche les corrections (mode DEV)

### Lecture Email ✅
- [ ] Emails épelés clairement ("contact, arobase, finality...")
- [ ] Références épelées ("M I S, tiret, 2024...")
- [ ] Téléphones formatés ("06, 12, 34...")
- [ ] Pauses naturelles entre les phrases

### Validation Données ✅
- [ ] Détecte "test", "mock", "fake" dans les données
- [ ] Détecte emails suspects ("test@test.com")
- [ ] Détecte IDs suspects ("test-123")
- [ ] Détecte dates suspectes (1970, 2000, 2099)
- [ ] Rejette automatiquement les données suspectes
- [ ] Messages d'erreur clairs

---

## 🚀 LANCER L'APP POUR TESTER

```powershell
# Terminal 1: Web app
cd c:\Users\mahdi\Documents\Finality-okok
npm run dev

# Ouvrir: http://localhost:5173
# Aller sur: Chat Assistant ou Voice Assistant
# Tester la reconnaissance vocale
```

---

## 📊 RÉSULTATS ATTENDUS

### Avant (v1)
- ❌ "reschershe trajet" → incompris
- ❌ "contact@finality.fr" → "contact finality f r" (incompréhensible)
- ❌ Données moquées possibles

### Après (v2)
- ✅ "reschershe trajet" → "Recherche de trajet" (corrigé auto)
- ✅ "contact@finality.fr" → "contact, arobase, finality, point, f r" (clair)
- ✅ Données moquées détectées et rejetées automatiquement

---

## ⚠️ DÉPANNAGE

### Problème: Corrections vocales ne s'affichent pas

**Solution**:
- Vérifier que vous êtes en mode DEV (`npm run dev`)
- Ouvrir la console (F12)
- Les logs n'apparaissent qu'en DEV

### Problème: Lecture email ne fonctionne pas

**Solution**:
- Vérifier que le navigateur supporte Speech Synthesis
- Essayer Chrome/Edge (meilleur support)
- Vérifier le volume du système

### Problème: Validation toujours false

**Solution**:
- Vérifier la connexion Supabase
- Vérifier que l'utilisateur est connecté
- Vérifier que la table existe
- Vérifier les RLS policies

---

## 📝 NOTES

- Les améliorations sont **automatiques** (pas besoin de modifier le code existant)
- `VoiceAssistantService` intègre tout automatiquement
- `claraDataValidator` doit être utilisé dans `aiServiceEnhanced.ts`

---

## ✨ PROCHAINES ÉTAPES

1. ✅ Tester les 3 améliorations (10 min)
2. ⏳ Intégrer validation dans toutes les actions Clara
3. ⏳ Ajouter plus de termes au dictionnaire métier
4. ⏳ Créer des tests unitaires automatisés

---

**Guide créé par**: GitHub Copilot  
**Date**: 12 octobre 2025  
**Durée test**: 10 minutes
