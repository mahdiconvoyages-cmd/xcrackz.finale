# 🔍 ANALYSE COHÉRENCE DES TABLES - Mobile Flutter

## 📊 État Général

Analyse complète des tables utilisées dans l'application mobile Flutter comparées à la base de données réelle.

---

## ✅ TABLES CORRECTES (Utilisées correctement)

### 1. **Missions** ✅
- **Table SQL**: `missions`
- **Utilisation mobile**: `missions` ✅
- **Fichiers**:
  - `mission_service.dart` ✅
  - `dashboard_screen.dart` ✅
  - `tracking_map_screen.dart` ✅
  - `tracking_list_screen.dart` ✅
  - `sync_service.dart` ✅
- **Status**: PARFAIT

### 2. **Vehicle Inspections** ✅
- **Table SQL**: `vehicle_inspections`
- **Utilisation mobile**: `vehicle_inspections` ✅
- **Fichiers**:
  - `inspection_service.dart` ✅
  - `sync_service.dart` ✅
- **Status**: CORRIGÉ (était `inspections` avant)

### 3. **Inspection Photos** ✅
- **Table SQL**: `inspection_photos`
- **Utilisation mobile**: `inspection_photos` ✅
- **Fichiers**:
  - `inspection_photo_service.dart` ✅
- **Status**: PARFAIT
- **Note**: Table liée à `inspections` (ancien système), pas à `vehicle_inspections`

### 4. **Inspection Damages** ✅
- **Table SQL**: `inspection_damages`
- **Utilisation mobile**: `inspection_damages` ✅
- **Fichiers**:
  - `inspection_photo_service.dart` ✅
- **Status**: PARFAIT

### 5. **Covoiturage** ✅
- **Table SQL**: `covoiturage` (alias de `carpooling_trips`)
- **Utilisation mobile**: `covoiturage` ✅
- **Fichiers**:
  - `covoiturage_service.dart` ✅
  - `create_trip_screen.dart` ✅
  - `sync_service.dart` ✅
- **Status**: PARFAIT

### 6. **Invoices** ✅
- **Table SQL**: `invoices`
- **Utilisation mobile**: `invoices` ✅
- **Fichiers**:
  - `invoice_service.dart` ✅
  - `quote_service.dart` ✅
  - `dashboard_screen.dart` ✅
  - `sync_service.dart` ✅
- **Status**: PARFAIT

### 7. **Quotes** ✅
- **Table SQL**: `quotes`
- **Utilisation mobile**: `quotes` ✅
- **Fichiers**:
  - `quote_service.dart` ✅
  - `sync_service.dart` ✅
- **Status**: PARFAIT

### 8. **Quote Items** ✅
- **Table SQL**: `quote_items`
- **Utilisation mobile**: `quote_items` ✅
- **Fichiers**:
  - `quote_service.dart` ✅
- **Status**: PARFAIT

### 9. **Invoice Items** ✅
- **Table SQL**: `invoice_items`
- **Utilisation mobile**: `invoice_items` ✅
- **Fichiers**:
  - `quote_service.dart` ✅
- **Status**: PARFAIT

### 10. **Profiles** ✅
- **Table SQL**: `profiles`
- **Utilisation mobile**: `profiles` ✅
- **Fichiers**:
  - `trip_details_screen.dart` ✅
  - `sync_service.dart` ✅
- **Status**: PARFAIT

### 11. **User Credits** ✅
- **Table SQL**: `user_credits`
- **Utilisation mobile**: `user_credits` ✅
- **Fichiers**:
  - `credits_service.dart` ✅
- **Status**: PARFAIT

### 12. **Credit Transactions** ✅
- **Table SQL**: `credit_transactions`
- **Utilisation mobile**: `credit_transactions` ✅
- **Fichiers**:
  - `credits_service.dart` ✅
- **Status**: PARFAIT

### 13. **Subscriptions** ✅
- **Table SQL**: `subscriptions`
- **Utilisation mobile**: `subscriptions` ✅
- **Fichiers**:
  - `subscription_service.dart` ✅
- **Status**: PARFAIT

### 14. **Carpooling Messages** ✅
- **Table SQL**: `carpooling_messages`
- **Utilisation mobile**: `carpooling_messages` ✅
- **Fichiers**:
  - `carpooling_chat_service.dart` ✅
  - `carpooling_messages_screen.dart` ✅
- **Status**: PARFAIT

### 15. **Ride Ratings** ✅
- **Table SQL**: `ride_ratings` (ou `carpooling_reviews`)
- **Utilisation mobile**: `ride_ratings` ✅
- **Fichiers**:
  - `carpooling_rating_service.dart` ✅
- **Status**: À VÉRIFIER (voir section problèmes)

---

## ⚠️ TABLES PROBLÉMATIQUES (À vérifier ou corriger)

### 1. **GPS Tracking** ⚠️

#### Utilisé dans le mobile:
```dart
// tracking_map_screen.dart
await _supabase.from('gps_tracking').upsert({...})

// gps_tracking_service.dart
await _supabase.from('gps_tracking').upsert({...})
.from('gps_tracking').select()

// tracking_list_screen.dart
.from('gps_tracking').select()
```

#### Table SQL réelle:
- ❌ **Pas de table `gps_tracking`**
- ✅ Tables disponibles:
  - `gps_tracking_sessions`
  - `gps_location_points`
  - `mission_tracking_sessions`
  - `mission_tracking_positions`

**PROBLÈME**: Le mobile utilise `gps_tracking` qui n'existe pas!

**SOLUTION**: Choisir entre:
1. Créer une table `gps_tracking` (simple)
2. Utiliser `mission_tracking_positions` (recommandé)
3. Utiliser `gps_location_points` + `gps_tracking_sessions`

---

### 2. **Users vs Auth.users** ⚠️

#### Utilisé dans le mobile:
```dart
// carpooling_booking_confirm_screen.dart
.from('users').select()

// carpooling_wallet_screen.dart (3 occurrences)
.from('users').select()
.from('users').update()
```

#### Table SQL réelle:
- ❌ **Pas de table publique `users`**
- ✅ Tables disponibles:
  - `auth.users` (système Supabase, protégée)
  - `profiles` (table publique avec infos utilisateur)

**PROBLÈME**: Le mobile essaie d'accéder à `users` qui n'existe pas dans le schéma public!

**SOLUTION**: Remplacer tous les `.from('users')` par `.from('profiles')`

---

### 3. **Wallet Transactions** ⚠️

#### Utilisé dans le mobile:
```dart
// carpooling_wallet_screen.dart (3 occurrences)
.from('wallet_transactions').select()
.from('wallet_transactions').insert()
```

#### Table SQL réelle:
- ⚠️ Table existe dans `COVOITURAGE_PROFESSIONNEL_COMPLET.sql`
- ❓ Mais absente de `COMPLETE_DATABASE_RESET_FULL.sql`

**PROBLÈME**: Incohérence dans les migrations SQL!

**SOLUTION**: 
1. Vérifier si la table existe vraiment dans Supabase
2. Si non, créer la table `wallet_transactions`
3. Ou utiliser `credit_transactions` si c'est un alias

---

### 4. **Ride Ratings vs Carpooling Reviews** ⚠️

#### Utilisé dans le mobile:
```dart
// carpooling_rating_service.dart
.from('ride_ratings').insert()
.from('ride_ratings').select()
```

#### Table SQL réelle:
- ❌ Pas de table `ride_ratings`
- ✅ Table `carpooling_reviews` existe

**PROBLÈME**: Nom de table incorrect!

**SOLUTION**: Remplacer `ride_ratings` par `carpooling_reviews`

---

## 🔴 INCOHÉRENCES CRITIQUES À CORRIGER

### Priorité 1 - BLOQUANT 🚨

1. **`gps_tracking`** n'existe pas
   - Fichiers: `tracking_map_screen.dart`, `gps_tracking_service.dart`, `tracking_list_screen.dart`
   - Impact: Tracking GPS ne fonctionne pas
   - Solution: Migrer vers `mission_tracking_positions`

2. **`users`** n'existe pas dans schéma public
   - Fichiers: `carpooling_booking_confirm_screen.dart`, `carpooling_wallet_screen.dart`
   - Impact: Erreurs lors des bookings et wallet
   - Solution: Utiliser `profiles`

### Priorité 2 - IMPORTANT ⚠️

3. **`wallet_transactions`** incohérence
   - Fichiers: `carpooling_wallet_screen.dart`
   - Impact: Portefeuille covoiturage ne fonctionne pas
   - Solution: Créer la table ou mapper vers `credit_transactions`

4. **`ride_ratings`** vs `carpooling_reviews`
   - Fichiers: `carpooling_rating_service.dart`
   - Impact: Notes ne sont pas enregistrées
   - Solution: Renommer en `carpooling_reviews`

---

## 📋 PLAN DE CORRECTION

### Étape 1: Corriger GPS Tracking
```dart
// AVANT
.from('gps_tracking')

// APRÈS
.from('mission_tracking_positions')
```

### Étape 2: Corriger Users → Profiles
```dart
// AVANT
.from('users')

// APRÈS
.from('profiles')
```

### Étape 3: Corriger Ride Ratings
```dart
// AVANT
.from('ride_ratings')

// APRÈS
.from('carpooling_reviews')
```

### Étape 4: Vérifier/Créer Wallet Transactions
```sql
-- Si la table n'existe pas, créer:
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'refund')),
  description TEXT,
  balance_after NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📊 RÉCAPITULATIF

| Table Utilisée | Existe? | Correcte? | Action |
|----------------|---------|-----------|--------|
| `missions` | ✅ | ✅ | Aucune |
| `vehicle_inspections` | ✅ | ✅ | Aucune |
| `inspection_photos` | ✅ | ✅ | Aucune |
| `inspection_damages` | ✅ | ✅ | Aucune |
| `covoiturage` | ✅ | ✅ | Aucune |
| `invoices` | ✅ | ✅ | Aucune |
| `quotes` | ✅ | ✅ | Aucune |
| `profiles` | ✅ | ✅ | Aucune |
| `carpooling_messages` | ✅ | ✅ | Aucune |
| `gps_tracking` | ❌ | ❌ | Migrer vers `mission_tracking_positions` |
| `users` | ❌ | ❌ | Remplacer par `profiles` |
| `wallet_transactions` | ⚠️ | ⚠️ | Vérifier/Créer |
| `ride_ratings` | ❌ | ❌ | Renommer en `carpooling_reviews` |

**Total**: 13 tables correctes ✅ | 4 tables à corriger ❌

---

## 🎯 PROCHAINES ÉTAPES

1. ✅ Corriger `gps_tracking` → `mission_tracking_positions`
2. ✅ Corriger `users` → `profiles`
3. ✅ Corriger `ride_ratings` → `carpooling_reviews`
4. ⏳ Vérifier existence de `wallet_transactions` dans Supabase
5. ⏳ Créer migration SQL si nécessaire
6. ⏳ Tester toutes les fonctionnalités affectées

---

**Date d'analyse**: 19 Novembre 2025  
**Status**: 📊 Analyse terminée - Corrections en attente
