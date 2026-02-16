# 🗂️ Configuration Storage - Guide Complet

## 🎯 Objectif

Créer et configurer les buckets Supabase Storage pour :
- `vehicle-images` : Photos de véhicules
- `inspection-photos` : Photos d'inspection véhicules

## 📦 Buckets Requis

### 1. vehicle-images
**Usage :** Upload de photos de véhicules par les utilisateurs

**Configuration :**
- Public: ✅ true
- File size limit: 5 MB
- Allowed mime types: `image/*`
- Path: `{user_id}/{filename}`

### 2. inspection-photos
**Usage :** Photos d'inspection (départ/arrivée)

**Configuration :**
- Public: ✅ true
- File size limit: 10 MB
- Allowed mime types: `image/*`
- Path: `inspections/{filename}`

## 🚀 Méthode 1 : Via Supabase Dashboard (Recommandé)

### Étape 1 : Accéder à Storage

1. Ouvrir https://app.supabase.com
2. Sélectionner votre projet
3. Menu latéral → **Storage**

### Étape 2 : Créer vehicle-images

1. Cliquer sur **"New bucket"**
2. Remplir :
   - **Name:** `vehicle-images`
   - **Public bucket:** ✅ Coché
   - **File size limit:** `5242880` (5 MB en bytes)
   - **Allowed MIME types:** `image/jpeg, image/png, image/webp, image/gif`
3. Cliquer sur **"Create bucket"**

### Étape 3 : Créer inspection-photos

1. Cliquer sur **"New bucket"**
2. Remplir :
   - **Name:** `inspection-photos`
   - **Public bucket:** ✅ Coché
   - **File size limit:** `10485760` (10 MB en bytes)
   - **Allowed MIME types:** `image/jpeg, image/png, image/webp`
3. Cliquer sur **"Create bucket"**

### Étape 4 : Configurer les Policies

Pour chaque bucket, aller dans l'onglet **"Policies"** :

#### vehicle-images Policies

**Policy 1 : Upload**
- Name: `Users can upload vehicle images`
- Policy type: INSERT
- Target roles: authenticated
- USING expression:
```sql
bucket_id = 'vehicle-images' AND
auth.uid()::text = (storage.foldername(name))[1]
```

**Policy 2 : Read**
- Name: `Users can read vehicle images`
- Policy type: SELECT
- Target roles: authenticated
- USING expression:
```sql
bucket_id = 'vehicle-images'
```

**Policy 3 : Delete**
- Name: `Users can delete own vehicle images`
- Policy type: DELETE
- Target roles: authenticated
- USING expression:
```sql
bucket_id = 'vehicle-images' AND
auth.uid()::text = (storage.foldername(name))[1]
```

#### inspection-photos Policies

**Policy 1 : Upload**
- Name: `Users can upload inspection photos`
- Policy type: INSERT
- Target roles: authenticated
- USING expression:
```sql
bucket_id = 'inspection-photos'
```

**Policy 2 : Read**
- Name: `Anyone can read inspection photos`
- Policy type: SELECT
- Target roles: authenticated
- USING expression:
```sql
bucket_id = 'inspection-photos'
```

**Policy 3 : Delete**
- Name: `Users can delete inspection photos`
- Policy type: DELETE
- Target roles: authenticated
- USING expression:
```sql
bucket_id = 'inspection-photos'
```

## 🛠️ Méthode 2 : Via SQL

### Créer les Buckets

```sql
-- Créer vehicle-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-images',
  'vehicle-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Créer inspection-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-photos',
  'inspection-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);
```

### Créer les Policies

```sql
-- =====================================================
-- VEHICLE-IMAGES POLICIES
-- =====================================================

-- Upload
CREATE POLICY "Users can upload vehicle images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Read
CREATE POLICY "Users can read vehicle images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vehicle-images');

-- Delete
CREATE POLICY "Users can delete own vehicle images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vehicle-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- INSPECTION-PHOTOS POLICIES
-- =====================================================

-- Upload
CREATE POLICY "Users can upload inspection photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

-- Read
CREATE POLICY "Anyone can read inspection photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'inspection-photos');

-- Delete
CREATE POLICY "Users can delete inspection photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'inspection-photos');
```

## 🛠️ Méthode 3 : Via Supabase CLI

```bash
# Créer vehicle-images
supabase storage create vehicle-images --public

# Créer inspection-photos
supabase storage create inspection-photos --public

# Appliquer les policies (nécessite SQL file)
supabase db push
```

## ✅ Vérification

### Test 1 : Lister les Buckets

```sql
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id IN ('vehicle-images', 'inspection-photos');
```

**Résultat attendu :**
```
id                  | name              | public | file_size_limit
--------------------|-------------------|--------|----------------
vehicle-images      | vehicle-images    | true   | 5242880
inspection-photos   | inspection-photos | true   | 10485760
```

### Test 2 : Vérifier les Policies

```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%vehicle%' OR policyname LIKE '%inspection%';
```

**Résultat attendu :** 6 policies au total (3 par bucket)

### Test 3 : Upload depuis l'Application

1. Aller sur une page avec upload d'image
2. Sélectionner une image
3. Upload
4. Vérifier dans Dashboard → Storage → vehicle-images ou inspection-photos

**Fichier attendu :**
- Format: `{user_id}/{timestamp}.{ext}` pour vehicle-images
- Format: `inspections/{type}_{timestamp}.{ext}` pour inspection-photos

## 🐛 Dépannage

### Erreur : "Bucket not found"

**Cause :** Bucket non créé

**Solution :**
```sql
-- Vérifier si bucket existe
SELECT * FROM storage.buckets WHERE id = 'vehicle-images';

-- Si vide, créer via Dashboard ou SQL
```

### Erreur : "new row violates row-level security policy"

**Cause :** Policies manquantes ou incorrectes

**Solution :**
```sql
-- Lister les policies existantes
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%vehicle%';

-- Recréer si manquantes (voir SQL ci-dessus)
```

### Erreur : "File size exceeds limit"

**Cause :** Image trop grande

**Solution :**
1. Compresser l'image avant upload
2. Ou augmenter la limite :
```sql
UPDATE storage.buckets
SET file_size_limit = 10485760 -- 10 MB
WHERE id = 'vehicle-images';
```

### Erreur : "File type not allowed"

**Cause :** MIME type non autorisé

**Solution :**
```sql
-- Ajouter le MIME type manquant
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
WHERE id = 'vehicle-images';
```

### Upload réussit mais image non visible

**Cause :** Bucket pas public ou URL incorrecte

**Solution :**
```sql
-- Rendre le bucket public
UPDATE storage.buckets SET public = true WHERE id = 'vehicle-images';

-- Vérifier l'URL
-- Format correct : https://{PROJECT_REF}.supabase.co/storage/v1/object/public/vehicle-images/{path}
```

## 📝 Structure de Fichiers

### vehicle-images
```
vehicle-images/
├── {user_id_1}/
│   ├── 1696234567890.jpg
│   ├── 1696234567891.png
│   └── ...
├── {user_id_2}/
│   └── ...
```

### inspection-photos
```
inspection-photos/
├── inspections/
│   ├── departure_front_1696234567890.jpg
│   ├── departure_back_1696234567891.jpg
│   ├── arrival_front_1696234567892.jpg
│   └── ...
```

## 🔐 Sécurité

### Bonnes Pratiques

1. **Bucket Public** : OK pour images (pas de données sensibles)
2. **Path avec user_id** : Empêche suppression croisée
3. **File size limit** : Protection contre abus
4. **Allowed MIME types** : Seulement images
5. **RLS Policies** : Contrôle d'accès fin

### Limites Recommandées

- Images véhicules : **5 MB max**
- Photos inspection : **10 MB max**
- Total storage par projet : **100 GB** (plan gratuit)

### Monitoring

```sql
-- Voir l'utilisation storage par bucket
SELECT
  bucket_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) / 1024 / 1024 as total_mb
FROM storage.objects
WHERE bucket_id IN ('vehicle-images', 'inspection-photos')
GROUP BY bucket_id;
```

## ✅ Checklist Configuration

- [ ] Bucket `vehicle-images` créé
- [ ] Bucket `inspection-photos` créé
- [ ] Limites de taille configurées (5MB / 10MB)
- [ ] MIME types autorisés configurés
- [ ] Buckets mis en public
- [ ] 3 policies pour vehicle-images (INSERT, SELECT, DELETE)
- [ ] 3 policies pour inspection-photos (INSERT, SELECT, DELETE)
- [ ] Test d'upload réussi
- [ ] Images visibles dans Dashboard
- [ ] URLs publiques fonctionnelles

## 🎯 Résultat Final

Après configuration :
- ✅ Upload de photos véhicules fonctionne
- ✅ Upload de photos inspection fonctionne
- ✅ Images accessibles via URL publique
- ✅ Sécurité RLS active
- ✅ Quotas respectés

**Les buckets sont maintenant opérationnels ! 🎉**
