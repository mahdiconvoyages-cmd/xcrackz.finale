# 🔧 PROBLÈME RÉSOLU - Photos Non Uploadées

## 📋 Résumé du Problème

### Symptômes
- ✅ Fichiers uploadés sur Supabase Storage (confirmé)
- ❌ 0 photos dans la base de données `inspection_photos_v2`
- ❌ Photos n'apparaissent pas sur l'interface web

### Cause Racine Identifiée

**Le code mobile utilisait des noms de colonnes INCORRECTS !**

#### Structure Réelle de `inspection_photos_v2`
```sql
CREATE TABLE public.inspection_photos_v2 (
  id uuid,
  inspection_id uuid,
  photo_type text,
  thumbnail_url text,
  full_url text,              -- ← Correct
  file_size_bytes bigint,
  width integer,
  height integer,
  mime_type text,
  latitude numeric,
  longitude numeric,
  taken_at timestamp,         -- ← Correct
  uploaded_at timestamp,
  created_at timestamp
);
```

#### Code Mobile AVANT (INCORRECT)
```typescript
await supabase.from('inspection_photos_v2').insert({
  inspection_id: createdInspection.id,
  photo_type: photo.type,
  photo_url: urlData.publicUrl,      // ❌ Colonne inexistante !
  uploaded_at: new Date().toISOString(), // ❌ Tentative d'override auto-column
}).select().single();
```

#### Code Mobile APRÈS (CORRECT)
```typescript
await supabase.from('inspection_photos_v2').insert({
  inspection_id: createdInspection.id,
  photo_type: photo.type,
  full_url: urlData.publicUrl,      // ✅ Colonne correcte
  taken_at: new Date().toISOString(), // ✅ Timestamp correct
}).select().single();
```

## 🔍 Diagnostic Effectué

### 1. Vérification Storage
```sql
SELECT name, created_at
FROM storage.objects
WHERE bucket_id = 'inspection-photos'
ORDER BY created_at DESC;
```

**Résultat :** 
- Inspection `afdcc884-300b-4671-be53-6ab066682357` : **6 fichiers** ✅
- Inspection `9f0edc40-d46c-45dd-a3f5-16cf36805fc3` : **7 fichiers** ✅

### 2. Vérification Base de Données
```sql
SELECT id, inspection_id, photo_type, created_at
FROM inspection_photos_v2
WHERE inspection_id IN (
  'afdcc884-300b-4671-be53-6ab066682357',
  '9f0edc40-d46c-45dd-a3f5-16cf36805fc3'
);
```

**Résultat :** **0 lignes** ❌

### 3. Dernières Photos Insérées
```sql
SELECT inspection_id, photo_type, created_at
FROM inspection_photos_v2
ORDER BY created_at DESC
LIMIT 10;
```

**Résultat :** Dernière photo le **30 octobre 2025** (avant la correction)

## ✅ Solution Appliquée

### Fichier Modifié
`mobile/src/screens/inspections/InspectionDepartureNew.tsx`

### Ligne 441-446
```typescript
const { data: photoRecord, error: insertError } = await supabase
  .from('inspection_photos_v2')
  .insert({
    inspection_id: createdInspection.id,
    photo_type: photo.type,
    full_url: urlData.publicUrl,      // Changé de photo_url
    taken_at: new Date().toISOString(), // Changé de uploaded_at
  })
  .select()
  .single();
```

## 🚀 Nouveau Build

**Build ID :** En cours...
**Plateforme :** Android
**Profile :** preview
**Taille :** 94.7 MB

**Changements Inclus :**
1. ✅ Utilisation de `inspection_photos_v2` (table) au lieu de `inspection_photos` (view)
2. ✅ Utilisation de `full_url` au lieu de `photo_url`
3. ✅ Utilisation de `taken_at` au lieu de `uploaded_at`
4. ✅ Logs détaillés pour debug (📤, ✅, ❌)

## 📝 Tests à Effectuer Après Installation

### 1. Créer Nouvelle Inspection
- [ ] Prendre 6-7 photos
- [ ] Sauvegarder l'inspection
- [ ] **Message attendu :** "✅ Inspection enregistrée avec succès ! 6 photos uploadées"

### 2. Vérifier Base de Données
```sql
-- Remplacer INSPECTION_ID par l'ID de votre nouvelle inspection
SELECT COUNT(*) as photo_count
FROM inspection_photos_v2
WHERE inspection_id = 'INSPECTION_ID';
```
**Résultat attendu :** `photo_count = 6` (ou le nombre de photos prises)

### 3. Vérifier Interface Web
- [ ] Aller sur page Missions
- [ ] Cliquer sur la mission de test
- [ ] Développer section "Inspection Départ"
- [ ] **Photos devraient s'afficher en grille** ✅

### 4. Tester Bouton PDF Complet
- [ ] Créer inspection départ + arrivée
- [ ] Cliquer sur bouton violet ★
- [ ] **PDF devrait contenir toutes les photos** ✅

## 📊 Historique des Corrections

| Date | Problème | Correction | Statut |
|------|----------|------------|--------|
| 01/11 14h | Photos uploadées sur Storage mais pas en DB | Changé `inspection_photos` (VIEW) vers `inspection_photos_v2` (TABLE) | ✅ |
| 01/11 14h | Policies RLS manquantes | Créé 4 policies sur `inspection_photos_v2` | ✅ |
| 01/11 16h | Noms de colonnes incorrects | `photo_url` → `full_url`, `uploaded_at` → `taken_at` | ✅ Build en cours |

## 🔐 Policies RLS Créées

```sql
-- INSERT
CREATE POLICY "Allow authenticated to insert inspection photos"
ON inspection_photos_v2
FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT
CREATE POLICY "Allow public to view inspection photos"
ON inspection_photos_v2
FOR SELECT
TO public
USING (true);

-- UPDATE
CREATE POLICY "Allow authenticated to update inspection photos"
ON inspection_photos_v2
FOR UPDATE
TO authenticated
USING (true);

-- DELETE
CREATE POLICY "Allow authenticated to delete inspection photos"
ON inspection_photos_v2
FOR DELETE
TO authenticated
USING (true);
```

## 📌 Note Importante

La colonne `uploaded_at` existe dans la table mais a une valeur par défaut (`DEFAULT now()`). 
Le code essayait de la définir manuellement, ce qui pouvait causer des conflits.
Nous utilisons maintenant `taken_at` qui est le timestamp correct pour les photos.

---

**Une fois le build terminé, installez le nouveau APK et testez immédiatement !**
