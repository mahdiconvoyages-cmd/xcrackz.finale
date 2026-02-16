# 🖼️ IMPLÉMENTATION PHOTOS PAR DÉFAUT VÉHICULES

## 📋 Vue d'ensemble

Implémenter l'affichage automatique d'une photo par défaut selon le type de véhicule (VL/VU/PL) quand l'utilisateur ne choisit pas de photo.

---

## 🎯 SOLUTION RECOMMANDÉE: Affichage Conditionnel

### Avantages
- ✅ Pas de modification de la base de données
- ✅ Flexible - facile de changer les images
- ✅ Pas d'upload inutile vers Supabase
- ✅ Charge instantanée (images en local)

---

## 📱 MOBILE - Implémentation

### 1. Créer fonction utilitaire

**Fichier:** `mobile/src/utils/vehicleDefaults.ts`

```typescript
/**
 * Retourne l'image par défaut selon le type de véhicule
 * Utilisé quand vehicle_image_url est null/undefined
 */

export const getDefaultVehicleImage = (vehicleType: 'VL' | 'VU' | 'PL' = 'VL') => {
  const defaultPhotos = {
    'VL': require('../assets/vehicles/avant.png'),
    'VU': require('../assets/vehicles/master avant.png'),
    'PL': require('../assets/vehicles/scania-avant.png'),
  };
  
  return defaultPhotos[vehicleType] || defaultPhotos['VL'];
};

/**
 * Retourne la source d'image avec fallback sur photo par défaut
 */
export const getVehicleImageSource = (
  imageUrl: string | null | undefined,
  vehicleType: 'VL' | 'VU' | 'PL' = 'VL'
) => {
  if (imageUrl) {
    return { uri: imageUrl };
  }
  return getDefaultVehicleImage(vehicleType);
};
```

---

### 2. Modifier MissionViewScreen

**Fichier:** `mobile/src/screens/missions/MissionViewScreen.tsx`

**Import:**
```typescript
import { getVehicleImageSource } from '../../utils/vehicleDefaults';
```

**Chercher la section d'affichage de l'image (autour ligne 200-250):**

**AVANT:**
```typescript
{mission.vehicle_image_url && (
  <Image 
    source={{ uri: mission.vehicle_image_url }} 
    style={styles.vehicleImage} 
  />
)}
```

**APRÈS:**
```typescript
<Image 
  source={getVehicleImageSource(mission.vehicle_image_url, mission.vehicle_type)}
  style={styles.vehicleImage} 
/>
```

---

### 3. Modifier MissionListScreen

**Fichier:** `mobile/src/screens/missions/MissionListScreen.tsx`

**Import:**
```typescript
import { getVehicleImageSource } from '../../utils/vehicleDefaults';
```

**Chercher le renderItem (autour ligne 100-150):**

**AVANT:**
```typescript
{item.vehicle_image_url && (
  <Image 
    source={{ uri: item.vehicle_image_url }} 
    style={styles.vehicleImage} 
  />
)}
```

**APRÈS:**
```typescript
<Image 
  source={getVehicleImageSource(item.vehicle_image_url, item.vehicle_type)}
  style={styles.vehicleImageThumb} 
/>
```

---

### 4. Modifier NewMissionsScreen (Missions reçues)

**Fichier:** `mobile/src/screens/NewMissionsScreen.tsx`

**Import:**
```typescript
import { getVehicleImageSource } from '../utils/vehicleDefaults';
```

**Chercher le renderMissionItem (autour ligne 250-350):**

**AVANT:**
```typescript
{item.vehicle_image_url && (
  <Image source={{ uri: item.vehicle_image_url }} style={styles.vehicleImage} />
)}
```

**APRÈS:**
```typescript
<Image 
  source={getVehicleImageSource(item.vehicle_image_url, item.vehicle_type)}
  style={styles.vehicleImageThumb} 
/>
```

---

## 🌐 WEB - Implémentation

### 1. Créer fonction utilitaire

**Fichier:** `src/utils/vehicleDefaults.ts`

```typescript
/**
 * Retourne l'URL de l'image par défaut selon le type de véhicule
 * Utilisé quand vehicle_image_url est null/undefined
 */

export const getDefaultVehicleImage = (vehicleType: 'VL' | 'VU' | 'PL' = 'VL'): string => {
  const defaultPhotos = {
    'VL': '/images/vehicles/vl-default.png',
    'VU': '/images/vehicles/vu-default.png',
    'PL': '/images/vehicles/pl-default.png',
  };
  
  return defaultPhotos[vehicleType] || defaultPhotos['VL'];
};

/**
 * Retourne l'URL de l'image avec fallback sur photo par défaut
 */
export const getVehicleImageUrl = (
  imageUrl: string | null | undefined,
  vehicleType: 'VL' | 'VU' | 'PL' = 'VL'
): string => {
  return imageUrl || getDefaultVehicleImage(vehicleType);
};
```

---

### 2. Préparer les images par défaut

**Créer dossier:** `public/images/vehicles/`

**Copier les images:**
- Depuis: `mobile/assets/vehicles/avant.png`
- Vers: `public/images/vehicles/vl-default.png`

- Depuis: `mobile/assets/vehicles/master avant.png`
- Vers: `public/images/vehicles/vu-default.png`

- Depuis: `mobile/assets/vehicles/scania-avant.png`
- Vers: `public/images/vehicles/pl-default.png`

**OU** utiliser des URLs Supabase Storage si images déjà uploadées:
```typescript
const defaultPhotos = {
  'VL': 'https://avacqhxkynpvupnfxktk.supabase.co/storage/v1/object/public/missions/defaults/vl-default.png',
  'VU': 'https://avacqhxkynpvupnfxktk.supabase.co/storage/v1/object/public/missions/defaults/vu-default.png',
  'PL': 'https://avacqhxkynpvupnfxktk.supabase.co/storage/v1/object/public/missions/defaults/pl-default.png',
};
```

---

### 3. Modifier TeamMissions

**Fichier:** `src/pages/TeamMissions.tsx`

**Import:**
```typescript
import { getVehicleImageUrl } from '../utils/vehicleDefaults';
```

**Chercher la section d'affichage de l'image dans la liste (autour ligne 640-660):**

**AVANT:**
```typescript
{mission.vehicle_image_url ? (
  <img
    src={mission.vehicle_image_url}
    alt="Véhicule"
    className="w-20 h-20 object-cover rounded-lg"
  />
) : (
  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
    <Car className="w-8 h-8 text-gray-400" />
  </div>
)}
```

**APRÈS:**
```typescript
<img
  src={getVehicleImageUrl(mission.vehicle_image_url, mission.vehicle_type)}
  alt={`Véhicule ${mission.vehicle_type}`}
  className="w-20 h-20 object-cover rounded-lg"
/>
```

---

### 4. Modifier MissionDetails (si existe)

**Fichier:** `src/pages/MissionDetails.tsx` (ou équivalent)

**Import:**
```typescript
import { getVehicleImageUrl } from '../utils/vehicleDefaults';
```

**Chercher l'affichage de l'image principale:**

**AVANT:**
```typescript
{mission.vehicle_image_url && (
  <img src={mission.vehicle_image_url} alt="Véhicule" />
)}
```

**APRÈS:**
```typescript
<img 
  src={getVehicleImageUrl(mission.vehicle_image_url, mission.vehicle_type)} 
  alt={`Véhicule ${mission.vehicle_type}`}
  className="w-full max-h-96 object-cover rounded-lg"
/>
```

---

## 🎨 STYLES OPTIONNELS

### Mobile - Ajuster taille des miniatures

**Dans MissionListScreen.tsx:**
```typescript
const styles = StyleSheet.create({
  ...
  vehicleImageThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f3f4f6', // Fallback background
  },
  vehicleImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginVertical: 10,
  },
});
```

### Web - Badge type de véhicule

**Dans TeamMissions.tsx (optionnel):**
```typescript
<div className="relative">
  <img
    src={getVehicleImageUrl(mission.vehicle_image_url, mission.vehicle_type)}
    alt={`Véhicule ${mission.vehicle_type}`}
    className="w-20 h-20 object-cover rounded-lg"
  />
  {!mission.vehicle_image_url && (
    <div className="absolute bottom-1 right-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
      {mission.vehicle_type}
    </div>
  )}
</div>
```

---

## ✅ CHECKLIST D'IMPLÉMENTATION

### Mobile
- [ ] Créer `mobile/src/utils/vehicleDefaults.ts`
- [ ] Modifier `mobile/src/screens/missions/MissionViewScreen.tsx`
- [ ] Modifier `mobile/src/screens/missions/MissionListScreen.tsx`
- [ ] Modifier `mobile/src/screens/NewMissionsScreen.tsx`
- [ ] Tester sur émulateur/device

### Web
- [ ] Créer `src/utils/vehicleDefaults.ts`
- [ ] Créer dossier `public/images/vehicles/`
- [ ] Copier 3 images par défaut (VL/VU/PL)
- [ ] Modifier `src/pages/TeamMissions.tsx`
- [ ] Modifier `src/pages/MissionDetails.tsx` (si existe)
- [ ] Tester dans navigateur

### Tests
- [ ] Créer mission SANS photo → Vérifie image par défaut VL
- [ ] Créer mission AVEC photo → Vérifie image personnalisée
- [ ] Changer vehicle_type → Vérifie image par défaut change
- [ ] Vérifier sur mobile ET web
- [ ] Vérifier dans liste ET détails

---

## 🐛 TROUBLESHOOTING

### Erreur: "Cannot find module '../utils/vehicleDefaults'"
**Solution:** Vérifier le chemin relatif d'import selon l'emplacement du fichier

### Image ne s'affiche pas (Web)
**Solution:** 
1. Vérifier que les images sont dans `public/images/vehicles/`
2. Vérifier les noms de fichiers correspondent exactement
3. Inspecter dans DevTools si 404 sur l'image

### Image ne s'affiche pas (Mobile)
**Solution:**
1. Vérifier `require()` pointe vers le bon chemin
2. Relancer le build (`npx expo start -c`)
3. Vérifier que les images existent dans `assets/vehicles/`

### TypeError: mission.vehicle_type is undefined
**Solution:** Ajouter valeur par défaut:
```typescript
getVehicleImageUrl(mission.vehicle_image_url, mission.vehicle_type || 'VL')
```

---

## 📊 RÉSULTAT ATTENDU

### Avant
- Mission sans photo → ❌ Emplacement vide ou icône générique
- UX: Impression de données manquantes

### Après
- Mission sans photo → ✅ Photo par défaut selon type (VL/VU/PL)
- UX: Interface complète et professionnelle
- Utilisateur identifie rapidement le type de véhicule

---

## 🚀 DÉPLOIEMENT

### Mobile
```bash
cd mobile
# Recompiler l'app
npx expo start -c
# Ou pour APK:
npx expo run:android --variant release
```

### Web
```bash
# Commit et push
git add src/utils/vehicleDefaults.ts public/images/vehicles/
git commit -m "feat: ajouter photos par défaut selon type véhicule (VL/VU/PL)"
git push

# Build et déploiement
npm run build
# Vercel auto-deploy ou:
vercel --prod
```

---

**Temps estimé:** 1-2 heures
**Impact:** Amélioration UX significative
**Risque:** Minimal (pas de modification DB)
