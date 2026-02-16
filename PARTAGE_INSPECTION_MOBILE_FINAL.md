# 🎯 PARTAGE RAPPORTS D'INSPECTION MOBILE - RÉCAP FINAL

## ✅ CE QUI A ÉTÉ CORRIGÉ

### 1. **Problème : Liste vide de rapports**
**Cause** : Requête cherchait `mission_number` (n'existe pas) au lieu de `reference`  
**Solution** : Modifié `InspectionShareScreen.tsx` ligne 51 et interface ligne 20

### 2. **Problème : Token undefined lors de la génération de lien**
**Cause** : Code faisait `data.share_token` mais RPC retourne un tableau  
**Solution** : Changé en `data[0].share_token` ligne 131 de `InspectionShareScreen.tsx`

### 3. **Problème : Fonction SQL cherchait dans mauvaises tables**
**Cause** : `get_inspection_report_by_token()` utilisait `inspection_photos` (n'existe pas)  
**Solution** : Recréé avec `inspection_photos_v2` (fichier `FIX_INSPECTION_SHARE_RPC.sql`)

---

## 📱 BUILDS DISPONIBLES

### Build #6 (DERNIER - EN COURS)
- **URL**: https://expo.dev/accounts/xcrackz123/projects/xcrackz-mobile/builds/4cb6bb84-326f-45f4-b38c-11ae369f9c57
- **Statut**: En cours de compilation
- **Corrections incluses**:
  - ✅ `reference` au lieu de `mission_number`
  - ✅ `data[0].share_token` au lieu de `data.share_token`
  - ✅ Console.log pour debug

### Build #5 (ANCIEN - NE PAS UTILISER)
- **URL**: https://expo.dev/artifacts/eas/i9K6gTAmLBaC2UqA3KezeQ.apk
- **Problème**: Utilise encore `data.share_token` (undefined)

---

## 🗄️ SQL EXÉCUTÉ SUR SUPABASE

```sql
DROP FUNCTION IF EXISTS get_inspection_report_by_token(TEXT);

CREATE OR REPLACE FUNCTION get_inspection_report_by_token(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_mission_id UUID;
BEGIN
  SELECT mission_id INTO v_mission_id
  FROM inspection_report_shares
  WHERE share_token = p_token AND is_active = TRUE;

  IF v_mission_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Token invalide');
  END IF;

  UPDATE inspection_report_shares
  SET access_count = access_count + 1, last_accessed_at = NOW()
  WHERE share_token = p_token;

  RETURN (
    SELECT jsonb_build_object(
      'mission_data', jsonb_build_object(
        'reference', m.reference,
        'pickup_address', m.pickup_address,
        'delivery_address', m.delivery_address,
        'pickup_date', m.pickup_date
      ),
      'vehicle_data', jsonb_build_object(
        'brand', m.vehicle_brand,
        'model', m.vehicle_model,
        'plate', m.vehicle_plate
      ),
      'inspection_departure', (
        SELECT jsonb_build_object(
          'mileage_km', vi.mileage_km,
          'fuel_level', vi.fuel_level,
          'cleanliness_interior', vi.internal_cleanliness,
          'cleanliness_exterior', vi.external_cleanliness,
          'photos', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('photo_url', full_url))
            FROM inspection_photos_v2
            WHERE inspection_id = vi.id
          ), '[]'::jsonb)
        )
        FROM vehicle_inspections vi
        WHERE vi.mission_id = m.id AND vi.inspection_type = 'departure'
        LIMIT 1
      ),
      'inspection_arrival', (
        SELECT jsonb_build_object(
          'mileage_km', vi.mileage_km,
          'fuel_level', vi.fuel_level,
          'cleanliness_interior', vi.internal_cleanliness,
          'cleanliness_exterior', vi.external_cleanliness,
          'photos', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('photo_url', full_url))
            FROM inspection_photos_v2
            WHERE inspection_id = vi.id
          ), '[]'::jsonb)
        )
        FROM vehicle_inspections vi
        WHERE vi.mission_id = m.id AND vi.inspection_type = 'arrival'
        LIMIT 1
      )
    )
    FROM missions m
    WHERE m.id = v_mission_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_inspection_report_by_token(TEXT) TO anon, authenticated;
```

**Statut** : ✅ Exécuté avec succès

---

## 🧪 PROCÉDURE DE TEST (une fois build #6 prêt)

### 1. Installer le nouvel APK
```bash
# Télécharger depuis :
https://expo.dev/accounts/xcrackz123/projects/xcrackz-mobile/builds/4cb6bb84-326f-45f4-b38c-11ae369f9c57

# Désinstaller ancienne version
# Installer nouveau APK
```

### 2. Tester la liste des rapports
- Ouvrir l'app
- Menu → "Rapports d'Inspection"
- **Résultat attendu** : Liste de missions avec `Mission #REFERENCE` (ex: Mission #MSN-001)

### 3. Tester génération lien - Mission créée par toi
- Cliquer sur une mission que TU as créée
- Cliquer sur "Ouvrir le Rapport"
- **Résultat attendu** : Page web s'ouvre avec le rapport complet

### 4. Tester génération lien - Mission assignée
- Cliquer sur une mission QUI T'A ÉTÉ ASSIGNÉE
- Cliquer sur "Ouvrir le Rapport"
- **Résultat attendu** : Page web s'ouvre avec le rapport complet

### 5. Tester partage WhatsApp
- Cliquer sur l'icône WhatsApp
- **Résultat attendu** : Message pré-rempli avec lien `https://www.xcrackz.com/rapport-inspection/XXXXX`

### 6. Tester copie du lien
- Cliquer sur l'icône "Copier"
- **Résultat attendu** : Alert "✅ Copié !" puis coller ailleurs pour vérifier

---

## 🔍 DEBUG SI ÇA MARCHE TOUJOURS PAS

### Erreur : "Impossible de générer le lien de partage"

**Vérifier console logs** :
```bash
npx react-native log-android
```

Chercher :
- `❌ Erreur RPC:`
- `Erreur génération lien:`

**Causes possibles** :
1. userId est null → Vérifier `user?.id` dans AuthContext
2. RPC échoue → Vérifier permissions dans Supabase
3. Token undefined → Problème résolu dans build #6

### Erreur : "Token invalide ou expiré"

**Vérifier dans Supabase SQL Editor** :
```sql
-- Voir tous les tokens générés
SELECT * FROM inspection_report_shares 
ORDER BY created_at DESC 
LIMIT 10;

-- Tester la fonction directement
SELECT get_inspection_report_by_token('UN_TOKEN_DE_TEST');
```

---

## 📊 ARCHITECTURE FINALE

```
MOBILE APP
  ↓
  Clique "Ouvrir Rapport"
  ↓
  generateShareLink(missionId)
  ↓
  supabase.rpc('create_or_get_inspection_share', { missionId, userId })
  ↓
  Fonction SQL crée token → Retourne [{ share_token: 'ABC123' }]
  ↓
  Code prend data[0].share_token
  ↓
  Génère URL: https://www.xcrackz.com/rapport-inspection/ABC123
  ↓
  Linking.openURL(url) → Ouvre navigateur
  ↓
  PAGE WEB
  ↓
  Appelle get_inspection_report_by_token('ABC123')
  ↓
  Fonction SQL retourne données (utilise inspection_photos_v2)
  ↓
  Affiche rapport complet
```

---

## 📝 FICHIERS MODIFIÉS

### Mobile
1. **InspectionShareScreen.tsx**
   - Ligne 20 : Interface avec `reference` au lieu de `mission_number`
   - Ligne 51 : Requête SQL avec `reference`
   - Ligne 131 : `data[0].share_token` au lieu de `data.share_token`
   - Lignes 204, 255, 263, 271, 279 : Utilise `item.reference`

### Supabase
1. **get_inspection_report_by_token()** (fonction RPC)
   - Utilise `inspection_photos_v2` au lieu de `inspection_photos`
   - Utilise `internal_cleanliness` et `external_cleanliness`
   - Retourne `reference` au lieu de `mission_number`

---

## 🎯 PROCHAINES ÉTAPES

1. ⏳ **Attendre Build #6** : https://expo.dev/accounts/xcrackz123/projects/xcrackz-mobile/builds/4cb6bb84-326f-45f4-b38c-11ae369f9c57

2. 📥 **Télécharger APK** dès qu'il est prêt

3. 🧪 **Tester** selon procédure ci-dessus

4. ✅ **Si ça marche** : Commit mobile/ et push

5. ❌ **Si ça marche pas** : Vérifier logs console avec `npx react-native log-android`

---

## 💡 DIFFÉRENCES AVEC LE WEB

| Aspect | Web | Mobile |
|--------|-----|--------|
| Affichage rapport | Sur la même page | Ouvre navigateur externe |
| Génération lien | Modal avec boutons | Icônes dans liste |
| Token stockage | LocalStorage | AsyncStorage |
| Photos | Stockage Supabase | Stockage Supabase (identique) |
| URL finale | www.xcrackz.com | www.xcrackz.com (identique) |

---

## 🚀 SUCCÈS ATTENDU

✅ Liste des rapports affichée avec références correctes  
✅ Génération de lien fonctionne pour missions créées ET assignées  
✅ Page web s'ouvre correctement avec toutes les données  
✅ Partage WhatsApp/SMS/Email avec lien fonctionnel  
✅ Photos affichées depuis inspection_photos_v2  

**Date de création** : 6 novembre 2025  
**Build en cours** : #6 (4cb6bb84-326f-45f4-b38c-11ae369f9c57)
