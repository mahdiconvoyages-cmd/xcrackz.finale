# Plan de Synchronisation Inspection Web ↔ Flutter

## 📊 État Actuel

### Flutter (Reference - Mobile App)
**Fichier**: `lib/screens/inspections/inspection_departure_screen.dart` (1689 lignes)

**Structure en 5 étapes :**
1. **KM, Carburant, Tableau de bord**
   - Photo tableau de bord
   - Kilométrage (TextInput)
   - Niveau de carburant (Slider 0-100%)

2. **8 Photos obligatoires avec guidage visuel**
   - 6 photos extérieures (avec images de référence selon type VL/VU/PL)
   - 2 photos intérieures (avant + arrière)
   - **Guidage dynamique** : Images réelles de véhicules (assets/vehicles/)
   - État des dommages par photo (RAS, Rayures, Cassé, Abimé)
   - **10 photos optionnelles** max (apparaissent progressivement)

3. **État du véhicule & Checklist**
   - État général: Excellent / Bon / Mauvais
   - Nombre de clés (Counter widget)
   - Checklist : Kit sécurité, Roue secours, Kit gonflage, Carte carburant
   - Véhicule chargé (bool)
   - Objet confié (bool + TextField description)

4. **Signatures**
   - Signature client + nom client
   - Signature convoyeur (nom auto-chargé depuis profiles.full_name)

5. **Documents (optionnel)**
   - Scanner de documents (integration avec document_scanner_screen)
   - Upload vers Supabase Storage

**Features clés Flutter :**
- ✅ Type de véhicule chargé depuis missions (VL/VU/PL)
- ✅ Images de guidage dynamiques selon type
- ✅ 8 photos obligatoires + 10 optionnelles
- ✅ État des dommages par photo
- ✅ Validation stricte avant passage étape suivante
- ✅ Upload vers `inspection-photos` bucket
- ✅ Création dans `vehicle_inspections` + `inspection_photos_v2`

---

### Web (Current - Nécessite sync)
**Fichier**: `src/pages/InspectionDepartureNew.tsx` (942 lignes)

**Structure actuelle (désorganisée) :**
- Mélange de photos obligatoires/optionnelles
- Pas de guidage visuel
- Checklist incomplète
- Pas de type de véhicule dynamique

**Problèmes identifiés :**
❌ Photos obligatoires mal définies (8 vs structure confuse)
❌ Pas d'images de guidage
❌ Checklist différente de Flutter
❌ Pas de distinction claire VL/VU/PL
❌ Étapes mal organisées
❌ Validation incohérente

---

## 🎯 Objectifs de Synchronisation

### Priorité 1 : Structure identique (5 étapes)
```
Step 1: KM + Carburant + Photo Tableau de bord
Step 2: 8 Photos obligatoires + guidage + 10 optionnelles
Step 3: État + Checklist
Step 4: Signatures
Step 5: Documents
```

### Priorité 2 : 8 Photos obligatoires identiques
```typescript
const REQUIRED_PHOTOS = [
  { type: 'front', label: 'Avant', guide: '/vehicles/avant.png' },
  { type: 'left_front', label: 'Avant gauche', guide: '/vehicles/lateral-gauche-avant.png' },
  { type: 'left_back', label: 'Arrière gauche', guide: '/vehicles/lateral-gauche-arriere.png' },
  { type: 'back', label: 'Arrière', guide: '/vehicles/arriere.png' },
  { type: 'right_back', label: 'Arrière droit', guide: '/vehicles/lateral-droit-arriere.png' },
  { type: 'right_front', label: 'Avant droit', guide: '/vehicles/lateral-droit-avant.png' },
  { type: 'interior_front', label: 'Intérieur avant', guide: '/vehicles/interieur_avant.png' },
  { type: 'interior_back', label: 'Intérieur arrière', guide: '/vehicles/interieur_arriere.png' },
];
```

### Priorité 3 : Guidage visuel dynamique
- Charger `vehicle_type` depuis mission
- Afficher images selon type (VL/VU/PL)
- Images côte-à-côte : Guidage | Aperçu photo

### Priorité 4 : Checklist identique
```typescript
interface ChecklistState {
  vehicleCondition: 'excellent' | 'bon' | 'mauvais';
  keysCount: number; // 1-3
  hasSecurityKit: boolean;
  hasSpareWheel: boolean;
  hasInflationKit: boolean;
  hasFuelCard: boolean;
  isVehicleLoaded: boolean;
  hasConfidedObject: boolean;
  confidedObjectDescription: string;
}
```

### Priorité 5 : Signatures identiques
```typescript
interface SignatureState {
  clientName: string;
  clientSignature: string; // base64
  driverName: string; // Auto-chargé depuis profiles
  driverSignature: string; // base64
}
```

---

## 📝 Modifications à Appliquer

### 1. Réorganiser les étapes (InspectionDepartureNew.tsx)

#### Step 1 - KM, Carburant, Tableau de bord
```tsx
<div className="space-y-6">
  {/* Photo tableau de bord */}
  <PhotoCard
    label="Tableau de bord"
    photo={dashboardPhoto}
    onCapture={() => handlePhotoClick('dashboard')}
    required={true}
  />
  
  {/* Kilométrage */}
  <div>
    <label>Kilométrage *</label>
    <input 
      type="number" 
      value={mileage}
      onChange={(e) => setMileage(e.target.value)}
      placeholder="Ex: 45000"
    />
  </div>
  
  {/* Niveau carburant */}
  <div>
    <label>Niveau de carburant: {fuelLevel}%</label>
    <input
      type="range"
      min="0"
      max="100"
      value={fuelLevel}
      onChange={(e) => setFuelLevel(e.target.value)}
    />
  </div>
</div>
```

#### Step 2 - 8 Photos obligatoires + guidage
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {REQUIRED_PHOTOS.map((photo, index) => (
    <div key={photo.type} className="space-y-2">
      {/* Image de guidage selon vehicle_type */}
      <div className="bg-gray-100 rounded-lg p-4">
        <img 
          src={getGuideImage(photo.type, mission?.vehicle_type)}
          alt={`Guidage ${photo.label}`}
          className="w-full h-48 object-contain"
        />
        <p className="text-sm text-center mt-2">{photo.label}</p>
      </div>
      
      {/* Photo capturée */}
      <PhotoCard
        label={photo.label}
        photo={photos[index]}
        onCapture={() => handlePhotoClick(photo.type)}
        required={true}
      />
      
      {/* État des dommages */}
      <select
        value={photoDamages[index]}
        onChange={(e) => setPhotoDamage(index, e.target.value)}
      >
        <option value="RAS">RAS</option>
        <option value="Rayures">Rayures</option>
        <option value="Cassé">Cassé</option>
        <option value="Abimé">Abimé</option>
      </select>
    </div>
  ))}
</div>

{/* Photos optionnelles (10 max) */}
<OptionalPhotos
  photos={optionalPhotos}
  onAdd={addOptionalPhoto}
  maxPhotos={10}
/>
```

#### Step 3 - État + Checklist
```tsx
<div className="space-y-6">
  {/* État général */}
  <div>
    <label>État du véhicule *</label>
    <div className="flex gap-4">
      <button onClick={() => setCondition('excellent')}>Excellent</button>
      <button onClick={() => setCondition('bon')}>Bon</button>
      <button onClick={() => setCondition('mauvais')}>Mauvais</button>
    </div>
  </div>
  
  {/* Nombre de clés */}
  <div>
    <label>Nombre de clés *</label>
    <div className="flex items-center gap-4">
      <button onClick={() => setKeysCount(Math.max(1, keysCount - 1))}>-</button>
      <span className="text-2xl font-bold">{keysCount}</span>
      <button onClick={() => setKeysCount(Math.min(3, keysCount + 1))}>+</button>
    </div>
  </div>
  
  {/* Checklist */}
  <div className="space-y-3">
    <label className="flex items-center gap-3">
      <input type="checkbox" checked={hasSecurityKit} onChange={(e) => setHasSecurityKit(e.target.checked)} />
      <span>Kit de sécurité</span>
    </label>
    <label className="flex items-center gap-3">
      <input type="checkbox" checked={hasSpareWheel} onChange={(e) => setHasSpareWheel(e.target.checked)} />
      <span>Roue de secours</span>
    </label>
    <label className="flex items-center gap-3">
      <input type="checkbox" checked={hasInflationKit} onChange={(e) => setHasInflationKit(e.target.checked)} />
      <span>Kit de gonflage</span>
    </label>
    <label className="flex items-center gap-3">
      <input type="checkbox" checked={hasFuelCard} onChange={(e) => setHasFuelCard(e.target.checked)} />
      <span>Carte carburant</span>
    </label>
    <label className="flex items-center gap-3">
      <input type="checkbox" checked={isVehicleLoaded} onChange={(e) => setIsVehicleLoaded(e.target.checked)} />
      <span>Véhicule chargé</span>
    </label>
  </div>
  
  {/* Objet confié */}
  <div>
    <label className="flex items-center gap-3">
      <input type="checkbox" checked={hasConfidedObject} onChange={(e) => setHasConfidedObject(e.target.checked)} />
      <span>Objet confié</span>
    </label>
    {hasConfidedObject && (
      <textarea
        value={confidedObjectDescription}
        onChange={(e) => setConfidedObjectDescription(e.target.value)}
        placeholder="Description de l'objet confié..."
        className="mt-2 w-full"
      />
    )}
  </div>
</div>
```

#### Step 4 - Signatures
```tsx
<div className="space-y-8">
  {/* Signature client */}
  <div>
    <label>Nom du client *</label>
    <input
      type="text"
      value={clientName}
      onChange={(e) => setClientName(e.target.value)}
      placeholder="Nom complet"
    />
    <SignatureCanvas
      value={clientSignature}
      onChange={setClientSignature}
      label="Signature du client"
    />
  </div>
  
  {/* Signature convoyeur */}
  <div>
    <label>Convoyeur</label>
    <input
      type="text"
      value={driverName}
      onChange={(e) => setDriverName(e.target.value)}
      placeholder="Nom du convoyeur"
      disabled // Auto-chargé
    />
    <SignatureCanvas
      value={driverSignature}
      onChange={setDriverSignature}
      label="Signature du convoyeur"
    />
  </div>
</div>
```

#### Step 5 - Documents
```tsx
<div className="space-y-6">
  <p className="text-gray-600">
    Scannez les documents liés à la mission (optionnel)
  </p>
  
  <button onClick={() => setShowDocScanner(true)}>
    📄 Scanner un document
  </button>
  
  {/* Liste des documents scannés */}
  <div className="grid grid-cols-2 gap-4">
    {scannedDocs.map((doc, index) => (
      <div key={index} className="relative">
        <img src={doc.preview} alt={doc.type} />
        <button onClick={() => removeDoc(index)}>❌</button>
      </div>
    ))}
  </div>
</div>

{showDocScanner && (
  <UnifiedDocumentScanner
    onScan={handleDocScanned}
    onClose={() => setShowDocScanner(false)}
  />
)}
```

---

### 2. Ajouter le système de guidage dynamique

```tsx
// Fonction pour obtenir l'image de guidage selon le type de véhicule
function getGuideImage(photoType: string, vehicleType: 'VL' | 'VU' | 'PL' = 'VL'): string {
  const baseImages = {
    front: {
      VL: '/vehicles/avant.png',
      VU: '/vehicles/master avant.png',
      PL: '/vehicles/scania-avant.png',
    },
    left_front: {
      VL: '/vehicles/lateral-gauche-avant.png',
      VU: '/vehicles/master lateral gauche avant.png',
      PL: '/vehicles/scania-lateral-gauche-avant.png',
    },
    left_back: {
      VL: '/vehicles/lateral-gauche-arriere.png',
      VU: '/vehicles/master lateral gauche arriere.png',
      PL: '/vehicles/scania-lateral-gauche-arriere.png',
    },
    back: {
      VL: '/vehicles/arriere.png',
      VU: '/vehicles/master avg (2).png',
      PL: '/vehicles/scania-arriere.png',
    },
    right_back: {
      VL: '/vehicles/lateral droit arriere.png',
      VU: '/vehicles/master lateral droit arriere.png',
      PL: '/vehicles/scania-lateral-droit-arriere.png',
    },
    right_front: {
      VL: '/vehicles/lateraldroit avant.png',
      VU: '/vehicles/master lateral droit avant.png',
      PL: '/vehicles/scania-lateral-droit-avant.png',
    },
    interior_front: {
      VL: '/vehicles/interieur_avant.png',
      VU: '/vehicles/interieur_avant.png',
      PL: '/vehicles/interieur_avant.png',
    },
    interior_back: {
      VL: '/vehicles/interieur_arriere.png',
      VU: '/vehicles/interieur_arriere.png',
      PL: '/vehicles/interieur_arriere.png',
    },
  };

  return baseImages[photoType]?.[vehicleType] || baseImages[photoType]?.['VL'] || '';
}
```

---

### 3. Charger le type de véhicule au début

```tsx
useEffect(() => {
  loadMission();
  loadDriverName(); // Charger le nom du convoyeur
}, [missionId]);

const loadMission = async () => {
  const { data, error } = await supabase
    .from('missions')
    .select('id, reference, vehicle_brand, vehicle_model, vehicle_plate, vehicle_type')
    .eq('id', missionId)
    .single();
    
  if (data) {
    setMission(data);
    setVehicleType(data.vehicle_type || 'VL'); // Définir le type
  }
};

const loadDriverName = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setDriverName(data.full_name || '');
    }
  }
};
```

---

### 4. Validation avant passage à l'étape suivante

```tsx
const validateStep = (step: number): boolean => {
  switch (step) {
    case 1:
      if (!dashboardPhoto) {
        showToast('error', 'Photo tableau de bord requise');
        return false;
      }
      if (!mileage || parseInt(mileage) <= 0) {
        showToast('error', 'Kilométrage requis');
        return false;
      }
      return true;
      
    case 2:
      const missingPhotos = photos.filter(p => !p.captured);
      if (missingPhotos.length > 0) {
        showToast('error', `${missingPhotos.length} photo(s) obligatoire(s) manquante(s)`);
        return false;
      }
      return true;
      
    case 3:
      if (!condition) {
        showToast('error', 'État du véhicule requis');
        return false;
      }
      if (hasConfidedObject && !confidedObjectDescription) {
        showToast('error', 'Description de l\'objet confié requise');
        return false;
      }
      return true;
      
    case 4:
      if (!clientName || !clientSignature) {
        showToast('error', 'Signature client requise');
        return false;
      }
      if (!driverSignature) {
        showToast('error', 'Signature convoyeur requise');
        return false;
      }
      return true;
      
    default:
      return true;
  }
};

const handleNextStep = () => {
  if (validateStep(currentStep)) {
    setCurrentStep(currentStep + 1);
  }
};
```

---

## ✅ Checklist de Synchronisation

### Phase 1 : Structure de base
- [ ] Réorganiser en 5 étapes claires
- [ ] Définir les 8 photos obligatoires
- [ ] Ajouter le système de photos optionnelles (10 max)
- [ ] Créer la fonction `getGuideImage()`

### Phase 2 : Étape 1 (KM + Carburant)
- [ ] Photo tableau de bord
- [ ] Input kilométrage (number)
- [ ] Slider niveau carburant (0-100%)
- [ ] Validation avant passage étape 2

### Phase 3 : Étape 2 (Photos)
- [ ] Afficher les 8 photos obligatoires avec guidage
- [ ] Images dynamiques selon vehicle_type
- [ ] État des dommages par photo (select)
- [ ] Photos optionnelles (progressive reveal 1-10)
- [ ] Validation : toutes les photos obligatoires prises

### Phase 4 : Étape 3 (Checklist)
- [ ] État du véhicule (3 boutons)
- [ ] Nombre de clés (counter 1-3)
- [ ] Checklist 5 items (checkboxes)
- [ ] Objet confié (checkbox + textarea conditionnelle)
- [ ] Validation : état véhicule sélectionné

### Phase 5 : Étape 4 (Signatures)
- [ ] Input nom client
- [ ] Signature client (canvas)
- [ ] Nom convoyeur (auto-chargé, disabled)
- [ ] Signature convoyeur (canvas)
- [ ] Validation : signatures obligatoires

### Phase 6 : Étape 5 (Documents)
- [ ] Bouton scanner document
- [ ] Intégration UnifiedDocumentScanner
- [ ] Liste des documents scannés
- [ ] Upload vers Supabase Storage

### Phase 7 : Validation & Upload
- [ ] Valider données complètes
- [ ] Upload photos vers `inspection-photos` bucket
- [ ] Créer `vehicle_inspections` record
- [ ] Créer `inspection_photos_v2` records
- [ ] Navigation vers liste missions

---

## 🚀 Prêt à Implémenter

Le plan est prêt. Voulez-vous que je commence l'implémentation ?

**Options :**
1. Tout implémenter d'un coup (fichier complet ~1200 lignes)
2. Par phases (5 étapes séparées)
3. Créer un nouveau fichier `InspectionDeparturePerfect.tsx`

Quelle option préférez-vous ?
