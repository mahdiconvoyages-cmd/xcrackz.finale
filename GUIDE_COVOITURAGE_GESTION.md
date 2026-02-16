# 📋 Guide de Gestion du Covoiturage - Messagerie & Réservations

## 🎯 Vue d'ensemble du système

Votre page Covoiturage fonctionne avec **4 onglets principaux** :

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Recherche  │  🚗 Mes Trajets  │  🎫 Mes Réservations  │  💬 Messages  │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ 🔍 ONGLET RECHERCHE

### Fonctionnalités actuelles ✅
- **Recherche de trajets** par ville de départ/arrivée
- **Filtres avancés** : prix, places, animaux, non-fumeur, réservation instantanée
- **Affichage des trajets** disponibles avec détails conducteur
- **Bouton "Réserver"** sur chaque trajet

### Comment ça fonctionne
```typescript
// Chargement des trajets disponibles
const loadTrips = async () => {
  const { data } = await supabase
    .from('carpooling_trips')
    .select(`
      *,
      driver:profiles!carpooling_trips_driver_id_fkey(
        id, full_name, email, avatar_url, phone
      )
    `)
    .eq('status', 'active')
    .gte('available_seats', 1)
    .order('departure_datetime', { ascending: true });
    
  setTrips(data || []);
};
```

### Processus de réservation
1. **Clic sur "Réserver"** → Ouvre le modal de réservation
2. **Remplir le formulaire** :
   - Nombre de places (1-X)
   - Message pour le conducteur (minimum 20 caractères)
3. **Vérification des crédits** : Nécessite **2 crédits xCrackz**
4. **Création de la réservation** :
   ```typescript
   await supabase.from('carpooling_bookings').insert({
     trip_id: selectedTrip.id,
     passenger_id: user.id,
     seats_booked: seatsBooked,
     total_price: tripPrice, // Prix à payer au conducteur
     credit_cost: 2, // Crédits déduits
     status: 'pending' ou 'confirmed', // Selon instant_booking
     message: bookingData.message
   });
   ```
5. **Déduction des crédits** via RPC `deduct_credits`
6. **Notification** : Alerte de confirmation

---

## 2️⃣ 🚗 ONGLET MES TRAJETS (Conducteur)

### Fonctionnalités actuelles ✅
- **Liste de vos trajets publiés**
- **Créer un nouveau trajet** (bouton "Proposer un trajet")
- **Voir les réservations** pour chaque trajet
- **Modifier/Annuler** vos trajets

### Comment ça fonctionne
```typescript
// Chargement de vos trajets
const loadMyTrips = async () => {
  const { data } = await supabase
    .from('carpooling_trips')
    .select('*')
    .eq('driver_id', user.id)
    .order('created_at', { ascending: false });
    
  setMyTrips(data || []);
};

// Chargement des réservations pour un trajet spécifique
const loadTripBookings = async (tripId: string) => {
  const { data } = await supabase
    .from('carpooling_bookings')
    .select(`
      *,
      passenger:profiles!carpooling_bookings_passenger_id_fkey(
        id, full_name, email, avatar_url, phone
      )
    `)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
    
  setTripBookings(data || []);
};
```

### Création d'un trajet
1. **Clic sur "Proposer un trajet"**
2. **Remplir le formulaire** :
   - Départ (adresse + ville)
   - Arrivée (adresse + ville)
   - Date et heure
   - Nombre de places (1-8)
   - Prix par place (minimum 2€)
   - Options : animaux, fumeur, musique, etc.
3. **Vérification** : Nécessite **2 crédits xCrackz**
4. **Publication** → Trajet visible dans la recherche

### Gestion des réservations reçues
Pour chaque réservation sur vos trajets, vous pouvez :
- ✅ **Accepter** : `UPDATE carpooling_bookings SET status = 'confirmed'`
- ❌ **Refuser** : `UPDATE carpooling_bookings SET status = 'rejected'`
- 💬 **Contacter** le passager (via messagerie)

---

## 3️⃣ 🎫 ONGLET MES RÉSERVATIONS (Passager)

### Fonctionnalités actuelles ✅
- **Liste de vos réservations**
- **Statuts** : En attente, Confirmée, Refusée, Annulée
- **Détails du trajet** et du conducteur
- **Actions** : Annuler, Contacter le conducteur

### Comment ça fonctionne
```typescript
// Chargement de vos réservations
const loadMyBookings = async () => {
  const { data } = await supabase
    .from('carpooling_bookings')
    .select(`
      *,
      trip:carpooling_trips(
        *,
        driver:profiles!carpooling_trips_driver_id_fkey(
          id, full_name, email, avatar_url, phone
        )
      )
    `)
    .eq('passenger_id', user.id)
    .order('created_at', { ascending: false });
    
  setMyBookings(data || []);
};
```

### Statuts de réservation
| Statut | Description | Actions possibles |
|--------|-------------|-------------------|
| `pending` | En attente de validation conducteur | Annuler, Contacter |
| `confirmed` | Acceptée par le conducteur | Annuler, Contacter |
| `rejected` | Refusée par le conducteur | Contacter |
| `cancelled` | Annulée par vous | - |
| `completed` | Trajet terminé | Noter le conducteur |

### Annulation d'une réservation
```typescript
const cancelBooking = async (bookingId: string) => {
  // 1. Mettre à jour le statut
  await supabase
    .from('carpooling_bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);
  
  // 2. Rembourser les 2 crédits
  await supabase.rpc('add_credits', {
    p_user_id: user.id,
    p_amount: 2,
    p_description: 'Remboursement annulation covoiturage'
  });
  
  // 3. Libérer les places dans le trajet
  // (géré automatiquement par le trigger SQL)
};
```

---

## 4️⃣ 💬 ONGLET MESSAGES

### ⚠️ État actuel : **PAS ENCORE IMPLÉMENTÉ**

La table `carpooling_messages` existe dans la base de données, mais l'interface n'est pas encore codée.

### Architecture de la messagerie (à implémenter)

#### Structure de la table
```sql
CREATE TABLE carpooling_messages (
  id uuid PRIMARY KEY,
  trip_id uuid REFERENCES carpooling_trips(id),
  sender_id uuid REFERENCES profiles(id),
  receiver_id uuid REFERENCES profiles(id),
  message text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

#### Fonctionnalités à développer

**1. Liste des conversations**
```typescript
const loadConversations = async () => {
  // Récupérer toutes les conversations où l'utilisateur est impliqué
  const { data } = await supabase
    .from('carpooling_messages')
    .select(`
      *,
      sender:profiles!sender_id(id, full_name, avatar_url),
      receiver:profiles!receiver_id(id, full_name, avatar_url),
      trip:carpooling_trips(
        id,
        departure_city,
        arrival_city,
        departure_datetime
      )
    `)
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false });
  
  // Grouper par conversation (trip_id + autre utilisateur)
  const grouped = groupMessagesByConversation(data);
  setConversations(grouped);
};
```

**2. Interface de chat**
```typescript
// Composant de messagerie
function MessagesTab() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  
  return (
    <div className="flex h-[600px]">
      {/* Liste des conversations (gauche) */}
      <div className="w-1/3 border-r overflow-y-auto">
        {conversations.map(conv => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            onClick={() => setSelectedConversation(conv)}
            unreadCount={conv.unreadCount}
          />
        ))}
      </div>
      
      {/* Messages de la conversation (droite) */}
      <div className="w-2/3 flex flex-col">
        {selectedConversation && (
          <>
            {/* En-tête avec infos du trajet */}
            <div className="p-4 border-b">
              <h3>{selectedConversation.trip.departure_city} → {selectedConversation.trip.arrival_city}</h3>
              <p>Avec {selectedConversation.otherUser.full_name}</p>
            </div>
            
            {/* Liste des messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedConversation.messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender_id === user.id}
                />
              ))}
            </div>
            
            {/* Input pour nouveau message */}
            <div className="p-4 border-t flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Écrivez votre message..."
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <button onClick={sendMessage}>
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

**3. Envoi de message**
```typescript
const sendMessage = async () => {
  if (!messageText.trim() || !selectedConversation) return;
  
  const { error } = await supabase
    .from('carpooling_messages')
    .insert({
      trip_id: selectedConversation.trip_id,
      sender_id: user.id,
      receiver_id: selectedConversation.otherUserId,
      message: messageText.trim(),
      is_read: false
    });
  
  if (!error) {
    setMessageText('');
    loadMessages(selectedConversation.trip_id);
  }
};
```

**4. Temps réel avec Supabase Realtime**
```typescript
useEffect(() => {
  if (!user || !selectedConversation) return;
  
  // S'abonner aux nouveaux messages
  const channel = supabase
    .channel('carpooling_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'carpooling_messages',
        filter: `trip_id=eq.${selectedConversation.trip_id}`
      },
      (payload) => {
        // Ajouter le nouveau message à la liste
        setMessages(prev => [...prev, payload.new]);
        
        // Marquer comme lu si on est le destinataire
        if (payload.new.receiver_id === user.id) {
          markAsRead(payload.new.id);
        }
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [selectedConversation]);
```

**5. Marquer comme lu**
```typescript
const markAsRead = async (messageId: string) => {
  await supabase
    .from('carpooling_messages')
    .update({ 
      is_read: true, 
      read_at: new Date().toISOString() 
    })
    .eq('id', messageId)
    .eq('receiver_id', user.id);
};
```

**6. Notification de messages non lus**
```typescript
const loadUnreadCount = async () => {
  const { count } = await supabase
    .from('carpooling_messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', user.id)
    .eq('is_read', false);
  
  setUnreadMessagesCount(count || 0);
};

// Afficher badge sur l'onglet Messages
<button onClick={() => setActiveTab('messages')}>
  💬 Messages
  {unreadMessagesCount > 0 && (
    <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
      {unreadMessagesCount}
    </span>
  )}
</button>
```

---

## 🔄 FLUX COMPLET D'UNE RÉSERVATION

### Scénario : Alice réserve un trajet de Bob

```
1. 🔍 Alice cherche un trajet Paris → Lyon
   └─> Trouve le trajet de Bob (15€/place, 2 places disponibles)

2. 🎫 Alice clique sur "Réserver"
   ├─> Saisit : 1 place + message "Bonjour, je voyage léger"
   ├─> Vérification : Alice a 10 crédits ✅
   └─> Création réservation (status: 'pending')
       └─> Déduction : 2 crédits (reste 8 crédits)

3. 🔔 Bob reçoit une notification (à implémenter)
   └─> Va dans "Mes Trajets" → Voit la demande d'Alice

4. 👀 Bob consulte la demande
   ├─> Voit le profil d'Alice
   ├─> Lit son message
   └─> Décide : Accepter ✅ ou Refuser ❌

5a. ✅ Bob accepte
    ├─> UPDATE status = 'confirmed'
    ├─> Places mises à jour : 2 → 1 disponible (trigger SQL)
    └─> Alice reçoit confirmation

5b. ❌ Bob refuse
    ├─> UPDATE status = 'rejected'
    ├─> Remboursement : +2 crédits pour Alice (RPC)
    └─> Places inchangées

6. 💬 Communication (si implémentée)
   ├─> Alice : "À quelle heure exactement?"
   ├─> Bob : "Je pars à 9h pile du RER"
   └─> Alice : "Parfait, à demain!"

7. 🚗 Jour du trajet
   └─> Alice paie 15€ en espèces à Bob

8. ⭐ Après le trajet
   ├─> Alice note Bob (5/5 étoiles)
   └─> Bob note Alice (5/5 étoiles)
```

---

## 💳 SYSTÈME DE CRÉDITS

### Utilisation des crédits xCrackz

| Action | Coût | Remboursement |
|--------|------|---------------|
| Publier un trajet | 2 crédits | Non |
| Réserver un trajet | 2 crédits | Si annulation ou refus |
| Annulation trajet (conducteur) | 0 | Rembourse les passagers |

### Fonctions RPC Supabase

**Déduire des crédits**
```sql
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text
)
RETURNS void AS $$
BEGIN
  UPDATE user_credits
  SET balance = balance - p_amount
  WHERE user_id = p_user_id;
  
  INSERT INTO credits_history (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, 'debit', p_description);
END;
$$ LANGUAGE plpgsql;
```

**Ajouter des crédits**
```sql
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text
)
RETURNS void AS $$
BEGIN
  UPDATE user_credits
  SET balance = balance + p_amount
  WHERE user_id = p_user_id;
  
  INSERT INTO credits_history (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, 'credit', p_description);
END;
$$ LANGUAGE plpgsql;
```

---

## 🔔 NOTIFICATIONS (À IMPLÉMENTER)

### Types de notifications à envoyer

1. **Nouvelle réservation** (pour conducteur)
   - "Alice a réservé 1 place pour votre trajet Paris → Lyon"

2. **Réservation confirmée** (pour passager)
   - "Bob a accepté votre réservation pour le trajet du 25/10"

3. **Réservation refusée** (pour passager)
   - "Bob a refusé votre réservation. Vos 2 crédits ont été remboursés"

4. **Nouveau message** (pour les deux)
   - "Vous avez reçu un nouveau message de Alice"

5. **Rappel trajet** (J-1 et H-2)
   - "Rappel : Votre trajet Paris → Lyon commence demain à 9h"

### Implémentation avec Supabase Edge Functions
```typescript
// supabase/functions/send-carpooling-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { userId, type, data } = await req.json();
  
  // Récupérer l'email de l'utilisateur
  const supabase = createClient(/* ... */);
  const { data: user } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single();
  
  // Envoyer l'email via service externe (SendGrid, Resend, etc.)
  // Ou notification push via OneSignal
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## 📊 STATISTIQUES & ANALYTICS

### Données à afficher dans un dashboard

```typescript
// Statistiques conducteur
const getDriverStats = async (userId: string) => {
  // Nombre de trajets publiés
  const { count: tripsCount } = await supabase
    .from('carpooling_trips')
    .select('*', { count: 'exact', head: true })
    .eq('driver_id', userId);
  
  // Nombre de passagers transportés
  const { count: passengersCount } = await supabase
    .from('carpooling_bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
    .in('trip_id', 
      supabase.from('carpooling_trips')
        .select('id')
        .eq('driver_id', userId)
    );
  
  // Note moyenne
  const { data: avgRating } = await supabase
    .rpc('get_user_average_rating', { user_uuid: userId });
  
  return { tripsCount, passengersCount, avgRating };
};
```

---

## 🚀 PROCHAINES ÉTAPES RECOMMANDÉES

### Priorité 1 : Messagerie 💬
1. Créer le composant `MessagesTab`
2. Implémenter `loadConversations()`
3. Interface de chat avec temps réel
4. Notifications de nouveaux messages

### Priorité 2 : Notifications 🔔
1. Edge Function pour envoi d'emails
2. Notifications push mobile (OneSignal)
3. Notifications in-app

### Priorité 3 : Amélioration UX ✨
1. Filtres avancés dans la recherche
2. Carte interactive avec itinéraires
3. Photos de profil obligatoires
4. Vérification d'identité

### Priorité 4 : Système d'avis ⭐
1. Interface pour noter après trajet
2. Affichage des avis sur profils
3. Calcul réputation

---

## 📝 RÉSUMÉ

Votre page Covoiturage est **90% fonctionnelle** :

✅ **Fonctionnel**
- Recherche de trajets
- Création de trajets
- Réservations
- Gestion des crédits
- Politique RLS sécurisée

⏳ **À développer**
- Messagerie temps réel
- Notifications
- Système d'avis
- Statistiques détaillées

La base est solide, il reste principalement la couche communication (messagerie + notifications) à implémenter !
