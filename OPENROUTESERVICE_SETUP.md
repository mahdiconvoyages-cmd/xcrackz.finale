# 🗺️ Configuration OpenRouteService pour le Calcul de Distance

## 📋 Étapes de Configuration

### 1️⃣ Obtenir une Clé API OpenRouteService

1. Allez sur: https://openrouteservice.org/dev/#/signup
2. Créez un compte gratuit
3. Confirmez votre email
4. Connectez-vous et allez dans **"Dashboard"**
5. Créez un nouveau **Token** (API Key)
6. Copiez votre clé API (format: `5b3ce3597851110001cf6248...`)

**Limites gratuites:**
- 2 000 requêtes par jour
- 40 requêtes par minute
- Parfait pour une application de convoyage moyenne

### 2️⃣ Configurer la Clé API dans Supabase

#### Option A: Via Supabase Dashboard (Recommandé)

1. Allez sur votre projet Supabase: https://supabase.com/dashboard
2. Naviguez vers **"Edge Functions"** → **"Settings"**
3. Ajoutez un nouveau **Secret**:
   - Nom: `OPENROUTESERVICE_API_KEY`
   - Valeur: Votre clé API OpenRouteService
4. Sauvegardez

#### Option B: Via CLI Supabase

```bash
# Définir le secret
supabase secrets set OPENROUTESERVICE_API_KEY=votre_cle_api_ici

# Vérifier les secrets
supabase secrets list
```

### 3️⃣ Déployer la Edge Function

```bash
# Déployer la fonction calculate-distance
supabase functions deploy calculate-distance

# Vérifier le déploiement
supabase functions list
```

### 4️⃣ Tester la Fonction

```bash
# Test local (development)
supabase functions serve

# Test avec curl
curl -X POST 'http://localhost:54321/functions/v1/calculate-distance' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "origin": {"lat": 48.8566, "lon": 2.3522},
    "destination": {"lat": 43.2965, "lon": 5.3698},
    "profile": "driving-car"
  }'
```

## 🚀 Utilisation dans l'Application

### Exemple 1: Calculer une Distance Simple

```typescript
import { calculateDistance } from '@/lib/services/distanceService'

// Paris → Marseille
const result = await calculateDistance(
  { lat: 48.8566, lon: 2.3522 },  // Paris
  { lat: 43.2965, lon: 5.3698 },  // Marseille
  'driving-car'
)

console.log(`Distance: ${result.distance} km`)
console.log(`Durée: ${result.duration / 60} minutes`)
```

### Exemple 2: Calculer un Prix avec Grille Tarifaire

```typescript
import { calculateDistance, calculatePrice, calculatePriceTTC } from '@/lib/services/distanceService'

// 1. Récupérer la grille tarifaire du client
const { data: pricingGrid } = await supabase
  .from('pricing_grids')
  .select('*')
  .eq('client_id', clientId)
  .single()

// 2. Calculer la distance
const { distance } = await calculateDistance(
  origin,
  destination,
  'driving-car' // ou 'driving-hgv' pour poids lourd
)

// 3. Calculer le prix
const priceHT = calculatePrice(distance, pricingGrid, 'light')
const priceTTC = calculatePriceTTC(priceHT, pricingGrid.vat_rate)

console.log(`Distance: ${distance} km`)
console.log(`Prix HT: ${priceHT} €`)
console.log(`Prix TTC: ${priceTTC} €`)
```

### Exemple 3: Dans un Composant React

```typescript
import { useState } from 'react'
import { calculateDistance, formatDuration } from '@/lib/services/distanceService'

function QuoteCalculator() {
  const [distance, setDistance] = useState<number | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCalculate = async () => {
    setLoading(true)
    try {
      const result = await calculateDistance(
        { lat: 48.8566, lon: 2.3522 },
        { lat: 43.2965, lon: 5.3698 }
      )
      setDistance(result.distance)
      setDuration(result.duration)
    } catch (error) {
      console.error('Erreur calcul distance:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleCalculate} disabled={loading}>
        {loading ? 'Calcul...' : 'Calculer Distance'}
      </button>
      {distance && (
        <div>
          <p>Distance: {distance} km</p>
          <p>Durée estimée: {formatDuration(duration!)}</p>
        </div>
      )}
    </div>
  )
}
```

## 🎯 Profils de Véhicules

| Profil | Description | Usage |
|--------|-------------|-------|
| `driving-car` | Voiture standard | Véhicules légers et utilitaires |
| `driving-hgv` | Poids lourd (Heavy Goods Vehicle) | Camions, semi-remorques |

## 📊 Structure de la Réponse

```typescript
{
  distance: 775.23,  // en kilomètres
  duration: 25380,   // en secondes (7h 3min)
  route: {           // GeoJSON de la route (optionnel)
    type: "LineString",
    coordinates: [[2.3522, 48.8566], ...]
  }
}
```

## ⚠️ Gestion des Erreurs

```typescript
try {
  const result = await calculateDistance(origin, destination)
} catch (error) {
  if (error.message.includes('OPENROUTESERVICE_API_KEY')) {
    console.error('Clé API non configurée')
  } else if (error.message.includes('No route found')) {
    console.error('Impossible de trouver un itinéraire')
  } else {
    console.error('Erreur inconnue:', error)
  }
}
```

## 🔧 Alternatives si Quota Dépassé

Si vous dépassez les 2 000 requêtes/jour gratuites:

1. **OpenRouteService Premium**: 3 000 - 100 000+ req/jour
2. **Google Maps Distance Matrix API**: 28 000 req/mois gratuit
3. **MapBox Directions API**: 100 000 req/mois gratuit
4. **HERE Maps**: 250 000 req/mois gratuit

## 📝 TODO

- [ ] Obtenir clé API OpenRouteService
- [ ] Configurer le secret dans Supabase
- [ ] Déployer la Edge Function
- [ ] Tester la fonction
- [ ] Intégrer dans le formulaire de devis
- [ ] Ajouter le géocodage d'adresses (optionnel)

## 🌐 Ressources

- [OpenRouteService Documentation](https://openrouteservice.org/dev/#/api-docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Distance Matrix Examples](https://openrouteservice.org/dev/#/api-docs/v2/matrix)
