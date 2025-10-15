# 🧠 CLARA - Knowledge Base Complète

## 📚 Table des matières

1. [Architecture du Projet](#architecture-du-projet)
2. [Base de Données](#base-de-données)
3. [Fonctionnalités Principales](#fonctionnalités-principales)
4. [Actions Exécutables par Clara](#actions-exécutables-par-clara)
5. [Pages et Navigation](#pages-et-navigation)
6. [Système de Crédits](#système-de-crédits)
7. [Rôles et Permissions](#rôles-et-permissions)
8. [Intégrations Externes](#intégrations-externes)

---

## 🏗️ Architecture du Projet

### Stack Technique

**Frontend Web:**
- React 18.3.1 avec TypeScript
- Vite 5.4.20 (build tool)
- Tailwind CSS (design system glassmorphism)
- React Router pour navigation

**Frontend Mobile:**
- Expo 54.0.10
- React Native
- TypeScript

**Backend:**
- Supabase 2.58.0 (PostgreSQL + Auth + Storage + Realtime)
- Edge Functions (serverless)
- API REST auto-générée

**IA:**
- DeepSeek API (chat completion)
- Vision AI pour inspection de véhicules
- Synthèse vocale (Web Speech API)

### Structure des Dossiers

```
/src
  /components          # Composants réutilisables
    ChatAssistant.tsx  # Interface de chat avec Clara
    CalendarView.tsx   # Calendrier de disponibilités
  /pages               # Pages de l'application
    Dashboard.tsx      # Tableau de bord
    Missions.tsx       # Gestion des missions
    Billing.tsx        # Facturation
    Contacts_PREMIUM.tsx  # Gestion contacts (moderne)
    Covoiturage.tsx    # Plateforme covoiturage
    RapportsInspection.tsx  # Rapports d'inspection
  /services            # Services métier
    aiServiceEnhanced.ts    # IA Clara (enhanced)
    aiLimitService.ts       # Limites IA par abonnement
    calendarService.ts      # Gestion calendrier
    attachmentsService.ts   # Pièces jointes
    VoiceAssistantService.ts  # Synthèse vocale
  /contexts
    AuthContext.tsx    # Authentification globale
  /lib
    supabase.ts       # Configuration Supabase
```

---

## 🗄️ Base de Données

### Tables Principales

#### **users (via Supabase Auth)**
- `id` (uuid) - Identifiant unique
- `email` - Email de connexion
- `user_metadata` - Métadonnées (first_name, last_name, phone, etc.)
- `role` - Rôle (user, driver, admin)

#### **profiles**
- `id` (uuid) - FK vers users
- `full_name` - Nom complet
- `first_name` - Prénom
- `last_name` - Nom
- `phone` - Téléphone
- `company_name` - Nom entreprise
- `siret` - SIRET (entreprises)
- `subscription_status` - Statut abonnement (free, starter, pro, etc.)
- `created_at` - Date création

#### **missions**
- `id` (uuid) - Identifiant unique
- `reference` - Référence unique (ex: MISS-001)
- `user_id` (uuid) - FK vers créateur
- `status` - Statut (pending, in_progress, completed, cancelled)
- `vehicle_brand` - Marque véhicule
- `vehicle_model` - Modèle véhicule
- `vehicle_plate` - Immatriculation
- `vehicle_vin` - Numéro série VIN
- `vehicle_image_url` - Photo véhicule
- `pickup_address` - Adresse départ
- `pickup_date` - Date/heure départ
- `pickup_lat/lng` - Coordonnées GPS départ
- `pickup_contact_id` - Contact départ
- `delivery_address` - Adresse arrivée
- `delivery_date` - Date/heure arrivée
- `delivery_lat/lng` - Coordonnées GPS arrivée
- `delivery_contact_id` - Contact arrivée
- `driver_id` - Chauffeur assigné
- `price` - Prix HT
- `notes` - Notes

#### **contacts**
- `id` (uuid) - Identifiant unique
- `user_id` (uuid) - Propriétaire du contact
- `name` - Nom du contact
- `email` - Email
- `phone` - Téléphone
- `type` - Type (customer, driver, supplier, personal)
- `company_name` - Entreprise
- `city` - Ville
- `address` - Adresse complète
- `license_type` - Type permis (light, heavy_goods)
- `rating` - Note moyenne (0-5)
- `has_calendar_access` - Accès au calendrier (true/false)
- `total_missions` - Nombre total de missions

#### **clients**
- `id` (uuid) - Identifiant unique
- `user_id` (uuid) - Propriétaire du client
- `type` - Type (individual, company)
- `first_name` - Prénom (particulier)
- `last_name` - Nom (particulier)
- `company_name` - Raison sociale (entreprise)
- `siret` - SIRET (entreprise)
- `siren` - SIREN (entreprise)
- `email` - Email
- `phone` - Téléphone
- `address` - Adresse complète
- `created_at` - Date création

#### **invoices**
- `id` (uuid) - Identifiant unique
- `user_id` (uuid) - Émetteur
- `client_id` (uuid) - Client
- `invoice_number` - Numéro facture
- `type` - Type (invoice, quote)
- `amount_ttc` - Montant TTC
- `amount_ht` - Montant HT
- `tva_amount` - Montant TVA
- `tva_rate` - Taux TVA (20%)
- `description` - Description
- `issue_date` - Date émission
- `due_date` - Date échéance
- `status` - Statut (draft, sent, paid, cancelled)
- `pdf_url` - URL du PDF généré

#### **mission_assignments**
- `id` (uuid) - Identifiant unique
- `mission_id` (uuid) - Mission assignée
- `contact_id` (uuid) - Prestataire/chauffeur
- `payment_ht` - Montant versé au prestataire (HT)
- `commission` - Commission gardée (HT)
- `status` - Statut (assigned, accepted, refused, completed)
- `assigned_at` - Date assignation

#### **vehicle_inspections**
- `id` (uuid) - Identifiant unique
- `mission_id` (uuid) - Mission concernée
- `inspector_id` (uuid) - Inspecteur
- `inspection_type` - Type (departure, arrival)
- `status` - Statut (in_progress, completed)
- `vehicle_info` - Infos véhicule (JSON)
- `overall_condition` - État général
- `fuel_level` - Niveau carburant (0-100)
- `mileage_km` - Kilométrage
- `damages` - Dommages détectés (JSON array)
- `notes` - Notes
- `inspector_signature` - Signature inspecteur
- `client_signature` - Signature client
- `completed_at` - Date complétion

#### **inspection_photos**
- `id` (uuid) - Identifiant unique
- `inspection_id` (uuid) - Inspection concernée
- `photo_type` - Type (front, back, left_side, right_side, dashboard, etc.)
- `photo_url` - URL photo stockée
- `description` - Description (générée par IA)
- `ai_description` - Description IA
- `has_damage` - Dommage détecté (true/false)
- `damage_severity` - Sévérité (minor, moderate, severe)

#### **carpooling_trips**
- `id` (uuid) - Identifiant unique
- `driver_id` (uuid) - Conducteur
- `departure_city` - Ville départ
- `departure_address` - Adresse départ
- `arrival_city` - Ville arrivée
- `arrival_address` - Adresse arrivée
- `departure_date` - Date/heure départ
- `price_per_seat` - Prix par place (min 2€)
- `total_seats` - Places totales (1-8)
- `available_seats` - Places disponibles
- `animals_allowed` - Animaux acceptés
- `instant_booking` - Réservation instantanée
- `status` - Statut (published, full, completed, cancelled)

#### **carpooling_bookings**
- `id` (uuid) - Identifiant unique
- `trip_id` (uuid) - Trajet réservé
- `passenger_id` (uuid) - Passager
- `seats_booked` - Nombre de places réservées
- `total_price` - Prix total
- `message_to_driver` - Message au conducteur (min 20 caractères)
- `status` - Statut (pending, confirmed, cancelled)
- `credits_blocked` - Crédits bloqués (2 par réservation)

#### **calendar_events**
- `id` (uuid) - Identifiant unique
- `user_id` (uuid) - Propriétaire de l'événement
- `title` - Titre événement
- `description` - Description
- `event_type` - Type (mission, appointment, personal, other)
- `start_date` - Date/heure début
- `end_date` - Date/heure fin
- `is_all_day` - Toute la journée (true/false)
- `color` - Couleur personnalisée
- `location` - Lieu

#### **user_credits**
- `id` (uuid) - Identifiant unique
- `user_id` (uuid) - Utilisateur
- `balance` - Solde actuel
- `lifetime_earned` - Total gagné à vie
- `lifetime_spent` - Total dépensé à vie

#### **ai_conversations**
- `id` (uuid) - Identifiant unique
- `user_id` (uuid) - Utilisateur
- `title` - Titre conversation
- `updated_at` - Dernière mise à jour

#### **ai_messages**
- `id` (uuid) - Identifiant unique
- `conversation_id` (uuid) - Conversation
- `role` - Rôle (user, assistant, system)
- `content` - Contenu du message
- `created_at` - Date création

#### **ai_requests_usage**
- `id` (uuid) - Identifiant unique
- `user_id` (uuid) - Utilisateur
- `month` - Mois (YYYY-MM)
- `count` - Nombre de requêtes
- `limit` - Limite autorisée
- `last_reset` - Dernière réinitialisation

---

## ⚙️ Fonctionnalités Principales

### 1. Gestion des Missions 🚗

**Création:**
- Coût: 1 crédit
- Infos obligatoires: marque, modèle, départ, arrivée
- Infos optionnelles: plaque, VIN, dates, contacts, notes
- Génération référence unique (MISS-XXX)

**Assignation:**
- Assigner à un prestataire/chauffeur
- Montant prestataire + commission = total mission
- Commission ajoutée au "Revenu du mois"
- Notification au prestataire

**Suggestion Intelligente de Chauffeur:**
- Analyse TOUS les chauffeurs dans contacts
- Critères:
  - ✅ Disponibilité à la date (via calendrier)
  - ✅ Ville du chauffeur vs ville de départ
  - ✅ Type de permis (léger vs poids lourd)
  - ✅ Distance depuis le point de départ
- Score 0-100 pour chaque chauffeur
- Recommandation du meilleur chauffeur
- UNIQUEMENT INFORMATIF (ne fait pas l'assignation)

**Statuts:**
- `pending` - En attente (pas encore assignée)
- `assigned` - Assignée à un chauffeur
- `in_progress` - En cours (chauffeur en route)
- `completed` - Terminée
- `cancelled` - Annulée

**Tracking:**
- Localisation en temps réel
- ETA (temps d'arrivée estimé)
- Historique des déplacements

### 2. Inspections de Véhicules 📋

**Types:**
- **Inspection départ** (avant transport)
- **Inspection arrivée** (après transport)

**Processus:**
1. Démarrer inspection (in_progress)
2. Prendre photos (8 types):
   - Avant
   - Arrière
   - Côté gauche
   - Côté droit
   - Tableau de bord
   - Intérieur avant
   - Roue avant gauche
   - Coffre
3. IA analyse chaque photo:
   - Détecte dommages
   - Génère description automatique
   - Classe sévérité (minor, moderate, severe)
4. Inspecteur complète:
   - Kilométrage
   - Niveau carburant
   - État général
   - Notes
   - Signatures
5. Finaliser inspection (completed)

**Rapports:**
- PDF généré automatiquement
- Toutes les photos en haute résolution
- Envoi par email (PDF + photos)
- Disponible dans `/rapports-inspection`
- Affichage progressif:
  - Rapport départ seul (si inspection arrivée pas terminée)
  - Rapport complet départ+arrivée (si les 2 terminées)

### 3. Facturation & Devis 💰

**Clients:**
- **Particuliers:** nom, prénom, adresse, email, téléphone
- **Professionnels (entreprises):** 
  - Recherche automatique via API Sirene (SIRET)
  - Raison sociale, SIRET, SIREN, adresse pré-remplis
  - Email et téléphone demandés

**Création Facture/Devis:**
1. Identifier le client (recherche ou création)
2. Montant TTC
3. Description/Objet
4. Date émission
5. Génération PDF automatique
6. Stockage dans Supabase Storage
7. Envoi par email optionnel

**Calculs automatiques:**
- TTC → HT: `montant_ht = montant_ttc / 1.20`
- TVA: `tva = montant_ht × 0.20`

**Statuts:**
- `draft` - Brouillon
- `sent` - Envoyée
- `paid` - Payée
- `cancelled` - Annulée

### 4. Covoiturage 🚗💨

**Publication de trajet:**
- Coût: **2 crédits** (déduits immédiatement)
- Prix minimum: 2€ par place (règle BlaBlaCar)
- Places: 1-8
- Options: animaux, musique, niveau bavardage
- Réservation instantanée ou avec validation

**Recherche de trajets:**
- Filtres: ville départ, ville arrivée, date
- Affichage: conducteur, prix, places, horaires
- Filtres additionnels: animaux acceptés, réservation instantanée

**Réservation:**
- Coût: **2 crédits bloqués** (remboursés si refus/annulation >24h)
- + Prix du trajet (payé au conducteur en espèces)
- Message obligatoire au conducteur (min 20 caractères)
- Vérification places disponibles
- Confirmation par conducteur requise (sauf instant booking)

**Statuts trajet:**
- `published` - Publié
- `full` - Complet
- `completed` - Terminé
- `cancelled` - Annulé

**Statuts réservation:**
- `pending` - En attente validation conducteur
- `confirmed` - Confirmée
- `cancelled` - Annulée

### 5. Contacts & Planning 👥📅

**Types de contacts:**
- `customer` - Clients
- `driver` - Chauffeurs
- `supplier` - Fournisseurs
- `personal` - Personnels

**Informations contacts:**
- Nom, email, téléphone
- Entreprise, ville, adresse
- Type de permis (light, heavy_goods)
- Note moyenne (0-5 étoiles)
- Nombre total de missions

**Calendrier de disponibilités:**
- Accessible via bouton "Planning"
- Uniquement pour contacts avec `has_calendar_access = true`
- Types d'événements: mission, RDV, personnel, autre
- Vue mensuelle
- Création/modification/suppression d'événements
- Événements toute la journée
- Couleurs personnalisables

**Vérification disponibilité:**
- Statut aujourd'hui: disponible ✅, indisponible ❌, partiel ⏰
- Prochaine date disponible
- Planning détaillé jour par jour

**Statistiques hebdomadaires:**
- Nombre total de contacts
- Contacts avec accès planning
- Liste des disponibles cette semaine
- Liste des indisponibles
- Liste des partiellement disponibles

**Prévention des doublons:**
- Vérification par email ET téléphone
- Alerte visuelle si doublon détecté
- Impossible d'ajouter le même contact 2 fois

### 6. Dashboard 📊

**Cartes de statistiques:**
- **Revenus du mois:**
  - Missions reçues (montant total)
  - + Commissions sur missions assignées
  - Calcul automatique
  - Détails par mission

- **Crédits disponibles:**
  - Solde actuel
  - Total gagné à vie
  - Total dépensé à vie
  - Bouton "Recharger"

- **Missions actives:**
  - En cours
  - En attente
  - Terminées ce mois

- **Contacts actifs:**
  - Total contacts
  - Chauffeurs disponibles
  - Dernières demandes

**Graphiques:**
- Évolution des revenus (30 derniers jours)
- Missions par statut (camembert)
- Top 5 chauffeurs par nombre de missions

---

## 🤖 Actions Exécutables par Clara

### Actions Implémentées

#### 1. **Gestion Clients**
```typescript
action: 'create_client'
data: {
  type: 'individual' | 'company',
  siret?: string,  // Pour entreprises
  first_name?: string,  // Pour particuliers
  last_name?: string,
  company_name?: string,
  email?: string,
  phone?: string,
  address?: string
}
```

```typescript
action: 'search_client'
data: {
  query: string  // Nom, email ou SIRET
}
```

```typescript
action: 'list_clients'
data: {
  type?: 'individual' | 'company' | 'all'
}
```

#### 2. **Facturation**
```typescript
action: 'generate_invoice'
data: {
  client_id: string,
  amount_ttc: number,
  description: string,
  issue_date: string,
  type: 'invoice' | 'quote'
}
requiresConfirmation: true
```

#### 3. **Missions**
```typescript
action: 'create_mission'
data: {
  vehicle_brand: string,
  vehicle_model: string,
  vehicle_plate?: string,
  vehicle_vin?: string,
  pickup_address: string,
  pickup_date: string,
  delivery_address: string,
  delivery_date?: string,
  price: number,
  notes?: string
}
requiresConfirmation: true
description: "Créer une mission (coût: 1 crédit)"
```

```typescript
action: 'assign_mission'
data: {
  mission_id: string,
  contact_id: string,
  payment_ht: number,  // Montant prestataire
  commission: number   // Commission gardée
}
requiresConfirmation: true
description: "Assigner une mission à un prestataire"
```

```typescript
action: 'suggest_driver'
data: {
  mission_id: string,
  vehicle_type: 'light' | 'heavy_goods',
  departure_city: string,
  departure_date: string
}
requiresConfirmation: false
description: "Suggérer le meilleur chauffeur pour une mission"
```

```typescript
action: 'analyze_mission'
data: {
  mission_id: string
}
requiresConfirmation: false
description: "Analyser l'état d'une mission"
```

```typescript
action: 'list_mission_reports'
data: {
  status?: 'pending' | 'in_progress' | 'completed'
}
requiresConfirmation: false
description: "Lister tous les rapports disponibles"
```

#### 4. **Tracking Véhicules**
```typescript
action: 'track_vehicle'
data: {
  mission_id: string
}
requiresConfirmation: false
description: "Localiser un véhicule en temps réel"
```

```typescript
action: 'estimate_arrival'
data: {
  mission_id: string
}
requiresConfirmation: false
description: "Estimer l'heure d'arrivée (ETA)"
```

#### 5. **Crédits**
```typescript
action: 'check_credits'
data: {
  user_id: string
}
requiresConfirmation: false
description: "Vérifier le solde de crédits"
```

#### 6. **Contacts**
```typescript
action: 'add_contact'
data: {
  email: string,
  name?: string,
  phone?: string,
  type: 'customer' | 'driver' | 'supplier' | 'personal'
}
requiresConfirmation: true
description: "Envoyer une demande de contact"
```

```typescript
action: 'check_contact_status'
data: {
  contact_id: string
}
requiresConfirmation: false
description: "Vérifier le statut d'une demande de contact"
```

```typescript
action: 'list_pending_contacts'
data: {}
requiresConfirmation: false
description: "Lister les demandes de contact en attente"
```

```typescript
action: 'list_contacts'
data: {
  type?: 'customer' | 'driver' | 'supplier' | 'personal' | 'all'
}
requiresConfirmation: false
description: "Lister tous les contacts"
```

```typescript
action: 'view_contact_planning'
data: {
  contact_id: string,
  month?: string  // YYYY-MM
}
requiresConfirmation: false
description: "Consulter le planning d'un contact"
```

```typescript
action: 'check_driver_availability'
data: {
  contact_id: string,
  date: string  // YYYY-MM-DD
}
requiresConfirmation: false
description: "Vérifier la disponibilité d'un chauffeur"
```

```typescript
action: 'get_weekly_availability_stats'
data: {
  week_start?: string  // YYYY-MM-DD (lundi de la semaine)
}
requiresConfirmation: false
description: "Statistiques de disponibilité de la semaine"
```

#### 7. **Revenus**
```typescript
action: 'get_monthly_revenue'
data: {
  month?: string  // YYYY-MM (défaut: mois en cours)
}
requiresConfirmation: false
description: "Afficher le revenu du mois"
```

#### 8. **Covoiturage**
```typescript
action: 'search_carpooling'
data: {
  departure_city: string,
  arrival_city: string,
  departure_date: string,
  animals_allowed?: boolean,
  instant_booking?: boolean
}
requiresConfirmation: false
description: "Rechercher des trajets de covoiturage"
```

```typescript
action: 'publish_carpooling'
data: {
  departure_city: string,
  departure_address: string,
  arrival_city: string,
  arrival_address: string,
  departure_date: string,
  price_per_seat: number,  // min 2€
  total_seats: number,  // 1-8
  animals_allowed: boolean,
  instant_booking: boolean
}
requiresConfirmation: true
description: "Publier un trajet (coût: 2 crédits)"
```

```typescript
action: 'book_carpooling'
data: {
  trip_id: string,
  seats_booked: number,
  message_to_driver: string  // min 20 caractères
}
requiresConfirmation: true
description: "Réserver un trajet (coût: 2 crédits + prix)"
```

```typescript
action: 'list_my_trips'
data: {
  role: 'driver' | 'passenger' | 'all',
  status?: 'published' | 'full' | 'completed' | 'cancelled'
}
requiresConfirmation: false
description: "Lister mes trajets de covoiturage"
```

#### 9. **Rapports d'Inspection**
```typescript
action: 'list_inspection_reports'
data: {
  status?: 'all' | 'departure_only' | 'complete'
}
requiresConfirmation: false
description: "Lister tous les rapports d'inspection"
```

```typescript
action: 'view_inspection_report'
data: {
  mission_id: string
}
requiresConfirmation: false
description: "Consulter un rapport d'inspection"
```

```typescript
action: 'send_inspection_report'
data: {
  mission_id: string,
  recipient_email: string
}
requiresConfirmation: true
description: "Envoyer un rapport par email (PDF + photos)"
```

```typescript
action: 'download_inspection_photos'
data: {
  mission_id: string
}
requiresConfirmation: false
description: "Télécharger toutes les photos d'inspection"
```

#### 10. **Navigation**
```typescript
// Clara peut rediriger l'utilisateur vers des pages
navigate('/dashboard')
navigate('/missions')
navigate('/billing')
navigate('/contacts')
navigate('/covoiturage')
navigate('/rapports-inspection')
navigate('/shop')  // Recharge crédits
```

---

## 🗺️ Pages et Navigation

### Pages Principales

#### `/dashboard` - Tableau de Bord
- **Cartes statistiques:** Revenus, Crédits, Missions, Contacts
- **Graphiques:** Évolution revenus, Missions par statut
- **Actions rapides:** Créer mission, Recharger crédits

#### `/missions` - Gestion des Missions
- **Liste missions:** Filtres par statut
- **Création:** Formulaire complet
- **Détail mission:** Infos complètes, tracking, inspections
- **Assignation:** Choix du chauffeur, montants

#### `/billing` - Facturation
- **Clients:** Liste, recherche, création
- **Factures/Devis:** Génération, édition, envoi
- **PDF:** Téléchargement, email

#### `/contacts` - Gestion Contacts (PREMIUM)
- **Liste contacts:** Recherche, filtres par type
- **Statistiques:** Total, Clients, Chauffeurs, Fournisseurs
- **Ajout contact:** Recherche par email/téléphone
- **Planning:** Bouton "Planning" → Calendrier de disponibilités
- **Prévention doublons:** Alerte si email/téléphone existant

#### `/covoiturage` - Plateforme Covoiturage
- **Recherche trajets:** Filtres ville, date, options
- **Publier trajet:** Formulaire complet (coût: 2 crédits)
- **Mes trajets:** Conducteur et passager
- **Réservations:** Gestion des demandes

#### `/rapports-inspection` - Rapports d'Inspection
- **Liste rapports:** Missions avec inspections
- **Affichage progressif:**
  - Rapport départ seul
  - Rapport complet (départ + arrivée)
- **PDF:** Téléchargement
- **Photos:** Téléchargement séparé
- **Email:** Envoi PDF + photos

#### `/shop` - Boutique Crédits
- **Packs crédits:** 10, 50, 100, 500 crédits
- **Paiement:** Stripe
- **Historique:** Achats précédents

#### `/profile` - Profil Utilisateur
- **Informations personnelles:** Nom, email, téléphone
- **Entreprise:** Nom, SIRET
- **Abonnement:** Statut, plan
- **Sécurité:** Mot de passe, 2FA

#### `/admin` - Administration (admin uniquement)
- **Utilisateurs:** Liste, gestion
- **Missions:** Monitoring global
- **Support:** Tickets

### Navigation Mobile (Expo)

**Bottom Tabs:**
- Missions
- Rapports
- Profil

**Screens:**
- MissionsScreen
- MissionDetailScreen
- MissionCreateScreen
- InspectionScreen
- MissionReportsScreen
- ProfileScreen

---

## 💳 Système de Crédits

### Prix des Actions

| Action | Coût |
|--------|------|
| Créer une mission | **1 crédit** |
| Publier un trajet covoiturage | **2 crédits** |
| Réserver un trajet covoiturage | **2 crédits bloqués*** |
| Utiliser Clara (requête IA) | **Selon abonnement** |

**Crédit bloqué* : Remboursé si refus conducteur ou annulation >24h avant départ

### Limites IA par Abonnement

| Plan | Requêtes IA/mois | Prix |
|------|------------------|------|
| **Free** | ❌ 0 | Gratuit |
| **Starter** | ⚡ 10 | 9,99€ |
| **Basic** | 📦 20 | 19,99€ |
| **Pro** | ♾️ Illimité | 49,99€ |
| **Business** | ♾️ Illimité | 99,99€ |
| **Enterprise** | ♾️ Illimité | 199,99€ |

### Recharge de Crédits

**Packs disponibles:**
- 10 crédits → 9,99€
- 50 crédits → 39,99€ (10% réduction)
- 100 crédits → 69,99€ (20% réduction)
- 500 crédits → 299,99€ (30% réduction)

**Méthodes:**
- Carte bancaire (Stripe)
- Abonnement avec crédits inclus

---

## 👥 Rôles et Permissions

### Rôles Disponibles

#### **user** (Utilisateur standard)
- Créer/gérer ses missions
- Créer/gérer ses clients
- Générer factures/devis
- Gérer ses contacts
- Publier/réserver covoiturages
- Consulter ses rapports
- Utiliser Clara (selon abonnement)
- Voir dashboard

#### **driver** (Chauffeur)
- Voir missions assignées
- Accepter/refuser missions
- Faire inspections véhicules
- Mettre à jour statuts missions
- Consulter ses gains
- Publier trajets covoiturage

#### **admin** (Administrateur)
- **TOUTES** les permissions user + driver
- Gérer tous les utilisateurs
- Voir toutes les missions
- Accès support
- Statistiques globales
- Gestion abonnements
- Logs système

### Vérifications de Sécurité

**Supabase Row Level Security (RLS):**
- Users ne voient QUE leurs données
- Drivers voient missions assignées
- Admins voient tout

**Exemples de politiques:**
```sql
-- Missions: users voient leurs missions créées
CREATE POLICY "Users can view own missions"
ON missions FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = driver_id);

-- Contacts: users voient leurs contacts uniquement
CREATE POLICY "Users can view own contacts"
ON contacts FOR SELECT
USING (auth.uid() = user_id);

-- Calendrier: users voient planning de leurs contacts
CREATE POLICY "Users can view contacts' calendar"
ON calendar_events FOR SELECT
USING (
  user_id IN (
    SELECT c.id FROM contacts c
    WHERE c.user_id = auth.uid()
    AND c.has_calendar_access = true
  )
);
```

---

## 🔌 Intégrations Externes

### 1. API Sirene (Entreprises)
- **URL:** `https://api.insee.fr/entreprises/sirene/V3/siret/{siret}`
- **Utilisation:** Recherche entreprises par SIRET
- **Données récupérées:**
  - Raison sociale
  - SIRET / SIREN
  - Adresse complète (rue, code postal, ville)
  - Forme juridique
  - Date création
- **Limites:** Gratuit, pas de limite

### 2. DeepSeek API (IA)
- **URL:** `https://api.deepseek.com/v1/chat/completions`
- **Modèle:** `deepseek-chat`
- **Utilisation:**
  - Chat conversationnel (Clara)
  - Analyse d'intentions
  - Génération de réponses
- **Vision AI:**
  - Analyse photos véhicules
  - Détection de dommages
  - Description automatique

### 3. Google Maps API
- **Places Autocomplete:** Recherche d'adresses
- **Geocoding:** Conversion adresse → coordonnées GPS
- **Distance Matrix:** Calcul distances entre 2 points
- **Directions:** Calcul itinéraires

### 4. Stripe (Paiements)
- **Checkout:** Achat de crédits
- **Subscriptions:** Abonnements mensuels
- **Webhooks:** Confirmation paiements

### 5. Supabase Edge Functions
- **send-notification:** Envoi notifications push
- **send-email:** Envoi emails (SMTP)
- **generate-pdf:** Génération PDF serveur
- **process-payment:** Traitement paiements Stripe

### 6. Web Speech API
- **Synthèse vocale:** Clara peut parler (réponses vocales)
- **Reconnaissance vocale:** Dictée vocale (bouton micro)
- **Langues:** Français (fr-FR)

---

## 📝 Conventions de Nommage

### Base de Données
- **Tables:** `snake_case` (ex: `mission_assignments`)
- **Colonnes:** `snake_case` (ex: `created_at`, `user_id`)
- **Foreign Keys:** `{table}_id` (ex: `mission_id`, `contact_id`)

### Code TypeScript
- **Composants:** `PascalCase` (ex: `ChatAssistant`, `CalendarView`)
- **Fonctions:** `camelCase` (ex: `createMission`, `sendEmail`)
- **Variables:** `camelCase` (ex: `userId`, `missionData`)
- **Constantes:** `UPPER_SNAKE_CASE` (ex: `DEEPSEEK_API_KEY`)
- **Interfaces:** `PascalCase` (ex: `AIMessage`, `Mission`)

### Fichiers
- **Composants:** `PascalCase.tsx` (ex: `ChatAssistant.tsx`)
- **Services:** `camelCase.ts` (ex: `aiServiceEnhanced.ts`)
- **Pages:** `PascalCase.tsx` (ex: `Dashboard.tsx`)

---

## 🚀 Workflow Utilisateur Typique

### Scénario 1: Créer une mission complète

1. **Utilisateur:** "Clara, crée une mission"
2. **Clara:**
   - Vérifie crédits (≥1)
   - Si insuffisant: "Tu as besoin d'au moins 1 crédit. Souhaites-tu en acheter ?"
   - Si OK: "Parfait ! Quelle est la marque du véhicule ?"
3. **Utilisateur:** "BMW"
4. **Clara:** "Et le modèle ?"
5. **Utilisateur:** "Série 3"
6. **Clara:** "Adresse de départ ?"
7. **Utilisateur:** "15 rue de Rivoli, Paris"
8. **Clara:** "Adresse d'arrivée ?"
9. **Utilisateur:** "20 avenue des Champs-Élysées, Paris"
10. **Clara:** "Quel est le montant total de cette mission (HT) ?"
11. **Utilisateur:** "350€"
12. **Clara:**
    - Crée la mission
    - Déduit 1 crédit
    - Enregistre 350€ dans "Revenu du mois"
    - "✅ Mission MISS-123 créée avec succès ! Tu as gagné 350€. Crédits restants: 49"

### Scénario 2: Assigner une mission

1. **Utilisateur:** "Assigne la mission MISS-123 à jean@chauffeur.com"
2. **Clara:**
   - Recherche le contact
   - Si trouvé: "J'ai trouvé Jean Dupont (chauffeur). Combien gagne-t-il pour cette mission (HT) ?"
   - Si pas trouvé: "Je ne trouve pas ce contact. Veux-tu l'ajouter d'abord ?"
3. **Utilisateur:** "200€"
4. **Clara:** "Et combien tu gagnes en commission (HT) ?"
5. **Utilisateur:** "150€"
6. **Clara:**
   - Vérifie: 200 + 150 = 350 ✅
   - Assigne la mission
   - Enregistre commission 150€ (remplace revenu de 350€)
   - "✅ Mission assignée à Jean Dupont ! Tu as gagné 150€ de commission. Revenu du mois ajusté: +150€"

### Scénario 3: Suggérer un chauffeur

1. **Utilisateur:** "Quel chauffeur pour la mission MISS-123 ?"
2. **Clara:**
   - Récupère infos mission (véhicule, dates, adresses)
   - Analyse TOUS les chauffeurs:
     - ✅ Disponibilité le 15 oct
     - ✅ Ville: Paris (même ville que départ)
     - ✅ Permis léger (adapté à BMW Série 3)
     - ✅ Distance: 5km du départ
   - Calcule scores:
     - Jean Dupont: 100/100 ⭐
     - Marie Martin: 70/100 (disponible mais loin)
     - Pierre Durand: 60/100 (pas disponible)
3. **Clara:**
   ```
   🎯 Meilleur chauffeur pour MISS-123:
   
   1. ⭐ Jean Dupont (100/100)
      ✅ Disponible le 15 oct
      ✅ À Paris (même ville)
      ✅ Permis léger adapté
      ✅ 5km du départ
      Note: 4.8/5 (12 missions)
   
   2. Marie Martin (70/100)
      ✅ Disponible
      ✅ Permis léger
      ⚠️ À Lyon (490km du départ)
   
   3. Pierre Durand (60/100)
      ❌ Pas disponible le 15 oct
      ✅ Permis léger
      ✅ À Paris
   
   Je recommande Jean Dupont. Veux-tu lui assigner ?
   ```

### Scénario 4: Créer un client professionnel

1. **Utilisateur:** "Crée un client avec le SIRET 12345678900014"
2. **Clara:**
   - Vérifie si client existe déjà
   - Si existe: "⚠️ Ce client existe déjà ! C'est [Nom entreprise]. Veux-tu créer une facture pour ce client ?"
   - Si n'existe pas: Appel API Sirene
3. **Clara:**
   ```
   ✅ Entreprise trouvée:
   
   Raison sociale: TRANSPORT RAPIDE SARL
   SIRET: 123 456 789 00014
   Adresse: 10 rue du Commerce, 75001 Paris
   
   As-tu l'email et le téléphone de contact ?
   ```
4. **Utilisateur:** "contact@transport-rapide.fr et 0123456789"
5. **Clara:**
   - Crée le client
   - "✅ Client créé avec succès ! Tu peux maintenant créer des factures pour TRANSPORT RAPIDE SARL."

### Scénario 5: Consulter les rapports d'inspection

1. **Utilisateur:** "Montre-moi les rapports disponibles"
2. **Clara:**
   ```
   📋 Rapports d'inspection disponibles:
   
   1. Mission MISS-123 (BMW Série 3 - AB-123-CD)
      ✅ Rapport complet (départ + arrivée)
      📅 Complété le 15 oct 2025
      📸 16 photos (8 départ + 8 arrivée)
      📄 PDF disponible
   
   2. Mission MISS-124 (Mercedes Classe A - CD-456-EF)
      ⏳ Rapport départ uniquement
      📅 Départ le 16 oct 2025
      📸 8 photos
      ⚠️ Arrivée en attente
   
   Veux-tu consulter un rapport ?
   ```
3. **Utilisateur:** "Envoie-moi le rapport de MISS-123 par email"
4. **Clara:**
   - Génère PDF
   - Télécharge toutes les photos
   - Envoie email avec PDF + 16 photos en pièces jointes
   - "✅ Rapport envoyé à [email] ! Tu as reçu le PDF + 16 photos en haute résolution."

---

## 🎯 Objectifs de Clara

### Proactivité
- Proposer des actions avant que l'utilisateur demande
- Anticiper les besoins
- Suggérer des optimisations

### Exemples:
- "Tu as 3 missions en attente. Veux-tu que je suggère des chauffeurs ?"
- "Ton solde de crédits est faible (2 restants). Veux-tu en acheter ?"
- "Tu as 5 demandes de contact en attente. Veux-tu les consulter ?"
- "Jean Dupont est disponible cette semaine. As-tu des missions pour lui ?"

### Personnalisation
- Saluer l'utilisateur par son prénom
- Se souvenir du contexte de conversation
- Adapter les suggestions au profil (chauffeur vs admin)

### Clarté
- Réponses concises
- Emojis pertinents
- Confirmations claires
- Récapitulatifs détaillés

### Sécurité
- Toujours vérifier les crédits
- Demander confirmation pour actions critiques
- Ne jamais inventer de données
- Respecter les permissions RLS

---

## 📚 Ressources Supplémentaires

### Documentation Interne
- `CLARA_TEST_GUIDE.md` - Guide de test Clara
- `CLARA_RAPPORTS_INSPECTION_GUIDE.md` - Rapports d'inspection
- `CLARA_COVOITURAGE_GUIDE.md` - Fonctionnalités covoiturage
- `CLARA_CONTACTS_PLANNING_GUIDE.md` - Gestion planning contacts
- `CLARA_AI_LIMITS.md` - Limites IA par abonnement

### Code Source
- `src/components/ChatAssistant.tsx` - Interface chat
- `src/services/aiServiceEnhanced.ts` - Logique IA complète
- `src/services/aiLimitService.ts` - Gestion limites IA
- `src/services/calendarService.ts` - Gestion calendrier

### Base de Données
- Supabase Dashboard: https://supabase.com/dashboard
- Tables: missions, contacts, clients, invoices, etc.
- Politiques RLS: Sécurité au niveau des lignes

---

**Version:** 2.0  
**Dernière mise à jour:** 14 octobre 2025  
**Auteur:** Équipe xCrackz

---

## ✅ Checklist d'Intégration Clara

- [x] Connaît toutes les tables de la base
- [x] Sait créer/modifier/lire des missions
- [x] Peut assigner des missions avec revenus
- [x] Suggère intelligemment des chauffeurs
- [x] Gère les clients (particuliers + entreprises)
- [x] Génère factures/devis
- [x] Recherche trajets covoiturage
- [x] Publie/réserve trajets
- [x] Consulte rapports d'inspection
- [x] Envoie rapports par email
- [x] Gère le calendrier de disponibilités
- [x] Vérifie disponibilité chauffeurs
- [x] Affiche revenus du mois
- [x] Vérifie crédits avant actions
- [x] Respecte limites IA par abonnement
- [x] Peut naviguer entre les pages
- [x] Gère les pièces jointes
- [x] Synthèse vocale des réponses
- [x] Reconnaissance vocale (dictée)

---

🎉 **Clara est maintenant une experte de votre projet !**
