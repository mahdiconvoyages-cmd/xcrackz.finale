# 🚀 GUIDE DE DÉPLOIEMENT - REFONTE RAPPORTS INSPECTION

## Phase 1: Backend - Déploiement Step-by-Step

### 📋 Pré-requis
- [ ] Accès à Supabase Dashboard
- [ ] Accès SQL Editor
- [ ] Sauvegarde de la base actuelle
- [ ] ~30 minutes disponibles

---

## 🔹 ÉTAPE 1: Base de Données (10 min)

### 1.1 Créer les nouvelles tables
```bash
# Dans Supabase SQL Editor, exécuter:
📄 REFONTE_BACKEND_PHASE1.sql
```

**Vérifications attendues:**
- ✅ Table `inspection_photos_v2` créée
- ✅ Table `inspection_pdfs` créée  
- ✅ Vue `v_inspection_reports` créée
- ✅ Fonction `is_inspection_complete()` créée

### 1.2 Setup Storage Buckets
```bash
# Exécuter:
📄 SETUP_STORAGE_BUCKETS_REFONTE.sql
```

**Vérifications attendues:**
- ✅ Bucket `inspection-photos-webp` créé (Public, 50MB)
- ✅ Bucket `inspection-pdfs` créé (Public, 100MB)
- ✅ 8 policies RLS créées (4 par bucket)

---

## 🔹 ÉTAPE 2: Edge Function PDF (5 min)

### 2.1 Déployer la fonction

**Option A: Via CLI (Recommandé)**
```bash
# Installer Supabase CLI si nécessaire
npm install -g supabase

# Se connecter
supabase login

# Lier au projet
supabase link --project-ref <your-project-ref>

# Déployer la fonction
supabase functions deploy generate-inspection-pdf
```

**Option B: Via Dashboard**
1. Aller dans **Edge Functions** → **New Function**
2. Nom: `generate-inspection-pdf`
3. Copier le contenu de `supabase/functions/generate-inspection-pdf/index.ts`
4. Déployer

### 2.2 Tester la fonction
```bash
# Via CLI
supabase functions invoke generate-inspection-pdf \
  --body '{"inspectionId":"<test-inspection-id>"}'

# Via Dashboard: Functions → generate-inspection-pdf → Test
```

**Résultat attendu:**
```json
{
  "success": true,
  "pdf_url": "https://...supabase.co/storage/v1/object/public/inspection-pdfs/...",
  "file_size": 123456
}
```

---

## 🔹 ÉTAPE 3: Triggers Auto-génération (5 min)

### 3.1 Configurer les settings Supabase

**Via Dashboard → Settings → Database:**
```sql
-- Remplacer <your-project-ref> par votre vrai project ref
ALTER DATABASE postgres SET app.supabase_function_url = 
  'https://<your-project-ref>.supabase.co/functions/v1';

ALTER DATABASE postgres SET app.supabase_service_role_key = 
  '<your-service-role-key>'; -- Depuis Settings → API
```

### 3.2 Créer les triggers
```bash
# Exécuter:
📄 SETUP_TRIGGERS_PDF_AUTO.sql
```

**Vérifications:**
- ✅ Trigger `auto_generate_pdf_on_complete` créé
- ✅ Fonction `regenerate_inspection_pdf()` créée
- ✅ Fonction `cleanup_old_pdfs()` créée

---

## 🔹 ÉTAPE 4: Migration Données (10 min)

### 4.1 Backup actuel
```bash
# Exécuter:
📄 MIGRATION_PHOTOS_V2.sql (Partie 1: Backup)
```

### 4.2 Migrer les photos
```bash
# Exécuter:
📄 MIGRATION_PHOTOS_V2.sql (Partie 2: Migration)
```

**Vérifications:**
```sql
-- Comparer les counts
SELECT COUNT(*) FROM inspection_photos;          -- Ancien
SELECT COUNT(*) FROM inspection_photos_v2;       -- Nouveau
SELECT COUNT(*) FROM inspection_photos_backup;   -- Backup

-- Les 3 doivent être identiques!
```

---

## 🧪 ÉTAPE 5: Tests de Validation

### Test 1: Vérifier la vue unifiée
```sql
SELECT * FROM v_inspection_reports LIMIT 5;
-- Doit retourner inspections avec photos en JSON
```

### Test 2: Tester génération PDF manuelle
```sql
-- Trouver une inspection complète
SELECT id FROM vehicle_inspections 
WHERE client_signature IS NOT NULL 
AND driver_signature IS NOT NULL
LIMIT 1;

-- Générer le PDF
SELECT regenerate_inspection_pdf('<inspection-id>');
```

### Test 3: Vérifier le trigger auto
```sql
-- Mettre à jour une inspection pour déclencher le trigger
UPDATE vehicle_inspections
SET driver_signature = driver_signature
WHERE id = '<test-inspection-id>';

-- Attendre 5 secondes, puis vérifier
SELECT * FROM inspection_pdfs 
WHERE inspection_id = '<test-inspection-id>';
-- Doit contenir une ligne avec pdf_url
```

---

## 📊 CHECKLIST FINALE

### Base de Données
- [ ] `inspection_photos_v2` créée et peuplée
- [ ] `inspection_pdfs` créée
- [ ] Vue `v_inspection_reports` fonctionne
- [ ] Tous les index créés (vérifier avec `\di` en psql)

### Storage
- [ ] Bucket `inspection-photos-webp` accessible publiquement
- [ ] Bucket `inspection-pdfs` accessible publiquement
- [ ] Policies RLS fonctionnent (tester upload/download)

### Edge Functions
- [ ] `generate-inspection-pdf` déployée
- [ ] Test manuel réussi (PDF généré)
- [ ] Trigger auto fonctionne

### Migration
- [ ] Backup créé (`inspection_photos_backup`)
- [ ] Photos migrées (counts identiques)
- [ ] Aucune photo orpheline

---

## 🔄 ROLLBACK (En cas de problème)

### Si problème pendant migration:
```sql
-- Restaurer depuis backup
TRUNCATE inspection_photos_v2;
INSERT INTO inspection_photos_v2 
SELECT * FROM inspection_photos_backup;
```

### Si Edge Function ne fonctionne pas:
```sql
-- Désactiver le trigger temporairement
ALTER TABLE vehicle_inspections 
DISABLE TRIGGER auto_generate_pdf_on_complete;

-- Réactiver quand corrigé
ALTER TABLE vehicle_inspections 
ENABLE TRIGGER auto_generate_pdf_on_complete;
```

---

## 📈 PROCHAINES ÉTAPES

Une fois Phase 1 validée:

### Phase 2: Mobile App
- Implémenter compression WebP
- Upload vers nouveau bucket
- Mode offline robuste

### Phase 3: Web App
- Refonte UI rapports
- Utiliser vue `v_inspection_reports`
- Lazy loading photos
- Bouton "Télécharger PDF" utilise cache

---

## 🆘 SUPPORT

### Logs à vérifier en cas d'erreur:
1. **Edge Function Logs:** Dashboard → Edge Functions → generate-inspection-pdf → Logs
2. **Database Logs:** Dashboard → Database → Logs
3. **Storage Logs:** Dashboard → Storage → Settings → Logs

### Commandes utiles:
```sql
-- Voir les derniers PDFs générés
SELECT * FROM inspection_pdfs ORDER BY generated_at DESC LIMIT 10;

-- Compter photos par inspection
SELECT inspection_id, COUNT(*) 
FROM inspection_photos_v2 
GROUP BY inspection_id 
ORDER BY COUNT(*) DESC;

-- Vérifier taille des buckets
SELECT bucket_id, COUNT(*), SUM((metadata->>'size')::bigint) / 1024 / 1024 as total_mb
FROM storage.objects
GROUP BY bucket_id;
```

---

## ✅ VALIDATION FINALE

**La Phase 1 est réussie si:**
- [x] Nouvelle inspection complète génère automatiquement un PDF
- [x] PDF accessible via URL publique
- [x] Photos visibles dans `v_inspection_reports`
- [x] Aucune erreur dans les logs
- [x] Backup fonctionnel pour rollback

**Temps estimé total:** 30-40 minutes

**Prêt à déployer ?** Commencez par ÉTAPE 1 ! 🚀
