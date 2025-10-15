# 🎉 Page Facturation Avancée - Guide Complet

## ✅ Améliorations Implémentées

### 1. **Statistiques Modernes** 📊
Remplacement des 4 anciennes cartes par le composant `BillingStats` :
- Design moderne avec gradients et icônes colorées
- Indicateurs de tendance (↗️ ↘️)
- Format monétaire français
- Responsive (1 à 4 colonnes)

### 2. **Filtres Avancés** 🔍
Ajout du composant `DocumentFilters` :
- Barre de recherche épurée
- Filtre par statut (dropdown)
- Pills pour filtres actifs (avec ✕ pour supprimer)
- Bouton "Réinitialiser" automatique
- Prêt pour filtres par date (showAdvanced)

### 3. **Changement de Statut Interactif** 🔄
- **Dropdown dans la colonne Statut** : Cliquez sur le statut → Menu déroulant
- **Options selon le type** :
  * Factures : Brouillon, Envoyé, Payé, En retard, Annulé
  * Devis : Brouillon, Envoyé, Accepté, Refusé, Expiré, Annulé
- **Confirmation** : Popup de confirmation avant changement
- **Feedback** : Message de succès/erreur

### 4. **Actions Rapides** ⚡
Nouveau bouton "⋮" (MoreVertical) avec menu déroulant :

#### **Dupliquer** 📋
- Crée une copie du document avec nouveau numéro
- Copie tous les items (lignes de produits)
- Date actuelle, statut "Brouillon"
- Conserve toutes les informations client

#### **Convertir Devis → Facture** 🔄 (uniquement pour devis)
- Transforme un devis en facture
- Génère numéro de facture automatique
- Copie tous les items
- Met à jour le devis en statut "Accepté"
- Bascule automatiquement sur l'onglet Factures

#### **Archiver** 🗄️
- Marque le document comme "Annulé"
- Confirmation avant archivage
- Le document reste visible (filtre "Annulé")

---

## 🎨 Aperçu Visuel

```
┌──────────────────────────────────────────────────────────┐
│ 🧾 Facturation                   [📄 Mentions] [+ Nouveau]│
│ Gérez vos devis et factures...                           │
│                                                           │
│ [📄 Factures] [📝 Devis]                                  │
├──────────────────────────────────────────────────────────┤
│ ┌────────┬────────┬────────┬────────┐  ← NOUVEAUX STATS │
│ │ 📄 15  │ 📝 8   │ 💶 25k │ ⏰ 5k  │                     │
│ │ Factures│ Devis │ CA     │ Attente│                     │
│ │ au total│ total │ 12 payé│ 2 retard│                    │
│ └────────┴────────┴────────┴────────┘                     │
├──────────────────────────────────────────────────────────┤
│ [🔍 Rechercher...]  [📋 Tous les statuts ▼]  [🔄]        │
│ 🏷️ Filtres: [Recherche: "ACME" ✕] [Statut: Payé ✕]      │  ← NOUVEAUX FILTRES
├──────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐   │
│ │ N° │ Client │ Date │ Montant │ Statut ▼ │ Actions │   │
│ ├────────────────────────────────────────────────────┤   │
│ │ F- │ ACME   │ ... │ 5,000€  │[Payé ▼] │ 👁️📄📧⋮│   │
│ │    │        │     │         │         │  └─────┐ │   │
│ │    │        │     │         │         │ ┌──────▼─┐│   │
│ │    │        │     │         │         │ │📋 Dupliquer│   ← MENU ACTIONS
│ │    │        │     │         │         │ │🔄 Convertir│
│ │    │        │     │         │         │ │🗄️ Archiver │
│ │    │        │     │         │         │ └─────────┘│
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## 🔧 Détails Techniques

### Nouveaux Imports
```tsx
import BillingStats from '../components/BillingStats';
import DocumentFilters from '../components/DocumentFilters';
import { Copy, ArrowRightLeft, Archive, MoreVertical } from 'lucide-react';
```

### Nouveaux États
```tsx
const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
```

### Nouvelles Fonctions

#### 1. `handleStatusChange(docId, newStatus)`
```typescript
- Confirmation popup
- UPDATE dans Supabase (invoices ou quotes)
- Reload documents
- Feedback utilisateur
```

#### 2. `handleDuplicate(doc)`
```typescript
- Génère nouveau numéro (F-2025-XXXX)
- INSERT document avec status='draft'
- Copie tous les items (invoice_items/quote_items)
- Success alert
```

#### 3. `handleConvertToInvoice(quote)`
```typescript
- Génère numéro facture
- INSERT dans invoices
- Copie quote_items → invoice_items
- UPDATE quote status='accepted'
- Bascule vers onglet Factures
```

#### 4. `handleArchive(docId)`
```typescript
- Confirmation popup
- UPDATE status='cancelled'
- Document reste visible (filtre)
```

---

## 🚀 Utilisation

### Changer le Statut
1. Cliquez sur le **dropdown statut** (colonne Statut)
2. Sélectionnez le nouveau statut
3. Confirmez dans la popup
4. ✅ Statut mis à jour

### Dupliquer un Document
1. Cliquez sur **⋮** (3 points verticaux)
2. Cliquez **📋 Dupliquer**
3. Confirmez
4. ✅ Nouveau document créé avec numéro unique

### Convertir Devis en Facture
1. Dans l'onglet **Devis**, cliquez sur **⋮**
2. Cliquez **🔄 Convertir en facture**
3. Confirmez
4. ✅ Facture créée, devis marqué "Accepté"
5. Redirection automatique vers onglet Factures

### Archiver un Document
1. Cliquez sur **⋮**
2. Cliquez **🗄️ Archiver** (texte rouge)
3. Confirmez
4. ✅ Document archivé (statut "Annulé")

---

## 📊 Flux de Travail Recommandé

### Scénario 1 : Nouveau Client
```
1. Créer DEVIS → Envoyé → Client accepte
2. Convertir en FACTURE → Envoyée → Payée
```

### Scénario 2 : Client Récurrent
```
1. Dupliquer dernière facture
2. Modifier montants/dates
3. Envoyer
```

### Scénario 3 : Annulation
```
1. Archiver le document
2. Créer nouvelle version (si nécessaire)
```

---

## 🎯 Prochaines Améliorations (Suggestions)

### 1. **Lier ClientSelector à la Page Clients**
- Dropdown avec liste clients depuis table `clients`
- Auto-remplissage des champs
- Bouton "+ Nouveau client" qui ouvre modal

### 2. **Export Groupé**
- Sélectionner plusieurs documents (checkbox)
- Télécharger ZIP avec tous les PDFs
- Ou envoyer tous par email

### 3. **Rappels Automatiques**
- Email automatique si facture en retard (overdue)
- Notifications dans l'app
- Dashboard avec factures à relancer

### 4. **Modèles de Documents**
- Sauvegarder modèles de factures
- Appliquer modèle lors de création
- Items pré-remplis

### 5. **Historique Client**
- Depuis la page Clients, voir toutes les factures
- Statistiques par client (CA, factures en retard)
- Graphiques d'évolution

### 6. **Vue Kanban** (Optionnel)
- Colonnes par statut (Brouillon → Envoyé → Payé)
- Drag & drop pour changer statut
- Filtres visuels

---

## ✅ Checklist de Validation

- [x] BillingStats intégré et fonctionnel
- [x] DocumentFilters intégré et fonctionnel
- [x] Changement de statut avec dropdown
- [x] Bouton Dupliquer fonctionnel
- [x] Bouton Convertir (devis → facture) fonctionnel
- [x] Bouton Archiver fonctionnel
- [x] Menu actions avec overlay (ferme au clic extérieur)
- [x] Confirmations avant actions critiques
- [x] Feedback utilisateur (alerts success/error)
- [x] Aucune erreur TypeScript

---

## 🐛 Troubleshooting

### Le menu actions ne se ferme pas
→ Vérifier l'overlay `<div className="fixed inset-0 z-10" onClick={...} />`
→ Z-index du menu doit être > overlay (20 > 10)

### La conversion devis→facture échoue
→ Vérifier que les colonnes `invoice_items` correspondent à `quote_items`
→ Check les foreign keys dans Supabase

### Le statut ne change pas
→ Vérifier les permissions RLS sur `invoices` et `quotes`
→ User doit être owner (user_id = auth.uid())

### Dupliquer crée des doublons de numéro
→ Timestamp `Date.now()` assure unicité
→ Si problème : ajouter compteur séquentiel dans profiles

---

## 📞 Support

Pour toute question :
1. Vérifier les fichiers modifiés :
   - ✅ `src/pages/Billing.tsx` (1125 lignes)
   - ✅ `src/components/BillingStats.tsx`
   - ✅ `src/components/DocumentFilters.tsx`
   - ✅ `supabase/migrations/20251011090000_add_client_id_to_billing.sql`

2. Vérifier la console navigateur pour erreurs

3. Tester les requêtes SQL dans Supabase SQL Editor

---

**Date de création** : 11 octobre 2025  
**Version** : 2.0  
**Status** : ✅ Facturation avancée opérationnelle
