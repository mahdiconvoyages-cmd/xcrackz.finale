# 🎨 REFONTE COMPLÈTE DU SYSTÈME D'INSPECTION

## 📱 Design de référence analysé

Basé sur les screenshots fournis, voici les éléments clés à implémenter :

### 🎯 Structure des étapes (Navigation par onglets)

```
┌─────────────────────────────────────────┐
│  Fermer    Photos ▼          ⋮          │
├─────────────────────────────────────────┤
│  [1]  [2]  [3]  [4]                     │
│   3    1    3    6                      │
│  (nb photos par étape)                  │
├─────────────────────────────────────────┤
│                                         │
│  Photos obligatoires        * = obligatoire │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │ Commencer│  │  Face     │            │
│  │ la prise │  │  avant    │            │
│  │ des       │  │ générale* │            │
│  │ photos   │  │  [schéma] │            │
│  └──────────┘  └──────────┘            │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │ Latéral  │  │  Face     │            │
│  │ gauche   │  │  arrière  │            │
│  │ avant*   │  │ générale* │            │
│  │ [schéma] │  │  [schéma] │            │
│  └──────────┘  └──────────┘            │
│                                         │
│  Photos optionnelles           0/14     │
│                                         │
│  📷 Ajouter photo libre                 │
│                                         │
│  [Étape précédente]                     │
│  [Signer et terminer]                   │
└─────────────────────────────────────────┘
```

### 📸 Types de photos obligatoires

#### Inspection DÉPART :
1. Face avant générale*
2. Latéral gauche avant*
3. Face arrière générale*
4. Latéral droit arrière*
5. Latéral gauche arrière*
6. Latéral droit avant*

#### Inspection ARRIVÉE :
1. Face avant générale*
2. Latéral gauche avant*
3. Face arrière générale*
4. Latéral droit arrière*
5. Latéral gauche arrière*
6. Latéral droit avant*
7. **PV de livraison/restitution* (NOUVEAU)**
8. **Compteur kilométrique* (NOUVEAU)**

### 🎨 Design moderne à implémenter

#### Couleurs :
- Primary: `#8B7BE8` (violet)
- Background: `#F8F7FF` (violet très clair)
- Cards: `#FFFFFF` (blanc)
- Border: `#E5E1F8` (violet clair)
- Text: `#2D2A3E` (gris foncé)
- Badge photo count: `#FF4D6D` (rouge)

#### Composants :
- ✅ Cards avec schémas vectoriels du véhicule
- ✅ Badges de comptage (nombre de photos)
- ✅ Navigation par étapes numérotées
- ✅ Bouton "Commencer la prise des photos" principal
- ✅ Section Photos optionnelles expandable
- ✅ Dropzone pour photos libres

### 📋 Nouvelles fonctionnalités

#### 1. Étapes de workflow :
- **Étape 1** : Photos extérieures (6 vues)
- **Étape 2** : Intérieur et tableau de bord (2 photos)
- **Étape 3** : Documents (PV, carte grise, etc.)
- **Étape 4** : Signature et validation

#### 2. Photos optionnelles :
- Dommages spécifiques (jusqu'à 14 photos)
- Annotations avec dessin sur photo
- Géolocalisation automatique
- Horodatage

#### 3. PV de livraison/restitution (Arrivée uniquement) :
- Photo du PV signé par le client
- Validation automatique de la lisibilité
- OCR optionnel pour extraction de données

### 🔧 Modifications techniques nécessaires

#### Base de données :
```sql
-- Ajouter colonne pour photos optionnelles
ALTER TABLE inspection_photos 
ADD COLUMN is_optional BOOLEAN DEFAULT FALSE;

-- Ajouter catégorie de photo
ADD COLUMN photo_category VARCHAR(50); -- 'exterior', 'interior', 'documents', 'optional'

-- Ajouter métadonnées
ADD COLUMN metadata JSONB; -- {damage_type, severity, notes}
```

#### Structure des fichiers :
```
src/
├── pages/
│   ├── InspectionDeparture.tsx (REFONTE)
│   ├── InspectionArrival.tsx (REFONTE)
│   └── InspectionSteps/ (NOUVEAU)
│       ├── Step1_ExteriorPhotos.tsx
│       ├── Step2_InteriorPhotos.tsx
│       ├── Step3_Documents.tsx
│       └── Step4_Signature.tsx
├── components/
│   └── inspection/
│       ├── PhotoCard.tsx (NOUVEAU - avec schéma)
│       ├── PhotoGrid.tsx (NOUVEAU)
│       ├── OptionalPhotos.tsx (NOUVEAU)
│       ├── StepNavigation.tsx (NOUVEAU)
│       └── VehicleSchematic.tsx (NOUVEAU - SVG)
```

### 📱 Responsive Design

#### Mobile (< 768px) :
- 2 colonnes pour les cards photos
- Navigation sticky en haut
- Boutons pleine largeur
- Swipe entre étapes

#### Tablette (768px - 1024px) :
- 3 colonnes pour les cards photos
- Sidebar pour navigation
- Layout flexible

#### Desktop (> 1024px) :
- 4 colonnes pour les cards photos
- Navigation latérale fixe
- Aperçu en temps réel
- Multi-upload par drag & drop

---

## 🚀 PLAN D'IMPLÉMENTATION

### Phase 1 : Composants de base (2-3h)
- [ ] Créer PhotoCard avec schémas SVG
- [ ] Créer StepNavigation
- [ ] Créer PhotoGrid responsive
- [ ] Créer VehicleSchematic (SVG interactif)

### Phase 2 : Workflow par étapes (3-4h)
- [ ] Refonte InspectionDeparture en multi-étapes
- [ ] Refonte InspectionArrival avec section PV
- [ ] Navigation entre étapes
- [ ] Sauvegarde auto par étape

### Phase 3 : Photos optionnelles (2h)
- [ ] Composant OptionalPhotos
- [ ] Upload multiple
- [ ] Annotations sur photo
- [ ] Géolocalisation

### Phase 4 : Design moderne (2h)
- [ ] Appliquer nouveau thème violet
- [ ] Animations et transitions
- [ ] Loading states
- [ ] Success/Error feedback

### Phase 5 : Tests (1h)
- [ ] Test mobile responsiveness
- [ ] Test workflow complet
- [ ] Test upload photos
- [ ] Test validation

---

**VOULEZ-VOUS QUE JE COMMENCE L'IMPLÉMENTATION ?**

Je peux créer :
1. Les nouveaux composants d'abord
2. Refondre une page à la fois (départ puis arrivée)
3. Créer un prototype complet d'un coup

Dites-moi par où commencer ! 🚀
