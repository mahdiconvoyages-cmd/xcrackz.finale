# 🎉 COVOITURAGE MODERNE - INSTALLATION COMPLÈTE

## ✅ FICHIERS CRÉÉS

### 📱 Mobile (6 écrans TypeScript/React Native)
1. `mobile/src/screens/carpooling/CarpoolingSearchScreen.tsx` - Recherche de trajets
2. `mobile/src/screens/carpooling/CarpoolingResultsScreen.tsx` - Liste des résultats
3. `mobile/src/screens/carpooling/PublishRideScreen.tsx` - Publication de trajet
4. `mobile/src/screens/carpooling/RideDetailsScreen.tsx` - Détails du trajet
5. `mobile/src/screens/carpooling/BookRideScreen.tsx` - Réservation
6. `mobile/src/screens/carpooling/CreditsWalletScreen.tsx` - Portefeuille

### 🌐 Web (2 pages TypeScript/React)
1. `src/pages/CarpoolingPage.tsx` - Recherche et liste des trajets
2. `src/pages/MyRidesDashboard.tsx` - Dashboard mes trajets/réservations

### 📊 Base de données
- ✅ 5 tables créées dans Supabase
- ✅ Fonctions SQL pour paiements et réservations
- ✅ RLS configuré

---

## 🚀 ÉTAPES D'INSTALLATION

### 1. Configuration de la navigation mobile

**Ouvrir** `mobile/src/navigation/AppNavigator.tsx` et **ajouter** :

```typescript
import CarpoolingSearchScreen from '../screens/carpooling/CarpoolingSearchScreen';
import CarpoolingResultsScreen from '../screens/carpooling/CarpoolingResultsScreen';
import PublishRideScreen from '../screens/carpooling/PublishRideScreen';
import RideDetailsScreen from '../screens/carpooling/RideDetailsScreen';
import BookRideScreen from '../screens/carpooling/BookRideScreen';
import CreditsWalletScreen from '../screens/carpooling/CreditsWalletScreen';

// Dans votre Stack Navigator, ajouter ces écrans :
<Stack.Screen 
  name="CarpoolingSearch" 
  component={CarpoolingSearchScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen 
  name="CarpoolingResults" 
  component={CarpoolingResultsScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen 
  name="RideDetails" 
  component={RideDetailsScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen 
  name="PublishRide" 
  component={PublishRideScreen}
  options={{ title: 'Publier un trajet' }}
/>
<Stack.Screen 
  name="BookRide" 
  component={BookRideScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen 
  name="CreditsWallet" 
  component={CreditsWalletScreen}
  options={{ headerShown: false }}
/>
```

### 2. Ajouter un bouton dans le menu principal mobile

**Ouvrir votre écran d'accueil principal** et ajouter :

```typescript
<TouchableOpacity 
  style={styles.menuButton}
  onPress={() => navigation.navigate('CarpoolingSearch')}
>
  <Ionicons name="car-sport" size={24} color="#fff" />
  <Text style={styles.menuButtonText}>Covoiturage</Text>
</TouchableOpacity>
```

### 3. Configuration des routes web

**Ouvrir** `src/App.tsx` (ou votre fichier de routes) et **ajouter** :

```typescript
import CarpoolingPage from './pages/CarpoolingPage';
import MyRidesDashboard from './pages/MyRidesDashboard';

// Dans vos routes :
<Route path="/covoiturage" element={<CarpoolingPage />} />
<Route path="/covoiturage/mes-trajets" element={<MyRidesDashboard />} />
```

### 4. Ajouter un lien dans le menu web

**Ouvrir votre composant de navigation web** et ajouter :

```typescript
<a 
  href="/covoiturage" 
  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg"
>
  <Car size={20} />
  <span>Covoiturage</span>
</a>
```

### 5. Installation des dépendances manquantes

```bash
# Mobile (si pas déjà installé)
cd mobile
npm install @react-native-community/datetimepicker

# Web (si pas déjà installé)
cd ..
npm install lucide-react
```

### 6. Vérifier la configuration Supabase

**S'assurer que les tables existent** en exécutant dans Supabase SQL Editor :

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'carpooling_rides', 
  'carpooling_bookings', 
  'carpooling_reviews',
  'user_credits',
  'credit_transactions'
);
```

Vous devriez voir **5 tables**.

---

## 🧪 TESTS À EFFECTUER

### Mobile

1. **Recherche de trajets**
   - Ouvrir l'app mobile
   - Aller sur "Covoiturage"
   - Rechercher "Paris" → "Lyon"
   - Vérifier que les résultats s'affichent

2. **Publication de trajet**
   - Cliquer sur "Publier un trajet"
   - Remplir tous les champs
   - Vérifier que le prix suggéré se calcule
   - Publier le trajet

3. **Réservation**
   - Sélectionner un trajet
   - Cliquer sur "Réserver"
   - Choisir le mode de paiement
   - Finaliser la réservation

4. **Portefeuille**
   - Ouvrir "Mon portefeuille"
   - Vérifier le solde
   - Tester la recharge (modal)

### Web

1. **Page covoiturage**
   - Aller sur `/covoiturage`
   - Vérifier l'affichage des trajets
   - Tester la recherche

2. **Dashboard**
   - Aller sur `/covoiturage/mes-trajets`
   - Vérifier l'onglet "Mes trajets publiés"
   - Vérifier l'onglet "Mes réservations"
   - Vérifier les statistiques (crédits, gains, dépenses)

---

## 🎨 PERSONNALISATION

### Changer les couleurs

**Dans chaque fichier**, modifier l'objet `colors` :

```typescript
const colors = {
  primary: '#0b1220',      // Votre couleur principale
  success: '#10b981',      // Vert pour les actions positives
  warning: '#f59e0b',      // Orange pour les alertes
  // ...
};
```

### Modifier le prix au kilomètre

**Dans** `PublishRideScreen.tsx` et dans le SQL :

```typescript
// Mobile
const suggested = (parseFloat(distanceKm) * 0.08).toFixed(2); // Changer 0.08

// SQL (dans la fonction calculate_suggested_price)
RETURN ROUND(p_distance_km * 0.08, 2); -- Changer 0.08
```

### Changer la commission

**Dans le SQL**, fonction `process_credit_payment` :

```sql
v_driver_amount DECIMAL := ROUND(p_amount * 0.95, 2); -- 5% de commission
-- Changer 0.95 pour ajuster (0.90 = 10% de commission)
```

---

## 🔧 FONCTIONNALITÉS AVANCÉES (À VENIR)

### Paiement réel (Stripe)

1. Créer un compte Stripe
2. Installer `@stripe/stripe-react-native`
3. Remplacer la fonction `handleRecharge` dans `CreditsWalletScreen.tsx`
4. Configurer les webhooks Stripe

### Chat en temps réel

1. Créer une table `carpooling_messages`
2. Utiliser Supabase Realtime
3. Ajouter un écran de chat

### Notifications push

1. Configurer OneSignal ou Firebase
2. Envoyer notifications sur :
   - Nouvelle réservation
   - Confirmation/refus
   - Rappel 1h avant départ

### Géolocalisation

1. Utiliser `expo-location`
2. Afficher la carte du trajet
3. Point de rencontre sur la carte

---

## 📊 ANALYTICS

**Créer une vue SQL pour les KPIs** :

```sql
CREATE OR REPLACE VIEW carpooling_kpis AS
SELECT
  COUNT(DISTINCT cr.id) as total_rides,
  COUNT(DISTINCT cb.id) as total_bookings,
  AVG(cr.price_per_seat) as avg_price,
  SUM(cb.amount_paid) as total_revenue,
  COUNT(DISTINCT cr.driver_id) as active_drivers,
  COUNT(DISTINCT cb.passenger_id) as active_passengers
FROM carpooling_rides cr
LEFT JOIN carpooling_bookings cb ON cb.ride_id = cr.id
WHERE cr.created_at >= NOW() - INTERVAL '30 days';
```

---

## 🐛 DÉPANNAGE

### "Column ride_id does not exist"
→ Réexécuter le script SQL `CARPOOLING_SETUP_FIXED.sql`

### "Navigation error"
→ Vérifier que tous les écrans sont bien enregistrés dans le Navigator

### "user is possibly null"
→ Ajouter une vérification : `if (!user) return;`

### Les trajets ne s'affichent pas
→ Vérifier les RLS policies dans Supabase

### Le paiement ne fonctionne pas
→ Vérifier que la fonction `process_credit_payment` existe dans Supabase

---

## 📞 SUPPORT

**En cas de problème :**
1. Vérifier les logs dans la console
2. Tester les requêtes SQL dans Supabase
3. Vérifier que toutes les dépendances sont installées
4. S'assurer que l'utilisateur est bien connecté

---

## 🎯 PROCHAINES ÉTAPES

1. ✅ Tester tous les flux utilisateur
2. ✅ Personnaliser les couleurs selon votre charte
3. ✅ Configurer les notifications
4. ✅ Intégrer Stripe pour les paiements réels
5. ✅ Ajouter le chat
6. ✅ Publier sur les stores

---

**🎉 Votre système de covoiturage moderne est prêt !**

Temps estimé pour finaliser : **2-3 jours**

- Build mobile : **4.4.0** (déjà créé)
- Build iOS : À créer avec compte Apple Developer
- Déploiement web : Push sur Vercel (auto-deploy)

**Bon courage ! 🚀**
