# 🚀 Déploiement Option IA - Guide Rapide

**Temps estimé:** 10 minutes

---

## ✅ Checklist Avant Déploiement

- [x] Composants Web créés
- [x] Composants Mobile créés
- [x] Services mis à jour
- [x] Migration SQL prête
- [x] Documentation complète
- [x] Aucune erreur TypeScript

---

## 📋 Étapes de Déploiement

### 1️⃣ Base de Données (5 min)

#### Option A : Supabase CLI

```bash
# Depuis le dossier racine
cd Finality-okok

# Appliquer la migration
npx supabase db push

# Vérifier que la colonne existe
npx supabase db query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'inspections' AND column_name = 'use_ai';"
```

#### Option B : Dashboard Supabase (recommandé si problème CLI)

1. Ouvrir [https://dashboard.supabase.com](https://dashboard.supabase.com)
2. Sélectionner votre projet
3. Aller dans **SQL Editor**
4. Cliquer **New query**
5. Copier le contenu de `migrations/add_use_ai_to_inspections.sql`
6. Cliquer **Run**
7. Vérifier succès : ✅ "Success. No rows returned"

**Vérification:**

```sql
-- Vérifier colonne créée
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'inspections' AND column_name = 'use_ai';

-- Résultat attendu:
-- column_name | data_type | column_default
-- use_ai      | boolean   | true

-- Vérifier index créé
SELECT indexname FROM pg_indexes 
WHERE tablename = 'inspections' AND indexname = 'idx_inspections_use_ai';

-- Résultat attendu:
-- indexname
-- idx_inspections_use_ai
```

---

### 2️⃣ Application Web (2 min)

```bash
# Aller dans dossier web
cd Finality-okok

# Installer dépendances (si pas déjà fait)
npm install

# Vérifier compilation TypeScript
npx tsc --noEmit

# Résultat attendu: Aucune erreur

# Démarrer en mode dev pour tester
npm run dev

# Ouvrir navigateur: http://localhost:5173
```

**Test rapide:**
1. Connexion avec compte test
2. Aller sur Missions
3. Cliquer "Démarrer inspection"
4. Vérifier modal s'affiche ✅
5. Tester choix OUI et NON

---

### 3️⃣ Application Mobile (3 min)

```bash
# Aller dans dossier mobile
cd cassa-temp

# Installer dépendances (si pas déjà fait)
npm install

# Vérifier compilation TypeScript
npx tsc --noEmit

# Résultat attendu: Aucune erreur

# Démarrer Expo
npm start

# Scanner QR code avec Expo Go
```

**Test rapide:**
1. Connexion avec compte test
2. Aller sur Missions
3. Sélectionner mission
4. Cliquer "Inspection départ"
5. Vérifier modal s'affiche ✅
6. Tester choix OUI et NON

---

## 🧪 Tests de Validation

### Test 1 : Base de Données

```sql
-- Test 1: Créer inspection avec IA
INSERT INTO vehicle_inspections (
  mission_id, inspector_id, inspection_type, use_ai, status
) VALUES (
  'test-mission-1', 'test-user-1', 'departure', true, 'in_progress'
) RETURNING id, use_ai;

-- Résultat attendu: use_ai = true

-- Test 2: Créer inspection sans IA
INSERT INTO vehicle_inspections (
  mission_id, inspector_id, inspection_type, use_ai, status
) VALUES (
  'test-mission-2', 'test-user-1', 'departure', false, 'in_progress'
) RETURNING id, use_ai;

-- Résultat attendu: use_ai = false

-- Nettoyage
DELETE FROM vehicle_inspections WHERE mission_id LIKE 'test-mission-%';
```

### Test 2 : Web - Modal Affichage

**Étapes:**
1. Ouvrir `http://localhost:5173`
2. Connexion
3. Missions → Nouvelle inspection
4. Vérifier modal apparaît

**Résultat attendu:**
- ✅ Modal visible
- ✅ Titre "Assistant IA Gemini"
- ✅ 2 options (OUI / NON)
- ✅ Bouton Confirmer désactivé par défaut

### Test 3 : Web - Choix OUI

**Étapes:**
1. Cliquer option OUI
2. Vérifier bordure verte
3. Cliquer Confirmer
4. Prendre une photo

**Résultat attendu:**
- ✅ Modal se ferme
- ✅ Photo prise
- ✅ Description IA générée (si réseau)
- ✅ En base: `use_ai = true`

### Test 4 : Web - Choix NON

**Étapes:**
1. Redémarrer inspection
2. Cliquer option NON
3. Vérifier bordure orange
4. Cliquer Confirmer
5. Prendre une photo

**Résultat attendu:**
- ✅ Modal se ferme
- ✅ Photo prise instantanément
- ✅ Pas d'appel IA
- ✅ En base: `use_ai = false`

### Test 5 : Mobile - Modal Affichage

**Étapes:**
1. Ouvrir app mobile
2. Connexion
3. Missions → Inspection départ
4. Vérifier modal apparaît

**Résultat attendu:**
- ✅ Modal visible plein écran
- ✅ Header gradient bleu/violet
- ✅ 2 cards sélectionnables
- ✅ Bouton Confirmer grisé si rien sélectionné

### Test 6 : Mobile - Choix OUI

**Étapes:**
1. Tap sur card OUI
2. Vérifier bordure verte + badge ✓
3. Tap Confirmer
4. Prendre photo

**Résultat attendu:**
- ✅ Modal se ferme avec animation
- ✅ Photo prise
- ✅ Loader "Analyse IA..."
- ✅ Description générée (si réseau)

### Test 7 : Mobile - Choix NON

**Étapes:**
1. Redémarrer inspection
2. Tap sur card NON
3. Vérifier bordure orange + badge ✓
4. Tap Confirmer
5. Prendre photo

**Résultat attendu:**
- ✅ Modal se ferme
- ✅ Photo sauvegardée directement
- ✅ Pas de loader IA
- ✅ Pas d'attente

### Test 8 : Mode Hors Ligne

**Étapes:**
1. Activer mode avion sur mobile
2. Démarrer inspection
3. Choisir NON
4. Prendre 6 photos
5. Compléter inspection

**Résultat attendu:**
- ✅ Tout fonctionne
- ✅ Pas d'erreur réseau
- ✅ Inspection sauvegardée localement
- ✅ Sync quand réseau revient

---

## 🐛 Dépannage

### Problème 1 : Modal ne s'affiche pas (Web)

**Symptômes:**
- Inspection démarre directement
- Pas de modal

**Solution:**
```tsx
// Vérifier dans InspectionWizard.tsx
const [showAIChoice, setShowAIChoice] = useState(true); // Doit être true
const [aiChoiceMade, setAiChoiceMade] = useState(false); // Doit être false

// Vérifier import
import AIChoiceModal from '../components/inspection/AIChoiceModal';
```

### Problème 2 : Modal ne s'affiche pas (Mobile)

**Symptômes:**
- Inspection démarre directement
- Pas de modal

**Solution:**
```tsx
// Vérifier dans InspectionScreen.tsx
const [showAIChoice, setShowAIChoice] = useState(true); // Doit être true
const [aiChoiceMade, setAiChoiceMade] = useState(false); // Doit être false

// Vérifier import
import AIChoiceModal from '../components/AIChoiceModal';
```

### Problème 3 : Erreur SQL "column use_ai does not exist"

**Symptômes:**
- Erreur lors création inspection
- "column use_ai does not exist"

**Solution:**
```bash
# Vérifier que migration a été appliquée
npx supabase db query "SELECT column_name FROM information_schema.columns WHERE table_name = 'vehicle_inspections' AND column_name = 'use_ai';"

# Si vide, réappliquer migration
npx supabase db push
```

### Problème 4 : IA ne fonctionne pas même avec OUI

**Symptômes:**
- Choix OUI sélectionné
- Mais pas de description IA

**Solution:**
```typescript
// Vérifier dans InspectionScreen.tsx (mobile)
if (useAI) { // Vérifier cette condition
  const description = await generatePhotoDescription(...);
}

// Vérifier état useAI
console.log('useAI:', useAI); // Doit être true
```

### Problème 5 : Erreur "AIzaSy..." API Key

**Symptômes:**
- Erreur 400 ou 403 Gemini API
- "API key not valid"

**Solution:**
```typescript
// Vérifier dans aiService.ts
const GEMINI_API_KEY = 'AIzaSyAsIK3J6NSmvEG478oOHbIkRNp4xy4S_50';

// Tester API key manuellement
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp?key=AIzaSyAsIK3J6NSmvEG478oOHbIkRNp4xy4S_50"

// Résultat attendu: JSON avec model info
```

---

## 📊 Monitoring Post-Déploiement

### Requêtes Supabase Utiles

```sql
-- 1. Statistiques utilisation IA
SELECT 
  use_ai,
  COUNT(*) as inspections,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM vehicle_inspections), 1) as percentage
FROM vehicle_inspections
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY use_ai;

-- 2. Inspections récentes avec IA
SELECT 
  id, 
  mission_id, 
  inspection_type, 
  use_ai,
  status,
  created_at
FROM vehicle_inspections
ORDER BY created_at DESC
LIMIT 20;

-- 3. Performance (temps moyen inspection)
SELECT 
  use_ai,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60) as avg_duration_minutes
FROM vehicle_inspections
WHERE status = 'completed' AND completed_at IS NOT NULL
GROUP BY use_ai;

-- 4. Taux de complétion
SELECT 
  use_ai,
  status,
  COUNT(*) as count
FROM vehicle_inspections
GROUP BY use_ai, status
ORDER BY use_ai, status;
```

### Métriques à Surveiller

| Métrique | Cible | Action si hors cible |
|----------|-------|---------------------|
| % Inspections avec IA | 60-80% | Vérifier réseau zones |
| Erreurs API Gemini | < 5% | Augmenter timeout |
| Temps moyen avec IA | < 20 min | Optimiser prompts |
| Temps moyen sans IA | < 12 min | OK |
| Taux complétion | > 95% | Enquêter bugs |

---

## ✅ Checklist Post-Déploiement

- [ ] Migration SQL appliquée avec succès
- [ ] Web: Modal s'affiche correctement
- [ ] Web: Choix OUI fonctionne (IA activée)
- [ ] Web: Choix NON fonctionne (mode manuel)
- [ ] Mobile: Modal s'affiche correctement
- [ ] Mobile: Choix OUI fonctionne (IA activée)
- [ ] Mobile: Choix NON fonctionne (mode manuel)
- [ ] Base: Champ `use_ai` sauvegardé
- [ ] Tests hors ligne réussis
- [ ] Aucune erreur console
- [ ] Documentation à jour
- [ ] Équipe formée sur nouvelle fonctionnalité

---

## 📞 Support

### Problèmes Techniques

**Contact:** Mahdi (développeur)

**Logs à fournir:**
```bash
# Web
# Ouvrir DevTools (F12) → Console
# Copier erreurs rouges

# Mobile
# Terminal Expo → Copier erreurs
```

### Feedback Utilisateurs

**Collecte:**
- Enquête après 1 semaine d'utilisation
- Questions:
  1. Utilisez-vous l'option IA ? (Oui/Non)
  2. Si oui, êtes-vous satisfait des descriptions ?
  3. Si non, pourquoi ? (Réseau / Urgence / Autre)
  4. Suggestions d'amélioration ?

---

## 🎉 Félicitations !

Si tous les tests passent :

✅ **Déploiement réussi !**  
✅ **Fonctionnalité opérationnelle**  
✅ **Prêt pour production**

---

**Date:** 15 Octobre 2025  
**Version:** 1.0  
**Status:** ✅ Déployable
