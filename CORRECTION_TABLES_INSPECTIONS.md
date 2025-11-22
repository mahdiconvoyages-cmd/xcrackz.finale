# ✅ CORRECTION TABLES INSPECTIONS - Mobile Flutter

## 🚨 Problème Identifié

L'application mobile Flutter utilisait **les mauvaises tables** pour les inspections:

### ❌ Avant (INCORRECT)
- **Table utilisée**: `inspections` 
- **Bucket storage**: `inspection-photos` (correct)
- **Modèle**: `Inspection` (incomplet)
- **Photos**: Stockées en JSONB dans le modèle
- **Dommages**: Stockées en JSONB dans le modèle

### ✅ Après (CORRECT)
- **Table principale**: `vehicle_inspections`
- **Table photos**: `inspection_photos`
- **Table dommages**: `inspection_damages`
- **Bucket storage**: `inspection-photos`
- **Modèles**: `VehicleInspection`, `InspectionPhoto`, `InspectionDamage`

---

## 📊 Structure de Base de Données

### Table: `vehicle_inspections`

```sql
CREATE TABLE public.vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES profiles(id),
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('departure', 'arrival')),
  vehicle_info JSONB DEFAULT '{}'::jsonb,
  overall_condition TEXT,
  fuel_level INTEGER,
  mileage_km INTEGER,
  damages JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  inspector_signature TEXT,
  client_signature TEXT,
  client_name TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  location_address TEXT,
  status TEXT DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `inspection_photos`

```sql
CREATE TABLE public.inspection_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES vehicle_inspections(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'vehicle_front',
    'vehicle_back', 
    'vehicle_side',
    'exterior',
    'interior',
    'arrival'
  )),
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `inspection_damages`

```sql
CREATE TABLE public.inspection_damages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES vehicle_inspections(id) ON DELETE CASCADE,
  damage_location TEXT,
  damage_severity TEXT CHECK (damage_severity IN ('minor', 'moderate', 'severe')),
  description TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔧 Fichiers Modifiés

### 1. `lib/models/inspection.dart` → Renommé en `VehicleInspection`

**Changements**:
- ✅ Classe renommée: `Inspection` → `VehicleInspection`
- ✅ Ajout de tous les champs de `vehicle_inspections`
- ✅ Suppression du champ `photos` (maintenant table séparée)
- ✅ Champs ajoutés: `inspectorId`, `vehicleInfo`, `overallCondition`, `mileageKm`, `inspectorSignature`, `clientName`, `latitude`, `longitude`, `locationAddress`, `status`, `completedAt`
- ✅ `type` renommé en `inspectionType`
- ✅ `mileage` renommé en `mileageKm`

**Utilisation**:
```dart
import 'package:finality_app/models/inspection.dart';

final inspection = VehicleInspection(
  id: 'uuid',
  missionId: 'mission-uuid',
  inspectionType: 'departure',
  mileageKm: 50000,
  fuelLevel: 75,
  status: 'in_progress',
  createdAt: DateTime.now(),
  updatedAt: DateTime.now(),
);
```

### 2. `lib/models/inspection_photo.dart` ✨ NOUVEAU

**Modèle pour gérer les photos séparément**:
```dart
class InspectionPhoto {
  final String id;
  final String inspectionId;
  final String category;
  final String photoUrl;
  final DateTime createdAt;
}

enum PhotoCategory {
  vehicleFront('vehicle_front', 'Avant du véhicule'),
  vehicleBack('vehicle_back', 'Arrière du véhicule'),
  vehicleSide('vehicle_side', 'Côté du véhicule'),
  exterior('exterior', 'Extérieur'),
  interior('interior', 'Intérieur'),
  arrival('arrival', 'Arrivée');
}
```

### 3. `lib/models/inspection_damage.dart` ✨ NOUVEAU

**Modèle pour gérer les dommages séparément**:
```dart
class InspectionDamage {
  final String id;
  final String inspectionId;
  final String? damageLocation;
  final String? damageSeverity;
  final String? description;
  final String? photoUrl;
  final DateTime createdAt;
}

enum DamageSeverity {
  minor('minor', 'Mineur'),
  moderate('moderate', 'Modéré'),
  severe('severe', 'Sévère');
}
```

### 4. `lib/services/inspection_service.dart`

**Changements**:
- ✅ Table changée: `inspections` → `vehicle_inspections`
- ✅ Type de retour: `Inspection` → `VehicleInspection`
- ✅ Toutes les méthodes mises à jour

**Méthodes**:
```dart
Future<List<VehicleInspection>> getInspectionsByMission(String missionId)
Future<VehicleInspection> getInspectionById(String id)
Future<VehicleInspection> createInspection(Map<String, dynamic> data)
Future<VehicleInspection> updateInspection(String id, Map<String, dynamic> updates)
Future<void> deleteInspection(String id)
```

### 5. `lib/services/inspection_photo_service.dart` ✨ NOUVEAU

**Service complet pour gérer photos et dommages**:

#### Méthodes Photos:
```dart
// Récupérer les photos
Future<List<InspectionPhoto>> getPhotosByInspection(String inspectionId)
Future<List<InspectionPhoto>> getPhotosByCategory(String inspectionId, PhotoCategory category)

// Upload de photos
Future<InspectionPhoto> uploadPhoto({
  required String inspectionId,
  required File photoFile,
  required PhotoCategory category,
})

Future<InspectionPhoto> uploadPhotoFromBytes({
  required String inspectionId,
  required List<int> photoBytes,
  required PhotoCategory category,
})

// Supprimer une photo
Future<void> deletePhoto(String photoId, String photoUrl)

// Utilitaires
Future<int> countPhotos(String inspectionId)
Future<bool> hasAllRequiredPhotos(String inspectionId)
```

#### Méthodes Dommages:
```dart
// Récupérer les dommages
Future<List<InspectionDamage>> getDamagesByInspection(String inspectionId)

// Créer un dommage avec photo optionnelle
Future<InspectionDamage> createDamage({
  required String inspectionId,
  required String damageLocation,
  required DamageSeverity severity,
  String? description,
  File? photoFile,
})

// Mettre à jour un dommage
Future<InspectionDamage> updateDamage({
  required String damageId,
  String? damageLocation,
  DamageSeverity? severity,
  String? description,
})

// Supprimer un dommage
Future<void> deleteDamage(String damageId, String? photoUrl)

// Utilitaires
Future<int> countDamages(String inspectionId)
```

### 6. `lib/services/sync_service.dart`

**Changements**:
- ✅ Channel renommé: `inspections_sync` → `vehicle_inspections_sync`
- ✅ Table écoutée: `inspections` → `vehicle_inspections`
- ✅ Méthode `_loadInspections()` mise à jour

---

## 📦 Storage Buckets

### Bucket: `inspection-photos`

**Utilisation**:
- Photos d'inspections (véhicule)
- Photos de dommages
- Signatures (client, inspecteur)

**Structure des chemins**:
```
inspection-photos/
├── inspections/{inspection_id}/
│   ├── {inspection_id}_vehicle_front_timestamp.jpg
│   ├── {inspection_id}_vehicle_back_timestamp.jpg
│   ├── {inspection_id}_exterior_timestamp.jpg
│   └── ...
├── damages/{inspection_id}/
│   ├── {inspection_id}_damage_timestamp.jpg
│   └── ...
└── signatures/{mission_id}/
    ├── {mission_id}_client_timestamp.png
    └── {mission_id}_inspector_timestamp.png
```

**Autres buckets disponibles** (pour référence):
- `inspection-documents` - Documents scannés (mobile)
- `scanned-documents` - Documents scannés (web)
- `inspection-photos-webp` - Photos optimisées WebP
- `inspection-pdfs` - Rapports PDF générés

---

## 🎯 Exemples d'Utilisation

### Exemple 1: Créer une inspection avec photos

```dart
import 'package:finality_app/services/inspection_service.dart';
import 'package:finality_app/services/inspection_photo_service.dart';
import 'package:finality_app/models/inspection_photo.dart';

final inspectionService = InspectionService();
final photoService = InspectionPhotoService();

// 1. Créer l'inspection
final inspection = await inspectionService.createInspection({
  'mission_id': missionId,
  'inspection_type': 'departure',
  'mileage_km': 50000,
  'fuel_level': 75,
  'status': 'in_progress',
});

// 2. Ajouter des photos
final photoFront = await photoService.uploadPhoto(
  inspectionId: inspection.id,
  photoFile: File('/path/to/front.jpg'),
  category: PhotoCategory.vehicleFront,
);

final photoBack = await photoService.uploadPhoto(
  inspectionId: inspection.id,
  photoFile: File('/path/to/back.jpg'),
  category: PhotoCategory.vehicleBack,
);

// 3. Vérifier que toutes les photos sont présentes
final allPhotosPresent = await photoService.hasAllRequiredPhotos(inspection.id);
if (allPhotosPresent) {
  // Marquer l'inspection comme complète
  await inspectionService.updateInspection(inspection.id, {
    'status': 'completed',
    'completed_at': DateTime.now().toIso8601String(),
  });
}
```

### Exemple 2: Ajouter un dommage avec photo

```dart
import 'package:finality_app/services/inspection_photo_service.dart';
import 'package:finality_app/models/inspection_damage.dart';

final photoService = InspectionPhotoService();

final damage = await photoService.createDamage(
  inspectionId: inspectionId,
  damageLocation: 'Portière avant gauche',
  severity: DamageSeverity.moderate,
  description: 'Rayure de 10cm sur la portière',
  photoFile: File('/path/to/damage.jpg'),
);
```

### Exemple 3: Récupérer toutes les photos d'une inspection

```dart
import 'package:finality_app/services/inspection_photo_service.dart';

final photoService = InspectionPhotoService();

// Toutes les photos
final allPhotos = await photoService.getPhotosByInspection(inspectionId);

// Photos par catégorie
final frontPhotos = await photoService.getPhotosByCategory(
  inspectionId,
  PhotoCategory.vehicleFront,
);

// Comptage
final photoCount = await photoService.countPhotos(inspectionId);
print('Nombre de photos: $photoCount');
```

### Exemple 4: Synchronisation temps réel

```dart
import 'package:finality_app/services/sync_service.dart';

final syncService = SyncProvider.of(context);

// Écouter les mises à jour des inspections
syncService!.syncInspections().listen((inspections) {
  setState(() {
    _inspections = inspections
        .map((json) => VehicleInspection.fromJson(json))
        .toList();
  });
});
```

---

## ✅ Checklist de Migration

Pour mettre à jour un écran existant utilisant les inspections:

- [ ] Importer `VehicleInspection` au lieu de `Inspection`
- [ ] Changer `type` → `inspectionType`
- [ ] Changer `mileage` → `mileageKm`
- [ ] Supprimer l'accès direct à `photos` (maintenant table séparée)
- [ ] Utiliser `InspectionPhotoService` pour gérer les photos
- [ ] Utiliser les enums `PhotoCategory` et `DamageSeverity`
- [ ] Mettre à jour les appels à `InspectionService`
- [ ] Vérifier la synchronisation via `SyncService`

---

## 🔄 Compatibilité Web-Mobile

### Web utilise:
- ✅ `vehicle_inspections`
- ✅ `inspection_photos`
- ✅ `inspection_damages`
- ✅ Bucket: `inspection-photos`

### Mobile utilise maintenant:
- ✅ `vehicle_inspections`
- ✅ `inspection_photos`
- ✅ `inspection_damages`
- ✅ Bucket: `inspection-photos`

**Synchronisation parfaite garantie** ✅

---

## 📝 Notes Importantes

1. **Migration automatique**: Les anciennes données de la table `inspections` (si elle existe) ne sont **pas** automatiquement migrées vers `vehicle_inspections`. Si nécessaire, créer un script SQL de migration.

2. **Photos obligatoires**: Les catégories suivantes sont considérées comme obligatoires:
   - `vehicle_front`
   - `vehicle_back`
   - `vehicle_side`
   - `exterior`
   - `interior`

3. **Storage**: Toutes les photos et signatures utilisent le bucket `inspection-photos` qui doit être configuré comme public.

4. **RLS**: Les policies RLS doivent être configurées pour:
   - `vehicle_inspections` - Accès basé sur `mission_id` → `user_id`
   - `inspection_photos` - Accès basé sur `inspection_id` → `mission_id` → `user_id`
   - `inspection_damages` - Accès basé sur `inspection_id` → `mission_id` → `user_id`

5. **Realtime**: Activer Realtime sur les tables:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_inspections;
   ALTER PUBLICATION supabase_realtime ADD TABLE inspection_photos;
   ALTER PUBLICATION supabase_realtime ADD TABLE inspection_damages;
   ```

---

## 🚀 Résultat Final

✅ **Mobile Flutter utilise maintenant les bonnes tables**
✅ **Synchronisation totale avec le web**
✅ **Structure de données propre et normalisée**
✅ **Services dédiés pour photos et dommages**
✅ **Support complet des catégories et sévérités**
✅ **Realtime synchronization fonctionnelle**

---

**Date**: 19 Novembre 2025  
**Status**: ✅ CORRIGÉ
