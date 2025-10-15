# 🎯 CRM Unifié - Guide Complet

## ✨ Nouvelle Page CRM Unifiée

Nous avons fusionné **3 pages** en une seule interface moderne et cohérente :

### 📦 Pages Fusionnées
1. **Clients** (`/clients`)
2. **Devis** (`/devis`)
3. **Facturation** (`/billing`)

### 🎨 Nouvelle Route
- **URL:** `http://localhost:5174/crm`
- **Menu:** "CRM & Commercial" dans la sidebar

---

## 🏗️ Architecture

### Fichier Principal
**`src/pages/CRM.tsx`**

```tsx
import Clients from './Clients';
import QuoteGenerator from './QuoteGenerator';
import Billing from './Billing';

// 3 onglets avec navigation fluide
const tabs = ['clients', 'quotes', 'invoices'];
```

### Structure
```
┌─────────────────────────────────────────┐
│  🏢 CRM & Gestion Commerciale          │
│  ┌─────────┬─────────┬─────────┐      │
│  │ Clients │ Devis   │ Facturation│    │
│  └─────────┴─────────┴─────────┘      │
├─────────────────────────────────────────┤
│                                         │
│         [Contenu de l'onglet actif]    │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🎯 Fonctionnalités

### Onglet 1 : Clients 👥
- ✅ Liste de tous les clients
- ✅ Recherche par nom, email, SIRET
- ✅ Création/Édition/Suppression
- ✅ Auto-complétion INSEE (SIRET)
- ✅ Grilles tarifaires personnalisées
- ✅ **Bouton "Créer un devis"** → Redirige vers onglet Devis

### Onglet 2 : Devis 📄
- ✅ Générateur de devis complet
- ✅ Multi-trajets (plusieurs lignes)
- ✅ Autocomplete adresses française (gratuit)
- ✅ Calcul GPS automatique (OpenRouteService)
- ✅ 3 types de véhicules (Léger/Utilitaire/Lourd)
- ✅ Prix HT/TTC automatiques
- ✅ Numérotation auto (DEVIS-2025-001)
- ✅ Sauvegarde en base de données
- ✅ Export PDF professionnel

### Onglet 3 : Facturation 💰
- ✅ Gestion factures et devis
- ✅ Statuts (Brouillon/Envoyé/Payé/Annulé)
- ✅ Recherche et filtres avancés
- ✅ Configuration TVA (Normale/Franchise/Micro)
- ✅ Mentions légales automatiques
- ✅ Génération PDF
- ✅ Envoi par email
- ✅ Statistiques et totaux

---

## 🔄 Redirection depuis Clients

### Ancien Comportement
```tsx
// Dans la page Clients (AVANT)
<button onClick={() => setShowQuoteModal(true)}>
  Créer un devis
</button>
// ❌ Modal qui s'ouvrait
```

### Nouveau Comportement
```tsx
// Dans la page Clients (APRÈS)
<button onClick={() => navigate('/crm?tab=quotes&client=' + client.id)}>
  Créer un devis
</button>
// ✅ Redirection vers onglet Devis avec client pré-sélectionné
```

---

## 🎨 Design Moderne

### Header CRM
```tsx
<div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600">
  <h1>🏢 CRM & Gestion Commerciale</h1>
  
  {/* Onglets avec animation */}
  <button className={isActive ? 'bg-white scale-105' : 'bg-white/10'}>
    <Icon /> {label}
  </button>
</div>
```

### Couleurs des Onglets
- **Clients:** `from-indigo-500 to-purple-500` 💜
- **Devis:** `from-blue-500 to-cyan-500` 💙
- **Facturation:** `from-green-500 to-emerald-500` 💚

---

## 📊 Modifications Effectuées

### 1. Création de `CRM.tsx`
```tsx
// Wrapper principal avec 3 onglets
export default function CRM() {
  const [activeTab, setActiveTab] = useState<'clients' | 'quotes' | 'invoices'>('clients');
  
  return (
    <div>
      {/* Tabs Navigation */}
      {activeTab === 'clients' && <Clients />}
      {activeTab === 'quotes' && <QuoteGenerator />}
      {activeTab === 'invoices' && <Billing />}
    </div>
  );
}
```

### 2. Modification de `Clients.tsx`
- ✅ Ajout `useNavigate()` depuis react-router-dom
- ✅ Retrait du wrapper `min-h-screen bg-gradient-to-br` (car déjà dans CRM)
- ✅ Bouton "Créer un devis" redirige vers `/crm?tab=quotes&client=XXX`

### 3. Modification de `QuoteGenerator.tsx`
- ✅ Retrait du wrapper de fond (car déjà dans CRM)
- ✅ Garde toutes ses fonctionnalités

### 4. Modification de `Billing.tsx`
- ✅ Retrait du wrapper de fond (car déjà dans CRM)
- ✅ Garde toutes ses fonctionnalités

### 5. Modification de `Layout.tsx`
- ✅ Retrait des liens "Clients" et "Facturation"
- ✅ Ajout du lien "CRM & Commercial" unique

### 6. Modification de `App.tsx`
- ✅ Import de `CRM` depuis `./pages/CRM`
- ✅ Ajout route `/crm` avec Layout
- ✅ Conservation routes `/clients`, `/devis`, `/billing` pour compatibilité

---

## 🚀 Comment Utiliser

### Méthode 1 : Menu Sidebar
```
1. Cliquez sur "CRM & Commercial" dans le menu
2. Naviguez entre les onglets Clients/Devis/Facturation
```

### Méthode 2 : URL Directe
```
http://localhost:5174/crm
http://localhost:5174/crm?tab=clients
http://localhost:5174/crm?tab=quotes
http://localhost:5174/crm?tab=invoices
```

### Méthode 3 : Depuis un Client
```
1. Page CRM → Onglet Clients
2. Cliquez sur "Créer un devis" sur une carte client
3. Redirection automatique vers onglet Devis avec client pré-sélectionné
```

---

## 📈 Avantages de la Fusion

### ✅ Cohérence
- Une seule interface pour toute la gestion commerciale
- Navigation fluide entre Clients → Devis → Factures
- Design unifié et moderne

### ✅ Productivité
- Moins de clics pour créer un devis depuis un client
- Tout au même endroit
- Workflow naturel : Client → Devis → Facture

### ✅ UX/UI
- Header gradienté unifié
- Onglets avec animation et indicateurs
- Moins d'entrées de menu (simplifié)

### ✅ Maintenance
- Code centralisé
- Réutilisation des composants
- Moins de duplication

---

## 🎯 Workflow Typique

```
1. CRM → Onglet Clients
   ↓
2. Créer/Gérer les clients
   ↓
3. Cliquer "Créer un devis"
   ↓
4. Auto-redirection vers Onglet Devis
   ↓
5. Client pré-sélectionné
   ↓
6. Saisie des trajets avec autocomplete
   ↓
7. Calcul GPS automatique
   ↓
8. Génération du devis PDF
   ↓
9. Basculer sur Onglet Facturation
   ↓
10. Convertir le devis en facture
    ↓
11. Envoi au client
```

---

## 🔧 Configuration

### Query Parameters
```typescript
// Ouvrir directement sur l'onglet Devis
/crm?tab=quotes

// Ouvrir avec client pré-sélectionné
/crm?tab=quotes&client=123e4567-e89b-12d3-a456-426614174000

// Ouvrir sur Facturation
/crm?tab=invoices
```

### État Local
```typescript
const [activeTab, setActiveTab] = useState<TabType>('clients');

// Lire le query parameter au mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab) setActiveTab(tab as TabType);
}, []);
```

---

## 📊 Base de Données

### Tables Concernées
1. **`clients`** - Informations clients
2. **`quotes`** - Devis générés
3. **`invoices`** - Factures émises
4. **`pricing_grids`** - Grilles tarifaires

### Relations
```sql
quotes.client_id → clients.id
invoices.client_id → clients.id (indirect via client_name)
pricing_grids.client_id → clients.id (nullable pour grille globale)
```

---

## 🎨 Personnalisation

### Changer les Couleurs
```tsx
// Dans CRM.tsx
const tabs = [
  { color: 'from-indigo-500 to-purple-500' },  // Clients
  { color: 'from-blue-500 to-cyan-500' },      // Devis
  { color: 'from-green-500 to-emerald-500' },  // Facturation
];
```

### Changer l'Ordre
```tsx
// Inverser l'ordre des onglets
const tabs = [
  { id: 'invoices', label: 'Facturation' },
  { id: 'quotes', label: 'Devis' },
  { id: 'clients', label: 'Clients' },
];
```

---

## 🐛 Dépannage

### L'onglet ne change pas
- Vérifiez que `activeTab` est bien mis à jour
- Regardez la console pour des erreurs

### Le client n'est pas pré-sélectionné
- Vérifiez le query parameter `?client=XXX`
- Vérifiez que `QuoteGenerator` lit ce paramètre

### Les pages sont vides
- Vérifiez que les imports sont corrects
- Vérifiez que les wrappers de fond ont été retirés

---

## ✨ Résumé

✅ **3 pages fusionnées** en une interface CRM unifiée
✅ **Navigation par onglets** avec animations
✅ **Redirection intelligente** Clients → Devis
✅ **Design moderne** avec gradients et glassmorphism
✅ **Menu simplifié** avec un seul lien "CRM & Commercial"
✅ **Workflow optimisé** pour la gestion commerciale

**Accédez maintenant à:** `http://localhost:5174/crm` 🚀
