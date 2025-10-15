# 🚀 PLAN D'ACTION COMPLET - Finality

## ✅ ÉTAPE 1: Appliquer Migration SQL Covoiturage

### Option A: Via Supabase Dashboard (RECOMMANDÉ)

1. **Ouvrir Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn/editor
   ```

2. **Aller dans SQL Editor**
   - Cliquer sur "SQL Editor" dans le menu de gauche
   - Cliquer sur "+ New Query"

3. **Copier-Coller le SQL**
   - Ouvrir `supabase/migrations/20251011_create_covoiturage_tables.sql`
   - Tout sélectionner (Ctrl+A)
   - Copier (Ctrl+C)
   - Coller dans l'éditeur SQL de Supabase

4. **Exécuter**
   - Cliquer sur "Run" ou appuyer sur `Ctrl+Enter`
   - Attendre quelques secondes
   - Vérifier qu'il n'y a pas d'erreur (devrait afficher "Success")

5. **Vérification**
   ```sql
   -- Exécuter cette requête pour vérifier
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_name LIKE 'covoiturage_%'
   ORDER BY table_name;
   
   -- Devrait retourner 5 lignes:
   -- ✅ covoiturage_bookings
   -- ✅ covoiturage_driver_profiles
   -- ✅ covoiturage_messages
   -- ✅ covoiturage_reviews
   -- ✅ covoiturage_trips
   ```

### Option B: Via CLI Supabase (Alternative)

```powershell
# Si vous avez installé Supabase CLI
supabase db push

# Ou directement avec psql
$env:PGPASSWORD = "votre-mot-de-passe-db"
psql -h db.bfrkthzovwpjrvqktdjn.supabase.co -U postgres -d postgres -f supabase/migrations/20251011_create_covoiturage_tables.sql
```

---

## ✅ ÉTAPE 2: Intégrer Autocomplétion dans Mobile

### 2.1 - CovoiturageScreen (PRIORITAIRE)

**Fichier**: `mobile/src/screens/CovoiturageScreenBlaBlaCar.tsx`

#### A. Importer le composant
```typescript
// Ajouter en haut du fichier (ligne 17)
import { AddressAutocompleteInput } from '../components/AddressAutocompleteInput';
```

#### B. Ajouter les states
```typescript
// Après les states existants (ligne ~44)
const [departureCoords, setDepartureCoords] = useState<[number, number] | null>(null);
const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
```

#### C. Remplacer le premier TextInput (départ)
**TROUVER** (ligne ~149):
```typescript
<TextInput
  style={styles.searchInput}
  placeholder="D'où partez-vous ?"
  placeholderTextColor="#94a3b8"
  value={departure}
  onChangeText={setDeparture}
/>
```

**REMPLACER PAR**:
```typescript
<View style={{ flex: 1 }}>
  <AddressAutocompleteInput
    value={departure}
    onChangeText={setDeparture}
    onSelectAddress={(address) => {
      setDeparture(address.city || address.fullAddress);
      setDepartureCoords(address.coordinates);
    }}
    placeholder="D'où partez-vous ?"
    icon="circle"
    types="place,locality"
    inputStyle={styles.searchInput}
  />
</View>
```

#### D. Remplacer le deuxième TextInput (destination)
**TROUVER** (ligne ~173):
```typescript
<TextInput
  style={styles.searchInput}
  placeholder="Où allez-vous ?"
  placeholderTextColor="#94a3b8"
  value={destination}
  onChangeText={setDestination}
/>
```

**REMPLACER PAR**:
```typescript
<View style={{ flex: 1 }}>
  <AddressAutocompleteInput
    value={destination}
    onChangeText={setDestination}
    onSelectAddress={(address) => {
      setDestination(address.city || address.fullAddress);
      setDestinationCoords(address.coordinates);
    }}
    placeholder="Où allez-vous ?"
    icon="map-pin"
    types="place,locality"
    inputStyle={styles.searchInput}
  />
</View>
```

### 2.2 - Créer Hook Covoiturage

**Nouveau fichier**: `mobile/src/hooks/useCovoiturage.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Trip {
  id: string;
  user_id: string;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  departure_time: string;
  price_per_seat: number;
  available_seats: number;
  comfort_level: string;
  features: string[];
  total_distance?: number;
  duration?: number;
  vehicle_brand?: string;
  vehicle_model?: string;
}

export const useCovoiturage = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTrips = async (
    from: string, 
    to: string, 
    date?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('covoiturage_trips')
        .select('*')
        .eq('status', 'published')
        .order('departure_date', { ascending: true });

      if (from) {
        query = query.ilike('departure_city', `%${from}%`);
      }
      
      if (to) {
        query = query.ilike('arrival_city', `%${to}%`);
      }
      
      if (date) {
        query = query.eq('departure_date', date);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      
      setTrips(data || []);
    } catch (err) {
      console.error('Erreur recherche trajets:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const createTrip = async (tripData: Partial<Trip>) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Utilisateur non connecté');

      const { data, error: insertError } = await supabase
        .from('covoiturage_trips')
        .insert([{ ...tripData, user_id: user.id }])
        .select()
        .single();

      if (insertError) throw insertError;
      
      return data;
    } catch (err) {
      console.error('Erreur création trajet:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    trips,
    loading,
    error,
    searchTrips,
    createTrip,
  };
};
```

### 2.3 - Utiliser le Hook dans CovoiturageScreen

**Dans CovoiturageScreenBlaBlaCar.tsx**, ajouter en haut:

```typescript
import { useCovoiturage } from '../hooks/useCovoiturage';

// Dans le composant
const { trips, loading, searchTrips } = useCovoiturage();
```

**Modifier le bouton Rechercher** (ligne ~191):
```typescript
<TouchableOpacity 
  style={styles.searchButton}
  onPress={() => {
    if (departure && destination) {
      searchTrips(departure, destination);
    }
  }}
>
  <Text style={styles.searchButtonText}>Rechercher</Text>
  {loading && <ActivityIndicator size="small" color="white" style={{ marginLeft: 8 }} />}
  <Feather name="arrow-right" size={20} color="white" />
</TouchableOpacity>
```

**Remplacer demoTrips** (ligne ~316):
```typescript
{/* Affichage des résultats */}
{loading ? (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#00AFF5" />
    <Text style={styles.loadingText}>Recherche en cours...</Text>
  </View>
) : trips.length > 0 ? (
  trips.map((trip) => renderTripCard(trip))
) : (
  <View style={styles.emptyState}>
    <MaterialCommunityIcons name="car-off" size={64} color="#475569" />
    <Text style={styles.emptyText}>Aucun trajet trouvé</Text>
    <Text style={styles.emptySubtext}>
      Essayez de modifier vos critères de recherche
    </Text>
  </View>
)}
```

**Ajouter les styles manquants**:
```typescript
// Dans styles
loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: 40,
},
loadingText: {
  marginTop: 16,
  fontSize: 16,
  color: '#94a3b8',
  fontWeight: '600',
},
emptyState: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: 40,
},
emptyText: {
  marginTop: 24,
  fontSize: 20,
  fontWeight: '700',
  color: '#f8fafc',
  textAlign: 'center',
},
emptySubtext: {
  marginTop: 8,
  fontSize: 14,
  color: '#94a3b8',
  textAlign: 'center',
},
```

---

## ✅ ÉTAPE 3: Intégrer Autocomplétion dans Web

### 3.1 - Créer Hook Autocomplétion Web

**Nouveau fichier**: `src/hooks/useAddressAutocomplete.ts`

```typescript
import { useState, useCallback } from 'react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface AddressSuggestion {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
}

export const useAddressAutocomplete = () => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const searchAddress = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&language=fr&country=FR&types=place,locality&limit=5`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      setSuggestions(data.features || []);
    } catch (error) {
      console.error('Erreur autocomplétion:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return { suggestions, loading, searchAddress, clearSuggestions };
};
```

---

## ✅ ÉTAPE 4: Synchroniser Web/Mobile Supabase

### 4.1 - Vérifier Configuration Web

**Fichier**: `src/lib/supabase.ts`

Devrait contenir:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 4.2 - Vérifier .env à la Racine

**Fichier**: `.env` (racine du projet)

DOIT contenir:
```env
VITE_SUPABASE_URL=https://bfrkthzovwpjrvqktdjn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzgwNzgsImV4cCI6MjA3NTU1NDA3OH0.ml0TkLYk53U6CqP_iCc8XkZMusFCSI-nYOS0WyV43Nc
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieGNyYWNreiIsImEiOiJjbWR3dzV3cDMxdXIxMmxzYTI0c2Z0N2lpIn0.PFh0zoPCQK9UueLrLKWd0w
```

### 4.3 - Redémarrer le Serveur Web

```powershell
# Arrêter tous les processus Node (Ctrl+C dans les terminaux)
# Ou forcer l'arrêt:
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

# Attendre 2 secondes
Start-Sleep -Seconds 2

# Relancer
npm run dev
```

### 4.4 - Vérifier Configuration Mobile

**Fichier**: `mobile/src/lib/supabase.ts`

Devrait utiliser la MÊME instance:
```typescript
const SUPABASE_URL = 'https://bfrkthzovwpjrvqktdjn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## ✅ ÉTAPE 5: Tests de Synchronisation

### Test 1: Créer un Trajet depuis Web
1. Se connecter sur `http://localhost:5173`
2. Aller dans Covoiturage
3. Publier un trajet Paris → Lyon
4. Vérifier dans Supabase Dashboard que le trajet apparaît

### Test 2: Voir le Trajet depuis Mobile
1. Ouvrir l'app mobile
2. Aller dans Covoiturage
3. Rechercher Paris → Lyon
4. Le trajet créé depuis le web DOIT apparaître

### Test 3: Vérification SQL
Dans Supabase SQL Editor:
```sql
-- Compter les trajets
SELECT COUNT(*) as total_trips FROM covoiturage_trips;

-- Voir les derniers trajets
SELECT 
  id,
  departure_city,
  arrival_city,
  departure_date,
  price_per_seat,
  created_at
FROM covoiturage_trips
ORDER BY created_at DESC
LIMIT 5;
```

---

## 📋 CHECKLIST COMPLÈTE

### Base de Données
- [ ] Migration SQL appliquée dans Supabase
- [ ] 5 tables créées (trips, bookings, reviews, messages, profiles)
- [ ] RLS policies actives
- [ ] Triggers fonctionnels

### Mobile
- [ ] AddressAutocompleteInput importé dans CovoiturageScreen
- [ ] States pour coordonnées ajoutés
- [ ] TextInputs remplacés par autocomplétion
- [ ] Hook useCovoiturage créé
- [ ] Recherche de trajets fonctionnelle
- [ ] Affichage des résultats Supabase

### Web
- [ ] Fichier `.env` avec variables VITE_*
- [ ] Serveur Vite redémarré
- [ ] Pas d'erreur "Invalid supabaseUrl"
- [ ] Hook useAddressAutocomplete créé (optionnel)
- [ ] Connexion Supabase fonctionnelle

### Synchronisation
- [ ] Même URL Supabase web/mobile
- [ ] Même ANON_KEY web/mobile
- [ ] Test création trajet web → visible mobile
- [ ] Test création trajet mobile → visible web

---

## 🎯 Ordre d'Exécution Recommandé

**1. D'ABORD** → Appliquer migration SQL (5 min)
**2. ENSUITE** → Corriger .env web et redémarrer (2 min)
**3. PUIS** → Intégrer autocomplétion mobile (15 min)
**4. ENFIN** → Tester synchronisation (5 min)

**TEMPS TOTAL**: ~30 minutes

---

**GO ! Let's do this ! 🚀**
