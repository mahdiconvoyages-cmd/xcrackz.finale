# 📸 Corrections Photos Mobile

## ✅ Problèmes corrigés

### 1. **Bucket Storage unifié avec le Web**
- ✅ Mobile utilise maintenant le bucket `missions` (comme le web)
- ✅ Path: `vehicle-images/{filename}` 
- ❌ Ancien: bucket `vehicle-images` séparé

### 2. **Désactivation du redimensionnement automatique**
- ✅ `quality: 1` (100% qualité, pas de compression)
- ❌ Ancien: `quality: 0.8` (80% qualité)

### 3. **Désactivation du recadrage automatique**
- ✅ `allowsEditing: false` (pas de crop/recadrage)
- ❌ Ancien: `allowsEditing: true` avec `aspect: [4, 3]`

---

## 📁 Fichiers modifiés

### 1. `mobile/src/components/VehicleImageUpload.tsx`
**Changements:**
```typescript
// AVANT
allowsEditing: true,
aspect: [4, 3],
quality: 0.8,

// APRÈS
allowsEditing: false,  // Pas de recadrage
quality: 1,  // Qualité maximale
```

**Bucket Storage:**
```typescript
// Upload vers le bucket 'missions' (comme le web)
const { data, error } = await supabase.storage
  .from('missions')  // ✅ Même bucket que le web
  .upload(filePath, blob, {
    contentType: `image/${extension}`,
    upsert: false,
  });

// Récupération URL publique
const { data: publicUrlData } = supabase.storage
  .from('missions')  // ✅ Même bucket que le web
  .getPublicUrl(filePath);
```

### 2. `mobile/src/screens/ScannerProScreen.tsx`
**Changements:**
```typescript
// AVANT
quality: 1,
allowsEditing: true,
aspect: [4, 3],

// APRÈS
quality: 1,
allowsEditing: false,  // Pas de recadrage automatique
```

### 3. `mobile/src/screens/inspections/InspectionDepartureNew.tsx`
**Changements:**
```typescript
// AVANT
quality: 0.8,
allowsEditing: true,
aspect: [4, 3],

// APRÈS
quality: 1,  // Qualité max
allowsEditing: false,  // Pas de recadrage
```

---

## 🎯 Comportement attendu

### Création de mission (MissionCreateScreen)
1. **Caméra:** Photo plein écran, sans recadrage
2. **Galerie:** Sélection sans modification
3. **Upload:** Vers `missions` bucket, path `vehicle-images/{timestamp}.{ext}`
4. **Qualité:** 100% (pas de compression)

### Scanner de documents (ScannerProScreen)
1. **Capture:** Photo brute, sans recadrage automatique
2. **Qualité:** Maximale (qualité 1.0)
3. **Filtres:** ❌ Désactivés (recadrage auto désactivé)

### Inspections (InspectionDepartureNew)
1. **Photos véhicule:** Qualité maximale
2. **Pas de recadrage:** L'utilisateur voit l'image complète
3. **Upload:** Vers bucket inspections

---

## 🔧 Configuration Supabase requise

### Bucket `missions` doit exister et avoir les policies:

```sql
-- Policy: Public read
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'missions');

-- Policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'missions');

-- Policy: Users can delete own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'missions' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 📱 Impact utilisateur

### Avant (problèmes)
- ❌ Photos compressées (80% qualité)
- ❌ Recadrage forcé 4:3
- ❌ Perte de détails
- ❌ Bucket différent web/mobile (incohérence)

### Après (corrigé)
- ✅ Photos qualité maximale (100%)
- ✅ Image complète (pas de crop)
- ✅ Détails préservés
- ✅ Même bucket web/mobile (cohérence)

---

## 🚀 Déploiement

### 1. Build APK avec les corrections
```powershell
cd mobile
eas build --platform android --profile preview
```

### 2. Ou utiliser OTA (si APK déjà distribué avec expo-updates)
```powershell
cd mobile
eas update --branch preview --message "Fix: qualité photos max + bucket unifié"
```

---

## ✅ Tests recommandés

### Test 1: Création mission
1. Ouvrir création mission
2. Ajouter photo véhicule (caméra)
3. Vérifier: pas de recadrage demandé
4. Soumettre mission
5. Vérifier dans web: photo visible et haute qualité

### Test 2: Scanner documents
1. Ouvrir scanner
2. Capturer document
3. Vérifier: image complète sans crop auto
4. Générer PDF
5. Vérifier qualité PDF

### Test 3: Inspection
1. Démarrer inspection départ
2. Prendre photo extérieure
3. Vérifier: qualité maximale
4. Soumettre
5. Voir dans web: photos nettes

---

## 🔍 Debugging

### Vérifier le bucket utilisé
```typescript
// Dans VehicleImageUpload.tsx, ligne 108
console.log('Upload vers bucket:', 'missions');
console.log('Path:', filePath);
```

### Vérifier la qualité
```typescript
// Dans launchCameraAsync
console.log('Quality setting:', 1);
console.log('AllowsEditing:', false);
```

### Logs Supabase Storage
```sql
-- Vérifier les uploads
SELECT 
  name,
  bucket_id,
  created_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'missions'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 Résumé des améliorations

| Aspect | Avant | Après |
|--------|-------|-------|
| **Qualité** | 80% | 100% |
| **Recadrage** | Forcé 4:3 | Aucun |
| **Bucket** | `vehicle-images` | `missions` |
| **Cohérence web/mobile** | ❌ | ✅ |
| **Compression** | Oui | Non |
| **Filtres auto** | Actifs | Désactivés |

---

## 🎉 Résultat final

- Photos **haute qualité** préservée
- **Aucune perte** de détails
- **Cohérence** totale web/mobile
- **Pas de recadrage** automatique non désiré
- Scanner **brut** sans filtres
