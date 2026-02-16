# 📋 Guide du Générateur de Devis

## 🎯 Deux Versions Disponibles

Il existe **2 versions** du Générateur de Devis dans l'application :

---

## 1️⃣ Version COMPOSANT (Modal dans Clients)

**Fichier:** `src/components/QuoteGenerator.tsx`

### 📍 Où le trouver ?
- Page **Clients** (`http://localhost:5174/clients`)
- Bouton "Générer un devis" sur chaque carte client

### ✨ Caractéristiques
- ✅ **Modal popup** (s'ouvre par-dessus la page)
- ✅ **Auto-complete française** avec `AddressAutocomplete`
- ✅ API gratuite `api-adresse.data.gouv.fr`
- ✅ Géolocalisation automatique
- ✅ Pré-rempli avec les infos du client
- ✅ Calcul de distance automatique
- ✅ Génération PDF instantanée
- ⚠️ Utilise encore **Mapbox** pour le calcul de distance (à migrer vers OpenRouteService)

### 📋 Fonctionnement
1. Cliquez sur un client dans la page Clients
2. Bouton "Générer un devis"
3. Modal s'ouvre avec le nom du client
4. Tapez les adresses avec autocomplete française
5. Calcul automatique de la distance
6. Sélection du type de véhicule
7. Génération et téléchargement PDF

---

## 2️⃣ Version PAGE (Route Dédiée) ⭐ NOUVELLE

**Fichier:** `src/pages/QuoteGenerator.tsx`

### 📍 Où le trouver ?
- **Route directe:** `http://localhost:5174/devis`
- Accessible depuis le menu de navigation

### ✨ Caractéristiques
- ✅ **Page complète** dédiée
- ✅ **Auto-complete française** avec `AddressAutocomplete`
- ✅ API gratuite `api-adresse.data.gouv.fr`
- ✅ **Multi-trajets** (ajouter plusieurs lignes)
- ✅ **Sélection client** depuis une liste déroulante
- ✅ **Grille tarifaire personnalisée** ou globale
- ✅ **Calcul GPS automatique** avec OpenRouteService
- ✅ Distance et durée en temps réel
- ✅ **Total général** calculé automatiquement
- ✅ Numérotation automatique des devis
- ✅ Date de validité configurable
- ✅ Notes additionnelles
- ✅ Sauvegarde en base de données

### 📋 Fonctionnalités Avancées
- **Multi-trajets:** Ajoutez autant de lignes que nécessaire
- **Calcul automatique:** Chaque trajet calcule sa distance via GPS
- **3 types de véhicules:** Léger 🚗 / Utilitaire 🚐 / Lourd 🚛
- **Prix HT et TTC:** Calcul automatique avec TVA
- **Grilles tarifaires:** Utilise les paliers de distance configurés
- **Marges et suppléments:** Appliqués automatiquement
- **Export PDF:** Génération de devis professionnel

---

## 🔄 Différences Clés

| Critère | Version Composant (Modal) | Version Page (Route) |
|---------|--------------------------|----------------------|
| **Localisation** | Dans page Clients | Route `/devis` |
| **Type UI** | Modal popup | Page complète |
| **Trajets** | 1 seul | Multi-trajets ✅ |
| **Client** | Pré-sélectionné | Liste déroulante |
| **Autocomplete** | ✅ API française | ✅ API française |
| **Distance API** | Mapbox ⚠️ | OpenRouteService ✅ |
| **Sauvegarde BDD** | ❌ Non | ✅ Oui (table quotes) |
| **Grille tarifaire** | Récupération auto | Sélection manuelle |
| **Numérotation** | ❌ Non | ✅ Auto (DEVIS-2025-001) |
| **Notes** | ❌ Non | ✅ Oui |
| **PDF** | ✅ Oui | ✅ Oui |

---

## 🚀 Comment Accéder

### Méthode 1: Via Clients (Modal)
```
1. Allez sur http://localhost:5174/clients
2. Cliquez sur "Générer un devis" sur une carte client
3. Modal s'ouvre instantanément
```

### Méthode 2: Route Directe (Page) ⭐ RECOMMANDÉ
```
1. Allez directement sur http://localhost:5174/devis
2. Ou ajoutez un lien dans le menu Layout.tsx
3. Page complète avec toutes les fonctionnalités
```

---

## 📊 Base de Données

### Table `quotes` (utilisée par la version PAGE)
```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  client_id UUID REFERENCES clients,
  quote_number TEXT UNIQUE,
  quote_date DATE,
  validity_days INTEGER,
  items JSONB, -- Tableau des trajets
  total_ht NUMERIC,
  total_ttc NUMERIC,
  total_distance NUMERIC, -- Calculé automatiquement
  pricing_grid_id UUID REFERENCES pricing_grids,
  additional_notes TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Exemple de données `items` (JSONB)
```json
[
  {
    "pickup_address": "10 Rue de Rivoli, Paris",
    "pickup_lat": 48.856614,
    "pickup_lng": 2.352222,
    "delivery_address": "Tour Eiffel, Paris",
    "delivery_lat": 48.858370,
    "delivery_lng": 2.294481,
    "vehicle_type": "light",
    "distance": 3.45,
    "duration": 12,
    "price_ht": 45.00,
    "price_ttc": 54.00
  }
]
```

---

## 🎨 Autocomplete Français

Les **deux versions** utilisent maintenant `AddressAutocomplete` :

```tsx
<AddressAutocomplete
  value={address}
  onChange={(address, lat, lng) => setAddress(address)}
  placeholder="Ex: 10 Rue de Rivoli, Paris"
  required
/>
```

### Fonctionnalités :
- ✅ API gratuite `api-adresse.data.gouv.fr`
- ✅ Aucune limite de requêtes
- ✅ Suggestions en temps réel (après 3 caractères)
- ✅ Géolocalisation avec bouton GPS 📍
- ✅ Navigation clavier (flèches ↑↓, Enter, Escape)
- ✅ Badges de type (🏠 Numéro, 🛣️ Rue, 🏙️ Ville)
- ✅ Coordonnées GPS automatiques
- ✅ Format: "Numéro, Rue, Code Postal Ville"

---

## 🔧 Migration Recommandée

### TODO: Migrer le composant Modal vers OpenRouteService

**Fichier à modifier:** `src/components/QuoteGenerator.tsx`

**Remplacer:**
```typescript
import { calculateDistance } from '../services/mapboxService';
```

**Par:**
```typescript
import { getRouteFromOpenRouteService } from '../lib/services/openRouteService';
```

**Et modifier la fonction:**
```typescript
const handleCalculateDistance = async () => {
  // ... validation ...
  
  const result = await getRouteFromOpenRouteService(
    fromLat, fromLng,
    toLat, toLng,
    'driving-car'
  );
  
  setDistance(result.distance);
  setDuration(result.duration);
};
```

---

## 📝 Recommandations

### Pour les utilisateurs :
- ✅ **Utilisez la version PAGE** (`/devis`) pour les devis complets
- ✅ **Multi-trajets, sauvegarde, numérotation automatique**
- ⚠️ Utilisez la version Modal seulement pour un devis rapide 1 trajet

### Pour les développeurs :
- 🔄 Migrer le composant Modal vers OpenRouteService
- 🎯 Ajouter un lien menu vers `/devis` dans Layout.tsx
- 📊 Considérer fusionner les deux versions à long terme
- 🗄️ Toujours sauvegarder les devis en BDD (table `quotes`)

---

## 🎉 Résumé

✅ **Autocomplete français ajouté** aux 2 versions
✅ **Route `/devis` créée** pour accès direct
✅ **Version PAGE** : Multi-trajets, sauvegarde BDD, OpenRouteService
⚠️ **Version Modal** : À migrer vers OpenRouteService

**Accédez maintenant à:** `http://localhost:5174/devis` 🚀
