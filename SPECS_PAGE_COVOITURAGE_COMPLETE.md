# 🚀 Page Web Covoiturage COMPLÈTE - Spécifications

## 📋 RÈGLES MÉTIER (Inspiré BlaBlaCar/Karos)

### **1. RÉSERVATION**
- ❌ **PAS de réservation instantanée** par défaut
- ✅ Le passager demande une réservation → Statut `pending`
- ✅ Le conducteur doit **ACCEPTER** la réservation → Statut `confirmed`
- ✅ Le conducteur peut **REFUSER** → Statut `rejected`
- ✅ Déduction crédits SEULEMENT quand statut = `confirmed`

### **2. ANNULATION**
- ✅ **Passager** peut annuler si:
  - Statut = `pending` (pas encore accepté) → Annulation gratuite
  - Statut = `confirmed` ET trajet pas encore commencé → Remboursement crédits
  - Statut = `confirmed` ET trajet commencé → Pas de remboursement
  
- ✅ **Conducteur** peut annuler si:
  - Aucune réservation confirmée → Annulation libre
  - Réservations confirmées → Remboursement automatique passagers

### **3. COMMUNICATION**
- ❌ Numéro téléphone **CACHÉ** tant que réservation pas `confirmed`
- ✅ Numéro téléphone **VISIBLE** après confirmation
- ✅ Messagerie intégrée disponible pour tous les trajets
- ✅ Notifications temps réel des nouveaux messages

### **4. CRÉDITS**
- ✅ Vérifier solde avant réservation
- ✅ Déduction au moment de la **CONFIRMATION** (pas demande)
- ✅ Remboursement si annulation par conducteur ou avant départ
- ✅ Affichage solde en temps réel

### **5. STATUTS TRAJET**
```typescript
type TripStatus = 
  | 'published'    // Trajet publié, cherche passagers
  | 'in_progress'  // Trajet en cours
  | 'completed'    // Trajet terminé
  | 'cancelled'    // Trajet annulé

type BookingStatus = 
  | 'pending'      // En attente validation conducteur
  | 'confirmed'    // Accepté par conducteur (crédits déduits)
  | 'rejected'     // Refusé par conducteur
  | 'cancelled'    // Annulé (passager ou conducteur)
  | 'completed'    // Trajet complété
  | 'no_show'      // Passager absent
```

## 🎨 INTERFACE WEB COMPLÈTE

### **A. ONGLET RECHERCHE**

```tsx
<SearchTrips>
  <Filters>
    - Ville départ (API Adresse FR)
    - Ville arrivée (API Adresse FR)
    - Date (datepicker)
    - Nombre de places
    - Prix max
    - Note minimum conducteur
    - Animaux autorisés
    - Non-fumeur
  </Filters>
  
  <TripsList>
    {trips.map(trip => (
      <TripCard>
        <RouteInfo>
          {trip.departure_city} → {trip.arrival_city}
          {format(trip.departure_datetime, 'dd MMM yyyy HH:mm')}
        </RouteInfo>
        
        <DriverInfo>
          <Avatar>{trip.driver.full_name}</Avatar>
          <Rating>{trip.driver_rating} ⭐</Rating>
          <VerifiedBadge IF verified />
        </DriverInfo>
        
        <TripDetails>
          <Seats>{trip.available_seats} places</Seats>
          <Price>{trip.price_per_seat}€/place</Price>
          <Amenities>
            {trip.allows_pets && <PetsIcon />}
            {trip.allows_music && <MusicIcon />}
            {!trip.allows_smoking && <NonSmokingIcon />}
          </Amenities>
        </TripDetails>
        
        <Actions>
          <Button onClick={() => viewTripDetails(trip.id)}>
            Voir détails
          </Button>
        </Actions>
      </TripCard>
    ))}
  </TripsList>
</SearchTrips>
```

### **B. MODAL DÉTAILS TRAJET**

```tsx
<TripDetailsModal trip={selectedTrip}>
  <Header>
    <Route>{departure_city} → {arrival_city}</Route>
    <DateTime>{formatted_date}</DateTime>
  </Header>
  
  <DriverSection>
    <DriverCard>
      <Avatar + Name + Rating />
      <Stats>
        {driver_trips_count} trajets
        {driver_rating} ⭐ ({total_ratings} avis)
      </Stats>
      <VerifiedBadge />
    </DriverCard>
    
    {/* Téléphone visible SEULEMENT si réservation confirmée */}
    {myBooking?.status === 'confirmed' && (
      <ContactInfo>
        📞 {trip.driver.phone}
        <Button onClick={() => call(phone)}>Appeler</Button>
      </ContactInfo>
    )}
  </DriverSection>
  
  <RouteDetails>
    <DeparturePoint>{departure_address}</DeparturePoint>
    <ArrivalPoint>{arrival_address}</ArrivalPoint>
    <Distance IF calculated />
  </RouteDetails>
  
  <TripInfo>
    <Seats>{available_seats}/{total_seats} disponibles</Seats>
    <Price>{price_per_seat}€/place</Price>
    <Vehicle IF vehicle_info>
      {vehicle_info.model} ({vehicle_info.year})
    </Vehicle>
  </TripInfo>
  
  <Preferences>
    {allows_pets && <Badge>🐾 Animaux</Badge>}
    {allows_music && <Badge>🎵 Musique</Badge>}
    {allows_smoking ? <Badge>🚬 Fumeur</Badge> : <Badge>🚭 Non-fumeur</Badge>}
    <ChatLevel>{chat_level}</ChatLevel>
  </Preferences>
  
  <Description IF description>
    {trip.description}
  </Description>
  
  {/* RÉSERVATION */}
  {!isMyTrip && !myBooking && (
    <BookingSection>
      <SeatsSelector value={seatsToBook} max={available_seats} />
      <TotalPrice>{price_per_seat * seatsToBook}€</TotalPrice>
      
      <UserCredits>
        Solde: {userCredits} crédits
        {userCredits < total_price && (
          <Alert>Crédits insuffisants</Alert>
        )}
      </UserCredits>
      
      <Button 
        onClick={handleBookTrip}
        disabled={userCredits < total_price}
      >
        Demander réservation ({seatsToBook} places)
      </Button>
      
      <InfoText>
        ℹ️ Le conducteur doit valider votre demande.
        Vos crédits seront déduits à la confirmation.
      </InfoText>
    </BookingSection>
  )}
  
  {/* STATUT RÉSERVATION PASSAGER */}
  {myBooking && (
    <MyBookingStatus status={myBooking.status}>
      {status === 'pending' && (
        <Alert color="orange">
          ⏳ En attente de validation du conducteur
          <Button onClick={handleCancelBooking}>
            Annuler la demande
          </Button>
        </Alert>
      )}
      
      {status === 'confirmed' && (
        <Alert color="green">
          ✅ Réservation confirmée !
          {myBooking.seats_booked} place(s) - {myBooking.total_price}€
          <ContactInfo>
            📞 {trip.driver.phone}
          </ContactInfo>
          {!tripStarted && (
            <Button onClick={handleCancelBooking}>
              Annuler (remboursement)
            </Button>
          )}
        </Alert>
      )}
      
      {status === 'rejected' && (
        <Alert color="red">
          ❌ Réservation refusée par le conducteur
        </Alert>
      )}
      
      {status === 'cancelled' && (
        <Alert color="gray">
          Réservation annulée
        </Alert>
      )}
    </MyBookingStatus>
  )}
  
  {/* MESSAGERIE */}
  <MessagingSection>
    <MessagesThread trip_id={trip.id} />
    <MessageInput 
      onSend={(msg) => sendMessage(trip.id, trip.driver_id, msg)}
      placeholder="Message au conducteur..."
    />
  </MessagingSection>
</TripDetailsModal>
```

### **C. ONGLET MES TRAJETS (Conducteur)**

```tsx
<MyTripsAsDriver>
  {myTrips.map(trip => (
    <TripCard>
      <RouteInfo>{departure_city} → {arrival_city}</RouteInfo>
      <DateTime>{formatted_date}</DateTime>
      <Status>{trip.status}</Status>
      
      <BookingsCount>
        {confirmedBookings.length} confirmées
        {pendingBookings.length} en attente
      </BookingsCount>
      
      <AvailableSeats>
        {available_seats}/{total_seats} places
      </AvailableSeats>
      
      <Actions>
        <Button onClick={() => viewBookings(trip.id)}>
          Gérer réservations ({pendingBookings.length} à valider)
        </Button>
        <Button onClick={() => editTrip(trip.id)}>Modifier</Button>
        <Button onClick={() => cancelTrip(trip.id)} color="red">
          Annuler trajet
        </Button>
      </Actions>
      
      {/* Liste des réservations */}
      <BookingsList>
        {trip.bookings.map(booking => (
          <BookingCard status={booking.status}>
            <PassengerInfo>
              <Avatar>{booking.passenger.full_name}</Avatar>
              <Rating>{booking.passenger.rating}</Rating>
            </PassengerInfo>
            
            <BookingDetails>
              {booking.seats_booked} place(s)
              {booking.total_price}€
            </BookingDetails>
            
            {booking.status === 'pending' && (
              <Actions>
                <Button onClick={() => acceptBooking(booking.id)}>
                  ✅ Accepter
                </Button>
                <Button onClick={() => rejectBooking(booking.id)}>
                  ❌ Refuser
                </Button>
              </Actions>
            )}
            
            {booking.status === 'confirmed' && (
              <ContactInfo>
                📞 {booking.passenger.phone}
              </ContactInfo>
            )}
          </BookingCard>
        ))}
      </BookingsList>
    </TripCard>
  ))}
  
  <CreateTripButton onClick={() => setShowCreateModal(true)}>
    + Publier un trajet
  </CreateTripButton>
</MyTripsAsDriver>
```

### **D. ONGLET MES RÉSERVATIONS (Passager)**

```tsx
<MyBookingsAsPassenger>
  {myBookings.map(booking => (
    <BookingCard>
      <TripInfo>
        {booking.trip.departure_city} → {booking.trip.arrival_city}
        {format(booking.trip.departure_datetime, 'dd MMM yyyy HH:mm')}
      </TripInfo>
      
      <DriverInfo>
        <Avatar>{booking.trip.driver.full_name}</Avatar>
        <Rating>{booking.trip.driver_rating}</Rating>
      </DriverInfo>
      
      <BookingDetails>
        <Seats>{booking.seats_booked} place(s)</Seats>
        <Price>{booking.total_price}€</Price>
        <Status>{booking.status}</Status>
      </BookingDetails>
      
      {booking.status === 'pending' && (
        <Alert color="orange">
          ⏳ En attente de validation
          <Button onClick={() => cancelBooking(booking.id)}>
            Annuler la demande
          </Button>
        </Alert>
      )}
      
      {booking.status === 'confirmed' && (
        <>
          <Alert color="green">✅ Confirmé</Alert>
          <ContactInfo>
            📞 {booking.trip.driver.phone}
            <Button onClick={() => call(phone)}>Appeler</Button>
          </ContactInfo>
          {!tripStarted && (
            <Button onClick={() => cancelBooking(booking.id)}>
              Annuler (remboursement)
            </Button>
          )}
        </>
      )}
      
      {booking.status === 'completed' && (
        <Button onClick={() => rateDriver(booking.trip.driver_id)}>
          Noter le conducteur
        </Button>
      )}
      
      <Button onClick={() => viewTripDetails(booking.trip_id)}>
        Voir détails + Messages
      </Button>
    </BookingCard>
  ))}
</MyBookingsAsPassenger>
```

### **E. ONGLET MESSAGES**

```tsx
<MessagesTab>
  <ConversationsList>
    {conversations.map(conv => (
      <ConversationCard onClick={() => selectConversation(conv)}>
        <TripInfo>{conv.trip.departure_city} → {conv.trip.arrival_city}</TripInfo>
        <OtherUser>
          <Avatar>{conv.other_user.full_name}</Avatar>
        </OtherUser>
        <LastMessage>
          {conv.last_message}
          <Time>{conv.last_message_at}</Time>
        </LastMessage>
        {conv.unread_count > 0 && (
          <UnreadBadge>{conv.unread_count}</UnreadBadge>
        )}
      </ConversationCard>
    ))}
  </ConversationsList>
  
  <MessagesThread IF selectedConversation>
    <Header>
      <TripInfo>{trip.departure_city} → {trip.arrival_city}</TripInfo>
      <OtherUser>{other_user.full_name}</OtherUser>
    </Header>
    
    <MessagesList>
      {messages.map(msg => (
        <Message isOwn={msg.sender_id === user.id}>
          <Text>{msg.message}</Text>
          <Time>{format(msg.created_at, 'HH:mm')}</Time>
          {msg.read && <ReadIndicator>✓✓</ReadIndicator>}
        </Message>
      ))}
    </MessagesList>
    
    <MessageInput>
      <Textarea 
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Votre message..."
      />
      <Button onClick={handleSendMessage}>Envoyer</Button>
    </MessageInput>
  </MessagesThread>
</MessagesTab>
```

## 🔧 FONCTIONS CRITIQUES

### **1. Réserver un trajet**
```typescript
const handleBookTrip = async () => {
  // 1. Vérifier crédits
  if (userCredits < totalPrice) {
    toast.error('Crédits insuffisants');
    return;
  }
  
  // 2. Créer réservation en statut 'pending'
  const { data: booking, error } = await supabase
    .from('carpooling_bookings')
    .insert({
      trip_id: tripId,
      passenger_id: user.id,
      seats_booked: seatsToBook,
      total_price: pricePerSeat * seatsToBook,
      status: 'pending',  // ⚠️ PAS 'confirmed'
      message: bookingMessage,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // 3. Notifier conducteur
  await sendNotification(trip.driver_id, {
    type: 'booking_request',
    message: `Nouvelle demande de réservation pour ${trip.departure_city} → ${trip.arrival_city}`,
    trip_id: tripId,
  });
  
  toast.success('Demande envoyée ! En attente de validation.');
};
```

### **2. Accepter une réservation (Conducteur)**
```typescript
const handleAcceptBooking = async (bookingId: string) => {
  const booking = bookings.find(b => b.id === bookingId);
  
  // 1. Vérifier places disponibles
  const confirmedSeats = bookings
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + b.seats_booked, 0);
  
  if (confirmedSeats + booking.seats_booked > trip.total_seats) {
    toast.error('Plus assez de places disponibles');
    return;
  }
  
  // 2. Mettre à jour statut
  const { error: updateError } = await supabase
    .from('carpooling_bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId);
  
  if (updateError) throw updateError;
  
  // 3. Déduire les crédits du passager
  const { error: creditsError } = await supabase.rpc('deduct_credits', {
    user_id: booking.passenger_id,
    amount: booking.total_price,
  });
  
  if (creditsError) {
    // Rollback
    await supabase
      .from('carpooling_bookings')
      .update({ status: 'pending' })
      .eq('id', bookingId);
    toast.error('Erreur déduction crédits');
    return;
  }
  
  // 4. Mettre à jour available_seats
  await supabase
    .from('carpooling_trips')
    .update({
      available_seats: trip.total_seats - (confirmedSeats + booking.seats_booked),
    })
    .eq('id', trip.id);
  
  // 5. Notifier passager
  await sendNotification(booking.passenger_id, {
    type: 'booking_confirmed',
    message: `Votre réservation pour ${trip.departure_city} → ${trip.arrival_city} est confirmée !`,
    trip_id: trip.id,
  });
  
  toast.success('Réservation acceptée !');
};
```

### **3. Annuler une réservation**
```typescript
const handleCancelBooking = async (bookingId: string, cancelledBy: 'passenger' | 'driver') => {
  const booking = bookings.find(b => b.id === bookingId);
  const tripStarted = new Date(trip.departure_datetime) < new Date();
  
  // 1. Vérifier si remboursement
  const shouldRefund = (
    booking.status === 'confirmed' &&
    (!tripStarted || cancelledBy === 'driver')
  );
  
  // 2. Mettre à jour statut
  await supabase
    .from('carpooling_bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);
  
  // 3. Rembourser si nécessaire
  if (shouldRefund) {
    await supabase.rpc('add_credits', {
      user_id: booking.passenger_id,
      amount: booking.total_price,
    });
    
    toast.info(`Remboursement de ${booking.total_price} crédits`);
  }
  
  // 4. Libérer places
  if (booking.status === 'confirmed') {
    await supabase
      .from('carpooling_trips')
      .update({
        available_seats: trip.available_seats + booking.seats_booked,
      })
      .eq('id', trip.id);
  }
  
  // 5. Notifier
  const notifyUserId = cancelledBy === 'passenger' 
    ? trip.driver_id 
    : booking.passenger_id;
  
  await sendNotification(notifyUserId, {
    type: 'booking_cancelled',
    message: `Réservation annulée pour ${trip.departure_city} → ${trip.arrival_city}`,
    trip_id: trip.id,
  });
};
```

### **4. RPC Functions SQL nécessaires**

```sql
-- Fonction: Déduire crédits
CREATE OR REPLACE FUNCTION deduct_credits(user_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE user_credits
  SET credits = credits - amount,
      updated_at = NOW()
  WHERE user_id = user_id
    AND credits >= amount;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Ajouter crédits
CREATE OR REPLACE FUNCTION add_credits(user_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_credits (user_id, credits)
  VALUES (user_id, amount)
  ON CONFLICT (user_id) DO UPDATE
  SET credits = user_credits.credits + amount,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 📊 RÉSUMÉ DES CHANGEMENTS

### **Tables utilisées (UNIFIÉES)**
✅ `carpooling_trips` - Trajets
✅ `carpooling_bookings` - Réservations
✅ `carpooling_messages` - Messages
✅ `carpooling_ratings` - Notes
✅ `user_credits` - Solde crédits

### **Workflow complet**
1. Passager cherche trajet
2. Passager demande réservation → `pending`
3. Conducteur accepte → `confirmed` + déduction crédits
4. Numéro visible pour les deux
5. Messages disponibles
6. Annulation possible avant départ
7. Après trajet → Notation mutuelle

### **Règles de sécurité**
- Crédits vérifiés avant réservation
- Crédits déduits SEULEMENT à confirmation
- Remboursement si annulation avant départ
- Téléphone caché si pas confirmé
- RLS Supabase sur toutes les tables

---

**Fichier à créer:** `src/pages/CovoiturageComplete.tsx` (2000+ lignes)

Voulez-vous que je procède à la création du fichier complet maintenant ?
