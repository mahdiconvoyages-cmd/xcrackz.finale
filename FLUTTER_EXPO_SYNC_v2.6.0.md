# 🔄 SYNCHRONISATION FLUTTER ↔️ EXPO XCRACKZ - v2.6.0+6

## ✅ FIXES CRITIQUES APPLIQUÉS

### 1. 🎨 **App Icon Configuration**
**Problème**: Logo Flutter par défaut visible au lieu du logo XZ
**Solution**:
- ✅ Package `flutter_launcher_icons: ^0.14.1` ajouté à `pubspec.yaml`
- ✅ Icon `icon.png` (512x512) copié depuis `mobile/assets/icon.png` vers `mobile_flutter/finality_app/assets/images/`
- ✅ Configuration ajoutée dans `pubspec.yaml`:
  ```yaml
  flutter_launcher_icons:
    android: true
    ios: true
    image_path: "assets/images/icon.png"
    adaptive_icon_background: "#0b1220"
    adaptive_icon_foreground: "assets/images/icon.png"
  ```
- ✅ Commande à exécuter: `flutter pub run flutter_launcher_icons:main`

**Référence Expo**: `mobile/app.json` ligne 9: `"icon": "./assets/icon.png"`

---

### 2. 💳 **Dashboard - Source Crédits**
**Problème**: Dashboard ne charge pas les bonnes informations
**Root Cause**: Flutter utilisait `user_credits` table, Expo utilise `profiles.credits`

**Solution**:
```dart
// AVANT (INCORRECT)
final creditsResponse = await supabase
    .from('user_credits')
    .select('credits_balance')
    .eq('user_id', userId)
    .maybeSingle();
_credits = creditsResponse?['credits_balance'] ?? 0;

// APRÈS (CORRECT - comme Expo)
final creditsResponse = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .maybeSingle();
_credits = creditsResponse?['credits'] ?? 0;
```

**Référence Expo**: `mobile/src/hooks/useCredits.ts` ligne 38-42:
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('credits')
  .eq('id', user.id)
  .single();
```

**Fichier modifié**: `mobile_flutter/finality_app/lib/screens/dashboard/dashboard_screen.dart` ligne 85-91

---

### 3. 💰 **Dashboard - Calcul Revenue**
**Problème**: Revenue affiché incorrect
**Solution**: Utiliser **company_commission + bonus_amount** (comme Expo)

**Code vérifié**:
```dart
// Query missions avec les bonnes colonnes
final missionsResponse = await supabase
    .from('missions')
    .select('id, status, created_at, company_commission, bonus_amount, distance_km')
    .eq('user_id', userId);

// Calcul revenue (ligne 149)
_monthlyRevenue = completedThisMonth.fold(
    0.0, (sum, m) => sum + ((m['company_commission'] ?? 0.0) + (m['bonus_amount'] ?? 0.0)));
```

**Référence Expo**: `mobile/src/screens/DashboardScreenNew.tsx` ligne 210, 228, 229:
```typescript
const totalRevenue = missions
  .filter((m) => m.status === 'completed')
  .reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);
```

**Fichier modifié**: `mobile_flutter/finality_app/lib/screens/dashboard/dashboard_screen.dart` ligne 111, 140, 149

---

### 4. 👤 **Inspection - Nom du Convoyeur**
**Problème**: Nom du convoyeur n'est pas affiché dans l'inspection
**Root Cause**: Variable `_driverName` existait mais fonction de chargement ABSENTE

**Solution**:
```dart
@override
void initState() {
  super.initState();
  _loadDriverName(); // Ajout de l'appel
}

/// Charger le nom du convoyeur depuis profiles.full_name (comme Expo ligne 91)
Future<void> _loadDriverName() async {
  try {
    final user = supabase.auth.currentUser;
    if (user == null) return;

    final response = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

    if (response != null) {
      setState(() {
        _driverName = response['full_name'] ?? '';
      });
      debugPrint('✅ INSPECTION: Driver name loaded = $_driverName');
    }
  } catch (e) {
    debugPrint('❌ INSPECTION: Error loading driver name: $e');
  }
}
```

**Référence Expo**: `mobile/src/screens/inspections/InspectionDeparture.tsx` ligne 91:
```typescript
const [convoyeurName, setConvoyeurName] = useState(user?.full_name || '');
```

**Fichier modifié**: `mobile_flutter/finality_app/lib/screens/inspections/inspection_departure_screen.dart` ligne 108-150

---

### 5. 🐛 **Debug Logging Ajouté**
Pour faciliter le debugging runtime, des logs ont été ajoutés:

**Dashboard** (`dashboard_screen.dart`):
```dart
debugPrint('✅ DASHBOARD: Credits loaded from profiles = $_credits');
debugPrint('🔍 DASHBOARD: Subscription = ${subscriptionResponse?['plan']}');
debugPrint('✅ DASHBOARD: Loaded ${missions.length} missions for user $userId');
debugPrint('📊 DASHBOARD: Active=$_activeMissions Completed=$_completedMissions');
debugPrint('💰 DASHBOARD: Monthly revenue = $_monthlyRevenue');
```

**Inspection** (`inspection_departure_screen.dart`):
```dart
debugPrint('✅ INSPECTION: Driver name loaded = $_driverName');
debugPrint('❌ INSPECTION: Error loading driver name: $e');
```

**Visualiser les logs**:
```bash
adb logcat -s flutter
```

---

### 6. ✍️ **Signature Package**
**Problème**: Signature fait crasher l'app
**Status**: 
- ✅ Package `signature: ^5.5.0` ajouté à `pubspec.yaml`
- ✅ Widget `SignaturePadWidget` existe et utilise implementation custom (pas de dépendance externe)
- ⚠️ À tester après installation APK

**Référence Expo**: `mobile/package.json` ligne 66: `"react-native-signature-canvas": "^5.0.1"`

---

## 📦 VERSION

**Nouvelle version**: `2.6.0+6` (incrémenté depuis 2.5.0+5)

**Fichier**: `mobile_flutter/finality_app/pubspec.yaml` ligne 19

---

## 🔧 BUILD & INSTALLATION

### Script PowerShell automatique:
```powershell
.\mobile_flutter\build-apk-fixed.ps1
```

### Étapes manuelles:
```bash
cd c:\Users\mahdi\Documents\Finality-okok\mobile_flutter\finality_app

# 1. Clean
C:\src\flutter\bin\flutter.bat clean

# 2. Install dependencies
C:\src\flutter\bin\flutter.bat pub get

# 3. Generate icons
C:\src\flutter\bin\flutter.bat pub run flutter_launcher_icons:main

# 4. Build APK
C:\src\flutter\bin\flutter.bat build apk --release
```

### Installation sur device:
```bash
# Désinstaller ancienne version (IMPORTANT!)
adb uninstall com.finality.app

# Installer nouvelle version
adb install c:\Users\mahdi\Documents\Finality-okok\mobile_flutter\finality_app\build\app\outputs\flutter-apk\app-release.apk

# Voir les logs
adb logcat -s flutter
```

---

## ✅ CHECKLIST VALIDATION

Après installation, vérifier:

- [ ] **Logo XZ visible** (pas logo Flutter par défaut)
- [ ] **Dashboard charge les crédits** depuis `profiles.credits`
- [ ] **Dashboard affiche revenue correct** (company_commission + bonus_amount)
- [ ] **Nom du convoyeur affiché** dans inspection départ
- [ ] **Signature fonctionne** sans crash
- [ ] **Logs debug visibles** dans `adb logcat -s flutter`

---

## 📊 COMPARAISON EXPO ↔️ FLUTTER

| Feature | Expo Source | Flutter Source | Status |
|---------|-------------|----------------|--------|
| **App Icon** | `mobile/app.json` L9 | `pubspec.yaml` + icon.png | ✅ Fixed |
| **Credits Source** | `useCredits.ts` L38-42 (`profiles.credits`) | `dashboard_screen.dart` L85-91 | ✅ Fixed |
| **Revenue Calcul** | `DashboardScreenNew.tsx` L210 | `dashboard_screen.dart` L149 | ✅ Fixed |
| **Driver Name** | `InspectionDeparture.tsx` L91 | `inspection_departure_screen.dart` L115-148 | ✅ Fixed |
| **Signature** | `react-native-signature-canvas` v5.0.1 | `SignaturePadWidget` custom | ⚠️ To Test |
| **Debug Logs** | `console.log` | `debugPrint` | ✅ Added |

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ **Build APK** avec script PowerShell
2. ⏳ **Test installation** sur device propre
3. ⏳ **Validation features** selon checklist
4. ⏳ **Logs runtime** vérification
5. ⏳ **Signature testing** (si crash, debug séparé)
6. ⏳ **Screens manquantes** inventaire (ScannerPro, Covoiturage, etc.)

---

## 📝 NOTES TECHNIQUES

### Différence clé: user_credits vs profiles.credits
- **Expo mobile** utilise `profiles.credits` directement
- **Web app** peut utiliser `user_credits` table pour historique
- **Flutter mobile** DOIT utiliser `profiles.credits` pour sync avec Expo

### Query patterns Supabase
Les queries Flutter doivent être **EXACTEMENT** identiques aux queries Expo:
- Même tables
- Même colonnes dans `.select()`
- Même filtres `.eq()`
- Même calculs (revenue, stats, etc.)

### Icon generation
`flutter_launcher_icons` génère automatiquement:
- Android: `mipmap-hdpi`, `mipmap-mdpi`, `mipmap-xhdpi`, `mipmap-xxhdpi`, `mipmap-xxxhdpi`
- iOS: `Assets.xcassets/AppIcon.appiconset`
- Adaptive icon avec foreground + background

---

## 🐛 DEBUGGING

Si problèmes persistent après build 2.6.0+6:

### 1. Logo toujours défaut Flutter
```bash
# Vérifier icons générés
ls android/app/src/main/res/mipmap-*/

# Re-générer
flutter pub run flutter_launcher_icons:main

# Clean + rebuild
flutter clean && flutter build apk --release
```

### 2. Dashboard data incorrecte
```bash
# Vérifier logs
adb logcat -s flutter | grep DASHBOARD

# Chercher:
# "✅ DASHBOARD: Credits loaded from profiles = X"
# "✅ DASHBOARD: Loaded X missions for user Y"
```

### 3. Nom convoyeur vide
```bash
# Vérifier logs
adb logcat -s flutter | grep INSPECTION

# Chercher:
# "✅ INSPECTION: Driver name loaded = XXX"
```

### 4. Signature crash
- Vérifier `SignaturePadWidget` import correct
- Tester sur emulator vs real device
- Check `RepaintBoundary` render issues

---

**Date**: 2025-01-20  
**Version**: 2.6.0+6  
**Author**: GitHub Copilot  
**Status**: ✅ Fixes appliqués, ⏳ Build + Test en attente
