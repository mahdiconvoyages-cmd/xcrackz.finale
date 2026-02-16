# 💶 SYSTÈME GRILLES TARIFAIRES - SPÉCIFICATIONS TECHNIQUES

*Date: 14 Octobre 2025*

---

## 📋 CAHIER DES CHARGES

### Objectif
Permettre à chaque convoyeur de créer et gérer des grilles tarifaires personnalisées par client pour automatiser le calcul de devis.

### Fonctionnalités Clés
1. **Grille Globale** - Tarification par défaut pour tous les clients
2. **Grilles Spécifiques** - Tarification personnalisée par client
3. **Calcul Automatique** - Intégration Mapbox pour distance réelle
4. **Devis PDF** - Génération automatique avec tarifs appliqués

---

## 🗄️ STRUCTURE BASE DE DONNÉES

### Table: `pricing_grids`
```sql
CREATE TABLE pricing_grids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT false,
  name VARCHAR(255) NOT NULL,
  
  -- Paliers de distance (forfaits HT)
  tier_1_50_light DECIMAL(10, 2),      -- 1-50km véhicule léger
  tier_1_50_utility DECIMAL(10, 2),    -- 1-50km utilitaire
  tier_1_50_heavy DECIMAL(10, 2),      -- 1-50km lourd
  
  tier_51_100_light DECIMAL(10, 2),    -- 51-100km léger
  tier_51_100_utility DECIMAL(10, 2),
  tier_51_100_heavy DECIMAL(10, 2),
  
  tier_101_150_light DECIMAL(10, 2),   -- 101-150km léger
  tier_101_150_utility DECIMAL(10, 2),
  tier_101_150_heavy DECIMAL(10, 2),
  
  tier_151_300_light DECIMAL(10, 2),   -- 151-300km léger
  tier_151_300_utility DECIMAL(10, 2),
  tier_151_300_heavy DECIMAL(10, 2),
  
  -- 301km+ → Tarif au kilomètre
  rate_per_km_light DECIMAL(10, 2),
  rate_per_km_utility DECIMAL(10, 2),
  rate_per_km_heavy DECIMAL(10, 2),
  
  -- Marges et suppléments
  margin_percentage DECIMAL(5, 2) DEFAULT 0,  -- Marge en %
  fixed_supplement DECIMAL(10, 2) DEFAULT 0,  -- Supplément fixe €
  supplement_notes TEXT,                       -- Ex: "Péage, urgence"
  
  -- TVA
  vat_rate DECIMAL(5, 2) DEFAULT 20.00,       -- TVA 20%
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte: Un seul global par user
  CONSTRAINT unique_global_per_user UNIQUE (user_id, is_global) WHERE is_global = true,
  -- Contrainte: Une seule grille par client
  CONSTRAINT unique_grid_per_client UNIQUE (user_id, client_id) WHERE client_id IS NOT NULL
);

-- Index
CREATE INDEX idx_pricing_grids_user_id ON pricing_grids(user_id);
CREATE INDEX idx_pricing_grids_client_id ON pricing_grids(client_id);
CREATE INDEX idx_pricing_grids_global ON pricing_grids(is_global) WHERE is_global = true;

-- RLS Policies
ALTER TABLE pricing_grids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pricing grids"
  ON pricing_grids FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pricing grids"
  ON pricing_grids FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pricing grids"
  ON pricing_grids FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pricing grids"
  ON pricing_grids FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger auto-update updated_at
CREATE OR REPLACE FUNCTION update_pricing_grids_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pricing_grids_updated_at
  BEFORE UPDATE ON pricing_grids
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_grids_updated_at();
```

---

## 🧮 LOGIQUE DE CALCUL

### Algorithme

```typescript
function calculateQuote(params: {
  distance: number;        // Distance en km (via Mapbox)
  vehicleType: 'light' | 'utility' | 'heavy';
  clientId: string;
  userId: string;
}): QuoteResult {
  
  // 1. Récupérer grille tarifaire
  let grid = getPricingGrid(userId, clientId); // Grille spécifique client
  if (!grid) {
    grid = getGlobalPricingGrid(userId); // Fallback grille globale
  }
  if (!grid) {
    throw new Error('Aucune grille tarifaire configurée');
  }
  
  // 2. Déterminer tarif selon distance et type véhicule
  let basePrice = 0;
  const { distance, vehicleType } = params;
  
  if (distance <= 50) {
    basePrice = grid[`tier_1_50_${vehicleType}`];
  } else if (distance <= 100) {
    basePrice = grid[`tier_51_100_${vehicleType}`];
  } else if (distance <= 150) {
    basePrice = grid[`tier_101_150_${vehicleType}`];
  } else if (distance <= 300) {
    basePrice = grid[`tier_151_300_${vehicleType}`];
  } else {
    // 301km+ → au kilomètre
    basePrice = distance * grid[`rate_per_km_${vehicleType}`];
  }
  
  // 3. Appliquer marge
  const marginAmount = (basePrice * grid.margin_percentage) / 100;
  const priceWithMargin = basePrice + marginAmount;
  
  // 4. Ajouter supplément fixe
  const totalHT = priceWithMargin + grid.fixed_supplement;
  
  // 5. Calculer TVA
  const vatAmount = (totalHT * grid.vat_rate) / 100;
  const totalTTC = totalHT + vatAmount;
  
  return {
    distance,
    vehicleType,
    basePrice,
    marginPercentage: grid.margin_percentage,
    marginAmount,
    fixedSupplement: grid.fixed_supplement,
    totalHT,
    vatRate: grid.vat_rate,
    vatAmount,
    totalTTC,
    gridName: grid.name,
    calculation: {
      tier: getTierLabel(distance),
      formula: getFormulaExplanation(distance, basePrice, grid)
    }
  };
}
```

---

## 🎨 INTERFACE UTILISATEUR

### Page Clients - Section Grille Tarifaire

```tsx
// Affichage par client
<div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-bold text-slate-900">
      💶 Grille Tarifaire
    </h3>
    <button onClick={() => openPricingGridModal(client.id)}>
      Configurer
    </button>
  </div>
  
  {client.pricing_grid ? (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">
        <strong>Grille:</strong> {client.pricing_grid.name}
      </p>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>1-50km: {client.pricing_grid.tier_1_50_light}€</div>
        <div>51-100km: {client.pricing_grid.tier_51_100_light}€</div>
        <div>101-150km: {client.pricing_grid.tier_101_150_light}€</div>
      </div>
      <button onClick={() => createQuoteWithGrid(client.id)}>
        Créer un devis
      </button>
    </div>
  ) : (
    <p className="text-sm text-slate-500 italic">
      Grille globale utilisée par défaut
    </p>
  )}
</div>
```

### Modal Configuration Grille

```tsx
<PricingGridModal>
  <h2>Grille Tarifaire - {clientName}</h2>
  
  <select value={vehicleType}>
    <option value="light">Véhicule Léger</option>
    <option value="utility">Utilitaire</option>
    <option value="heavy">Lourd</option>
  </select>
  
  <div className="grid grid-cols-2 gap-4">
    <label>
      1-50km (forfait HT)
      <input type="number" {...} />
    </label>
    <label>
      51-100km (forfait HT)
      <input type="number" {...} />
    </label>
    <label>
      101-150km (forfait HT)
      <input type="number" {...} />
    </label>
    <label>
      151-300km (forfait HT)
      <input type="number" {...} />
    </label>
    <label>
      301km+ (€/km)
      <input type="number" {...} />
    </label>
  </div>
  
  <div>
    <label>Marge (%)</label>
    <input type="number" {...} />
  </div>
  
  <div>
    <label>Supplément fixe (€)</label>
    <input type="number" {...} />
    <textarea placeholder="Notes (péage, urgence...)" {...} />
  </div>
  
  <button onClick={copyFromGlobalGrid}>
    Copier depuis la grille globale
  </button>
  
  <button onClick={savePricingGrid}>
    Sauvegarder
  </button>
</PricingGridModal>
```

---

## 🔗 INTÉGRATION MAPBOX

### Calcul Distance Automatique

```typescript
import mapboxgl from 'mapbox-gl';

async function calculateDistance(from: string, to: string): Promise<number> {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromCoords};${toCoords}?access_token=${MAPBOX_TOKEN}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  const distanceMeters = data.routes[0].distance;
  const distanceKm = Math.round(distanceMeters / 1000);
  
  return distanceKm;
}
```

---

## 📄 GÉNÉRATION DEVIS PDF

### Template

```typescript
import jsPDF from 'jspdf';

function generateQuotePDF(quote: QuoteResult, client: Client) {
  const doc = new jsPDF();
  
  doc.text('DEVIS DE TRANSPORT', 105, 20, { align: 'center' });
  doc.text(`Client: ${client.name}`, 20, 40);
  doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, 50);
  
  doc.text('Détail du calcul:', 20, 70);
  doc.text(`Distance: ${quote.distance} km`, 30, 80);
  doc.text(`Type véhicule: ${quote.vehicleType}`, 30, 90);
  doc.text(`Palier tarifaire: ${quote.calculation.tier}`, 30, 100);
  doc.text(`Prix de base HT: ${quote.basePrice.toFixed(2)} €`, 30, 110);
  doc.text(`Marge (${quote.marginPercentage}%): ${quote.marginAmount.toFixed(2)} €`, 30, 120);
  doc.text(`Supplément: ${quote.fixedSupplement.toFixed(2)} €`, 30, 130);
  
  doc.text(`TOTAL HT: ${quote.totalHT.toFixed(2)} €`, 30, 150);
  doc.text(`TVA (${quote.vatRate}%): ${quote.vatAmount.toFixed(2)} €`, 30, 160);
  doc.text(`TOTAL TTC: ${quote.totalTTC.toFixed(2)} €`, 30, 170);
  
  doc.save(`devis_${client.name}_${Date.now()}.pdf`);
}
```

---

## ✅ PLAN D'IMPLÉMENTATION

### Phase 1: Base de données
1. ✅ Créer migration `create_pricing_grids.sql`
2. ✅ Appliquer migration Supabase
3. ✅ Tester RLS policies

### Phase 2: Service
1. ✅ Créer `pricingGridService.ts`
2. ✅ Fonctions CRUD grilles
3. ✅ Fonction `calculateQuote()`
4. ✅ Intégration Mapbox distance

### Phase 3: UI
1. ✅ Modifier `Clients.tsx` - Section grille par client
2. ✅ Créer `PricingGridModal.tsx` - Configuration
3. ✅ Créer `QuoteGenerator.tsx` - Génération devis
4. ✅ Intégrer PDF export

### Phase 4: Tests
1. ✅ Tester création grille globale
2. ✅ Tester création grille client
3. ✅ Tester calcul devis (tous paliers)
4. ✅ Tester génération PDF

---

**Prêt pour implémentation!** 🚀
