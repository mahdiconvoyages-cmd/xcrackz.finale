# 🔄 Synchronisation Mobile-Web & Autocomplétion

## 📋 Vue d'ensemble

Ce document détaille les nouvelles fonctionnalités de synchronisation en temps réel entre le mobile et le web, ainsi que l'autocomplétion d'adresses intégrée.

---

## 🌐 Synchronisation Temps Réel

### Service de Synchronisation (`sync_service.dart`)

Le `SyncService` permet une synchronisation bidirectionnelle en temps réel entre l'app mobile Flutter et l'application web via Supabase Realtime.

#### Fonctionnalités

✅ **Synchronisation des Missions**
```dart
final syncService = SyncProvider.of(context);
syncService!.syncMissions().listen((missions) {
  // Mise à jour automatique des missions
  setState(() => _missions = missions);
});
```

✅ **Synchronisation du Covoiturage**
```dart
syncService!.syncCarpooling().listen((trips) {
  // Mise à jour automatique des trajets
  setState(() => _trips = trips);
});
```

✅ **Synchronisation des Inspections**
```dart
syncService!.syncInspections().listen((inspections) {
  // Mise à jour automatique des inspections
});
```

✅ **Synchronisation des Factures**
```dart
syncService!.syncInvoices().listen((invoices) {
  // Mise à jour automatique des factures
});
```

✅ **Synchronisation des Devis**
```dart
syncService!.syncQuotes().listen((quotes) {
  // Mise à jour automatique des devis
});
```

✅ **Synchronisation du Profil Utilisateur**
```dart
final userId = Supabase.instance.client.auth.currentUser!.id;
syncService!.syncUserProfile(userId).listen((profile) {
  // Mise à jour automatique du profil
});
```

#### Avantages

- 🔄 **Temps Réel**: Les modifications sur le web apparaissent instantanément sur mobile
- 🔒 **Sécurisé**: Utilise Supabase Row Level Security
- 📱 **Automatique**: Pas besoin de rafraîchir manuellement
- 🎯 **Efficace**: Utilise les WebSockets pour minimiser la bande passante
- 💾 **Cache intégré**: Les données sont chargées une seule fois puis mises à jour

#### Utilisation dans un Widget

```dart
class MyScreen extends StatefulWidget {
  @override
  State<MyScreen> createState() => _MyScreenState();
}

class _MyScreenState extends State<MyScreen> {
  late StreamSubscription _subscription;
  List<Map<String, dynamic>> _missions = [];

  @override
  void initState() {
    super.initState();
    final syncService = SyncProvider.of(context);
    
    _subscription = syncService!.syncMissions().listen((missions) {
      setState(() => _missions = missions);
    });
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: _missions.length,
      itemBuilder: (context, index) {
        final mission = _missions[index];
        return ListTile(title: Text(mission['title']));
      },
    );
  }
}
```

---

## 📍 Autocomplétion d'Adresses

### Service d'Autocomplétion (`address_autocomplete_service.dart`)

Utilise l'**API Adresse du Gouvernement Français** (gratuite, sans clé API requise).

#### Fonctionnalités

✅ **Recherche d'Adresses Complètes**
```dart
final addresses = await AddressAutocompleteService.searchAddresses('10 Rue de Rivoli, Paris');
// Retourne des suggestions détaillées avec coordonnées GPS
```

✅ **Recherche de Villes Uniquement**
```dart
final cities = await AddressAutocompleteService.searchCities('Lyon');
// Retourne uniquement les villes
```

✅ **Géocodage Inverse** (Coordonnées → Adresse)
```dart
final address = await AddressAutocompleteService.reverseGeocode(48.8566, 2.3522);
// Retourne l'adresse pour les coordonnées GPS données
```

#### Widget Prêt à l'Emploi

Le widget `AddressAutocompleteField` offre une expérience utilisateur complète:

```dart
AddressAutocompleteField(
  label: 'Départ',
  hintText: 'Ex: Paris, Gare de Lyon',
  prefixIcon: Icons.trip_origin,
  citiesOnly: false, // true pour villes uniquement
  onSelected: (address) {
    print('Adresse sélectionnée: ${address.label}');
    print('Latitude: ${address.latitude}');
    print('Longitude: ${address.longitude}');
  },
)
```

#### Caractéristiques du Widget

- ⚡ **Debouncing**: Attend 500ms après la dernière frappe
- 🔍 **Recherche Progressive**: Affiche les suggestions en temps réel
- 🎨 **Interface Native**: S'intègre parfaitement au Material Design
- 📍 **Coordonnées GPS**: Chaque suggestion inclut lat/lng
- 🚀 **Performance**: Cache les résultats, minimum 3 caractères
- 🧹 **Bouton Clear**: Efface facilement la recherche
- ⏳ **Indicateur de Chargement**: Feedback visuel pendant la recherche

---

## 🚗 Exemple Complet: Écran de Création de Trajet

L'écran `CreateTripScreen` démontre l'utilisation complète de l'autocomplétion:

### Fonctionnalités Implémentées

1. **Autocomplétion Départ/Destination**
   - Suggestions en temps réel d'adresses françaises
   - Coordonnées GPS automatiques
   - Validation avant soumission

2. **Sélection Date/Heure**
   - DatePicker localisé en français
   - TimePicker pour l'heure précise
   - Contraintes: dates futures uniquement

3. **Formulaire Complet**
   - Nombre de places (1-8)
   - Prix par passager
   - Notes optionnelles
   - Validation de tous les champs

4. **Synchronisation Automatique**
   - Création dans Supabase
   - Synchronisation instantanée avec le web
   - Mise à jour des listes de trajets

### Utilisation

```dart
Navigator.push(
  context,
  MaterialPageRoute(builder: (context) => const CreateTripScreen()),
);
```

### Données Créées

```json
{
  "driver_id": "user-uuid",
  "departure": "10 Rue de Rivoli, 75001 Paris",
  "departure_city": "Paris",
  "departure_lat": 48.8566,
  "departure_lng": 2.3522,
  "destination": "Place Bellecour, 69002 Lyon",
  "arrival_city": "Lyon",
  "destination_lat": 45.7578,
  "destination_lng": 4.8320,
  "departure_date": "2025-11-20T14:30:00.000Z",
  "available_seats": 4,
  "price_per_seat": 25.0,
  "status": "active"
}
```

---

## 🔧 Configuration Requise

### Packages Ajoutés

```yaml
dependencies:
  http: ^1.6.0  # Pour les appels API d'autocomplétion
  provider: ^6.1.1  # Pour le state management
  supabase_flutter: ^2.0.0  # Pour la synchronisation
```

### Imports Nécessaires

```dart
// Pour l'autocomplétion
import 'package:finality_app/services/address_autocomplete_service.dart';

// Pour la synchronisation
import 'package:finality_app/services/sync_service.dart';
```

---

## 📊 Modèle de Données Covoiturage Mis à Jour

Le modèle `Covoiturage` a été étendu pour la compatibilité web:

```dart
class Covoiturage {
  // Propriétés existantes
  final String id;
  final String driverId;
  final String departure;
  final String destination;
  final DateTime departureDate;
  final int availableSeats;
  final double pricePerSeat;
  
  // Nouvelles propriétés pour la synchronisation
  final String? departureCity;      // Nom de la ville de départ
  final String? arrivalCity;        // Nom de la ville d'arrivée
  final double? price;              // Prix total (alias)
  final List<Map<String, dynamic>>? participants;  // Liste des passagers
  final String? description;        // Description détaillée
}
```

---

## 🎯 Intégration dans l'App

### 1. Main.dart - Provider Global

```dart
MultiProvider(
  providers: [
    Provider(create: (_) => SyncService()),
  ],
  child: SyncProvider(
    syncService: SyncService(),
    child: MaterialApp(...),
  ),
)
```

### 2. Écrans Existants - Ajout de la Sync

Exemple pour `MissionsScreen`:

```dart
@override
void initState() {
  super.initState();
  final syncService = SyncProvider.of(context);
  
  _syncSubscription = syncService!.syncMissions().listen((missions) {
    setState(() {
      _missions = missions.map((m) => Mission.fromJson(m)).toList();
      _isLoading = false;
    });
  });
}
```

### 3. Formulaires - Ajout de l'Autocomplétion

Remplacez les `TextField` d'adresses par:

```dart
AddressAutocompleteField(
  label: 'Adresse',
  onSelected: (address) {
    // Utiliser address.latitude et address.longitude
  },
)
```

---

## 🔐 Sécurité & Performance

### Row Level Security (RLS)

Assurez-vous que vos tables Supabase ont des politiques RLS:

```sql
-- Exemple pour la table covoiturage
CREATE POLICY "Users can view all active trips"
  ON covoiturage FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users can create their own trips"
  ON covoiturage FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Users can update their own trips"
  ON covoiturage FOR UPDATE
  USING (auth.uid() = driver_id);
```

### Optimisation

- ✅ Debouncing sur l'autocomplétion (500ms)
- ✅ Limite de 10 suggestions max
- ✅ Minimum 3 caractères pour rechercher
- ✅ Cache des streams de synchronisation
- ✅ Cleanup automatique des canaux WebSocket

---

## 🧪 Tests

### Tester l'Autocomplétion

```dart
test('Address autocomplete returns suggestions', () async {
  final suggestions = await AddressAutocompleteService.searchAddresses('Paris');
  expect(suggestions.isNotEmpty, true);
  expect(suggestions.first.city, 'Paris');
});
```

### Tester la Synchronisation

1. Ouvrez l'app mobile
2. Ouvrez l'app web dans un navigateur
3. Créez une mission sur le web
4. Vérifiez qu'elle apparaît instantanément sur mobile

---

## 📱 Compatibilité

- ✅ Android 5.0+ (API 21+)
- ✅ iOS 12.0+
- ✅ Web (Chrome, Firefox, Safari, Edge)
- ✅ Connexion internet requise pour la sync
- ✅ Fonctionne en mode hors ligne (données en cache)

---

## 🐛 Dépannage

### L'autocomplétion ne fonctionne pas

1. Vérifiez la connexion internet
2. Vérifiez que le package `http` est installé: `flutter pub get`
3. Vérifiez les logs: `flutter logs`

### La synchronisation ne fonctionne pas

1. Vérifiez les credentials Supabase dans `main.dart`
2. Vérifiez que Realtime est activé dans Supabase
3. Vérifiez les politiques RLS dans Supabase
4. Consultez la console Supabase pour les erreurs

### Problèmes de performance

1. Augmentez le debounce delay: `Duration(milliseconds: 1000)`
2. Réduisez la limite de suggestions: `limit=5`
3. Utilisez `citiesOnly: true` pour moins de résultats

---

## 🚀 Prochaines Étapes

### Améliorations Possibles

- [ ] Ajouter le cache local SQLite pour le mode hors ligne
- [ ] Implémenter la géolocalisation automatique
- [ ] Ajouter des favoris d'adresses
- [ ] Historique de recherche
- [ ] Suggestions basées sur l'historique
- [ ] Synchronisation différentielle (delta updates)
- [ ] Compression des données synchronisées
- [ ] Indicateurs de statut de synchronisation
- [ ] Retry automatique en cas d'erreur
- [ ] Mode hors ligne avec queue de synchronisation

---

## 📚 Ressources

- [API Adresse Data.gouv.fr](https://adresse.data.gouv.fr/api-doc/adresse)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Flutter Provider](https://pub.dev/packages/provider)
- [HTTP Package](https://pub.dev/packages/http)

---

## ✅ Résumé

L'application mobile Finality dispose maintenant de:

1. **Synchronisation en temps réel** avec le web via Supabase Realtime
2. **Autocomplétion d'adresses** françaises gratuite et performante
3. **Widget réutilisable** pour l'autocomplétion
4. **Service de synchronisation** global accessible partout
5. **Modèle de données** enrichi et compatible web
6. **Écran exemple** complet (création de trajet)

Toutes ces fonctionnalités sont prêtes à l'emploi et peuvent être intégrées dans n'importe quel écran de l'application! 🎉
