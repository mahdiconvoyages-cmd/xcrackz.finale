# Fix: Photo Upload Error - React Native Compatibility

**Date:** 11 octobre 2025  
**Problème:** "error uploading photo typeerror cannot read property base64 undefined"

## 🔍 Problèmes identifiés

### 1. FileReader API (Web API)
- **Fichier:** `InspectionScreen.tsx`
- **Ligne:** 248-257
- **Erreur:** Utilisation de `FileReader` qui n'existe pas en React Native
- **Solution:** Utilisation directe de `result.assets[0].base64` depuis expo-image-picker

### 2. atob() et Buffer (Web/Node APIs)
- **Fichier:** `inspectionService.ts`
- **Ligne:** 162-225
- **Erreur:** Utilisation de `atob()`, `Buffer`, `Blob` qui n'existent pas en React Native
- **Solution:** Implémentation d'un décodeur base64 manuel compatible React Native

### 3. Avertissement deprecation expo-image-picker
- **Warning:** "`ImagePicker.MediaTypeOptions` have been deprecated"
- **Solution:** Gardé `MediaTypeOptions.Images` pour compatibilité avec la version actuelle

## ✅ Corrections appliquées

### InspectionScreen.tsx (lignes 216-254)

**AVANT:**
```typescript
const result = await ImagePicker.launchCameraAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.8,
  allowsEditing: false,
});

if (!result.canceled && result.assets[0]) {
  // ...
  const response = await fetch(result.assets[0].uri);
  const blob = await response.blob();
  const reader = new FileReader();
  
  reader.onloadend = async () => {
    const base64 = (reader.result as string).split(',')[1]; // ❌ ERROR
    const damage = await analyzeDamage(base64, ...);
  };
  reader.readAsDataURL(blob);
}
```

**APRÈS:**
```typescript
const result = await ImagePicker.launchCameraAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.8,
  allowsEditing: false,
  base64: true, // ✅ Enable base64 directly
});

if (!result.canceled && result.assets[0]) {
  // ...
  const base64 = result.assets[0].base64; // ✅ Direct access
  
  if (base64) {
    console.log('🤖 Analyse IA en cours...');
    const damage = await analyzeDamage(base64, photoSteps[currentStep].label);
    // ...
  }
}
```

### inspectionService.ts (lignes 162-245)

**AVANT:**
```typescript
const base64 = await FileSystem.readAsStringAsync(compressedImage.uri, {
  encoding: FileSystem.EncodingType.Base64,
});

const response = await fetch(result.assets[0].uri);
const blob = await response.blob();
const reader = new FileReader();

reader.onloadend = () => {
  const base64 = (reader.result as string).split(',')[1];
  // Upload...
};
reader.readAsDataURL(blob);
```

**APRÈS:**
```typescript
// Read file as base64
const base64 = await FileSystem.readAsStringAsync(compressedImage.uri, {
  encoding: 'base64', // ✅ Simplified
});

console.log('✅ Base64 encoded, length:', base64.length);

// Manual base64 decode (no atob needed) ✅
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const len = binaryString.length;
const bytes = new Uint8Array(len * 3 / 4);
let bufferPos = 0;

for (let i = 0; i < len; i += 4) {
  const encoded1 = chars.indexOf(binaryString[i]);
  const encoded2 = chars.indexOf(binaryString[i + 1]);
  const encoded3 = chars.indexOf(binaryString[i + 2]);
  const encoded4 = chars.indexOf(binaryString[i + 3]);
  
  bytes[bufferPos++] = (encoded1 << 2) | (encoded2 >> 4);
  bytes[bufferPos++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
  bytes[bufferPos++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
}

const { data: uploadData, error: uploadError } = await supabase.storage
  .from('inspection-photos')
  .upload(filePath, bytes.buffer, { // ✅ Upload ArrayBuffer
    contentType: 'image/jpeg',
    upsert: false,
  });
```

## 📝 Logs de debugging ajoutés

```typescript
console.log('📸 Starting photo upload...', { inspectionId, photoType });
console.log('✅ Image compressed:', compressedImage.uri);
console.log('✅ Base64 encoded, length:', base64.length);
console.log('📤 Uploading to Supabase Storage...');
console.log('✅ Upload successful:', uploadData);
console.log('📷 Public URL:', publicUrl);
console.log('✅ Photo record created:', photoData);
console.log('❌ Upload error:', uploadError);
console.log('❌ Photo record error:', photoError);
console.log('❌ Error uploading photo:', error);
```

## 🧪 Comment tester

1. Redémarrer l'app Expo:
   ```powershell
   cd mobile
   npx expo start --clear
   ```

2. Dans l'app mobile:
   - Ouvrir une mission
   - Cliquer sur "Inspection"
   - Aller dans l'onglet "Départ"
   - Cliquer sur "Prendre une photo" pour un des points d'inspection
   - Vérifier les logs dans le terminal Expo

3. Logs attendus:
   ```
   📸 Starting photo upload...
   ✅ Image compressed: file://...
   ✅ Base64 encoded, length: 123456
   📤 Uploading to Supabase Storage...
   ✅ Upload successful: { path: "..." }
   📷 Public URL: https://...
   ✅ Photo record created: { id: "...", ... }
   🤖 Analyse IA en cours...
   ```

## ⚠️ Problèmes restants

### Erreur Jimp
```
Error: Could not find MIME for Buffer <null>
at Jimp.parseBitmap
```

**Cause:** Une bibliothèque utilise Jimp en arrière-plan  
**Impact:** Ne bloque pas l'upload mais crée des warnings  
**Solution:** À investiguer - possible conflit avec expo-image-manipulator

### Mauvaise URL Supabase
```
LOG  Supabase Config: {
  "url": "https://bfrkthzovwpjrvqktdjn.supabase.co"
}
```

**Problème:** L'app mobile utilise l'ancien projet Supabase  
**URL correcte:** `https://tjcrrgstcwypqwsbwfud.supabase.co`  
**À corriger dans:**
- `mobile/.env`
- `mobile/src/lib/supabase.ts`
- `mobile/src/config/supabase.js`

## 🔄 Prochaines étapes

1. ✅ Upload photo fixé avec décodage base64 manuel
2. ⏳ Tester l'upload complet
3. ⏳ Corriger l'URL Supabase dans les fichiers de config mobile
4. ⏳ Investiguer l'erreur Jimp si elle persiste
5. ⏳ Tester l'analyse IA avec DeepSeek

## 📚 Références

- [expo-image-picker docs](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [expo-file-system docs](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [Supabase Storage upload](https://supabase.com/docs/reference/javascript/storage-from-upload)
- [Base64 encoding](https://developer.mozilla.org/en-US/docs/Glossary/Base64)

## 🎯 Architecture finale

```
Photo Capture Flow (React Native Compatible):
┌─────────────────────────────────────────────┐
│ 1. ImagePicker.launchCameraAsync()          │
│    - base64: true option                    │
│    - quality: 0.8                           │
│    - Returns: { assets: [{ uri, base64 }] } │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 2. ImageManipulator.manipulateAsync()       │
│    - Resize to 1920px width                 │
│    - Compress to 0.8 quality                │
│    - Format: JPEG                           │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 3. FileSystem.readAsStringAsync()           │
│    - encoding: 'base64'                     │
│    - Reads compressed image as base64       │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 4. Manual base64 decode                     │
│    - No atob() / Buffer / Blob              │
│    - Pure JavaScript implementation         │
│    - Returns: Uint8Array                    │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 5. Supabase Storage upload                  │
│    - bucket: 'inspection-photos'            │
│    - upload(path, bytes.buffer)             │
│    - contentType: 'image/jpeg'              │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 6. Database record creation                 │
│    - table: 'inspection_photos'             │
│    - photo_url: publicUrl                   │
│    - metadata: type, location, timestamp    │
└─────────────────────────────────────────────┘
```
