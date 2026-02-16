# Problèmes de Compilation APK - Flutter App

## Date: 19 novembre 2025

## Résumé
L'APK ne peut pas être compilé à cause de 100+ erreurs dans le code Flutter.

## Problèmes Gradle Résolus ✅
1. ✅ Package edge_detection obsolète → **Retiré du pubspec.yaml**
2. ✅ AGP 8.1.0 → **Upgradé vers 8.5.0**
3. ✅ Gradle 8.3 → **Upgradé vers 8.7**
4. ✅ compileSdk 34 → **Upgradé vers 36**
5. ✅ targetSdk 34 → **Upgradé vers 36**
6. ✅ Kotlin 1.8.22 → **Upgradé vers 1.9.0**

## Erreurs Dart/Flutter Critiques ❌

### 1. Fichiers manquants
- `lib/screens/inspection_details_screen.dart` → **N'existe pas**
- `lib/screens/debug/debug_tools_screen.dart` → **N'existe pas**
- `lib/screens/utils/sharing_utils.dart` → **N'existe pas**
- `lib/screens/services/deep_link_service.dart` → **Mauvais path**

### 2. Services - API incompatible Supabase
**Fichiers:** `mission_service.dart`, `invoice_service.dart`, `quote_service.dart`
```dart
// ERREUR: Méthode .eq() n'existe plus dans Supabase 2.x
query = query.eq('status', status);

// SOLUTION:
query = query.filter('status', 'eq', status);
```

### 3. SupabaseService - Getter 'client' manquant
**Fichier:** `lib/services/supabase_service.dart`
```dart
// ERREUR:
_supabaseService.client.from('table')

// SOLUTION: Ajouter getter
class SupabaseService {
  SupabaseClient get client => Supabase.instance.client;
}
```

### 4. Models - Propriétés manquantes
**UserSubscription** (subscription_screen.dart):
- `endDate` → Doit être ajouté au model
- `planName` → Doit être ajouté au model

**Invoice/Quote** (quote_service.dart):
- `sortOrder` → Paramètre manquant dans InvoiceItem
- `clientName` → Paramètre manquant dans Invoice constructor

### 5. Scanner - Méthodes obsolètes
**Fichier:** `document_scanner_screen.dart`
```dart
// ERREUR: EdgeDetection retiré
await EdgeDetection.detectEdge;

// ERREUR: img.sharpen() n'existe plus dans package 'image'
image = img.sharpen(image, amount: 1.5);

// SOLUTION: Utiliser img.adjustColor() ou copySharpen()
```

### 6. MobileScanner - API changée
**Fichiers:** `scan_qr_screen.dart`, `scan_barcode_screen.dart`
```dart
// ERREUR: torchState n'existe plus
_controller.torchState

// SOLUTION: Utiliser TorchState enum directement
_controller.toggleTorch()
```

### 7. Type Errors
**Covoiturage:**
- `DateTime` cannot be assigned to `String` (trip_details_screen)
- `String?` nullable errors (departureCity, arrivalCity)
- `.toStringAsFixed()` called on nullable double

**Inspection:**
- `Uint8List?` cannot be assigned to `String?` (signatures)
- `File` type expected, `String` provided (upload methods)

### 8. Missing Screens Referenced
- `InspectionDetailsScreen` → Référencé mais n'existe pas
- `DebugToolsScreen` → Référencé mais n'existe pas
- `InvoiceFormScreen` → Constructor not found
- `MyApp` → Referenced in app_drawer mais problème de contexte

## Actions Requises pour Build APK

### Priorité 1 (CRITIQUE - Bloque compilation)
1. Créer `lib/screens/inspection_details_screen.dart`
2. Créer `lib/screens/debug/debug_tools_screen.dart`
3. Fixer SupabaseService.client getter
4. Remplacer `.eq()` par `.filter()` dans tous les services
5. Corriger les paths d'imports (deep_link_service, sharing_utils)

### Priorité 2 (BLOQUE - Null safety)
1. Fixer type conversions DateTime/String dans Covoiturage
2. Fixer signatures Uint8List → String dans Inspection
3. Ajouter null checks sur propriétés optionnelles

### Priorité 3 (AMÉLIORATION - Features obsolètes)
1. Retirer références EdgeDetection
2. Remplacer img.sharpen() par alternative
3. Mettre à jour MobileScanner API
4. Ajouter propriétés manquantes aux Models

## Estimation Temps de Fix
- Priorité 1: **4-6 heures**
- Priorité 2: **3-4 heures**
- Priorité 3: **2-3 heures**

**Total: 9-13 heures de travail**

## Workaround Temporaire
Pour compiler l'APK maintenant, il faudrait:
1. Commenter tous les écrans avec erreurs
2. Retirer features problématiques du drawer
3. Build avec fonctionnalités réduites

## Recommandation
L'application nécessite une refonte technique significative avant d'être compilable. Les erreurs indiquent:
- Migration Supabase incomplète (v1 → v2)
- Packages obsolètes non mis à jour
- Models incomplets
- Screens manquants

**Suggestion:** Implémenter d'abord les fixes Priorité 1, puis tester la compilation progressivement.
