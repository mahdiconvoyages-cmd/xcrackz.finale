# 🎯 Amélioration Système Facturation - Guide Complet

## 📋 Vue d'ensemble

Amélioration majeure du système de facturation avec :
1. **Page Clients dédiée** (`/clients`)
2. **Composants réutilisables** (BillingStats, DocumentFilters)
3. **Migration SQL** pour lier clients et factures
4. **Navigation améliorée** dans le menu latéral

---

## 🆕 Nouveautés

### 1. Page Clients (`/clients`)

**Fonctionnalités** :
- ✅ Liste des clients avec grille responsive (3 colonnes)
- ✅ Recherche par nom, email ou SIRET
- ✅ Stats rapides (total clients, nouveaux ce mois, avec email, avec SIRET)
- ✅ Ajout/Édition de clients (modal)
- ✅ Suppression de clients avec confirmation
- ✅ Vue détaillée avec statistiques par client :
  * Nombre de factures
  * Nombre de devis
  * Chiffre d'affaires total
  * Montant en attente
  * Dernière facture

**Accès** :
- URL: `/clients`
- Menu latéral: Nouvelle entrée "Clients" (icône Building2, couleur indigo)

**Design** :
- Cartes clients avec avatar (première lettre)
- Gradient teal/cyan pour les boutons
- Modal fullscreen responsive
- Glassmorphism (backdrop-blur)

---

### 2. Composants Réutilisables

#### `BillingStats.tsx`
Composant de statistiques pour la page Facturation.

**Props** :
```typescript
{
  totalInvoices: number;        // Nombre total de factures
  totalQuotes: number;          // Nombre total de devis
  totalRevenue: number;         // CA total
  pendingAmount: number;        // Montant en attente
  paidInvoices: number;         // Factures payées
  overdueInvoices: number;      // Factures en retard
  period?: 'month' | 'year' | 'all';  // Période
}
```

**Affichage** :
- 4 cartes statistiques (Factures, Devis, CA, En attente)
- Icônes colorées
- Trends (↗️ ↘️)
- Format monétaire FR

#### `DocumentFilters.tsx`
Composant de filtrage avancé pour factures/devis.

**Props** :
```typescript
{
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  dateRange?: { start: string; end: string };
  onDateRangeChange?: (range) => void;
  showAdvanced?: boolean;
}
```

**Fonctionnalités** :
- Recherche textuelle
- Filtre par statut (draft, sent, paid, overdue, cancelled)
- Filtre par date (plage)
- Pills pour filtres actifs (avec ✕ pour supprimer)
- Bouton "Réinitialiser" si filtres actifs

---

### 3. Migration SQL

**Fichier** : `supabase/migrations/20251011090000_add_client_id_to_billing.sql`

**Modifications** :
1. Ajoute `client_id uuid` aux tables `invoices` et `quotes`
2. Référence `clients(id)` avec `ON DELETE SET NULL`
3. Index pour performances
4. Triggers de synchronisation automatique :
   - Quand `client_id` est défini → Auto-remplit `client_name`, `client_email`, `client_address`, `client_siret`

**Avantages** :
- Lien CRM → Facturation
- Historique complet par client
- Auto-completion des données client
- Flexibilité (client_id optionnel)

---

## 🚀 Instructions d'Installation

### Étape 1: Appliquer la migration SQL

1. Ouvrez **Supabase Dashboard** → SQL Editor
2. Copiez le contenu de `supabase/migrations/20251011090000_add_client_id_to_billing.sql`
3. Collez et exécutez
4. Vérifiez le message de succès

### Étape 2: Tester la page Clients

1. Lancez l'app web : `npm run dev`
2. Connectez-vous
3. Menu latéral → **Clients** (icône Building2)
4. Cliquez sur **Nouveau client**
5. Remplissez les champs :
   - Nom * (requis)
   - Email * (requis)
   - Téléphone (optionnel)
   - Adresse (optionnel)
   - SIRET (optionnel, 14 chiffres)
6. Cliquez **Créer**
7. Le client apparaît dans la grille
8. Cliquez sur une carte client → Modal détails avec stats

### Étape 3: Utiliser les composants dans Billing.tsx

**Exemple pour BillingStats** :
```tsx
import BillingStats from '../components/BillingStats';

// Dans votre composant
<BillingStats
  totalInvoices={invoices.length}
  totalQuotes={quotes.length}
  totalRevenue={invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0)}
  pendingAmount={invoices.filter(i => i.status === 'sent').reduce((sum, i) => sum + i.total, 0)}
  paidInvoices={invoices.filter(i => i.status === 'paid').length}
  overdueInvoices={invoices.filter(i => i.status === 'overdue').length}
  period="month"
/>
```

**Exemple pour DocumentFilters** :
```tsx
import DocumentFilters from '../components/DocumentFilters';

// États
const [searchQuery, setSearchQuery] = useState('');
const [statusFilter, setStatusFilter] = useState('all');

// Dans votre JSX
<DocumentFilters
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
  statusFilter={statusFilter}
  onStatusFilterChange={setStatusFilter}
  showAdvanced={true}
  dateRange={{ start: '', end: '' }}
  onDateRangeChange={(range) => console.log(range)}
/>
```

---

## 🎨 Prochaines Améliorations Suggérées

### Page Facturation Avancée

1. **Intégrer les composants** :
   ```tsx
   // Remplacer les stats actuelles par
   <BillingStats ... />
   
   // Ajouter les filtres
   <DocumentFilters ... />
   ```

2. **Lier aux clients** :
   - Dans ClientSelector, permettre de sélectionner depuis la table `clients`
   - Auto-remplir les champs si `client_id` sélectionné
   - Afficher historique client dans le formulaire

3. **Actions rapides** :
   - Dupliquer facture/devis
   - Convertir devis → facture
   - Archiver documents
   - Export CSV/PDF groupé

4. **Vue Kanban** (optionnel) :
   - Colonnes par statut (Draft → Sent → Paid)
   - Drag & drop pour changer statut
   - Filtres visuels

---

## 📊 Structure de la Base de Données

### Table `clients`
```sql
- id: uuid (PK)
- user_id: uuid (FK profiles)
- name: text
- email: text
- phone: text
- address: text
- siret: text (14 caractères)
- created_at: timestamptz
- updated_at: timestamptz
```

### Tables `invoices` & `quotes` (modifiées)
```sql
-- Nouvelles colonnes
- client_id: uuid (FK clients, nullable)

-- Triggers automatiques
- sync_client_data_invoice
- sync_client_data_quote
```

**Logique** :
1. Utilisateur sélectionne un client (ou saisit manuellement)
2. Si `client_id` défini → Trigger remplit auto `client_name`, `client_email`, etc.
3. Facture liée au CRM → Stats précises dans page Clients

---

## ✅ Checklist de Validation

- [x] Page Clients créée (`/clients`)
- [x] Route ajoutée dans `App.tsx`
- [x] Menu latéral mis à jour (Layout.tsx)
- [x] Migration SQL créée (client_id + triggers)
- [x] Composant BillingStats créé
- [x] Composant DocumentFilters créé
- [ ] Migration SQL appliquée dans Supabase
- [ ] Page Facturation intégrant BillingStats
- [ ] Page Facturation intégrant DocumentFilters
- [ ] ClientSelector modifié pour utiliser table clients
- [ ] Tests end-to-end (créer client → créer facture liée)

---

## 🐛 Troubleshooting

### Erreur: "clients table does not exist"
→ La migration SQL n'a pas été appliquée
→ Exécuter `20251011090000_add_client_id_to_billing.sql` dans Supabase SQL Editor

### Erreur: "Cannot read property 'name' of null"
→ client_id référence un client supprimé
→ Vérifie le trigger ON DELETE SET NULL

### Les stats client ne s'affichent pas
→ Vérifier les colonnes dans la requête SQL
→ S'assurer que `client_id` est bien lié dans invoices/quotes

### Menu "Clients" n'apparaît pas
→ Vider le cache navigateur (Ctrl+Shift+R)
→ Vérifier que Building2 est importé dans Layout.tsx

---

## 📞 Support

Pour toute question :
1. Vérifier les fichiers créés :
   - `src/pages/Clients.tsx`
   - `src/components/BillingStats.tsx`
   - `src/components/DocumentFilters.tsx`
   - `supabase/migrations/20251011090000_add_client_id_to_billing.sql`

2. Vérifier la console navigateur pour les erreurs TypeScript

3. Tester les requêtes SQL directement dans Supabase SQL Editor

---

**Date de création** : 11 octobre 2025
**Version** : 1.0
**Status** : ✅ Composants créés, migration prête, à intégrer dans Billing.tsx
