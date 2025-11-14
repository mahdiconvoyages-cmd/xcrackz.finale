# 📱💻 SYSTÈME DE DOCUMENTS UNIFIÉS - Guide d'utilisation

## Vue d'ensemble

Le système de documents unifiés permet de synchroniser automatiquement tous les documents scannés entre:
- ✅ Application Web (PWA)
- ✅ Application Mobile (React Native)
- ✅ Inspections (liées aux missions)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     SUPABASE CLOUD                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Table: unified_scanned_documents                  │ │
│  │  - Métadonnées des documents                       │ │
│  │  - user_id, inspection_id, filter_type, etc.      │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Storage Bucket: scanned-documents                 │ │
│  │  - Fichiers images haute qualité (JPEG 98%)       │ │
│  │  - Organisation par user_id/timestamp              │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
           │                           │
           ▼                           ▼
   ┌──────────────┐          ┌──────────────┐
   │   WEB PWA    │          │    MOBILE    │
   │   Scanner    │◄────────►│   Scanner    │
   └──────────────┘          └──────────────┘
```

## Composants

### 1. UnifiedDocumentScanner (Web)

**Emplacement**: `src/components/inspection/UnifiedDocumentScanner.tsx`

**Fonctionnalités**:
- 📸 Appareil photo natif du téléphone (via input[capture])
- 🔍 Détection automatique des bords (OpenCV.js)
- ✂️ Recadrage manuel avec zoom et rotation
- 🎨 3 filtres professionnels: N&B (défaut), Gris, Couleur
- 📤 Export PDF, Partage natif, Téléchargement JPG
- 💾 Validation et callback pour intégration

**Utilisation**:
```tsx
import UnifiedDocumentScanner from '../components/inspection/UnifiedDocumentScanner';

<UnifiedDocumentScanner
  onCapture={(file, imageUrl) => {
    // file: File object pour upload
    // imageUrl: base64 pour preview
    console.log('Document capturé:', file.name);
  }}
  onCancel={() => {
    console.log('Scan annulé');
  }}
  inspectionId={inspectionId}
  documentType="registration"
  title="Scanner la Carte Grise"
  userId={user.id}
/>
```

### 2. Service unifiedDocumentService

**Emplacement**: `src/services/unifiedDocumentService.ts`

**Fonctions disponibles**:

#### `uploadScannedDocument(file, userId, options)`
Upload un document dans Supabase avec synchronisation automatique.

```typescript
const doc = await uploadScannedDocument(file, user.id, {
  name: 'Carte Grise',
  filterType: 'bw',
  documentType: 'registration',
  inspectionId: inspection.id,
  platform: 'web'
});
```

#### `getUserDocuments(userId, options)`
Récupérer tous les documents d'un utilisateur.

```typescript
const docs = await getUserDocuments(user.id, {
  inspectionId: inspection.id,  // Optionnel
  documentType: 'registration', // Optionnel
  limit: 50                      // Optionnel
});
```

#### `deleteDocument(documentId)`
Supprimer un document (Storage + DB).

```typescript
await deleteDocument(doc.id);
```

#### `updateDocument(documentId, updates)`
Mettre à jour les métadonnées d'un document.

```typescript
await updateDocument(doc.id, {
  name: 'Nouveau nom',
  filter_type: 'grayscale'
});
```

#### `downloadDocument(publicUrl, fileName)`
Télécharger un document via son URL publique.

```typescript
await downloadDocument(doc.public_url, 'document.jpg');
```

#### `exportDocumentToPDF(publicUrl, fileName)`
Exporter un document en PDF (format A4).

```typescript
await exportDocumentToPDF(doc.public_url, 'document');
```

## Installation & Configuration

### 1. Exécuter la migration SQL

```bash
# Dans Supabase SQL Editor, exécuter:
cat CREATE_UNIFIED_DOCUMENTS_SYSTEM.sql
```

### 2. Créer le bucket Storage

**Dans Supabase Dashboard**:
1. Aller dans Storage
2. Créer un nouveau bucket: `scanned-documents`
3. Cocher "Public bucket"
4. File size limit: 10 MB
5. Allowed MIME types: `image/jpeg, image/png, application/pdf`

### 3. Configurer les policies Storage

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'scanned-documents');

-- Allow users to read their own files
CREATE POLICY "Allow user file access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'scanned-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Allow user file deletion"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'scanned-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

## Intégration dans les pages

### Page d'inspection (déjà intégré)

```tsx
// src/pages/InspectionDepartureNew.tsx
import UnifiedDocumentScanner from '../components/inspection/UnifiedDocumentScanner';

const [showDocScanner, setShowDocScanner] = useState(false);

<UnifiedDocumentScanner
  onCapture={handleDocScan}
  onCancel={() => setShowDocScanner(false)}
  documentType="registration"
  title="Scanner la Carte Grise"
  userId={user?.id}
/>
```

### Scanner standalone

Pour utiliser comme scanner général (sans inspection):

```tsx
import UnifiedDocumentScanner from '../components/inspection/UnifiedDocumentScanner';

<UnifiedDocumentScanner
  onCapture={(file, imageUrl) => {
    // Upload manuel ou traitement custom
  }}
  onCancel={() => {
    // Retour à la vue précédente
  }}
  userId={user.id}
/>
```

## Synchronisation Mobile

Le même système peut être utilisé sur mobile en React Native:

```typescript
// mobile/src/services/unifiedDocumentService.ts
// Utiliser les mêmes fonctions avec @supabase/supabase-js
```

## Avantages du système unifié

✅ **Synchronisation automatique** - Documents accessibles partout
✅ **Stockage centralisé** - Une seule source de vérité
✅ **RLS Supabase** - Sécurité garantie au niveau base de données
✅ **Filtres professionnels** - Qualité CamScanner
✅ **Export multi-format** - PDF, JPG, Partage natif
✅ **Linked to inspections** - Traçabilité complète
✅ **Platform tracking** - Savoir d'où vient chaque document
✅ **Metadata rich** - Dimensions, taille, type de filtre, etc.

## Statistiques utilisateur

Requête pour obtenir les stats d'un utilisateur:

```sql
SELECT * FROM user_document_stats WHERE user_id = 'xxx';
```

Résultat:
- total_documents
- linked_inspections
- total_storage_bytes
- web_documents
- mobile_documents
- bw_documents / gray_documents / color_documents
- last_scan_date

## Nettoyage automatique

Pour nettoyer les anciens documents (>1 an):

```sql
SELECT cleanup_old_documents();
```

## Support

Pour toute question ou problème:
1. Vérifier les logs Supabase
2. Vérifier les policies RLS
3. Vérifier que le bucket est public
4. Vérifier que l'utilisateur est authentifié

## Roadmap

🚧 **À venir**:
- [ ] Compression intelligente des images
- [ ] OCR pour extraction de texte
- [ ] Détection automatique du type de document
- [ ] Multi-pages PDF
- [ ] Annotation sur les documents
- [ ] Partage sécurisé avec expiration
- [ ] Versions de documents
- [ ] Tags et catégories personnalisées
