# 🚨 GUIDE DE DÉPANNAGE - PHOTOS NON UPLOADÉES

## Problème constaté
```
✅ Inspection départ enregistrée
📸 Photos uploadées: 0
⚠️ Attention: 6 photo(s) non uploadée(s)
```

---

## 🔍 ÉTAPE 1: DIAGNOSTIC

### A. Vérifier les logs dans l'app mobile

**Ouvrir les logs React Native**:
```bash
# Android
npx react-native log-android

# OU si vous utilisez Expo
npx expo start
# Puis appuyez sur 'j' pour ouvrir les logs
```

**Chercher ces messages**:
```
❌❌ ERREUR COMPLÈTE upload photo
❌ Error message: [le message d'erreur exact]
❌ DÉTAILS DES ÉCHECS:
```

Les erreurs typiques:
- `Upload failed: Bucket not found` → Le bucket n'existe pas
- `Upload failed: new row violates row-level security` → Problème de permissions RLS
- `Upload failed: File too large` → Fichier > 50MB
- `DB insert failed: permission denied` → Problème permissions table
- `Erreur lecture fichier: 404` → URI photo invalide

---

### B. Vérifier la configuration Supabase

**Connectez-vous à Supabase Dashboard** → Storage

1. **Le bucket `inspection-photos` existe-t-il ?**
   - Si NON → créer le bucket (voir SOLUTION 1)

2. **Le bucket est-il PUBLIC ?**
   - Aller dans Storage → inspection-photos → Settings
   - "Public bucket" doit être activé ✅

3. **Y a-t-il des fichiers dans le bucket ?**
   - Aller dans Storage → inspection-photos
   - Vérifier s'il y a des fichiers récents
   - Si OUI mais pas dans la table → Problème insertion DB
   - Si NON → Problème upload Storage

---

### C. Exécuter le diagnostic SQL

**Dans Supabase SQL Editor**, exécuter:

```sql
-- Copier/coller le contenu de DIAGNOSTIC_PHOTOS_NON_UPLOADEES.sql
```

**Vérifier les résultats**:

1. **Inspections récentes** → Doit montrer votre inspection avec `photo_count = 0`
2. **Bucket config** → `public = true`, `file_size_limit = 52428800`
3. **Policies RLS** → Doit avoir 4 policies (INSERT, SELECT, UPDATE, DELETE)
4. **Fichiers Storage** → Vérifier si des fichiers sont uploadés
5. **Photos table** → Vérifier si des enregistrements existent

---

## 🛠️ SOLUTIONS

### SOLUTION 1: Créer/reconfigurer le bucket

**Si le bucket n'existe pas** ou est mal configuré:

1. **Aller dans Supabase Dashboard → Storage**

2. **Créer le bucket** (si n'existe pas):
   - Nom: `inspection-photos`
   - Public: ✅ Activé
   - File size limit: 50 MB
   - Allowed MIME types: `image/jpeg,image/jpg,image/png,image/heic`

3. **Ou reconfigurer** (si existe):
   ```sql
   UPDATE storage.buckets
   SET 
     public = true,
     file_size_limit = 52428800,
     allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/heic']
   WHERE id = 'inspection-photos';
   ```

---

### SOLUTION 2: Recréer les policies RLS

**Si les policies sont incorrectes ou manquantes**:

```sql
-- 1. Supprimer les anciennes policies
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their inspection photos" ON storage.objects;

-- 2. Créer les bonnes policies
CREATE POLICY "Allow authenticated users to upload inspection photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

CREATE POLICY "Allow authenticated users to update their inspection photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'inspection-photos');

CREATE POLICY "Allow public read access to inspection photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'inspection-photos');

CREATE POLICY "Allow authenticated users to delete their inspection photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'inspection-photos');
```

---

### SOLUTION 3: Vérifier les permissions de la table `inspection_photos`

```sql
-- Vérifier les policies RLS sur la table
SELECT * FROM pg_policies 
WHERE tablename = 'inspection_photos';

-- Si aucune policy, créer:
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to insert photos"
ON inspection_photos
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow public to read photos"
ON inspection_photos
FOR SELECT
TO public
USING (true);
```

---

### SOLUTION 4: Augmenter le timeout réseau

**Si l'upload échoue après quelques secondes** (connexion lente):

Dans `mobile/src/lib/supabase.ts`:

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-react-native',
    },
  },
  // ⬇️ AJOUTER
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
```

---

### SOLUTION 5: Réduire la taille des photos

**Si les photos sont trop grandes** (> 5MB sur réseau lent):

Dans `InspectionDepartureNew.tsx`, après la capture:

```typescript
import * as ImageManipulator from 'expo-image-manipulator';

// Après la capture de la photo
const compressedPhoto = await ImageManipulator.manipulateAsync(
  photo.uri,
  [{ resize: { width: 1920 } }], // Redimensionner à 1920px de large
  { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
);

// Utiliser compressedPhoto.uri au lieu de photo.uri
```

---

## 🔄 SOLUTION 6: Système de retry automatique

**Amélioration du code** (déjà appliqué dans le dernier commit):

```typescript
// Upload avec retry (3 tentatives)
const uploadWithRetry = async (photo, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 Tentative ${attempt}/${maxRetries} pour ${photo.type}`);
      
      // ... code d'upload ...
      
      return { success: true };
    } catch (error) {
      console.error(`❌ Tentative ${attempt} échouée:`, error);
      
      if (attempt === maxRetries) {
        return { success: false, error };
      }
      
      // Attendre avant de réessayer (backoff exponentiel)
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
};
```

---

## 📊 TEST APRÈS CORRECTION

### 1. Reconstruire l'app mobile

```bash
cd mobile
npm install
eas build --platform android --profile preview
```

### 2. Créer une nouvelle inspection de test

1. Ouvrir l'app mobile
2. Créer une nouvelle mission
3. Faire une inspection départ
4. Prendre 6 photos
5. Sauvegarder

### 3. Vérifier les logs

**Succès attendu**:
```
📸 Upload de 6 photos en parallèle...
📤 [1/6] Upload photo front démarré...
📂 Fichier: inspections/xxx-front-xxx.jpg
📊 Taille fichier: 234.56 KB
☁️ Upload vers Supabase Storage...
✅ Fichier uploadé sur Storage: inspections/xxx-front-xxx.jpg
🔗 URL publique: https://xxx.supabase.co/storage/v1/object/public/inspection-photos/...
💾 Insertion dans table inspection_photos...
✅✅ Photo front complètement uploadée (ID: uuid-xxx)
...
✅ 6/6 photos uploadées
```

### 4. Vérifier dans Supabase

**Storage**:
- Aller dans Storage → inspection-photos
- Doit voir les 6 fichiers uploadés

**Table inspection_photos**:
```sql
SELECT * FROM inspection_photos 
WHERE inspection_id = 'votre-inspection-id'
ORDER BY created_at DESC;
```
→ Doit retourner 6 lignes

**Web App**:
- Aller sur "Rapports d'Inspection"
- Ouvrir votre inspection
- Les 6 photos doivent s'afficher

---

## 🎯 CHECKLIST COMPLÈTE

Avant de refaire un test, vérifier:

- [ ] Bucket `inspection-photos` existe
- [ ] Bucket est PUBLIC ✅
- [ ] File size limit = 50MB
- [ ] 4 policies RLS sur `storage.objects` (INSERT, SELECT, UPDATE, DELETE)
- [ ] 2 policies RLS sur `inspection_photos` (INSERT, SELECT)
- [ ] App mobile rebuild avec les nouveaux logs
- [ ] Connexion internet stable
- [ ] Compte utilisateur connecté dans l'app

---

## 📞 SUPPORT

**Si le problème persiste après avoir tout vérifié**:

1. **Exporter les logs complets**:
   ```bash
   npx expo start > logs.txt 2>&1
   # Puis faire l'inspection
   # Envoyer logs.txt
   ```

2. **Capturer les erreurs Supabase**:
   - Aller dans Supabase Dashboard → Logs → Edge Logs
   - Filtrer par timestamp de votre test
   - Copier les erreurs

3. **Vérifier les quotas Supabase**:
   - Dashboard → Settings → Usage
   - Vérifier que vous n'êtes pas en limite de Storage

---

## 🎉 SOLUTION RAPIDE (TL;DR)

**Si vous voulez juste que ça marche maintenant**:

```sql
-- 1. Exécuter ce script dans Supabase SQL Editor:

-- Recréer le bucket
DROP BUCKET IF EXISTS "inspection-photos" CASCADE;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-photos',
  'inspection-photos',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp']
);

-- Créer les policies
CREATE POLICY "Allow authenticated upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'inspection-photos');

CREATE POLICY "Allow authenticated update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'inspection-photos');

CREATE POLICY "Allow authenticated delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'inspection-photos');

-- Vérifier
SELECT * FROM storage.buckets WHERE id = 'inspection-photos';
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%inspection%';
```

**2. Rebuild l'app**:
```bash
cd mobile
eas build --platform android --profile preview
```

**3. Réessayer l'inspection**

✅ **Ça devrait marcher !**
