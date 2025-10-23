# 🎯 PLAN DE RECONSTRUCTION MOBILE - COPIE EXACTE DU WEB

## 📊 OBJECTIF
Créer une app mobile Expo qui est une **COPIE PARFAITE** de l'app web avec :
- ✅ Même fonctionnalités
- ✅ Même tables Supabase
- ✅ Mode Nuit/Jour
- ✅ Responsive (tablette, Android, iPhone)
- ✅ Design propre et épuré
- ❌ Sans la boutique (web uniquement)

---

## 📱 PAGES À COPIER DU WEB

### 1. Dashboard.tsx ✅
**Fonctionnalités :**
- Statistiques (missions, inspections, chiffre d'affaires)
- Système de crédits
- Notifications push (OneSignal)
- Missions récentes
- Actions rapides

**Tables Supabase :**
```typescript
- missions
- vehicle_inspections
- user_credits
- notifications
```

---

### 2. TeamMissions.tsx (Page Missions) ✅
**Fonctionnalités :**
- Liste des missions (en cours, terminées, urgentes)
- Filtres et recherche
- Création de mission (MissionCreate.tsx)
- Détails mission (MissionView.tsx)
- Assignation d'équipe
- Statuts (pending, in_progress, completed)

**Tables Supabase :**
```typescript
- missions (EXACTEMENT comme web)
  - id, reference, client_id, pickup_address, delivery_address
  - status, priority, vehicle_type, notes
  - assigned_to, created_by, created_at, updated_at
- mission_assignments
- mission_locations (tracking GPS)
```

**Composants à copier :**
- MissionCreate.tsx
- MissionView.tsx
- MissionTracking.tsx

---

### 3. InspectionDeparture.tsx + InspectionArrival.tsx ✅
**Fonctionnalités :**
- **Inspection DÉPART** :
  - Photos : Avant, Arrière, Côté gauche, Côté droit, Compteur, Intérieur
  - État du véhicule (rayures, bosses, etc.)
  - Niveau de carburant
  - Signature client
  
- **Inspection ARRIVÉE** :
  - Mêmes photos que départ
  - Comparaison avec état départ
  - Constatations
  - Signature client

**Tables Supabase :**
```typescript
- vehicle_inspections
  - id, mission_id, inspection_type (departure/arrival)
  - photos (JSON array)
  - fuel_level, mileage, vehicle_condition
  - notes, signature_url
  - created_at, created_by
  
- inspection_photos
  - id, inspection_id, photo_type, photo_url
  - position (front, back, left, right, dashboard, interior)
  - uploaded_at
```

**Upload photos :**
- Supabase Storage bucket : `inspection-photos`
- Chemin : `{mission_id}/{inspection_type}/{photo_type}.jpg`

---

### 4. RapportsInspection.tsx (Rapports PDF) ✅
**Fonctionnalités :**
- Liste des rapports d'inspection
- Génération PDF automatique
- Téléchargement PDF
- Partage par email
- Aperçu rapport

**Tables Supabase :**
```typescript
- inspection_reports
  - id, inspection_id, report_url, generated_at
  
Ou utiliser directement vehicle_inspections avec génération dynamique
```

**Génération PDF :**
```typescript
// Utiliser react-native-pdf ou expo-print
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const generatePDF = async (inspection) => {
  const html = `
    <html>
      <body>
        <h1>Rapport d'Inspection</h1>
        <img src="${inspection.photo_front}" />
        ...
      </body>
    </html>
  `;
  
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri);
};
```

---

### 5. Billing.tsx (Facturation) ✅
**Fonctionnalités :**
- Liste des factures
- Création de facture
- Détails facture
- Export PDF
- Envoi par email
- Statuts (brouillon, envoyée, payée)

**Tables Supabase :**
```typescript
- invoices
  - id, invoice_number, client_id, mission_id
  - amount, tax, total
  - status (draft, sent, paid, overdue)
  - due_date, paid_date
  - items (JSON array)
  - created_at, created_by
```

---

### 6. QuoteGenerator.tsx (Devis) ✅
**Fonctionnalités :**
- Création de devis
- Liste des devis
- Conversion devis → facture
- Export PDF
- Statuts (brouillon, envoyé, accepté, refusé)

**Tables Supabase :**
```typescript
- quotes
  - id, quote_number, client_id
  - items (JSON array), amount, tax, total
  - status (draft, sent, accepted, declined)
  - valid_until, accepted_date
  - created_at, created_by
```

---

### 7. Clients.tsx ✅
**Fonctionnalités :**
- Liste des clients
- Création client
- Détails client
- Historique missions
- Coordonnées complètes

**Tables Supabase :**
```typescript
- clients
  - id, name, email, phone
  - address, city, postal_code, country
  - company_name, siret, vat_number
  - notes
  - created_at, updated_at
```

---

### 8. Covoiturage.tsx ✅
**Fonctionnalités :**
- Recherche de trajets
- Publier un trajet
- Mes trajets
- Réservations
- Messagerie entre conducteurs/passagers

**Tables Supabase :**
```typescript
- carpooling_trips
  - id, driver_id, departure, destination
  - departure_time, seats_available, price_per_seat
  - status (active, completed, cancelled)
  - created_at
  
- carpooling_bookings
  - id, trip_id, passenger_id, seats_booked
  - status (pending, confirmed, cancelled)
  - created_at
  
- carpooling_messages
  - id, trip_id, sender_id, receiver_id
  - message, sent_at
```

---

### 9. Profile.tsx ✅
**Fonctionnalités :**
- Informations personnelles
- Photo de profil
- Paramètres de notification
- Préférences
- Déconnexion

**Tables Supabase :**
```typescript
- users (table auth.users + profils)
- user_settings
  - user_id, notifications_enabled, theme (dark/light)
  - language, timezone
```

---

### 10. MissionTracking.tsx + PublicTracking.tsx ✅
**Fonctionnalités :**
- **Tracking en temps réel** :
  - Mise à jour GPS toutes les 2 secondes
  - Affichage sur carte
  - Historique du trajet
  
- **Partage client** :
  - Génération lien public
  - Client peut suivre en temps réel sans compte
  - Affichage ETA (temps estimé d'arrivée)

**Tables Supabase :**
```typescript
- mission_locations
  - id, mission_id, latitude, longitude
  - speed, heading, accuracy
  - timestamp
  - created_at
  
- public_tracking_links
  - id, mission_id, public_token (UUID)
  - expires_at, is_active
  - created_at
```

**Service GPS :**
```typescript
// src/services/GPSTrackingService.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK = 'background-location-task';

// Enregistrer la localisation toutes les 2s
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  
  const { locations } = data;
  const location = locations[0];
  
  // Sauvegarder dans Supabase
  await supabase.from('mission_locations').insert({
    mission_id: currentMissionId,
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    speed: location.coords.speed,
    heading: location.coords.heading,
    accuracy: location.coords.accuracy,
    timestamp: new Date(location.timestamp).toISOString()
  });
});

// Démarrer le tracking
const startTracking = async (missionId) => {
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 2000, // 2 secondes
    distanceInterval: 0,
    foregroundService: {
      notificationTitle: 'Tracking en cours',
      notificationBody: `Mission ${missionId}`
    }
  });
};

// Générer lien public
const generatePublicLink = async (missionId) => {
  const { data } = await supabase
    .from('public_tracking_links')
    .insert({
      mission_id: missionId,
      public_token: crypto.randomUUID(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    })
    .select()
    .single();
  
  return `https://app.finality.com/tracking/${data.public_token}`;
};
```

---

## 🎨 SYSTÈME DE THÈME (DARK/LIGHT)

### Structure
```typescript
// src/contexts/ThemeContext.tsx
import React, { createContext, useState, useContext } from 'react';
import { useColorScheme } from 'react-native';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  colors: typeof lightColors;
  setTheme: (theme: Theme) => void;
}

const lightColors = {
  background: '#ffffff',
  surface: '#f8fafc',
  primary: '#00AFF5',
  secondary: '#64748b',
  text: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  card: '#ffffff',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

const darkColors = {
  background: '#0f172a',
  surface: '#1e293b',
  primary: '#00AFF5',
  secondary: '#94a3b8',
  text: '#f1f5f9',
  textSecondary: '#cbd5e1',
  border: '#334155',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  card: '#1e293b',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>('auto');
  
  const isDark = theme === 'auto' 
    ? systemColorScheme === 'dark'
    : theme === 'dark';
  
  const colors = isDark ? darkColors : lightColors;
  
  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

### Utilisation
```typescript
import { useTheme } from '../contexts/ThemeContext';

const MyScreen = () => {
  const { colors, isDark } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello</Text>
    </View>
  );
};
```

---

## 📐 NAVIGATION STRUCTURE

```
App
├── AuthStack (si non connecté)
│   ├── Login
│   └── Register
│
└── MainDrawer (si connecté)
    ├── Dashboard
    ├── Missions
    │   ├── MissionList
    │   ├── MissionCreate
    │   ├── MissionView
    │   └── MissionTracking
    ├── Inspections
    │   ├── InspectionList
    │   ├── InspectionDeparture
    │   ├── InspectionArrival
    │   └── InspectionReports
    ├── Facturation
    │   ├── InvoiceList
    │   └── InvoiceCreate
    ├── Devis
    │   ├── QuoteList
    │   └── QuoteCreate
    ├── Clients
    │   ├── ClientList
    │   └── ClientDetails
    ├── Covoiturage
    │   ├── Search
    │   ├── MyTrips
    │   └── Messages
    └── Profile
        ├── Settings
        └── Preferences
```

---

## 📦 PACKAGES NÉCESSAIRES

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "react-native": "0.74.0",
    
    // Navigation
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/drawer": "^6.6.6",
    "@react-navigation/native-stack": "^6.9.17",
    "@react-navigation/bottom-tabs": "^6.5.11",
    
    // UI
    "react-native-safe-area-context": "4.10.5",
    "react-native-screens": "3.31.1",
    "react-native-gesture-handler": "~2.16.1",
    "react-native-reanimated": "~3.10.1",
    
    // Supabase
    "@supabase/supabase-js": "^2.39.0",
    
    // Localisation GPS
    "expo-location": "~17.0.1",
    "expo-task-manager": "~11.8.2",
    "react-native-maps": "1.14.0",
    
    // Caméra & Photos
    "expo-camera": "~15.0.5",
    "expo-image-picker": "~15.0.5",
    "expo-media-library": "~16.0.3",
    
    // PDF
    "expo-print": "~13.0.1",
    "expo-sharing": "~12.0.1",
    
    // Notifications
    "expo-notifications": "~0.28.1",
    "onesignal-expo-plugin": "^2.0.0",
    
    // Autres
    "expo-secure-store": "~13.0.1",
    "expo-constants": "~16.0.1",
    "@react-native-async-storage/async-storage": "1.23.1",
    "date-fns": "^3.0.0",
    "axios": "^1.6.0"
  }
}
```

---

## 🗂️ STRUCTURE DES DOSSIERS

```
mobile/
├── src/
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardScreen.tsx
│   │   ├── missions/
│   │   │   ├── MissionListScreen.tsx
│   │   │   ├── MissionCreateScreen.tsx
│   │   │   ├── MissionViewScreen.tsx
│   │   │   └── MissionTrackingScreen.tsx
│   │   ├── inspections/
│   │   │   ├── InspectionListScreen.tsx
│   │   │   ├── InspectionDepartureScreen.tsx
│   │   │   ├── InspectionArrivalScreen.tsx
│   │   │   └── InspectionReportsScreen.tsx
│   │   ├── billing/
│   │   │   ├── InvoiceListScreen.tsx
│   │   │   └── InvoiceCreateScreen.tsx
│   │   ├── quotes/
│   │   │   ├── QuoteListScreen.tsx
│   │   │   └── QuoteCreateScreen.tsx
│   │   ├── clients/
│   │   │   ├── ClientListScreen.tsx
│   │   │   └── ClientDetailsScreen.tsx
│   │   ├── covoiturage/
│   │   │   ├── CovoiturageSearchScreen.tsx
│   │   │   ├── CovoiturageMyTripsScreen.tsx
│   │   │   └── CovoiturageMessagesScreen.tsx
│   │   └── profile/
│   │       └── ProfileScreen.tsx
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── missions/
│   │   │   └── MissionCard.tsx
│   │   ├── inspections/
│   │   │   └── PhotoCapture.tsx
│   │   └── navigation/
│   │       └── DrawerContent.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── services/
│   │   ├── supabase.ts
│   │   ├── GPSTrackingService.ts
│   │   ├── NotificationService.ts
│   │   └── PDFService.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTheme.ts
│   │   ├── useMissions.ts
│   │   └── useInspections.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   └── validators.ts
│   └── types/
│       └── navigation.ts
├── App.tsx
├── app.json
└── package.json
```

---

## 🚀 ORDRE D'IMPLÉMENTATION

### ✅ Phase 1 : Base (2h)
1. Nettoyer le projet actuel
2. Installer les packages
3. Créer ThemeContext (dark/light)
4. Créer la structure de navigation
5. Créer AuthContext

### ✅ Phase 2 : Dashboard (1h)
6. Copier Dashboard.tsx
7. Intégrer statistiques
8. Intégrer crédits
9. Intégrer notifications push

### ✅ Phase 3 : Missions (3h)
10. Copier TeamMissions.tsx (liste)
11. Copier MissionCreate.tsx
12. Copier MissionView.tsx
13. Implémenter tracking GPS toutes les 2s
14. Implémenter partage lien public

### ✅ Phase 4 : Inspections (3h)
15. Copier InspectionDeparture.tsx
16. Copier InspectionArrival.tsx
17. Intégrer caméra + upload photos
18. Copier RapportsInspection.tsx
19. Intégrer génération PDF

### ✅ Phase 5 : Facturation & Devis (2h)
20. Copier Billing.tsx
21. Copier QuoteGenerator.tsx
22. Intégrer génération PDF factures/devis

### ✅ Phase 6 : Clients & Covoiturage (2h)
23. Copier Clients.tsx
24. Copier Covoiturage.tsx

### ✅ Phase 7 : Profile & Finalisation (1h)
25. Copier Profile.tsx
26. Tests responsive
27. Polish final

**TOTAL : ~14 heures**

---

## 📝 NOTES IMPORTANTES

### Cohérence avec le Web
- ✅ Utiliser **EXACTEMENT** les mêmes noms de tables
- ✅ Utiliser les mêmes types TypeScript
- ✅ Utiliser les mêmes services Supabase
- ✅ Respecter les mêmes RLS policies

### Responsive
- ✅ Utiliser `Dimensions.get('window')` pour détecter la taille
- ✅ Adapter la navigation (Drawer pour tablette, Tabs pour mobile)
- ✅ Tester sur iPhone, Android, tablette

### Performance
- ✅ Images optimisées (expo-image)
- ✅ Lazy loading des screens
- ✅ Pagination des listes
- ✅ Cache des données

### Sécurité
- ✅ Tokens stockés dans SecureStore
- ✅ RLS policies Supabase
- ✅ Validation des inputs
- ✅ Liens publics avec expiration

---

## 🎯 RÉSULTAT FINAL

Une app mobile Expo qui est une **COPIE EXACTE** du web avec :
- ✅ Toutes les fonctionnalités (sauf boutique)
- ✅ Même design (dark/light)
- ✅ Même données (Supabase)
- ✅ Responsive et performante
- ✅ Propre et épurée

**Prêt à commencer ? 🚀**
