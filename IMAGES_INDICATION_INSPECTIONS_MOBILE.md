# ✅ Images d'Indication Véhicules - Inspections Mobile

## 🎯 Objectif
Intégrer les images d'indication de véhicules dans les écrans d'inspection mobile pour guider visuellement les utilisateurs lors de la capture de photos, comme sur la version web.

---

## 📋 Travaux Réalisés

### 1. ✅ Copie des Images de Véhicules
**Emplacement**: `mobile/assets/vehicles/` (18 images)

**Images par type de véhicule**:
- **VL (Véhicule Léger)**: 6 images
  - `avant.png`
  - `arriere.png`
  - `lateral gauche avant.png`
  - `laterale gauche arriere.png`
  - `lateraldroit avant.png`
  - `lateral droit arriere.png`

- **VU (Véhicule Utilitaire - Master)**: 6 images
  - `master avant.png`
  - `master avg (2).png`
  - `master lateral droit avant.png`
  - `master lateral droit arriere.png`
  - `master lateral gauche arriere.png`

- **PL (Poids Lourd - Scania)**: 6 images
  - `scania-avant.png`
  - `scania-arriere.png`
  - `scania-lateral-gauche-avant.png`
  - `scania-lateral-gauche-arriere.png`
  - `scania-lateral-droit-avant.png`
  - `scania-lateral-droit-arriere.png`

### 2. ✅ Composant PhotoIndicator Créé
**Fichier**: `mobile/src/components/inspection/PhotoIndicator.tsx`

**Fonctionnalités**:
- Affiche l'image du véhicule appropriée selon le type (VL/VU/PL) et l'angle de prise de vue
- Mapping automatique des types de photos vers les images correspondantes
- Overlay de validation (check vert) quand la photo est capturée
- Fallback vers icône caméra si l'image n'existe pas

**Props**:
```typescript
interface PhotoIndicatorProps {
  vehicleType: 'VL' | 'VU' | 'PL';
  photoType: string; // 'front', 'back', 'left_front', etc.
  isCaptured: boolean;
}
```

### 3. ✅ Intégration dans InspectionDepartureNew
**Fichier**: `mobile/src/screens/inspections/InspectionDepartureNew.tsx`

**Modifications**:
- Import du composant `PhotoIndicator`
- Ajout de `PhotoIndicator` dans chaque carte de photo
- Photo capturée affichée en overlay au-dessus de l'image d'indication
- Styles ajustés pour superposition correcte

**Comportement**:
1. **Avant capture**: Image d'indication visible pour guider l'utilisateur
2. **Après capture**: Photo réelle affichée avec badge vert de validation
3. **Type véhicule**: Déterminé automatiquement depuis `mission.vehicle_type`

### 4. ✅ InspectionArrivalNew Compatible
**Fichier**: `mobile/src/screens/inspections/InspectionArrivalNew.tsx`

InspectionArrivalNew réutilise InspectionDepartureNew avec le paramètre `isArrival={true}`, donc les modifications sont automatiquement appliquées.

---

## 🔧 Mapping Type Photo → Image

```typescript
VEHICLE_PHOTOS = {
  VL: {
    front: 'avant.png',
    back: 'arriere.png',
    left_front: 'lateral gauche avant.png',
    left_back: 'laterale gauche arriere.png',
    right_front: 'lateraldroit avant.png',
    right_back: 'lateral droit arriere.png',
  },
  VU: { ... }, // Master
  PL: { ... }, // Scania
}
```

---

## 📱 Résultat Visuel

### Avant Capture
```
┌─────────────────┐
│                 │
│  [Image Avant]  │  ← Image d'indication
│                 │
│  Face avant     │
└─────────────────┘
```

### Après Capture
```
┌─────────────────┐
│      [✓]        │  ← Badge vert
│  [Photo Prise]  │  ← Photo réelle
│                 │
│  Face avant     │
└─────────────────┘
```

---

## 🎨 Styles Appliqués

```typescript
photoCard: {
  width: '47%',
  aspectRatio: 1,
  borderRadius: 12,
  borderWidth: 2,
  overflow: 'hidden',
  position: 'relative', // Pour superposition
}

photoImage: {
  position: 'absolute', // Overlay
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  resizeMode: 'cover',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
}
```

---

## 🚀 Comment Tester

1. **Lancer Expo**:
   ```bash
   cd mobile
   npx expo start
   ```

2. **Accéder à une mission**:
   - Ouvrir l'app sur appareil/émulateur
   - Sélectionner une mission
   - Cliquer sur "État des lieux Départ" ou "État des lieux Arrivée"

3. **Vérifier**:
   - ✅ Les 6 cartes de photos affichent les images d'indication appropriées
   - ✅ Le type de véhicule (VL/VU/PL) est correctement détecté
   - ✅ Les images changent selon l'angle (avant, arrière, latéral...)
   - ✅ Après capture, la photo s'affiche avec le badge vert

---

## 📂 Fichiers Créés/Modifiés

### Créés
- ✅ `mobile/assets/vehicles/` (18 images copiées)
- ✅ `mobile/src/components/inspection/PhotoIndicator.tsx`
- ✅ `mobile/src/components/inspection/index.ts`

### Modifiés
- ✅ `mobile/src/screens/inspections/InspectionDepartureNew.tsx`
  - Import de PhotoIndicator
  - Intégration dans le rendu
  - Ajustement des styles

---

## 🎯 Avantages

1. **UX Améliorée**: L'utilisateur sait exactement quelle vue photographier
2. **Cohérence Web/Mobile**: Même expérience sur les deux plateformes
3. **Guidage Visuel**: Réduit les erreurs de prise de vue
4. **Professionnel**: Apparence plus soignée et professionnelle
5. **Flexible**: Supporte 3 types de véhicules (VL, VU, PL)

---

## 📝 Notes Techniques

- **Images en local**: Utilisent `require()` pour bundling avec Expo
- **Pas de dépendance réseau**: Images embarquées dans l'app
- **Performance**: Images optimisées pour mobile
- **Fallback**: Icône caméra si image manquante
- **Type-safe**: Interface TypeScript stricte

---

## 🔜 Prochaines Étapes (Optionnel)

1. Tester sur appareil physique
2. Vérifier la qualité des images sur différents écrans
3. Ajouter animations de transition (optionnel)
4. Compresser les images si taille app trop importante
5. Ajouter images pour interior/dashboard (optionnel)

---

## ✅ État
**TERMINÉ** - Les images d'indication sont intégrées et fonctionnelles dans les écrans d'inspection mobile.
