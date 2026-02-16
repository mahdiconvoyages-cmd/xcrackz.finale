# 🇫🇷 Auto-complétion d'Adresses Françaises - API Gratuite

## ✅ Configuration Terminée!

Votre application utilise maintenant l'API **100% GRATUITE** du gouvernement français pour l'auto-complétion d'adresses!

### 🎯 API Utilisée
**api-adresse.data.gouv.fr**
- ✅ **100% GRATUIT**
- ✅ **SANS LIMITE de requêtes**
- ✅ **SANS clé API nécessaire**
- ✅ Données officielles (Base Adresse Nationale)
- ✅ Mise à jour quotidienne

---

## 📦 Fichiers Créés/Modifiés

### 1. Service d'Auto-complétion
**`src/lib/services/addressAutocomplete.ts`**
- `searchAddress()` - Recherche d'adresses
- `reverseGeocode()` - Coordonnées → Adresse
- `geocodeAddress()` - Adresse → Coordonnées
- Fonctions utilitaires de formatage

### 2. Composant React
**`src/components/AddressAutocomplete.tsx`** (Mis à jour)
- ✅ Auto-complétion en temps réel
- ✅ Navigation au clavier (↑ ↓ Enter Esc)
- ✅ **Bouton de géolocalisation** 📍
- ✅ Badge "API gratuite"
- ✅ Message "Aucun résultat"
- ✅ Interface moderne et responsive

---

## 🚀 Utilisation

### Exemple Simple

```tsx
import AddressAutocomplete from '@/components/AddressAutocomplete';

function MyForm() {
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number>();
  const [lng, setLng] = useState<number>();

  return (
    <AddressAutocomplete
      value={address}
      onChange={(addr, latitude, longitude) => {
        setAddress(addr);
        setLat(latitude);
        setLng(longitude);
      }}
      label="Adresse de départ"
      placeholder="Ex: 8 Boulevard du Palais, 75001 Paris"
      required
    />
  );
}
```

### Avec Gestion d'Erreur

```tsx
<AddressAutocomplete
  value={pickupAddress}
  onChange={(addr, lat, lng) => {
    setPickupAddress(addr);
    setPickupLat(lat);
    setPickupLng(lng);
  }}
  label="Adresse de collecte"
  required
  error={errors.pickupAddress}
/>
```

---

## 🎨 Fonctionnalités

### 1. Auto-complétion Intelligente
- Recherche dès **3 caractères** tapés
- **Debounce de 300ms** pour éviter trop de requêtes
- Résultats triés par **pertinence**
- Affichage du **type** d'adresse (🏠 Numéro, 🛣️ Rue, 🏙️ Ville)

### 2. Navigation Clavier
- **↓** - Suggestion suivante
- **↑** - Suggestion précédente
- **Enter** - Sélectionner
- **Esc** - Fermer les suggestions

### 3. Géolocalisation
- **Bouton 📍** à droite du champ
- Utilise le GPS du navigateur
- **Reverse geocoding** automatique
- Remplit automatiquement l'adresse

### 4. Interface Moderne
- Design cohérent avec votre app
- Loader animé pendant la recherche
- Badge "API gratuite" sous le champ
- Message élégant si aucun résultat

---

## 📊 Données Retournées

### Format de Suggestion

```typescript
{
  label: "8 Boulevard du Palais 75001 Paris",
  name: "Boulevard du Palais",
  postcode: "75001",
  city: "Paris",
  context: "75, Paris, Île-de-France",
  type: "housenumber", // ou "street", "locality", "municipality"
  importance: 0.8,
  coordinates: {
    lat: 48.8566,
    lon: 2.3522
  }
}
```

### Utilisation des Coordonnées

```tsx
const handleAddressSelect = (addr: string, lat?: number, lng?: number) => {
  console.log('Adresse:', addr);
  console.log('Latitude:', lat);  // 48.8566
  console.log('Longitude:', lng); // 2.3522
  
  // Utiliser avec OpenRouteService
  const route = await getRouteFromOpenRouteService(
    lat1, lng1, lat2, lng2
  );
};
```

---

## 🗺️ Intégration avec OpenRouteService

Combinez les deux APIs pour une expérience complète:

```tsx
// 1. Utilisateur saisit l'adresse
<AddressAutocomplete
  value={pickupAddress}
  onChange={(addr, lat, lng) => {
    setPickupAddress(addr);
    setPickupLat(lat);
    setPickupLng(lng);
  }}
/>

<AddressAutocomplete
  value={deliveryAddress}
  onChange={(addr, lat, lng) => {
    setDeliveryAddress(addr);
    setDeliveryLat(lat);
    setDeliveryLng(lng);
  }}
/>

// 2. Calcul du tracé GPS
const route = await getRouteFromOpenRouteService(
  pickupLat, pickupLng,
  deliveryLat, deliveryLng
);

// 3. Calcul du prix
const price = calculatePrice(
  route.distance / 1000, // Convertir en km
  pricingGrid,
  'light'
);
```

---

## 🎯 Exemples Réels

### Exemple 1: Formulaire de Devis

```tsx
function QuoteForm() {
  const [pickup, setPickup] = useState('');
  const [delivery, setDelivery] = useState('');
  const [pickupCoords, setPickupCoords] = useState<[number, number]>();
  const [deliveryCoords, setDeliveryCoords] = useState<[number, number]>();

  const handleCalculate = async () => {
    if (!pickupCoords || !deliveryCoords) return;

    const route = await getRouteFromOpenRouteService(
      pickupCoords[0], pickupCoords[1],
      deliveryCoords[0], deliveryCoords[1]
    );

    console.log(`Distance: ${route.distance / 1000} km`);
    console.log(`Durée: ${route.duration / 60} minutes`);
  };

  return (
    <form>
      <AddressAutocomplete
        value={pickup}
        onChange={(addr, lat, lng) => {
          setPickup(addr);
          if (lat && lng) setPickupCoords([lat, lng]);
        }}
        label="Adresse de départ"
        required
      />

      <AddressAutocomplete
        value={delivery}
        onChange={(addr, lat, lng) => {
          setDelivery(addr);
          if (lat && lng) setDeliveryCoords([lat, lng]);
        }}
        label="Adresse d'arrivée"
        required
      />

      <button onClick={handleCalculate}>
        Calculer
      </button>
    </form>
  );
}
```

### Exemple 2: Création de Mission

```tsx
function CreateMission() {
  return (
    <form onSubmit={handleSubmit}>
      <AddressAutocomplete
        value={formData.pickup_address}
        onChange={(addr, lat, lng) => {
          setFormData({
            ...formData,
            pickup_address: addr,
            pickup_lat: lat,
            pickup_lng: lng
          });
        }}
        label="Adresse de collecte"
        placeholder="Saisissez l'adresse de collecte..."
        required
      />

      <AddressAutocomplete
        value={formData.delivery_address}
        onChange={(addr, lat, lng) => {
          setFormData({
            ...formData,
            delivery_address: addr,
            delivery_lat: lat,
            delivery_lng: lng
          });
        }}
        label="Adresse de livraison"
        placeholder="Saisissez l'adresse de livraison..."
        required
      />
    </form>
  );
}
```

---

## 🔍 Types d'Adresses

L'API renvoie différents types d'adresses:

| Type | Icône | Description | Exemple |
|------|-------|-------------|---------|
| `housenumber` | 🏠 | Numéro précis | "8 Boulevard du Palais" |
| `street` | 🛣️ | Rue sans numéro | "Boulevard du Palais" |
| `locality` | 📍 | Lieu-dit | "La Défense" |
| `municipality` | 🏙️ | Ville | "Paris" |

---

## 💡 Astuces

### 1. Géolocalisation Rapide
Cliquez sur le bouton 📍 pour:
- Utiliser votre position GPS
- Remplir automatiquement l'adresse
- Gagner du temps!

### 2. Navigation Clavier
- Tapez 3 caractères minimum
- Utilisez ↓↑ pour naviguer
- Enter pour valider
- Pas besoin de la souris!

### 3. Recherche Intelligente
```
Essayez:
✅ "8 bd palais paris" → Fonctionne
✅ "palais paris" → Trouve plusieurs résultats
✅ "75001" → Liste les adresses du quartier
✅ "tour eiffel" → Trouve le monument
```

---

## 📚 API Documentation

### Endpoints Utilisés

#### 1. Recherche d'Adresse
```
GET https://api-adresse.data.gouv.fr/search/
?q=8+Boulevard+du+Palais+Paris
&limit=5
&autocomplete=1
```

#### 2. Reverse Geocoding
```
GET https://api-adresse.data.gouv.fr/reverse/
?lat=48.8566
&lon=2.3522
```

### Paramètres Disponibles

| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| `q` | Texte de recherche | "8 bd palais" |
| `limit` | Nb max de résultats | 5 (défaut) |
| `autocomplete` | Mode auto-complétion | 1 ou 0 |
| `lat` | Latitude | 48.8566 |
| `lon` | Longitude | 2.3522 |
| `postcode` | Filtrer par code postal | 75001 |
| `citycode` | Filtrer par code INSEE | 75056 |

---

## 🎨 Personnalisation

### Changer le Placeholder

```tsx
<AddressAutocomplete
  placeholder="Tapez votre adresse ici..."
  ...
/>
```

### Changer le Nombre de Résultats

Dans `addressAutocomplete.ts`:
```typescript
export async function searchAddress(
  query: string,
  limit: number = 10  // Au lieu de 5
): Promise<AddressSuggestion[]>
```

### Filtrer par Code Postal

```typescript
const url = new URL('https://api-adresse.data.gouv.fr/search/')
url.searchParams.append('q', query)
url.searchParams.append('limit', '5')
url.searchParams.append('postcode', '75001') // Filtrer Paris 1er
```

---

## ✅ Avantages vs Alternatives

### API Adresse.gouv.fr (Gratuit)
- ✅ **100% GRATUIT**
- ✅ **SANS LIMITE**
- ✅ Données officielles
- ✅ Adresses françaises précises
- ✅ Pas de clé API nécessaire
- ❌ France uniquement

### Google Maps Autocomplete (Payant)
- ❌ **0.017€ par requête**
- ❌ Facturation obligatoire
- ✅ Mondial
- ✅ Très précis

### Mapbox Geocoding (Payant)
- ❌ **0.0075€ par requête**
- ❌ 100 000 req/mois puis payant
- ✅ Mondial
- ✅ Personnalisable

**Conclusion:** Pour les adresses françaises, l'API gouvernementale est **imbattable**! 🇫🇷

---

## 🧪 Tests

### Test Manuel Rapide

1. Ouvrir votre app
2. Aller sur un formulaire avec adresse
3. Taper "8 bd pal"
4. Vérifier que les suggestions apparaissent
5. Sélectionner une adresse
6. Vérifier que les coordonnées sont remplies

### Test de Géolocalisation

1. Cliquer sur le bouton 📍
2. Autoriser la géolocalisation
3. Vérifier que l'adresse est remplie

---

## 🎉 Résumé

Vous avez maintenant:
- ✅ Auto-complétion d'adresses **100% gratuite**
- ✅ **Sans limite** de requêtes
- ✅ Navigation au clavier
- ✅ Géolocalisation intégrée
- ✅ Coordonnées GPS automatiques
- ✅ Interface moderne et responsive
- ✅ Compatible avec OpenRouteService

**Tout est prêt! Testez dans vos formulaires! 🚀**

---

## 📞 Ressources

- [API Documentation](https://adresse.data.gouv.fr/api-doc/adresse)
- [Base Adresse Nationale](https://adresse.data.gouv.fr/)
- [GitHub API Adresse](https://github.com/BaseAdresseNationale)

---

**Bon développement! 🇫🇷🗺️**
