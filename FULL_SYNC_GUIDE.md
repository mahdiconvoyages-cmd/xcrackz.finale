# Guide de Synchronisation Complète - Web ↔️ Mobile

## Vue d'ensemble

Les applications web et mobile FleetCheck sont **100% synchronisées** via Supabase.

---

## ✅ Configuration Supabase Synchronisée

### Credentials (Identiques)

**Web** (`.env`)
```env
VITE_SUPABASE_URL=https://erdxgujquowvkhmudaai.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Mobile** (`mobile/.env`)
```env
EXPO_PUBLIC_SUPABASE_URL=https://erdxgujquowvkhmudaai.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ **Même base de données** pour les deux applications!

---

## 🗄️ Structure Supabase Partagée

### Tables Communes

Toutes ces tables sont utilisées par web ET mobile:

#### 1. `auth.users` (Supabase Auth)
- Authentification unifiée
- Même utilisateur peut se connecter web et mobile
- Session partagée via tokens

#### 2. `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  credits INTEGER DEFAULT 0,
  role TEXT DEFAULT 'user',
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3. `missions`
```sql
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE,
  title TEXT,
  status TEXT,
  driver_id UUID REFERENCES profiles(id),
  donor_id UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  pickup_address TEXT,
  pickup_city TEXT,
  delivery_address TEXT,
  delivery_city TEXT,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  vehicle_plate TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 4. `inspections`
```sql
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID REFERENCES missions(id),
  user_id UUID REFERENCES profiles(id),
  inspection_type TEXT CHECK (inspection_type IN ('departure', 'arrival')),
  odometer INTEGER,
  fuel_level INTEGER,
  notes TEXT,
  photos JSONB,
  inspector_signature TEXT,
  status TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 5. `contacts`
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 6. `shop_items`
```sql
CREATE TABLE shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  description TEXT,
  price INTEGER,
  category TEXT,
  image_url TEXT,
  stock INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 7. `orders`
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  items JSONB,
  total INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 8. `carpools` (Covoiturage)
```sql
CREATE TABLE carpools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES profiles(id),
  departure TEXT,
  arrival TEXT,
  departure_time TIMESTAMPTZ,
  seats_available INTEGER,
  price_per_seat INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔄 Flux de Données en Temps Réel

### Web → Mobile

**Exemple: Création de mission sur web**

1. Admin crée mission sur web
2. Mission insérée dans Supabase
3. Mobile reçoit notification temps réel
4. Chauffeur voit la nouvelle mission
5. Peut démarrer inspection depuis mobile

### Mobile → Web

**Exemple: Inspection sur mobile**

1. Chauffeur fait inspection sur mobile
2. Photos uploadées vers Supabase Storage
3. Données insérées dans table `inspections`
4. Web affiche automatiquement les résultats
5. Admin voit photos et signature

### Synchronisation Bidirectionnelle

**Exemple: Profil utilisateur**

1. Utilisateur modifie profil sur web
2. Changements dans `profiles` table
3. Mobile récupère les nouveaux données
4. Ou inversement: modification sur mobile → web

---

## 📡 Real-Time Subscriptions

### Activées sur les deux plateformes

**Web** (`src/lib/supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

**Mobile** (`mobile/src/lib/supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Exemple: Écouter les nouvelles missions

**Web**
```typescript
const subscription = supabase
  .channel('missions')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'missions'
  }, (payload) => {
    console.log('Nouvelle mission!', payload.new);
    // Rafraîchir la liste
  })
  .subscribe();
```

**Mobile**
```typescript
const subscription = supabase
  .channel('missions')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'missions'
  }, (payload) => {
    console.log('Nouvelle mission!', payload.new);
    // Afficher notification
    // Rafraîchir la liste
  })
  .subscribe();
```

---

## 🔐 Authentification Unifiée

### Même système Auth

**Web - Login**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});
```

**Mobile - Login**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});
```

### Session Partagée

- Token JWT stocké localement
- Web: localStorage
- Mobile: SecureStore (Expo)
- Validité: 1 semaine par défaut
- Refresh automatique

### Multi-Device

Un utilisateur peut:
- ✅ Se connecter sur web
- ✅ Se connecter sur mobile simultanément
- ✅ Déconnexion sur un appareil = session active sur l'autre
- ✅ Déconnexion globale possible

---

## 📁 Storage Partagé

### Bucket `inspections`

**Structure identique:**
```
inspections/
  {mission_id}/
    departure/
      {timestamp}_avant.jpg
      {timestamp}_arriere.jpg
      {timestamp}_gauche.jpg
      {timestamp}_droite.jpg
      {timestamp}_tableau.jpg
    arrival/
      {timestamp}_avant.jpg
      {timestamp}_arriere.jpg
      {timestamp}_doc.pdf
```

**Upload depuis mobile:**
```typescript
const { data, error } = await supabase.storage
  .from('inspections')
  .upload(`${missionId}/departure/${timestamp}_avant.jpg`, photoBlob);
```

**Récupération depuis web:**
```typescript
const { data } = supabase.storage
  .from('inspections')
  .getPublicUrl(`${missionId}/departure/${timestamp}_avant.jpg`);

// Afficher l'image
<img src={data.publicUrl} alt="Photo avant" />
```

---

## 🔄 Queue Offline (Mobile uniquement)

### Fonctionnement

1. **Pas de connexion** → Données stockées localement
2. **AsyncStorage** → Queue d'actions en attente
3. **Connexion rétablie** → Synchronisation automatique
4. **Upload des photos** → Puis insertion en base

### Exemple

```typescript
// Mobile - Inspection hors ligne
await enqueueInspection({
  missionId: '123',
  type: 'departure',
  km: '50000',
  photos: { /* URIs locales */ },
});

// Plus tard, avec connexion
const result = await flushInspectionQueue();
console.log(`${result.pushed} inspections synchronisées!`);
```

### Web - Affichage immédiat

Dès que mobile synchronise:
1. Photos uploadées → Storage
2. Données insérées → Database
3. Web récupère automatiquement
4. Affichage temps réel

---

## 🎯 Cas d'Usage Synchronisés

### 1. Workflow Complet d'Inspection

**Admin (Web)**
```typescript
// 1. Créer mission
const { data } = await supabase.from('missions').insert({
  title: 'Transport véhicule',
  driver_id: chauffeurId,
  pickup_address: 'Paris',
  delivery_address: 'Lyon',
});
```

**Chauffeur (Mobile)**
```typescript
// 2. Voir la mission
const { data: missions } = await supabase
  .from('missions')
  .select('*')
  .eq('driver_id', userId);

// 3. Faire inspection départ
await pushOrQueueInspection({
  missionId: mission.id,
  type: 'departure',
  photos: capturedPhotos,
});

// 4. Mettre à jour statut
await supabase.from('missions')
  .update({ status: 'in_progress' })
  .eq('id', missionId);
```

**Admin (Web) - Suivi temps réel**
```typescript
// Voir l'inspection en temps réel
const { data: inspection } = await supabase
  .from('inspections')
  .select('*')
  .eq('mission_id', missionId)
  .eq('inspection_type', 'departure')
  .single();

// Voir les photos
const photoUrls = Object.values(inspection.photos).map(path =>
  supabase.storage.from('inspections').getPublicUrl(path).data.publicUrl
);
```

### 2. Système de Covoiturage

**Utilisateur A (Mobile) - Publier**
```typescript
const { data } = await supabase.from('carpools').insert({
  driver_id: userId,
  departure: 'Paris',
  arrival: 'Lyon',
  departure_time: '2025-10-15T14:00:00',
  seats_available: 3,
  price_per_seat: 25,
});
```

**Utilisateur B (Web) - Rechercher**
```typescript
const { data: carpools } = await supabase
  .from('carpools')
  .select('*')
  .eq('departure', 'Paris')
  .eq('arrival', 'Lyon')
  .gte('departure_time', new Date().toISOString());
```

**Utilisateur B (Mobile) - Réserver**
```typescript
const { data } = await supabase.from('carpool_bookings').insert({
  carpool_id: carpoolId,
  passenger_id: userId,
  seats_booked: 1,
});

// Notification à l'utilisateur A automatiquement
```

### 3. Boutique et Crédits

**Utilisateur (Web) - Acheter crédits**
```typescript
// 1. Passer commande
const { data: order } = await supabase.from('orders').insert({
  user_id: userId,
  items: [{ item: 'credits_pack_500', quantity: 1 }],
  total: 500,
});

// 2. Mise à jour crédits
const { data } = await supabase
  .from('profiles')
  .update({ credits: profiles.credits + 500 })
  .eq('id', userId);
```

**Utilisateur (Mobile) - Voir crédits**
```typescript
// Récupération automatique du nouveau solde
const { data: profile } = await supabase
  .from('profiles')
  .select('credits')
  .eq('id', userId)
  .single();

console.log(`Crédits: ${profile.credits}`); // 500
```

---

## 📊 Monitoring Synchronisation

### Vérifier la connexion

**Web**
```typescript
const { data, error } = await supabase.from('profiles').select('*').limit(1);
if (error) console.error('Pas connecté à Supabase');
else console.log('✅ Connecté');
```

**Mobile**
```typescript
const { data, error } = await supabase.from('profiles').select('*').limit(1);
if (error) console.error('Pas connecté à Supabase');
else console.log('✅ Connecté');
```

### Dashboard Supabase

```
https://supabase.com/dashboard/project/erdxgujquowvkhmudaai
```

Voir en temps réel:
- Nombre de connexions
- Requêtes par seconde
- Storage utilisé
- Utilisateurs actifs

---

## 🚀 Performance

### Optimisations Communes

**1. Indexes** (déjà configurés)
```sql
CREATE INDEX idx_missions_driver ON missions(driver_id);
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_inspections_mission ON inspections(mission_id);
```

**2. RLS** (Row Level Security activé partout)
```sql
-- Les utilisateurs voient uniquement leurs données
CREATE POLICY "Users see own data"
ON profiles FOR SELECT
USING (auth.uid() = id);
```

**3. Pagination**

Web et mobile utilisent la pagination:
```typescript
const { data } = await supabase
  .from('missions')
  .select('*')
  .range(0, 9) // 10 premiers résultats
  .order('created_at', { ascending: false });
```

---

## 🔧 Maintenance

### Backups

Supabase fait des backups automatiques:
- Quotidiens (7 jours)
- PITR (Point-In-Time Recovery)

### Migrations

**Appliquer une migration:**

```bash
# Via dashboard Supabase
https://supabase.com/dashboard/project/erdxgujquowvkhmudaai/sql

# Ou via CLI
supabase db push
```

**Les deux apps utilisent la même DB:**
- ✅ Pas besoin de migrer séparément
- ✅ Une seule source de vérité

---

## ✅ Checklist Synchronisation

- [x] Même URL Supabase
- [x] Mêmes clés API
- [x] Même schéma de base de données
- [x] Storage partagé
- [x] Auth unifiée
- [x] Real-time activé
- [x] RLS configuré
- [x] Types synchronisés (`shared/types/`)

**Les applications web et mobile sont 100% synchronisées!** 🎊

---

## 📚 Documentation

### Supabase
- Dashboard: https://supabase.com/dashboard
- Docs: https://supabase.com/docs

### FleetCheck
- Web: `src/lib/supabase.ts`
- Mobile: `mobile/src/lib/supabase.ts`
- Types: `shared/types/database.ts`

---

**Toutes vos données sont synchronisées en temps réel entre web et mobile!** ⚡
