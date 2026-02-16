# 🎯 PLAN D'ACTION - Améliorations Inspection

**Date:** 11 octobre 2025  
**Priorité:** HAUTE

---

## 📋 Liste des améliorations

### 1. ✅ Verrouillage après validation
**Problème:** On peut modifier l'inspection départ après validation  
**Solution:**
- Ajouter `status` dans table `inspections` : `draft` | `locked`
- Bloquer modification si `status = 'locked'`
- Afficher badge "✅ Validé" si locked

**Fichiers à modifier:**
- `mobile/src/screens/InspectionDepartScreen.tsx`
- `mobile/src/screens/InspectionArrivalScreen.tsx`
- `mobile/src/services/inspectionService.ts`

---

### 2. ✅ Signature départ/arrivée
**Problème:** Manque signature client + chauffeur  
**Solution:**
- Utiliser `expo-signature-capture` ou `react-native-signature-canvas`
- Sauvegarder en base64
- Upload vers Supabase Storage

**Nouvelles colonnes DB:**
```sql
ALTER TABLE inspections 
ADD COLUMN driver_signature TEXT,
ADD COLUMN client_signature TEXT,
ADD COLUMN signed_at TIMESTAMP;
```

**Fichiers à modifier:**
- Créer `SignatureModal.tsx`
- Modifier `InspectionDepartScreen.tsx`
- Modifier `InspectionArrivalScreen.tsx`

---

### 3. 🚀 GPS Navigation Waze
**Problème:** Pas de vraie navigation  
**Solution:**
- Intégrer Mapbox Navigation SDK
- Ou ouvrir app Waze/Google Maps native
- Navigation: pickup_address → delivery_address

**Options:**

#### Option A: Mapbox Navigation (intégré)
```typescript
import MapboxNavigation from '@mapbox/react-native-mapbox-navigation';

<MapboxNavigation
  origin={[pickup.lon, pickup.lat]}
  destination={[delivery.lon, delivery.lat]}
  onRouteProgressChange={handleProgress}
/>
```

#### Option B: Ouvrir Waze (simple)
```typescript
const openWaze = () => {
  const url = `waze://?ll=${lat},${lon}&navigate=yes`;
  Linking.openURL(url);
};
```

**Fichiers à modifier:**
- Remplacer `InspectionGPSScreen.tsx` par `WazeNavigationScreen.tsx`

---

### 4. 🎨 Optimiser affichage inspection
**Problème:** Interface pas claire  
**Améliorations:**
- Cards plus lisibles
- Photos en grille 2x2
- Progression visuelle
- Couleurs cohérentes
- Icônes pour chaque section

**Fichiers à modifier:**
- `InspectionDepartScreen.tsx` (refonte UI)
- `InspectionArrivalScreen.tsx` (refonte UI)

---

### 5. 💾 Sauvegarder progression automatiquement
**Problème:** Perte de données si crash/fermeture  
**Solution:**
- AsyncStorage pour brouillon
- Auto-save toutes les 5 secondes
- Restaurer au redémarrage

**Fichiers à modifier:**
- `InspectionDepartScreen.tsx` (useEffect auto-save)
- `InspectionArrivalScreen.tsx` (useEffect auto-save)

---

## 🏗️ Structure SQL requise

```sql
-- 1. Ajouter colonnes signatures et status
ALTER TABLE inspections 
ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'locked')),
ADD COLUMN driver_signature TEXT,
ADD COLUMN client_signature TEXT,
ADD COLUMN signed_at TIMESTAMP,
ADD COLUMN locked_at TIMESTAMP;

-- 2. Index pour recherche rapide
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_mission_status ON inspections(mission_id, status);
```

---

## 📦 Dépendances à installer

```bash
# Signature
npm install react-native-signature-canvas

# Navigation (si Mapbox intégré)
npm install @mapbox/react-native-mapbox-navigation

# Storage local
npm install @react-native-async-storage/async-storage
```

---

## 🎯 Ordre d'implémentation

### Phase 1: Verrouillage + Signatures (2h)
1. Migration SQL (5 min)
2. Composant SignatureModal (30 min)
3. Intégration départ/arrivée (30 min)
4. Verrouillage après signature (20 min)
5. Tests (35 min)

### Phase 2: Auto-save (1h)
1. AsyncStorage integration (20 min)
2. Auto-save hook (20 min)
3. Restore on mount (10 min)
4. Tests (10 min)

### Phase 3: GPS Navigation (1h)
1. Décider: Mapbox vs Waze external
2. Implémenter navigation (40 min)
3. Tests (20 min)

### Phase 4: Optimisation UI (2h)
1. Refonte cards (45 min)
2. Grid photos (30 min)
3. Progress bar (15 min)
4. Tests (30 min)

**Total estimé:** 6 heures

---

## 🚀 Commençons par quoi?

Choisissez la priorité:
1. **Verrouillage + Signatures** (critique pour validation)
2. **GPS Navigation Waze** (fonctionnalité principale)
3. **Auto-save** (éviter perte de données)
4. **Optimisation UI** (améliorer UX)

**Recommandation:** Commencer par **Verrouillage + Signatures** car c'est la base du workflow.
