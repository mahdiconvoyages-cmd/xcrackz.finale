# ✅ SYNCHRONISATION SCANNER MOBILE ↔️ WEB COMPLÈTE

## 📋 État actuel

### Mobile (React Native)
- ✅ Scanner CamScannerLike fonctionnel
- ✅ Upload vers `inspection-documents` storage
- ❌ **PAS de sauvegarde dans table `inspection_documents`**
- ✅ Scans stockés localement + storage distant

### Web (React)
- ✅ ProfessionalScannerPage fonctionnel
- ✅ Service `inspectionDocumentsService.ts` créé
- ✅ Upload vers `scanned-documents` storage
- ✅ **SAUVEGARDE dans table `inspection_documents`** ✅
- ✅ Page MyDocuments pour afficher les documents

## 🎯 Solution: Synchroniser les 3 composants

### 1️⃣ MOBILE: Ajouter sauvegarde dans `inspection_documents`
**Fichier**: `mobile/src/screens/ScannerProScreen.tsx`

Dans `handleProScanComplete` (ligne ~150), après upload storage, ajouter:

```typescript
// Enregistrer dans inspection_documents
const { error: dbError } = await supabase
  .from('inspection_documents')
  .insert({
    inspection_id: null, // Document standalone
    document_type: 'generic',
    document_title: `Scan ${new Date().toLocaleDateString()}`,
    document_url: urlData.publicUrl,
    pages_count: 1,
    user_id: user.id, // IMPORTANT pour RLS
  });

if (dbError) {
  console.error('❌ Erreur enregistrement DB:', dbError);
} else {
  console.log('✅ Document enregistré dans inspection_documents');
}
```

### 2️⃣ WEB: Déjà fonctionnel ✅
- `ProfessionalScannerPage.tsx` utilise `uploadInspectionDocument()`
- Service sauvegarde dans `inspection_documents`
- RLS policies permettent accès user

### 3️⃣ PAGE MES DOCUMENTS: Afficher mobile + web
**Fichier**: `src/pages/MyDocuments.tsx`

Service `getAllUserDocuments` déjà:
- ✅ Récupère documents WHERE `user_id = userId`
- ✅ Multi-stratégie (directs + liés via inspections)

## ⚠️ PROBLÈME ACTUEL

Les 6 documents existants ont des `user_id` différents:
- `7fa41d0a-2f20-4713-ac4c-7d4faf0b5d0d` → 4 documents
- `c37f15d6-545a-4792-9697-de03991b4f17` → 1 document
- `b5adbb76-c33f-45df-a236-649564f63af5` → 1 document

**❓ Question**: Avec quel email êtes-vous connecté?
- Exécutez en Supabase: `SELECT id, email FROM profiles WHERE email ILIKE '%mahdi%' OR email ILIKE '%convoy%';`

## 🔧 Actions à faire

1. **SQL**: Identifier votre user_id
2. **SQL**: Optionnel - Réassigner documents si nécessaire
3. **Mobile**: Ajouter INSERT dans `inspection_documents`
4. **Test**: Scanner mobile → voir dans web /mes-documents
5. **Test**: Scanner web → voir dans web /mes-documents

## 📊 Structure finale

```
┌─────────────────────────────────────┐
│  STORAGE: inspection-documents      │ (Mobile scans)
│  STORAGE: scanned-documents         │ (Web scans)
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  TABLE: inspection_documents        │
│  - id                               │
│  - inspection_id (nullable)         │
│  - document_type                    │
│  - document_title                   │
│  - document_url (storage URL)       │
│  - pages_count                      │
│  - user_id ← RLS filter             │
│  - created_at                       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  WEB PAGE: /mes-documents           │
│  Affiche TOUS les documents         │
│  (mobile + web synchronisés)        │
└─────────────────────────────────────┘
```

## ✨ Résultat final

✅ Scan depuis mobile → visible dans web
✅ Scan depuis web → visible dans web  
✅ Même table `inspection_documents`
✅ RLS par `user_id`
✅ Page unifiée `/mes-documents`
