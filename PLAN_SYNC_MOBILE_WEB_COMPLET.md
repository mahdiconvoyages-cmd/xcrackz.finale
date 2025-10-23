# Plan de Synchronisation Mobile ↔️ Web

## 1. ✅ TERMINÉ - Colonnes Supabase Corrigées

### Inspections
- ✅ `vehicle_make` → `vehicle_brand`
- ✅ Requête mobile mise à jour

### Invoices & Quotes  
- ✅ `company_name, first_name, last_name` → `name, email`
- ✅ Interfaces TypeScript mises à jour
- ✅ Affichage des noms clients corrigé

## 2. 🔄 EN COURS - Formulaire Création Mission Mobile

### Champs manquants à ajouter:
1. **vehicle_type** (VL/VU/PL) - Sélecteur avec Picker
2. **vehicle_vin** - TextInput pour numéro VIN
3. **vehicle_image_url** - Upload photo avec expo-image-picker
4. **pickup_lat / pickup_lng** - Récupérer via API Adresse
5. **delivery_lat / delivery_lng** - Récupérer via API Adresse

### Composants à créer/modifier:
- ✅ AddressAutocompleteInput (API Adresse gouv.fr)
- ✅ VehicleTypePicker (VL/VU/PL)
- ✅ VehicleImagePicker (expo-image-picker + Supabase Storage)

### Champs à supprimer:
- ❌ `price` (pas dans le web, auto-calculé)

## 3. 📱 Bouton "Commencer Inspection" Mobile

### Problème actuel:
- ❌ Pas de bouton pour démarrer l'inspection dans MissionViewScreen
- ❌ Pas de bouton dans MissionListScreen
- ❌ Pas de logique pour vérifier si départ ou arrivée

### Solution (comme sur web):
```tsx
// Dans MissionViewScreen.tsx
const handleStartInspection = async () => {
  // Vérifier si l'inspection de départ existe
  const { data: departureInspection } = await supabase
    .from('vehicle_inspections')
    .select('id')
    .eq('mission_id', mission.id)
    .eq('inspection_type', 'departure')
    .single();
  
  if (departureInspection) {
    // Aller vers inspection d'arrivée
    navigation.navigate('InspectionArrival', { missionId: mission.id });
  } else {
    // Aller vers inspection de départ
    navigation.navigate('InspectionDeparture', { missionId: mission.id });
  }
};
```

### Où ajouter le bouton:
- **MissionViewScreen** : Après le bouton "Suivi GPS"
- **MissionListScreen** : Dans chaque carte mission (swipe actions ou bouton secondaire)

## 4. 📊 Client-Devis-Facturation Page Unique

### Problème actuel:
- ❌ Trois écrans séparés (ClientsNavigator, InvoicesNavigator, QuotesNavigator)
- ❌ Pas de navigation fluide entre les sections
- ✅ Sur le web : Une seule page avec tabs

### Solution:
Créer **`BillingScreen.tsx`** avec React Native Tab View:
```tsx
import { TabView, TabBar } from 'react-native-tab-view';

const BillingScreen = () => {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'clients', title: 'Clients' },
    { key: 'invoices', title: 'Factures' },
    { key: 'quotes', title: 'Devis' },
  ]);
  
  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      onIndexChange={setIndex}
      renderTabBar={renderTabBar}
    />
  );
};
```

### Composants à intégrer:
- ✅ ClientsListTab (liste + création)
- ✅ InvoicesListTab (liste + création + détails)
- ✅ QuotesListTab (liste + création + détails)

## 5. 🗄️ Vérification Tables Supabase

### Tables à vérifier:
- [x] missions (colonnes vehicle_brand, vehicle_model, vehicle_plate, vehicle_type, vehicle_vin, vehicle_image_url)
- [x] clients (colonnes name, email, phone, address, siret)
- [x] invoices (colonnes invoice_number, client_id, total_amount, status, issue_date, due_date)
- [x] quotes (colonnes quote_number, client_id, total_amount, status, valid_until)
- [x] vehicle_inspections (colonnes mission_id, inspection_type, status)

### Migrations SQL à créer si manquantes:
```sql
-- Ajouter vehicle_type si absent
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS vehicle_type TEXT CHECK (vehicle_type IN ('VL', 'VU', 'PL'));

-- Ajouter vehicle_vin si absent
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS vehicle_vin TEXT;

-- Ajouter vehicle_image_url si absent
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS vehicle_image_url TEXT;
```

## 6. 📝 Documentation à Créer

- [x] `COMPARAISON_FORMULAIRE_MISSION.md` - Différences web/mobile
- [ ] `GUIDE_INSPECTION_MOBILE.md` - Comment démarrer/terminer une inspection
- [ ] `GUIDE_BILLING_UNIFIED.md` - Architecture de la page unifiée
- [ ] `API_ADRESSE_MOBILE.md` - Intégration API Adresse dans React Native

## 🎯 Priorités

### 🔴 Haute Priorité (Bloquant)
1. ✅ Corriger colonnes Supabase (vehicle_brand, clients.name)
2. 🔄 Ajouter bouton "Commencer Inspection" mobile
3. 🔄 Corriger formulaire création mission (vehicle_type, VIN, photo)

### 🟡 Moyenne Priorité (Important)
4. 📊 Page unique Client-Devis-Facturation
5. 🗺️ API Adresse avec autocomplete
6. 📷 Upload photo véhicule

### 🟢 Basse Priorité (Nice to have)
7. 📄 Prévisualisation PDF mobile
8. 🎨 Steps/Wizard pour formulaire mission
9. 📚 Documentation complète

## ⚙️ Déploiement Web

### Status:
- ✅ Commit créé avec toutes les modifications
- ❌ Pas de remote git configuré
- ⏳ En attente: URL du dépôt GitHub ou configuration Vercel CLI

### Actions requises:
```bash
# Option 1: Push vers GitHub existant
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main

# Option 2: Vercel CLI (si pas de git)
npm i -g vercel
vercel --prod
```

Vercel détectera automatiquement Vite et déploiera avec la config de `vercel.json`.
