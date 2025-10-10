# FleetCheck - Documentation de Synchronisation Web/Mobile

## Vue d'ensemble

FleetCheck est maintenant une application **full-stack synchronisée** avec:
- **Frontend Web** (React + Vite + TypeScript)
- **Application Mobile** (React Native + Expo)
- **Backend partagé** (Supabase)
- **Code partagé** (Types, utils, constants)

---

## Architecture du Projet

```
fleetcheck/
├── web/                          # Application web (React)
│   ├── src/
│   │   ├── pages/               # Pages web
│   │   ├── components/          # Composants web
│   │   ├── lib/
│   │   │   └── supabase.ts     # Client Supabase web
│   │   └── ...
│   ├── .env                     # Variables web
│   └── package.json
│
├── mobile/                       # Application mobile (Expo)
│   ├── src/
│   │   ├── screens/            # Écrans mobile
│   │   ├── components/         # Composants mobile
│   │   ├── lib/
│   │   │   └── supabase.ts    # Client Supabase mobile
│   │   └── ...
│   ├── .env                    # Variables mobile
│   ├── app.json                # Config Expo
│   └── package.json
│
├── shared/                      # Code partagé (NEW!)
│   ├── types/
│   │   ├── database.ts         # Types Supabase
│   │   └── index.ts
│   ├── utils/
│   │   ├── formatters.ts       # Formatage de données
│   │   ├── validators.ts       # Validations
│   │   └── index.ts
│   └── constants/
│       ├── app.ts              # Constantes app
│       └── index.ts
│
└── supabase/                    # Configuration Supabase
    └── migrations/              # Migrations DB
```

---

## Configuration Supabase Unifiée

### Base de données unique

Les deux applications (web et mobile) utilisent **la même instance Supabase**:

```
URL: https://erdxgujquowvkhmudaai.supabase.co
```

### Configuration Web (.env)

```env
VITE_SUPABASE_URL=https://erdxgujquowvkhmudaai.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieGNyYWNreiIsImEiOiJjbWR3dzV3cDM...
VITE_ONESIGNAL_APP_ID=b284fe02-642c-40e5-a05f-c50e07edc86d
VITE_GOOGLE_CLIENT_ID=695959395673-d24r9sj6sj9805h072kndsho8ij0dkgo.apps.googleusercontent.com
```

### Configuration Mobile (mobile/.env)

```env
EXPO_PUBLIC_SUPABASE_URL=https://erdxgujquowvkhmudaai.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieGNyYWNreiIsImEiOiJjbWR3dzV3cDM...
EXPO_PUBLIC_ONESIGNAL_APP_ID=b284fe02-642c-40e5-a05f-c50e07edc86d
EXPO_PUBLIC_GOOGLE_CLIENT_ID=695959395673-d24r9sj6sj9805h072kndsho8ij0dkgo.apps.googleusercontent.com
```

### Configuration Mobile (mobile/app.json)

```json
{
  "expo": {
    "extra": {
      "SUPABASE_URL": "https://erdxgujquowvkhmudaai.supabase.co",
      "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "MAPBOX_TOKEN": "pk.eyJ1IjoieGNyYWNreiIsImEiOiJjbWR3dzV3cDM...",
      "ONESIGNAL_APP_ID": "b284fe02-642c-40e5-a05f-c50e07edc86d"
    }
  }
}
```

---

## Code Partagé

### Types TypeScript (`shared/types/`)

Tous les types de base de données sont définis dans `shared/types/database.ts`:

```typescript
import { Profile, Mission, Vehicle, Invoice } from '../shared/types';

// Utilisable dans web et mobile
```

**Types disponibles:**
- `Profile` - Profils utilisateurs
- `Mission` - Missions/tâches
- `Vehicle` - Véhicules
- `Invoice` - Factures
- `Contact` - Contacts
- `Inspection` - Inspections
- `ShopItem` - Articles boutique
- `Order` - Commandes
- `CreditTransaction` - Transactions de crédits
- `Carpooling` - Covoiturages

### Utilitaires (`shared/utils/`)

#### Formatters (`formatters.ts`)

```typescript
import { formatCurrency, formatDate, formatDistance } from '../shared/utils';

formatCurrency(1500);              // "1 500,00 €"
formatDate(new Date());            // "08/10/2025"
formatDistance(2500);              // "2,5 km"
```

**Fonctions disponibles:**
- `formatCurrency(amount, currency)` - Formatage devise
- `formatDate(date, format)` - Formatage date
- `formatDateTime(date)` - Formatage date + heure
- `formatTime(date)` - Formatage heure
- `formatDistance(meters)` - Formatage distance
- `formatDuration(seconds)` - Formatage durée
- `formatPhoneNumber(phone)` - Formatage téléphone
- `formatFileSize(bytes)` - Formatage taille fichier
- `truncateText(text, max)` - Tronquer texte
- `capitalizeFirst(text)` - Première lettre majuscule
- `formatLicensePlate(plate)` - Formatage plaque
- `getInitials(firstName, lastName)` - Initiales

#### Validators (`validators.ts`)

```typescript
import { validateEmail, validatePhone, validatePassword } from '../shared/utils';

validateEmail('[email protected]');           // true
validatePhone('0612345678');                  // true
validatePassword('MyPass123').isValid;        // true
```

**Fonctions disponibles:**
- `validateEmail(email)` - Validation email
- `validatePhone(phone)` - Validation téléphone
- `validatePassword(password)` - Validation mot de passe (retourne isValid + errors)
- `validateLicensePlate(plate)` - Validation plaque française
- `validateVIN(vin)` - Validation VIN
- `validatePostalCode(code)` - Validation code postal
- `validateIBAN(iban)` - Validation IBAN
- `validateRequired(value)` - Champ requis
- `validateNumber(value, min, max)` - Validation nombre
- `validateUrl(url)` - Validation URL
- `validateDate(date)` - Validation date
- `validateFutureDate(date)` - Validation date future
- `validatePastDate(date)` - Validation date passée

### Constantes (`shared/constants/`)

```typescript
import { MISSION_STATUSES, COLORS, STORAGE_KEYS } from '../shared/constants';

const status = MISSION_STATUSES.IN_PROGRESS;  // 'in_progress'
const primary = COLORS.primary;                // '#2563EB'
const key = STORAGE_KEYS.AUTH_TOKEN;          // '@fleetcheck:auth_token'
```

**Constantes disponibles:**
- `APP_NAME`, `APP_VERSION`
- `MISSION_STATUSES`, `MISSION_PRIORITIES`
- `INVOICE_STATUSES`
- `INSPECTION_TYPES`, `INSPECTION_STATUSES`
- `VEHICLE_STATUSES`
- `USER_ROLES`
- `CREDIT_TRANSACTION_TYPES`
- `CARPOOLING_STATUSES`
- `ORDER_STATUSES`
- `COLORS` (palette de couleurs)
- `STORAGE_KEYS` (clés AsyncStorage/localStorage)

---

## Utilisation du Code Partagé

### Dans le Web

```typescript
// src/pages/Missions.tsx
import { Mission, MISSION_STATUSES, formatDate } from '../../shared';

const mission: Mission = {
  id: '123',
  status: MISSION_STATUSES.IN_PROGRESS,
  created_at: new Date().toISOString(),
  // ...
};

console.log(formatDate(mission.created_at)); // "08/10/2025"
```

### Dans le Mobile

```typescript
// mobile/src/screens/MissionsScreen.tsx
import { Mission, MISSION_STATUSES, formatDate } from '../../shared';

const mission: Mission = {
  id: '123',
  status: MISSION_STATUSES.IN_PROGRESS,
  created_at: new Date().toISOString(),
  // ...
};

console.log(formatDate(mission.created_at)); // "08/10/2025"
```

---

## Synchronisation des Données

### Authentification

Les deux applications partagent:
- **Même base utilisateurs** (table `profiles`)
- **Sessions Supabase synchronisées**
- **RLS (Row Level Security)** identique

**Flow:**
1. Utilisateur se connecte sur web → session créée
2. Utilisateur se connecte sur mobile avec même email → même session
3. Les données sont automatiquement filtrées par `user_id`

### Missions, Factures, Contacts, etc.

Toutes les données sont **automatiquement synchronisées** via Supabase:

```typescript
// Web: Créer une mission
await supabase.from('missions').insert({
  title: 'Livraison urgent',
  status: 'planned'
});

// Mobile: Récupérer les missions (automatiquement synchro!)
const { data } = await supabase.from('missions').select('*');
```

### Temps réel (Realtime)

Pour écouter les changements en temps réel:

```typescript
// Web ou Mobile
const channel = supabase
  .channel('missions')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'missions' },
    (payload) => {
      console.log('Changement:', payload);
    }
  )
  .subscribe();
```

---

## Démarrage des Applications

### Web

```bash
cd /path/to/project
npm install
npm run dev
```

### Mobile

```bash
cd /path/to/project/mobile
npm install
npm start

# Puis scanner le QR code avec Expo Go
# ou utiliser:
npm run android  # Pour Android
npm run ios      # Pour iOS
```

---

## Schéma de la Base de Données

La base Supabase contient les tables suivantes:

- **profiles** - Profils utilisateurs
- **missions** - Missions/tâches
- **vehicles** - Véhicules
- **invoices** - Factures
- **contacts** - Contacts
- **inspections** - Inspections véhicules
- **inspection_photos** - Photos d'inspections
- **shop_items** - Articles de la boutique
- **orders** - Commandes
- **order_items** - Détails des commandes
- **credit_transactions** - Transactions de crédits
- **carpooling** - Trajets covoiturage
- **carpooling_bookings** - Réservations covoiturage

Toutes les tables ont **RLS activé** et des policies basées sur `user_id`.

---

## Bonnes Pratiques

### 1. Toujours utiliser les types partagés

```typescript
// ❌ Mauvais
interface Mission {
  title: string;
  // ...
}

// ✅ Bon
import { Mission } from '../shared/types';
```

### 2. Utiliser les constantes partagées

```typescript
// ❌ Mauvais
const status = 'in_progress';

// ✅ Bon
import { MISSION_STATUSES } from '../shared/constants';
const status = MISSION_STATUSES.IN_PROGRESS;
```

### 3. Utiliser les validators avant d'envoyer des données

```typescript
import { validateEmail } from '../shared/utils';

if (!validateEmail(email)) {
  alert('Email invalide');
  return;
}

await supabase.auth.signInWithPassword({ email, password });
```

### 4. Formater les données d'affichage

```typescript
import { formatCurrency, formatDate } from '../shared/utils';

<Text>{formatCurrency(invoice.total)}</Text>
<Text>{formatDate(invoice.created_at)}</Text>
```

---

## Migration depuis l'ancienne base

Si vous aviez des données dans l'ancienne base mobile (`vdygbqinodzvkdwegvpq.supabase.co`), vous devez:

1. **Exporter les données** depuis l'ancienne base
2. **Importer** dans la nouvelle base (`erdxgujquowvkhmudaai.supabase.co`)

Ou simplement **repartir à zéro** avec la nouvelle base unifiée.

---

## Support

Pour toute question sur la synchronisation:

1. Vérifier que les `.env` sont identiques
2. Vérifier que `app.json` contient les bonnes variables
3. Vérifier les imports depuis `shared/`
4. Consulter cette documentation

---

**FleetCheck - Synchronisé avec succès!** ✅
