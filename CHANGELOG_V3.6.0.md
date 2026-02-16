# Xcrackz v3.6.0 - Corrections importantes

## 🔄 Flux de statuts des missions corrigé

### Problème identifié
Toutes les missions démarraient avec le statut `in_progress` au lieu de `pending`, rendant impossible de différencier les missions en attente des missions actives.

### Solution implémentée
1. **Création de mission** : `status = 'pending'` (déjà correct dans `mission_create_screen_new.dart`)
2. **Inspection de départ** : Change `pending` → `in_progress` UNIQUEMENT après validation
3. **Inspection d'arrivée** : Change `in_progress` → `completed` UNIQUEMENT après validation

### Fichiers modifiés
- `lib/screens/inspections/inspection_departure_screen.dart` (ligne 393)
- `lib/screens/inspections/inspection_arrival_screen.dart` (ligne 615)
- Commentaires ajoutés pour clarifier la logique

---

## 🔒 Masquage des URLs sensibles

### Problème identifié
Les messages d'erreur affichaient directement `$e`, exposant :
- URLs Supabase complètes
- Tokens d'authentification
- Détails techniques sensibles

### Solution implémentée
Créé `ErrorHelper.cleanError()` qui :
- Détecte les erreurs JWT/token → "Erreur d'authentification"
- Détecte les URLs Supabase → "Erreur de connexion au serveur"
- Détecte les erreurs storage → "Erreur lors de l'upload du fichier"
- Détecte les erreurs réseau → "Erreur réseau. Vérifiez votre connexion"
- Détecte les erreurs de permission → "Permissions insuffisantes"
- Message générique pour les autres cas

### Fichiers modifiés (10 fichiers, 27+ occurrences)
- `lib/utils/error_helper.dart` (nouveau)
- `lib/screens/missions/missions_screen.dart`
- `lib/screens/missions/mission_detail_screen.dart`
- `lib/screens/missions/mission_map_screen.dart`
- `lib/screens/invoices/invoice_form_screen.dart`
- `lib/screens/invoices/invoice_detail_screen.dart`
- `lib/screens/quotes/quote_form_screen.dart`
- `lib/screens/quotes/quote_detail_screen.dart`
- `lib/screens/inspections/inspections_screen.dart`
- `lib/screens/inspections/inspection_departure_screen.dart`
- `lib/screens/document_scanner/document_scanner_pro_screen.dart`
- `lib/widgets/signature_pad_widget.dart`

### Script automatisé
Créé `hide-db-urls.ps1` pour automatiser les remplacements futurs

---

## 📡 Mode hors ligne (baseline)

### Fonctionnalités ajoutées
1. **Détection de connectivité** : Service `ConnectivityService` avec Provider
2. **Indicateur visuel** : Bannière rouge en haut de l'écran quand offline
3. **Bouton réessayer** : Permet de revérifier la connexion manuellement
4. **Architecture extensible** : Prêt pour caching sqflite dans versions futures

### Nouveaux packages
- `connectivity_plus: ^6.1.5` - Détection réseau WiFi/Mobile/None
- `sqflite: ^2.4.2` - Base de données locale (préparation future)

### Fichiers créés
- `lib/services/connectivity_service.dart` - Service de connectivité avec ChangeNotifier
- `lib/widgets/offline_indicator.dart` - Widget bannière rouge + mini indicateur

### Fichiers modifiés
- `lib/main.dart` - Ajout ConnectivityService au MultiProvider
- `lib/screens/home_screen.dart` - Intégration OfflineIndicator
- `pubspec.yaml` - Ajout des packages

### Comportement
- **En ligne** : Bannière cachée, fonctionnement normal
- **Hors ligne** : 
  - Bannière rouge "Mode hors ligne - Certaines fonctionnalités sont limitées"
  - Icône WiFi barrée
  - Bouton "Réessayer" pour vérifier connexion
  - Détection automatique quand connexion revient

### TODO futures pour mode offline complet
- Cache local des missions avec sqflite
- Synchronisation automatique au retour en ligne
- File d'attente d'upload de photos
- Gestion des conflits de données
- Indicateurs par écran (missions, documents, etc.)

---

## 📦 Version & Build

**Version** : 3.6.0 (build 37)
**Taille APK** : ~54 MB (estimation)
**Build** : En cours...

---

## ✅ Tests recommandés

1. **Flux de statuts** :
   - Créer mission → Vérifier status='pending'
   - Faire inspection départ → Vérifier status='in_progress'
   - Faire inspection arrivée → Vérifier status='completed'

2. **Masquage URLs** :
   - Provoquer erreurs réseau
   - Vérifier que les messages ne montrent pas d'URLs
   - Tester erreurs d'authentification

3. **Mode offline** :
   - Activer mode avion
   - Vérifier apparition bannière rouge
   - Cliquer "Réessayer"
   - Désactiver mode avion
   - Vérifier disparition automatique de la bannière

---

## 🔧 Commandes de build

```powershell
# Installer dépendances
C:\src\flutter\bin\flutter.bat pub get

# Build APK
C:\src\flutter\bin\flutter.bat build apk --release

# Emplacement APK
# build/app/outputs/flutter-apk/app-release.apk
```

---

## 📝 Notes techniques

- **ErrorHelper** : Utilise pattern matching sur les strings d'erreur
- **ConnectivityService** : Écoute les changements avec `onConnectivityChanged`
- **OfflineIndicator** : Consumer<ConnectivityService> pour updates automatiques
- **Statuts missions** : Logique centralisée dans écrans d'inspection
- **Pas de breaking changes** : Rétrocompatible avec données existantes
