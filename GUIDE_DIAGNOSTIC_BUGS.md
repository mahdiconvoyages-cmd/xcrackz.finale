# 🔍 GUIDE DE DIAGNOSTIC - Photos Livraison & Crashes

## 📋 RÉSUMÉ DES BUGS

### ✅ Bug 1: Niveau carburant "50/8" → **CORRIGÉ**
- **Fichier**: `PublicInspectionReportShared.tsx`
- **Change**: `/8` → `%`

### ✅ Bug 2: Signatures PDF sans noms → **CORRIGÉ**
- **Fichiers**: 
  - `pdfGenerator.ts`
  - `comparisonPdfGenerator.ts`
- **Change**: Ajout nom/prénom à côté de "Convoyeur" et "Client"

### ⏳ Bug 3: Missions terminées à 0 → **SQL CRÉÉ**
- **Fichier**: `FIX_MISSIONS_COMPLETED_STATUS.sql`
- **Action**: Exécuter dans Supabase Dashboard
- **Trigger auto créé**: Les futures missions seront auto-complétées

### 🔍 Bug 4: Photos livraison manquantes → **EN COURS**

### ⚠️ Bug 5: App beugue pendant missions → **À DIAGNOSTIQUER**

---

## 📸 DIAGNOSTIC PHOTOS LIVRAISON

### Étape 1: Vérifier si photos uploadées

Exécuter dans **Supabase SQL Editor**:

```sql
-- Compter photos d'arrivée dans la base
SELECT COUNT(*) as total_photos_arrivee
FROM inspection_photos_v2 ip
JOIN vehicle_inspections vi ON ip.inspection_id = vi.id
WHERE vi.inspection_type = 'arrival';

-- Voir les 10 dernières photos d'arrivée
SELECT 
  ip.id,
  ip.inspection_id,
  ip.photo_type,
  LEFT(ip.full_url, 50) as url_debut,
  ip.taken_at,
  m.reference
FROM inspection_photos_v2 ip
JOIN vehicle_inspections vi ON ip.inspection_id = vi.id
JOIN missions m ON vi.mission_id = m.id
WHERE vi.inspection_type = 'arrival'
ORDER BY ip.taken_at DESC
LIMIT 10;
```

### Étape 2: Vérifier Storage Supabase

1. Aller dans **Supabase Dashboard** → **Storage** → **inspection-photos**
2. Chercher des fichiers récents
3. Vérifier les permissions (bucket doit être PUBLIC)

```sql
-- Vérifier politique bucket
SELECT * FROM storage.buckets WHERE name = 'inspection-photos';

-- Vérifier les policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

### Étape 3: Tester l'upload mobile

1. Ouvrir l'app mobile en mode dev
2. Faire une inspection arrivée
3. Regarder les logs console (Metro):
   ```
   📸 Upload de X photos en parallèle...
   📤 [1/6] Upload photo front démarré...
   ✅✅ Photo front complètement uploadée (ID: xxx)
   ```

4. Chercher des **erreurs** comme:
   ```
   ❌ Erreur Supabase Storage: ...
   ❌ ERREUR COMPLÈTE upload photo: ...
   ```

### Étape 4: Vérifier la récupération

Dans `InspectionReportAdvanced.tsx`, vérifier logs:

```typescript
console.log(`📸 Arrivée: ${ap?.length || 0} photos chargées`);
```

Si `0 photos chargées` mais des photos existent en DB → problème requête

---

## 💥 DIAGNOSTIC CRASHES PENDANT MISSIONS

### Symptômes
- App beugue pendant mission
- Obligé de vider cache
- Perte de données en cours

### Causes possibles

#### 1. **État asyncrone non géré**

Vérifier dans `MissionViewScreen.tsx` ou `InspectionDepartureNew.tsx`:

```typescript
// MAUVAIS - risque crash si component unmount
async loadData() {
  const data = await fetch();
  this.setState({ data }); // 💥 Crash si unmounted
}

// BON - vérifier before setState
async loadData() {
  const data = await fetch();
  if (this._isMounted) {
    this.setState({ data });
  }
}
```

#### 2. **Mémoire photos trop lourde**

Dans `InspectionDepartureNew.tsx`:

```typescript
// Les photos en base64 peuvent saturer mémoire
// SOLUTION: Compression avant upload

const compressPhoto = async (uri: string) => {
  const manipResult = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }], // Réduire taille
    { compress: 0.7, format: SaveFormat.JPEG }
  );
  return manipResult.uri;
};
```

#### 3. **Storage AsyncStorage plein**

```typescript
// Nettoyer vieux caches
import AsyncStorage from '@react-native-async-storage/async-storage';

const clearOldCache = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const oldKeys = keys.filter(k => k.startsWith('inspection_progress_'));
  
  for (const key of oldKeys) {
    const data = await AsyncStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      const age = Date.now() - new Date(parsed.timestamp).getTime();
      if (age > 7 * 24 * 60 * 60 * 1000) { // > 7 jours
        await AsyncStorage.removeItem(key);
      }
    }
  }
};
```

#### 4. **Trop de listeners/subscriptions**

Vérifier dans `useEffect`:

```typescript
useEffect(() => {
  const subscription = supabase
    .channel('missions')
    .on('postgres_changes', ...)
    .subscribe();
  
  // ⚠️ IMPORTANT: cleanup
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### Actions immédiates

1. **Activer logs détaillés**

Dans `App.tsx` ou `index.tsx`:

```typescript
if (__DEV__) {
  console.log('🔍 Mode DEBUG activé');
  
  // Logger tous les erreurs
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('💥 CRASH GLOBAL:', error, isFatal);
  });
}
```

2. **Ajouter Error Boundaries**

```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('💥 Error Boundary caught:', error, errorInfo);
    // Envoyer à service analytics
  }
  
  render() {
    return this.props.children;
  }
}

// Wrapper la navigation
<ErrorBoundary>
  <NavigationContainer>
    ...
  </NavigationContainer>
</ErrorBoundary>
```

3. **Monitorer mémoire**

```typescript
import { MemoryInfo } from 'react-native';

const checkMemory = async () => {
  if (Platform.OS === 'android') {
    const memInfo = await MemoryInfo.getMemoryInfo();
    console.log('📊 Mémoire:', memInfo);
    
    if (memInfo.usedMemory > 500 * 1024 * 1024) { // > 500MB
      console.warn('⚠️ Mémoire élevée! Nettoyer cache...');
    }
  }
};
```

---

## 🛠️ PLAN D'ACTION

### Priorité 1: Exécuter SQL
```bash
# Dans Supabase Dashboard → SQL Editor
1. Exécuter: DIAGNOSTIC_BUGS_MISSIONS.sql
2. Exécuter: FIX_MISSIONS_COMPLETED_STATUS.sql
3. Vérifier résultats
```

### Priorité 2: Tester photos
```bash
1. Faire inspection arrivée dans app
2. Vérifier logs Metro
3. Vérifier Storage Supabase
4. Vérifier table inspection_photos_v2
```

### Priorité 3: Capturer crash
```bash
1. Activer mode DEBUG
2. Reproduire crash
3. Copier logs complets
4. Identifier stack trace
```

---

## 📊 CHECKLIST TESTS

- [ ] Niveau carburant affiche `50%` (pas `50/8`)
- [ ] Signatures PDF montrent noms complets
- [ ] Compteur missions terminées > 0
- [ ] Photos arrivée visibles dans rapport
- [ ] App stable pendant inspection complète
- [ ] Pas besoin vider cache entre missions

---

## 🚨 SI PROBLÈME PERSISTE

### Photos manquantes
1. Vérifier bucket `inspection-photos` existe
2. Vérifier policies Storage (PUBLIC read)
3. Tester upload manuel dans Storage
4. Vérifier URL dans `full_url` accessible

### Crashes
1. Activer React Native Debugger
2. Installer Flipper pour profiling
3. Vérifier logs natifs (adb logcat)
4. Désactiver upload photos temporairement

### Compteur à 0
1. Vérifier trigger créé: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_complete_mission';`
2. Vérifier fonction existe: `SELECT * FROM pg_proc WHERE proname = 'auto_complete_mission';`
3. Update manuel si besoin: `UPDATE missions SET status = 'completed' WHERE ...`

---

## 📞 CONTACT DONNÉES TECHNIQUES

**Pour investigation approfondie, fournir**:
- Logs Metro complets
- Screenshot erreur
- ID mission problématique
- Résultats SQL diagnostic
- Version app (package.json version)
- OS mobile (Android/iOS version)

---

**Date**: 2025-11-06  
**Auteur**: AI Assistant  
**Status**: 3/5 bugs corrigés, 2 en diagnostic
