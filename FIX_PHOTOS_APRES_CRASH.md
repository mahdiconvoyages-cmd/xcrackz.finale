# 🔥 FIX CRITIQUE - Photos Manquantes Après Crash

## 🎯 PROBLÈME IDENTIFIÉ

**Symptôme**: Quand l'app crash et qu'on reprend la progression, les photos ne sont pas uploadées même si on continue l'inspection.

**Cause Root**: 
Les URIs des photos sont sauvegardées dans AsyncStorage, mais après un crash, ces URIs deviennent **invalides** car elles pointent vers des fichiers temporaires qui n'existent plus.

```typescript
// ❌ AVANT - MAUVAIS
const progressData = {
  photos: [
    { 
      type: 'front', 
      uri: 'file:///data/.../cache/Camera/photo123.jpg',  // ❌ URI invalide après crash
      captured: true 
    }
  ]
};
```

## ✅ SOLUTION APPLIQUÉE

### Changement 1: Sauvegarde sans URIs

**Fichier**: `InspectionDepartureNew.tsx` - fonction `saveProgress()`

```typescript
// ✅ APRÈS - BON
const saveProgress = async () => {
  // Sauvegarder uniquement l'ÉTAT, pas les URIs
  const photosState = photos.map(p => ({ 
    type: p.type, 
    label: p.label, 
    captured: p.captured  // ✅ État seulement
  }));
  
  const progressData = {
    currentStep,
    photosState,  // ✅ Pas d'URIs
    optionalPhotosState,
    damagePhotosCount,
    fuelLevel,
    mileage,
    // ... autres données
  };
};
```

### Changement 2: Restauration sans URIs

**Fichier**: `InspectionDepartureNew.tsx` - fonction `loadSavedProgress()`

```typescript
// ✅ APRÈS - Forcer à reprendre les photos
const restoredPhotos = REQUIRED_PHOTOS.map((p) => {
  return {
    ...p,
    uri: null,        // ❌ URI invalide
    captured: false,  // ❌ Force à reprendre
  };
});
setPhotos(restoredPhotos);
```

### Changement 3: Message clair à l'utilisateur

```typescript
Alert.alert(
  '⚠️ Reprendre l\'inspection ?',
  `Une inspection en cours a été trouvée
  
  ⚠️ IMPORTANT: Les photos devront être reprises 
  car elles ne peuvent pas être restaurées après un crash.`,
  [
    { text: 'Recommencer à zéro', ... },
    { text: 'Reprendre (reprendre photos)', ... }
  ]
);
```

## 📊 COMPORTEMENT AVANT/APRÈS

### ❌ AVANT

1. App crash pendant inspection
2. Reprendre progression
3. Photos marquées "captured" mais URIs invalides
4. Continuer et valider inspection
5. **Upload échoue silencieusement** ❌
6. Inspection enregistrée SANS photos ❌

### ✅ APRÈS

1. App crash pendant inspection
2. Reprendre progression
3. **Message clair: "photos à reprendre"** ✅
4. Photos réinitialisées à `captured: false`
5. Utilisateur DOIT reprendre les photos ✅
6. Inspection enregistrée AVEC photos ✅

## 🎯 IMPACT

### Positif ✅
- **Photos toujours uploadées** après crash
- **Message clair** pour l'utilisateur
- **Pas de perte de données** (kilométrage, notes, etc.)
- **Logs explicites** pour debug

### Compromis ⚠️
- Utilisateur doit **reprendre toutes les photos**
- Pas de restauration automatique des URIs

### Alternative envisagée (non implémentée)
- Copier photos dans stockage permanent
- Upload immédiat après chaque photo
- Restaurer depuis stockage permanent

**Raison rejet**: Complexité + Espace disque + Délai upload

## 🧪 TEST

### Scénario test complet

```bash
1. Commencer inspection départ
2. Prendre 3 photos sur 6
3. Remplir kilométrage, notes
4. CRASH APP (fermer de force)
5. Relancer app
6. Ouvrir même mission
7. Message: "Reprendre inspection ?"
8. Cliquer "Reprendre"
9. Vérifier:
   ✓ Kilométrage conservé
   ✓ Notes conservées
   ✓ Photos marquées "à reprendre" (0/6)
   ✓ Reprendre les 6 photos
   ✓ Valider inspection
   ✓ TOUTES les photos uploadées ✅
```

## 📝 LOGS À VÉRIFIER

### Sauvegarde
```
💾 Progression sauvegardée (sans URIs photos)
```

### Restauration
```
⚠️ Photos obligatoires: URIs invalides, à reprendre
✅ Progression restaurée (photos à reprendre)
```

### Upload
```
📸 Upload de 6 photos en parallèle...
📤 [1/6] Upload photo front démarré...
✅✅ Photo front complètement uploadée (ID: xxx)
...
✅ 6/6 photos uploadées
```

## 🔍 DIAGNOSTIC SI PROBLÈME

### Photos toujours manquantes ?

1. **Vérifier logs Metro**:
   ```
   📸 Upload de X photos en parallèle...
   ```
   Si X = 0 → Problème capture

2. **Vérifier table Supabase**:
   ```sql
   SELECT COUNT(*) FROM inspection_photos_v2
   WHERE inspection_id = 'xxx';
   ```

3. **Vérifier Storage Supabase**:
   - Dashboard → Storage → inspection-photos
   - Chercher fichiers récents

## 💡 AMÉLIORATIONS FUTURES

### Option 1: Upload immédiat
```typescript
const takePicture = async () => {
  const photo = await ImagePicker.launchCameraAsync();
  
  // Upload IMMÉDIATEMENT
  const uploaded = await uploadToSupabase(photo.uri);
  
  if (uploaded) {
    // Sauvegarder ID photo uploadée
    savePhotoId(uploaded.id);
  }
};
```

**Avantages**:
- Pas de perte après crash
- Photos déjà en cloud

**Inconvénients**:
- Lent (6 uploads successifs)
- Nécessite connexion stable

### Option 2: Stockage permanent local
```typescript
const takePicture = async () => {
  const photo = await ImagePicker.launchCameraAsync();
  
  // Copier dans stockage permanent
  const permanentUri = await FileSystem.copyAsync({
    from: photo.uri,
    to: `${FileSystem.documentDirectory}inspection_${Date.now()}.jpg`
  });
  
  // Sauvegarder URI permanent
  savePhotoUri(permanentUri);
};
```

**Avantages**:
- Restauration possible après crash
- Pas besoin connexion

**Inconvénients**:
- Espace disque
- Cleanup complexe

---

## ✅ RÉSOLUTION

**Status**: ✅ **CORRIGÉ**

**Fichiers modifiés**:
- `mobile/src/screens/inspections/InspectionDepartureNew.tsx`

**Fonctions modifiées**:
- `saveProgress()` - Ne sauvegarde plus les URIs
- `loadSavedProgress()` - Force à reprendre les photos

**Impact**: 
- **0 perte de photos** après crash
- **UX claire** pour l'utilisateur
- **Logs explicites** pour debug

**Date**: 2025-11-06  
**Par**: AI Assistant  
**Validation**: À tester en conditions réelles
