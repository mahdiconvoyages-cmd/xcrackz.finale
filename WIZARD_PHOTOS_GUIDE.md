# 📸 WIZARD PHOTOS - GUIDE COMPLET

**Date**: 11 octobre 2025  
**Version**: 1.0  
**Fichier**: `mobile/src/screens/InspectionWizardScreen.tsx`  

---

## 🎯 OBJECTIF

Résoudre les problèmes de photos qui disparaissent et conflits d'ordre avec un système wizard moderne :
- **4 photos obligatoires** (avant, arrière, gauche, droite)
- **2 photos optionnelles** (intérieur, compteur)
- Affichage immédiat des photos (pas de disparition)
- Progression visuelle claire
- Upload en arrière-plan
- IA automatique

---

## 🐛 PROBLÈMES RÉSOLUS

### Problème 1: Photos qui disparaissent ❌

**Cause**:
```typescript
// Avant: Remplacer photo avant upload terminé
newSteps[currentStep] = {
  ...newSteps[currentStep],
  photo, // undefined si upload échoue
};
```

**Solution** ✅:
```typescript
// 1. Afficher IMMÉDIATEMENT l'URI locale
newSteps[currentStep] = {
  ...newSteps[currentStep],
  photoUri: asset.uri, // Affichage instantané
};
setSteps(newSteps);

// 2. Upload en arrière-plan
const photo = await uploadInspectionPhoto(...);

// 3. Mettre à jour SANS supprimer l'URI
updatedSteps[currentStep] = {
  ...updatedSteps[currentStep],
  photo, // Objet Supabase
  photoUri: asset.uri, // Garder URI locale
};
```

**Résultat**: Photo visible immédiatement, même si upload lent

---

### Problème 2: Conflits d'ordre ❌

**Cause**:
```typescript
// Avant: Ordre manueldépendant du bouton cliqué
photoSteps = [front, back, left, right, interior, dashboard];
// Utilisateur peut cliquer dans désordre
```

**Solution** ✅:
```typescript
// Progression séquentielle forcée
const [currentStep, setCurrentStep] = useState(0);

// Auto-passage à l'étape suivante après photo
setTimeout(() => {
  if (currentStep < steps.length - 1) {
    setCurrentStep(currentStep + 1);
  }
}, 1500);

// Boutons navigation
{currentStep > 0 && <Bouton Précédent />}
{!photo && <Bouton Prendre Photo />}
{photo && currentStep < max && <Bouton Suivant />}
```

**Résultat**: Ordre toujours respecté, navigation intuitive

---

## 📋 STRUCTURE WIZARD

### États

```typescript
interface WizardStep {
  type: 'front' | 'back' | 'left' | 'right' | 'interior' | 'dashboard';
  label: string;           // "Vue avant"
  instruction: string;     // "Positionnez-vous face..."
  icon: string;            // "arrow-up"
  required: boolean;       // true/false
  photo: InspectionPhoto | null;  // Objet Supabase
  photoUri?: string;       // URI locale (affichage)
  aiDescription?: string;  // Description IA
  descriptionApproved?: boolean;
}

const [steps, setSteps] = useState<WizardStep[]>([...]);
const [currentStep, setCurrentStep] = useState(0);
const [uploading, setUploading] = useState(false);
const [analyzing, setAnalyzing] = useState(false);
```

### Configuration étapes

```typescript
const steps: WizardStep[] = [
  // ✅ OBLIGATOIRES (4)
  {
    type: 'front',
    label: 'Vue avant',
    instruction: 'Positionnez-vous face au véhicule, à environ 3 mètres',
    icon: 'arrow-up',
    required: true,
    photo: null,
  },
  {
    type: 'back',
    label: 'Vue arrière',
    instruction: 'Positionnez-vous derrière le véhicule, à environ 3 mètres',
    icon: 'arrow-down',
    required: true,
    photo: null,
  },
  {
    type: 'left',
    label: 'Côté gauche',
    instruction: 'Positionnez-vous à gauche du véhicule, vue complète',
    icon: 'arrow-left',
    required: true,
    photo: null,
  },
  {
    type: 'right',
    label: 'Côté droit',
    instruction: 'Positionnez-vous à droite du véhicule, vue complète',
    icon: 'arrow-right',
    required: true,
    photo: null,
  },
  
  // ✨ OPTIONNELLES (2)
  {
    type: 'interior',
    label: 'Intérieur (optionnel)',
    instruction: 'Tableau de bord, sièges, état général intérieur',
    icon: 'layout',
    required: false,
    photo: null,
  },
  {
    type: 'dashboard',
    label: 'Compteur (optionnel)',
    instruction: 'Photo nette du kilométrage et indicateurs',
    icon: 'activity',
    required: false,
    photo: null,
  },
];
```

---

## 🎨 UI COMPOSANTS

### Header avec progression

```
┌────────────────────────────────────┐
│ [X]  Photos du véhicule        [ ]│
│      Étape 1 / 6                   │
│      2/4 obligatoires • 3 total    │
└────────────────────────────────────┘
```

### Barre de progression circulaire

```
┌────────────────────────────────────────────────┐
│  ●   ●   ○   ○   ○   ○                         │
│  ✓   ✓   3   4   5   6                         │
│ Avant Arrière Gauche Droite Int. Comp.        │
└────────────────────────────────────────────────┘

Légende:
● = Photo prise (vert)
● = Étape active (bleu)
○ = Pas encore (gris)
🔴 = Badge rouge si obligatoire et pas fait
```

### Card instruction

```
┌────────────────────────────────────┐
│ [🎯]  Vue avant      [Obligatoire] │
│                                    │
│ Positionnez-vous face au véhicule,│
│ à environ 3 mètres                 │
└────────────────────────────────────┘
```

### Zone photo

**Avant prise**:
```
┌────────────────────────────────────┐
│                                    │
│         ┌─────────────┐            │
│         │             │            │
│         │   📷 64px   │            │
│         │             │            │
│         └─────────────┘            │
│                                    │
│  Toucher pour prendre la photo     │
│  Assurez-vous d'un bon éclairage   │
│                                    │
└────────────────────────────────────┘
```

**Après prise (upload en cours)**:
```
┌────────────────────────────────────┐
│        [Photo 4:3]                 │
│                                    │
│         ⚙️ Upload...               │
│                                    │
│  [🤖 Analyse IA...]    (top-right) │
└────────────────────────────────────┘
```

**Photo uploadée**:
```
┌────────────────────────────────────┐
│  [✅ Description validée]  (badge) │
│        [Photo 4:3]                 │
│                                    │
│           [Reprendre]  (bottom)    │
└────────────────────────────────────┘
```

### Card description IA

```
┌────────────────────────────────────┐
│ 💬 Description IA                  │
├────────────────────────────────────┤
│ Véhicule Citroën C3 noir, en bon  │
│ état. Vue avant complète, pas de  │
│ dommage visible.                   │
└────────────────────────────────────┘
```

### Conseils

```
┌────────────────────────────────────┐
│ ℹ️ Conseils                        │
├────────────────────────────────────┤
│ • Gardez le véhicule entier        │
│ • Évitez les reflets et ombres     │
│ • Mode paysage si possible         │
└────────────────────────────────────┘
```

### Footer actions

**Étapes intermédiaires**:
```
┌────────────────────────────────────┐
│ [← Précédent]      [Suivant →]     │
└────────────────────────────────────┘
```

**Étape optionnelle**:
```
┌────────────────────────────────────┐
│ [← Précédent]      [Ignorer →]     │
└────────────────────────────────────┘
```

**Toutes photos obligatoires faites**:
```
┌────────────────────────────────────┐
│   [✓ Terminer (4 photos)]          │
└────────────────────────────────────┘
```

---

## 🔄 WORKFLOW COMPLET

### 1. Lancement Wizard

```typescript
// Depuis InspectionScreen
navigation.navigate('InspectionWizard', {
  inspectionId: inspection.id,
  onComplete: (photos: InspectionPhoto[]) => {
    // Récupérer les photos et mettre à jour photoSteps
    updatePhotosInInspection(photos);
  }
});
```

### 2. Progression étape par étape

```
Démarrage
  ↓
Étape 1: Vue avant (obligatoire)
  ├─ Afficher instruction
  ├─ Bouton "Prendre photo"
  ├─ Clic → Caméra
  ├─ Photo prise
  ├─ Affichage immédiat (URI locale) ✅
  ├─ Upload en arrière-plan
  ├─ Analyse IA (10s max)
  ├─ Alert "Description IA"
  ├─ Auto-passage étape 2
  ↓
Étape 2: Vue arrière (obligatoire)
  ├─ Bouton "Précédent" disponible
  ├─ Même process...
  ↓
Étape 3: Côté gauche (obligatoire)
  ↓
Étape 4: Côté droit (obligatoire)
  ↓
Étape 5: Intérieur (optionnel)
  ├─ Bouton "Ignorer" disponible
  ├─ Si ignoré → Étape 6
  ↓
Étape 6: Compteur (optionnel)
  ├─ Bouton "Ignorer" disponible
  ├─ Si 4 obligatoires faites:
  ├─   Bouton "Terminer (X photos)"
  ↓
Terminer
  ├─ Alert "✅ Photos complètes"
  ├─ onComplete(photos) appelé
  ├─ navigation.goBack()
  ↓
Retour InspectionScreen
  ├─ Photos mises à jour
  ├─ Formulaire détails affiché
```

### 3. Gestion erreurs

**Upload échoue**:
```
Photo prise
  ↓
Affichage immédiat (URI) ✅
  ↓
Upload → ERROR
  ↓
Annuler affichage
Supprimer photoUri
  ↓
Alert "Erreur d'upload"
  [Réessayer]
  ↓
handleTakePhoto() relancé
```

**IA timeout (offline)**:
```
Upload OK
  ↓
Analyse IA → TIMEOUT (10s)
  ↓
Description: "📡 Hors ligne..."
  ↓
Pas d'alert (silent)
  ↓
Continuer sans description
```

---

## 📊 DONNÉES CALCULÉES

```typescript
const currentPhotoStep = steps[currentStep];
const requiredPhotos = steps.filter(s => s.required && s.photo);
const allRequiredDone = requiredPhotos.length === 4;
const totalPhotos = steps.filter(s => s.photo).length;
```

**Affichage**:
- Header: `2/4 obligatoires • 3 total`
- Bouton Terminer: `Terminer (3 photos)`
- Alert finale: `3 photos capturées`

---

## 🎨 STYLES CLÉS

### Progression circulaire

```typescript
progressStep: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: '#334155', // Gris par défaut
  borderWidth: 2,
  borderColor: '#475569',
}

progressStepActive: {
  backgroundColor: '#14b8a6', // Bleu (étape actuelle)
  borderColor: '#14b8a6',
  transform: [{ scale: 1.1 }], // Légèrement plus grand
}

progressStepDone: {
  backgroundColor: '#10b981', // Vert (complétée)
  borderColor: '#10b981',
}

requiredBadge: {
  position: 'absolute',
  top: -2,
  right: -2,
  width: 12,
  height: 12,
  borderRadius: 6,
  backgroundColor: '#ef4444', // Badge rouge obligatoire
  borderWidth: 2,
  borderColor: '#1e293b',
}
```

### Tags obligatoire/optionnel

```typescript
requiredTag: {
  backgroundColor: 'rgba(239, 68, 68, 0.2)',
  borderColor: '#ef4444',
  // Rouge
}

optionalTag: {
  backgroundColor: 'rgba(100, 116, 139, 0.2)',
  borderColor: '#64748b',
  // Gris
}
```

---

## 🧪 TESTS À EFFECTUER

### Test 1: Progression normale
1. Lancer wizard
2. Prendre 4 photos obligatoires
3. Vérifier progression circulaire
4. Vérifier auto-passage étapes
5. Ignorer les 2 optionnelles
6. Cliquer "Terminer"
7. Vérifier retour avec 4 photos

### Test 2: Photos optionnelles
1. Lancer wizard
2. Prendre 4 obligatoires
3. Prendre 1 optionnelle (intérieur)
4. Ignorer 1 optionnelle (compteur)
5. Terminer avec 5 photos

### Test 3: Reprendre photo
1. Prendre photo avant
2. Cliquer "Reprendre"
3. Vérifier suppression
4. Reprendre nouvelle photo
5. Vérifier remplacement

### Test 4: Navigation arrière
1. Prendre photos 1, 2, 3
2. Cliquer "Précédent"
3. Revenir à photo 2
4. Reprendre photo 2
5. Continuer normalement

### Test 5: Erreur upload
1. Couper WiFi
2. Prendre photo
3. Vérifier alert "Erreur d'upload"
4. Cliquer "Réessayer"
5. Rallumer WiFi
6. Vérifier upload OK

### Test 6: IA offline
1. Couper réseau
2. Prendre photo (upload en cache OK)
3. Attendre 10s
4. Vérifier pas d'alert IA
5. Continuer normalement

---

## 📱 INTÉGRATION

### Dans InspectionScreen

```typescript
// Remplacer handleTakePhoto par:
const handleStartPhotoWizard = () => {
  if (!inspection) return;
  
  navigation.navigate('InspectionWizard', {
    inspectionId: inspection.id,
    onComplete: (photos: InspectionPhoto[]) => {
      // Mettre à jour photoSteps avec les nouvelles photos
      const newSteps = [...photoSteps];
      
      photos.forEach(photo => {
        const stepIndex = newSteps.findIndex(s => s.type === photo.photo_type);
        if (stepIndex !== -1) {
          newSteps[stepIndex] = {
            ...newSteps[stepIndex],
            photo,
            photoUri: photo.photo_url, // URL Supabase
          };
        }
      });
      
      setPhotoSteps(newSteps);
      
      // Si toutes photos faites, afficher formulaire détails
      if (photos.length >= 4) {
        setShowDetailsForm(true);
      }
    }
  });
};
```

### Enregistrer route

```typescript
// mobile/src/navigation/AppNavigator.tsx
<Stack.Screen 
  name="InspectionWizard" 
  component={InspectionWizardScreen}
  options={{ headerShown: false }}
/>
```

---

## ✅ AVANTAGES

**UX**:
- ✅ Progression visuelle claire
- ✅ Ordre respecté (pas de confusion)
- ✅ Photos visibles immédiatement
- ✅ Navigation intuitive (Précédent/Suivant)
- ✅ Skip optionnelles

**Technique**:
- ✅ Pas de disparition photos (URI locale)
- ✅ Upload en arrière-plan (non-bloquant)
- ✅ Gestion erreurs robuste
- ✅ IA automatique (avec timeout)
- ✅ Code modulaire et réutilisable

**Business**:
- ✅ 4 photos minimum garanties
- ✅ Qualité contrôlée (instructions claires)
- ✅ Traçabilité complète
- ✅ Moins d'erreurs utilisateur

---

## 🚀 AMÉLIORATIONS FUTURES

1. **Validation qualité photo**
   - Vérifier netteté
   - Détecter flou
   - Alerte si trop sombre

2. **Guides de cadrage**
   - Overlay avec silhouette véhicule
   - Grille de composition
   - Détection auto-centrage

3. **Mode hors ligne complet**
   - Queue d'upload
   - Sync automatique au retour réseau
   - Indicateur état sync

4. **Compression intelligente**
   - Adapter qualité selon réseau
   - Thumbnails pour preview
   - Full-res pour archivage

---

**Créé par**: GitHub Copilot  
**Date**: 11 octobre 2025  
**Version**: 1.0  
**Status**: ✅ READY FOR TEST  
