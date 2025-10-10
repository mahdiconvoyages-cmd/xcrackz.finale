# FleetCheck - Plateforme SaaS de Gestion de Convoyage Automobile

FleetCheck est une plateforme complète de gestion de convoyage automobile développée en PHP avec Laravel et Supabase.

## 🚀 Fonctionnalités

### Core Features
- ✅ **Dashboard Analytics** - KPIs, graphiques et statistiques en temps réel
- ✅ **Gestion des Missions** - CRUD complet avec vues Liste, Kanban et Carte
- ✅ **Inspection Véhicules** - Documentation départ/arrivée avec photos et signatures
- ✅ **Contacts** - Carnet d'adresses avec système d'invitations
- ✅ **Rapports** - Visualisation et export des missions terminées
- ✅ **Facturation** - Génération de factures et devis conformes (France)
- ✅ **Marketplace** - Plateforme publique d'offres de missions
- ✅ **Covoiturage** - Système de partage de trajets entre convoyeurs
- ✅ **Paramètres** - Gestion profil, notifications et sécurité

### Technologies
- **Backend**: PHP 8.1+ avec Laravel 10
- **Base de données**: PostgreSQL (Supabase)
- **Authentification**: Supabase Auth (email/password)
- **Storage**: Supabase Storage (avatars, photos missions, logos)
- **Frontend**: Blade Templates + Tailwind CSS
- **Cartes**: Mapbox API
- **PDF**: TCPDF
- **Email**: PHPMailer

## 📋 Prérequis

- PHP >= 8.1
- Composer
- PostgreSQL (ou compte Supabase)
- Node.js & NPM (pour assets frontend)
- Extensions PHP: `pdo`, `pdo_pgsql`, `mbstring`, `zip`, `gd`

## 🛠️ Installation

### 1. Cloner le projet

```bash
git clone <repository-url>
cd fleetcheck-php
```

### 2. Installer les dépendances PHP

```bash
composer install
```

### 3. Configuration de l'environnement

Copiez le fichier `.env.php` vers `.env` et configurez vos variables :

```bash
cp .env.php .env
```

Éditez `.env` avec vos informations :

```env
APP_NAME=FleetCheck
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (Supabase PostgreSQL)
DB_CONNECTION=pgsql
DB_HOST=db.your-project.supabase.co
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres
DB_PASSWORD=your-db-password

# Mapbox (pour les cartes)
MAPBOX_ACCESS_TOKEN=your-mapbox-token

# Email (SMTP)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@fleetcheck.com"
```

### 4. Générer la clé d'application

```bash
php artisan key:generate
```

### 5. Configuration Supabase

#### Base de données

Exécutez le script SQL de migration sur votre projet Supabase (via Dashboard SQL Editor) :

```sql
-- Voir le fichier database/migrations/init_schema.sql
-- Ce fichier contient toutes les tables nécessaires
```

Les tables principales :
- `profiles` - Utilisateurs
- `missions` - Missions de convoyage
- `inspection_departures` / `inspection_arrivals` - Inspections véhicules
- `contacts` - Carnet d'adresses
- `invoices` / `quotes` - Facturation
- `billing_clients` - Clients de facturation
- `company_info` - Informations entreprise
- `marketplace_missions` / `marketplace_mission_responses` - Marketplace
- `shared_rides` / `ride_reservations` / `ride_messages` - Covoiturage
- `notifications` - Notifications utilisateur

#### Storage Buckets

Créez les buckets suivants dans Supabase Storage :

1. **avatars** (public)
2. **mission-photos** (public)
3. **company-logos** (public)
4. **verification-documents** (private)

#### Row Level Security (RLS)

Les politiques RLS sont automatiquement créées avec le script de migration. Assurez-vous que RLS est activé sur toutes les tables.

### 6. Lancer le serveur de développement

```bash
php artisan serve
```

L'application sera disponible sur : `http://localhost:8000`

## 📁 Structure du projet

```
fleetcheck-php/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── DashboardController.php
│   │   │   ├── MissionController.php
│   │   │   ├── ContactController.php
│   │   │   ├── ReportController.php
│   │   │   ├── BillingController.php
│   │   │   ├── MarketplaceController.php
│   │   │   ├── CovoiturageController.php
│   │   │   └── SettingsController.php
│   │   └── Middleware/
│   │       └── AuthMiddleware.php
│   └── Services/
│       ├── SupabaseService.php
│       ├── MapboxService.php
│       ├── PdfService.php
│       └── EmailService.php
├── resources/
│   └── views/
│       ├── layouts/
│       │   └── app.blade.php
│       ├── auth/
│       │   ├── login.blade.php
│       │   ├── register.blade.php
│       │   └── forgot-password.blade.php
│       ├── dashboard.blade.php
│       ├── landing.blade.php
│       └── [autres vues...]
├── routes/
│   └── web.php
├── composer.json
└── .env
```

## 🎨 Design System

### Palette de couleurs

```css
--primary: #14b8a6 (teal-500)
--primary-hover: #0d9488 (teal-600)
--secondary: #06b6d4 (cyan-500)
--success: #10b981 (green-500)
--warning: #f59e0b (amber-500)
--error: #ef4444 (red-500)
--background: hsl(220, 18%, 12%)
--surface: hsl(220, 15%, 14%)
```

### Composants

- Glass cards avec backdrop-filter
- Boutons avec gradient teal/cyan
- Badges de statut colorés
- Sidebar responsive
- Formulaires avec validation

## 📱 Pages principales

### Public
- `/` - Landing page
- `/login` - Connexion
- `/register` - Inscription
- `/forgot-password` - Mot de passe oublié

### Protégées (authentification requise)
- `/dashboard` - Tableau de bord
- `/missions` - Gestion des missions (liste, kanban, carte)
- `/missions/create` - Créer une mission
- `/missions/{id}` - Détails d'une mission
- `/contacts` - Carnet d'adresses
- `/reports` - Rapports de missions terminées
- `/billing` - Facturation (factures, devis, clients)
- `/billing/company` - Paramètres entreprise
- `/marketplace` - Marketplace de missions
- `/marketplace/create` - Publier une mission
- `/marketplace/my/missions` - Mes missions publiées
- `/marketplace/my/offers` - Mes offres
- `/covoiturage` - Liste des trajets
- `/covoiturage/publish` - Publier un trajet
- `/covoiturage/my-trips` - Mes trajets
- `/covoiturage/messages` - Messagerie
- `/settings` - Paramètres utilisateur

## 🔐 Authentification & Sécurité

### Flow d'authentification

1. **Inscription** (`/register`)
   - Création user dans Supabase Auth
   - Création automatique du profil dans `profiles`
   - Stockage du JWT dans la session

2. **Connexion** (`/login`)
   - Validation email/password via Supabase
   - Récupération du JWT
   - Stockage session + profil

3. **Middleware** (`AuthMiddleware`)
   - Vérification présence JWT
   - Redirection vers `/login` si non authentifié

### RLS (Row Level Security)

Toutes les requêtes respectent les politiques RLS de Supabase :
- Les utilisateurs ne peuvent accéder qu'à leurs propres données
- Vérification via `auth.uid()` dans les politiques SQL
- Marketplace et covoiturage : données publiques selon statut

## 📊 Fonctionnalités avancées

### Mapbox Integration

- Géocodage d'adresses (autocomplete)
- Calcul d'itinéraires avec distance/durée
- Affichage carte avec marqueurs
- Token sécurisé via variable d'environnement

```php
$mapbox = new MapboxService();
$coords = $mapbox->getCoordinates("Paris, France");
$directions = $mapbox->getDirections($lng1, $lat1, $lng2, $lat2);
```

### Génération PDF

Factures et devis générés avec TCPDF :
- En-tête entreprise avec logo
- Détails client
- Lignes de facturation
- Calcul TVA automatique
- Mentions légales

```php
$pdf = new PdfService();
$pdfContent = $pdf->generateInvoice($invoice, $company, $client);
```

### Upload de fichiers

Photos, avatars et documents via Supabase Storage :
- Buckets publics/privés
- URLs publiques générées
- Gestion des permissions RLS

```php
$supabase->uploadFile('avatars', $path, $fileContent, $mimeType);
$url = $supabase->getPublicUrl('avatars', $path);
```

### Export CSV

Export des missions et rapports en CSV :
- Headers configurables
- Encodage UTF-8
- Téléchargement direct

```php
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="missions.csv"');
```

### Email (PHPMailer)

Envoi d'emails HTML :
- Invitations contacts
- Rapports de missions
- Factures avec PDF en pièce jointe

```php
$email = new EmailService();
$email->sendInvitation($recipientEmail, $inviterName, $inviteLink);
```

## 🚧 TODO / Améliorations futures

- [ ] Authentification OAuth (Google, Microsoft)
- [ ] Notifications en temps réel (WebSocket/Pusher)
- [ ] Notifications push mobile
- [ ] Export PDF des rapports complets
- [ ] Système de reviews/évaluations
- [ ] API REST publique
- [ ] Multi-langue (i18n)
- [ ] Mode sombre
- [ ] Tests unitaires et fonctionnels
- [ ] CI/CD (GitHub Actions)

## 🐛 Dépannage

### Erreur de connexion Supabase

Vérifiez que vos clés API dans `.env` sont correctes :
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
```

### Erreur d'upload de fichiers

Vérifiez les permissions des buckets Storage et que RLS est correctement configuré.

### Erreur de génération PDF

Assurez-vous que l'extension GD est activée :
```bash
php -m | grep gd
```

### Erreur d'envoi d'email

Configurez un App Password si vous utilisez Gmail :
1. Activer la validation 2 facteurs
2. Générer un "App Password"
3. Utiliser ce mot de passe dans `MAIL_PASSWORD`

## 📄 Licence

MIT License - Voir LICENSE file pour plus de détails.

## 👥 Support

Pour toute question ou problème :
- Email: support@fleetcheck.com
- Documentation: https://docs.fleetcheck.com

---

Développé avec ❤️ par l'équipe FleetCheck
