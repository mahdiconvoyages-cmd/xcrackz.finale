# 🚨 PLAN D'ACTION IMMÉDIAT - Récupération Photos Supprimées

**Date:** 16 octobre 2025  
**Contexte:** Photos supprimées par CASCADE lors du cleanup des duplicates `vehicle_inspections`  
**Impact:** Toutes les photos d'inspection potentiellement perdues  

## ⏰ ACTIONS URGENTES (À FAIRE MAINTENANT)

### 1. STOP - Pas d'autres modifications DB
- [ ] ❌ **INTERDICTION** : Plus aucune modification sur les tables `vehicle_inspections` ou `inspection_photos`
- [ ] ❌ **INTERDICTION** : Pas d'autres scripts de cleanup 
- [ ] ✅ **OBLIGATOIRE** : Backup immédiat de l'état actuel

```sql
-- Créer snapshot immédiat
\copy (SELECT * FROM vehicle_inspections) TO 'backup_vehicle_inspections_emergency.csv' DELIMITER ',' CSV HEADER;
\copy (SELECT * FROM inspection_photos) TO 'backup_inspection_photos_emergency.csv' DELIMITER ',' CSV HEADER;
```

### 2. DIAGNOSTIC RAPIDE - Vérifier les dégâts

#### A. Exécuter le script de vérification
```bash
cd c:\Users\mahdi\Documents\Finality-okok
node check_storage_recovery.js
```

#### B. Vérification manuelle Supabase Dashboard
1. Aller sur **dashboard.supabase.com**
2. **Storage** → Bucket `inspection-photos`
3. Dossier `inspections/` → Compter les fichiers
4. **Database** → Table `inspection_photos` → Compter les lignes

### 3. ÉVALUATION DE RÉCUPÉRATION

#### Scénario A : 📁 Fichiers Storage OK, DB vidée
**Symptômes:** Files dans bucket mais table `inspection_photos` vide  
**Récupération:** POSSIBLE ✅ via ré-association

```sql
-- Compter fichiers orphelins potentiels
SELECT COUNT(*) FROM vehicle_inspections WHERE id NOT IN (
  SELECT DISTINCT inspection_id FROM inspection_photos WHERE inspection_id IS NOT NULL
);
```

#### Scénario B : 🗑️ Storage ET DB vidés
**Symptômes:** Bucket vide + table vide  
**Récupération:** BACKUP OBLIGATOIRE ⚠️

#### Scénario C : ✅ Données intactes
**Symptômes:** Storage ET DB contiennent des données  
**Action:** Vérifier cohérence uniquement

## 🔧 RÉCUPÉRATION AUTOMATIQUE (Si Scénario A)

### Script de ré-association photos → inspections

```javascript
// recovery_photos.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('YOUR_URL', 'YOUR_KEY');

async function recoverPhotos() {
  // 1. Lister tous les fichiers Storage
  const { data: files } = await supabase.storage
    .from('inspection-photos')
    .list('inspections');
    
  for (const file of files) {
    // 2. Parser le nom: {inspection_id}-{type}-{timestamp}.jpg
    const [inspectionId, photoType] = file.name.split('-');
    
    // 3. Vérifier si l'inspection existe
    const { data: inspection } = await supabase
      .from('vehicle_inspections')
      .select('id')
      .eq('id', inspectionId)
      .single();
      
    if (inspection) {
      // 4. Recréer l'enregistrement inspection_photos
      const { data: urlData } = supabase.storage
        .from('inspection-photos')
        .getPublicUrl(`inspections/${file.name}`);
        
      await supabase.from('inspection_photos').insert({
        inspection_id: inspectionId,
        photo_type: photoType,
        photo_url: urlData.publicUrl,
        uploaded_by: 'RECOVERY_SCRIPT',
        created_at: new Date().toISOString()
      });
      
      console.log(`✅ Récupéré: ${file.name}`);
    }
  }
}
```

## 📊 RESTAURATION DEPUIS BACKUP SUPABASE

### Si perte totale → Point-in-time recovery

1. **Dashboard Supabase** → Votre projet
2. **Settings** → **Database** → **Backups**
3. **Point-in-time Recovery**
4. Sélectionner timestamp **AVANT** l'exécution du script destructeur
5. ⚠️ **ATTENTION:** Cela restaure TOUTE la DB à ce moment

### Alternative : Backup partiel via SQL

```sql
-- Si vous avez un dump des données avant incident
COPY inspection_photos FROM 'backup_avant_cleanup.csv' DELIMITER ',' CSV HEADER;
```

## 🔍 VÉRIFICATION POST-RÉCUPÉRATION

```sql
-- Vérifier cohérence finale
SELECT 
  (SELECT COUNT(*) FROM vehicle_inspections) as inspections,
  (SELECT COUNT(*) FROM inspection_photos) as photos,
  (SELECT COUNT(*) FROM vehicle_inspections WHERE id NOT IN (
    SELECT DISTINCT inspection_id FROM inspection_photos
  )) as inspections_without_photos;
```

## ⚡ ACTIONS PAR PRIORITÉ

### 🔴 CRITIQUE (maintenant)
- [ ] Exécuter `node check_storage_recovery.js`
- [ ] Backup emergency
- [ ] Identifier scénario (A, B ou C)

### 🟠 URGENT (aujourd'hui)
- [ ] Si Scénario A : Exécuter script de récupération
- [ ] Si Scénario B : Point-in-time recovery Supabase
- [ ] Tester 1 inspection complète en dev

### 🟡 IMPORTANT (cette semaine)
- [ ] Configurer backups automatiques quotidiens
- [ ] Appliquer correctifs code (`setInspection` fix)
- [ ] Créer tests pour éviter régression

## 📞 ESCALATION

**Si récupération impossible :**
1. Contacter support Supabase (backups cachés ?)
2. Notifier utilisateurs de la perte potentielle
3. Plan de re-capture manuel des photos critiques

## ✅ CHECKLIST FINALE

- [ ] Photos récupérées et fonctionnelles
- [ ] Code corrigé (`setInspection` fix appliqué)
- [ ] Backups automatiques configurés
- [ ] Runbook sécurité DB activé
- [ ] Tests inspection validés
- [ ] Documentation incident créée

---

**⚠️ NE PAS REDÉMARRER DE CLEANUP SANS TOUS LES CHECKS ✅**