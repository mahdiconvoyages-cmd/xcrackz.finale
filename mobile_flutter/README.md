# Project Structure - Finality Flutter App

## Application Flutter pour Finality - Convoyages

### Installation et Setup

1. **Flutter installé** : Flutter 3.27.1 (Stable)
2. **Packages installés** : 
   - supabase_flutter
   - Material 3 UI

### Structure du Projet

```
lib/
├── main.dart                      # Point d'entrée de l'app
├── screens/
│   ├── splash_screen.dart         # Écran de chargement
│   ├── login_screen.dart          # Connexion avec Supabase Auth
│   ├── home_screen.dart           # Navigation principale
│   ├── missions/
│   │   └── missions_screen.dart   # Liste des convoyages
│   ├── inspections/
│   │   └── inspections_screen.dart
│   ├── covoiturage/
│   │   └── covoiturage_screen.dart
│   └── profile/
│       └── profile_screen.dart    # Profil utilisateur
```

### Fonctionnalités Implémentées

✅ **Authentification Supabase**
- Login avec email/password
- Session management
- Déconnexion

✅ **Navigation**
- Bottom navigation bar avec 4 onglets
- Splash screen avec redirection automatique

✅ **Missions (Convoyages)**
- Liste des missions depuis Supabase
- Filtres par statut (pending, in_progress, completed)
- Pull to refresh
- Cards Material 3

✅ **Design**
- Material Design 3
- Dark mode support
- Thème personnalisé (Bleu primary)

### Prochaines Étapes

1. **Configuration Supabase** :
   - Modifier `main.dart` avec vos credentials Supabase
   - Ou utiliser le fichier `.env`

2. **Tables Supabase requises** :
   - `missions` (id, pickup_address, delivery_address, status, vehicle_type, pickup_date, created_at)
   - `inspections` (à définir)
   - `covoiturage` (à définir)
   - `users` (géré par Supabase Auth)

3. **Développement à continuer** :
   - Module Inspections complet
   - Module Covoiturage
   - Détails des missions
   - Création de nouvelles missions
   - Notifications push
   - Géolocalisation

### Commandes

```bash
# Lancer l'app
cd mobile_flutter/finality_app
flutter run

# Build APK
flutter build apk --release

# Build iOS
flutter build ios --release
```

### Notes

- L'app utilise Supabase pour le backend
- Authentification sécurisée
- Architecture propre et modulaire
- Prête pour Android et iOS
