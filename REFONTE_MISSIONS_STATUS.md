# 🚀 REFONTE MISSIONS MOBILE - IMPLÉMENTATION COMPLÈTE

## ✅ RÉALISÉ

### 1. Suppression Facturation ✓
- ❌ Supprimé `src/screens/FacturationScreen.tsx`
- ✅ Mis à jour `src/types/navigation.ts`
  - Retiré `FacturationStackParamList`
  - Retiré `Facturation` de `MainTabParamList`
  - Ajouté `Missions: undefined`

### 2. Navigation Mise à Jour ✓
```typescript
export type MainTabParamList = {
  Inspections: NavigatorScreenParams<InspectionsStackParamList>;
  Missions: undefined;  // ← NOUVEAU
  Covoiturage: NavigatorScreenParams<CovoiturageStackParamList>;
  Scanner: NavigatorScreenParams<ScannerStackParamList>;
  Boutique: undefined;
  Profile: undefined;
  Dashboard: undefined;
  Contacts: undefined;
  More: undefined;
};
```

---

## 📝 À FAIRE

### 1. Créer MissionsScreen.tsx Complet

**Basé sur :** `src/pages/TeamMissions.tsx` (web - 1117 lignes)

**Structure :**
```
MissionsScreen (Principal)
├── Material Top Tabs
│   ├── Mes Missions (Onglet 1)
│   └── Missions Reçues (Onglet 2)
├── Header avec stats
├── Recherche et filtres
├── Toggle Grid/List
└── Liste des missions

Components:
├── MissionCard (Grid/List)
├── StatsCards
├── FilterBar
└── EmptyState
```

**Logique Clé :**
1. Charger missions créées (`user_id = current_user`)
2. Charger missions reçues (`assigned_user_id = current_user`)
3. Pour chaque mission, charger les inspections
4. Calculer le statut :
   - `pending` : Aucune inspection
   - `in_progress` : Inspection départ seulement
   - `completed` : Départ + Arrivée (MASQUÉ)
5. Filtrer les missions terminées (ne pas afficher)

**Tables :**
- `missions` : Toutes les missions
- `vehicle_inspections` : Pour calculer le statut

---

### 2. Modifier MainNavigator

**Fichier :** `src/navigation/MainNavigator.tsx` (ou équivalent)

**Actions :**
- Retirer le Tab "Facturation"
- Ajouter le Tab "Missions"
- Utiliser l'icône `clipboard-list` ou `truck`

```tsx
<Tab.Screen
  name="Missions"
  component={MissionsScreen}
  options={{
    title: 'Missions',
    tabBarIcon: ({ color, size }) => (
      <MaterialCommunityIcons name="truck" size={size} color={color} />
    ),
  }}
/>
```

---

### 3. Optimiser PDF Scanner

**Fichier :** `src/services/missionPdfGeneratorMobile.ts`

**Modifications :**

1. **Section Comparaison Départ/Arrivée**
```typescript
// Après avoir affiché départ et arrivée séparément
// Ajouter une section "Comparaison"

const addComparisonSection = (pdf: PDFDocument, page: PDFPage) => {
  // Titre
  page.drawText('📊 COMPARAISON DÉPART / ARRIVÉE', {
    x: 50,
    y: yPosition,
    size: 16,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  
  // Tableau 2 colonnes
  // Colonne 1: Photos Départ
  // Colonne 2: Photos Arrivée
  
  // Signatures côte-à-côte
  // Signature Départ | Signature Arrivée
};
```

2. **Export Photos Séparées**
```typescript
export async function exportMissionPhotos(missionId: string) {
  // Récupérer toutes les photos de la mission
  const { data: inspections } = await supabase
    .from('vehicle_inspections')
    .select('id, inspection_type')
    .eq('mission_id', missionId);
  
  // Pour chaque inspection, télécharger les photos
  const photos = [];
  for (const inspection of inspections) {
    const {data: inspectionPhotos} = await supabase
      .from('inspection_photos')
      .select('*')
      .eq('inspection_id', inspection.id);
    
    photos.push(...inspectionPhotos);
  }
  
  // Créer un ZIP ou partager individuellement
  return photos;
}
```

---

## 📋 CHECKLIST FINALE

### Phase 1 : Nettoyage ✅
- [x] FacturationScreen.tsx supprimé
- [x] Navigation.ts mis à jour
- [x] Pas d'erreurs de compilation

### Phase 2 : Nouveau Missions (À FAIRE)
- [ ] Créer `src/screens/MissionsScreen.tsx`
- [ ] Implémenter onglets (Mes Missions | Reçues)
- [ ] Implémenter toggle Grid/List
- [ ] Implémenter recherche et filtres
- [ ] Calculer statuts basés sur inspections
- [ ] Masquer missions terminées
- [ ] Afficher images véhicules
- [ ] Actions (Démarrer/Continuer inspection)
- [ ] Navigation vers détails mission
- [ ] Stats cards (header)

### Phase 3 : Navigation (À FAIRE)
- [ ] MainNavigator mis à jour
- [ ] Tab Facturation retiré
- [ ] Tab Missions ajouté
- [ ] Test navigation

### Phase 4 : PDF Optimisé (À FAIRE)
- [ ] Section comparaison ajoutée
- [ ] Photos côte-à-côte
- [ ] Signatures côte-à-côte
- [ ] Export photos séparées
- [ ] Test génération PDF

---

## 🎯 RÉSULTAT ATTENDU

### Navigation Mobile
```
Bottom Tabs:
├─ Dashboard
├─ Missions ← NOUVEAU (remplace Facturation)
├─ Inspections
├─ Covoiturage
├─ Scanner
└─ Plus
```

### Écran Missions
```
┌─────────────────────────────────┐
│ 🎯 Missions                     │
│ ┌───────────┬─────────────┐    │
│ │Mes Missions│Missions Reçues│  │
│ └───────────┴─────────────┘    │
│                                 │
│ 📊 STATS                        │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐           │
│ │ 5│ │ 2│ │ 1│ │ 2│           │
│ └──┘ └──┘ └──┘ └──┘           │
│                                 │
│ 🔍 Recherche   [Grid] [List]   │
│                                 │
│ ┌─────────┐ ┌─────────┐        │
│ │Mission 1│ │Mission 2│        │
│ │ [Image] │ │ [Image] │        │
│ │#REF-001 │ │#REF-002 │        │
│ │Pending  │ │En cours │        │
│ └─────────┘ └─────────┘        │
└─────────────────────────────────┘
```

### PDF Optimisé
```
MISSION #REF-001
├─ Informations
├─ Inspection Départ
│  ├─ Photos
│  └─ Signatures
├─ Inspection Arrivée
│  ├─ Photos
│  └─ Signatures
└─ 📊 COMPARAISON ← NOUVEAU
   ├─ Départ vs Arrivée (côte-à-côte)
   ├─ Photos comparées
   └─ Signatures comparées
```

---

## 💡 NOTES IMPORTANTES

### Calcul du Statut
Le statut n'est PAS stocké en base, il est CALCULÉ :
```typescript
const calculateStatus = (mission: Mission, inspections: Inspection[]) => {
  const hasDepart = inspections.some(i => i.inspection_type === 'departure');
  const hasArrival = inspections.some(i => i.inspection_type === 'arrival');
  
  if (hasDepart && hasArrival) return 'completed';
  if (hasDepart) return 'in_progress';
  return 'pending';
};
```

### Filtrage des Missions Terminées
Les missions avec statut `completed` sont MASQUÉES de la liste principale.
Elles sont visibles uniquement dans :
- L'onglet "Archivées" (si implémenté)
- La page "Rapports d'inspection"

### Tables SQL
```sql
-- Missions
missions
  id uuid
  reference text
  user_id uuid (créateur)
  assigned_user_id uuid (assigné à)
  pickup_address text
  delivery_address text
  vehicle_brand text
  vehicle_model text
  vehicle_image_url text
  price numeric
  archived boolean

-- Inspections
vehicle_inspections
  id uuid
  mission_id uuid
  inspection_type text ('departure' | 'arrival')
  
-- Photos
inspection_photos
  id uuid
  inspection_id uuid
  photo_url text
```

---

Prêt pour l'implémentation complète !
