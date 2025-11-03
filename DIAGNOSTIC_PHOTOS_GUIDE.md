# 🔍 DIAGNOSTIC PHOTOS - INSTRUCTIONS

## Étape 1: Exécuter le diagnostic

1. Ouvrir Supabase Dashboard → SQL Editor
2. Copier et exécuter le contenu de `DIAGNOSTIC_PHOTOS_COMPLET.sql`
3. Analyser les résultats

## Résultats attendus

### ✅ BON ÉTAT
```
📦 BUCKET: public = true
📊 PHOTOS: Toutes avec URLs complètes (https://)
🔒 RLS: Policies permettant lecture publique
💾 STORAGE: Nombre cohérent avec DB
```

### ⚠️ PROBLÈMES POSSIBLES

#### Problème 1: Bucket non public
```sql
public = false
```
**Solution:** Exécuter `FIX_PHOTOS_BUCKET_RLS.sql`

#### Problème 2: URLs relatives (pas complètes)
```sql
photo_url = 'inspections/abc.jpg'  -- ❌ Manque le domaine
```
**Solution:** Le code que j'ai modifié (`inspectionReportService.ts`) convertit automatiquement ces paths en URLs publiques. Vérifier que le code fonctionne en rechargeant la page web.

#### Problème 3: Photos orphelines
```sql
Photos dans storage: 50
Photos en DB: 30
```
**Solution:** Photos uploadées mais pas enregistrées en DB. Exécuter script de récupération ou ignorer (photos anciennes).

#### Problème 4: Policies RLS trop restrictives
```sql
Pas de policy "SELECT TO public"
```
**Solution:** Exécuter `FIX_PHOTOS_BUCKET_RLS.sql` section 2-3.

## Étape 2: Corriger si nécessaire

Si le diagnostic révèle des problèmes:

```bash
# Exécuter dans Supabase SQL Editor
psql < FIX_PHOTOS_BUCKET_RLS.sql
```

Ou copier-coller le contenu de `FIX_PHOTOS_BUCKET_RLS.sql` dans SQL Editor.

## Étape 3: Tester dans l'application web

1. Ouvrir l'application web (http://localhost:5173 ou votre URL)
2. Aller à `/rapports-inspections`
3. Ouvrir un rapport avec photos
4. **Vérifier:**
   - Les vignettes s'affichent ✅
   - Cliquer ouvre la galerie plein écran ✅
   - Les images se chargent rapidement ✅
   - Pas d'erreurs 404/403 dans la console ✅

## Étape 4: Vérifier la console navigateur

Ouvrir DevTools (F12) → Console

### ✅ Bon signe
```
✅ 25 rapports trouvés
📸 Photo URLs normalisées
```

### ❌ Erreur à corriger
```
GET https://.../photo.jpg 404 (Not Found)
GET https://.../photo.jpg 403 (Forbidden)
```

**Si 404:** Photo n'existe pas dans le storage → vérifier upload
**Si 403:** Problème RLS → exécuter `FIX_PHOTOS_BUCKET_RLS.sql`

## Étape 5: Tester le téléchargement ZIP

1. Cliquer sur le bouton "Télécharger les photos" (icône Image)
2. Attendre la génération du ZIP
3. **Vérifier:**
   - ZIP se télécharge ✅
   - Contient les dossiers "1-inspection-depart" et "2-inspection-arrivee" ✅
   - Les images s'ouvrent correctement ✅

## Commandes SQL utiles pour investigation

### Voir les dernières photos uploadées
```sql
SELECT photo_url, created_at 
FROM inspection_photos 
ORDER BY created_at DESC 
LIMIT 10;
```

### Compter les formats d'URL
```sql
SELECT 
  CASE 
    WHEN photo_url LIKE 'http%' THEN 'Complet'
    ELSE 'Partiel'
  END as format,
  COUNT(*) 
FROM inspection_photos 
GROUP BY format;
```

### Tester une URL publique
```sql
SELECT 
  'https://bfrkthzovwpjrvqktdjn.supabase.co/storage/v1/object/public/inspection-photos/' || name 
FROM storage.objects 
WHERE bucket_id = 'inspection-photos' 
LIMIT 1;
```

## Prochaines étapes après diagnostic

1. **Si tout fonctionne:** Marquer la tâche "Vérifier bucket & RLS" comme complétée
2. **Si problèmes:** Me partager les résultats du diagnostic et j'ajusterai le fix
3. **Continuer vers:** Correction du système de signature (tâche suivante dans la todo list)

## Notes importantes

- Le bucket `inspection-photos` DOIT être public pour que les images s'affichent directement
- Les URLs doivent être complètes (pas juste le path)
- La conversion path→URL se fait maintenant automatiquement dans `inspectionReportService.ts`
- Si anciennes photos avec paths relatifs: elles seront converties au chargement de la page
