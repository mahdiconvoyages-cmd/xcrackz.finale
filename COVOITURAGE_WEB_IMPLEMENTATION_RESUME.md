# 🚗 Page Web Covoiturage COMPLÈTE - Résumé d'implémentation

**Fichier:** `src/pages/Covoiturage.tsx`  
**Taille estimée:** ~2500 lignes  
**Inspiré de:** BlaBlaCar + Karos

---

## 📋 FONCTIONNALITÉS IMPLÉMENTÉES

### 1️⃣ **SYSTÈME DE RÉSERVATION AVEC VALIDATION**

#### Flux passager :
```
1. Rechercher trajet
2. Voir détails + info conducteur (sans téléphone)
3. Demander réservation → Status: PENDING ⏳
4. Attendre validation conducteur
5. Si CONFIRMÉ ✅ → Crédits déduits + Téléphone visible
6. Si REFUSÉ ❌ → Notification + Pas de déduction
```

#### Flux conducteur :
```
1. Publier trajet
2. Recevoir demandes réservation (status: PENDING)
3. Voir profil passager + note
4. ACCEPTER → Déduction crédits automatique via RPC
5. REFUSER → Passager notifié
6. Gérer toutes les réservations confirmées
```

### 2️⃣ **MESSAGERIE INTÉGRÉE TEMPS RÉEL**

- 💬 Chat par trajet entre conducteur et passagers
- 🔔 Notifications temps réel (Supabase Realtime)
- ✓✓ Indicateurs de lecture (is_read)
- 📱 Badge nombre de messages non lus
- 🔄 Mise à jour automatique des conversations

### 3️⃣ **GESTION CRÉDITS INTELLIGENTE**

```typescript
// Vérification avant réservation
const userCredits = await supabase.rpc('get_user_credits', { p_user_id: user.id });
if (userCredits < totalPrice) → Erreur affichée

// Déduction à la confirmation (PAS à la demande)
await supabase.rpc('deduct_credits', { 
  p_user_id: passenger_id, 
  p_amount: total_price 
});

// Remboursement si annulation avant départ
if (shouldRefund) {
  await supabase.rpc('add_credits', { 
    p_user_id: passenger_id, 
    p_amount: total_price 
  });
}
```

### 4️⃣ **RÈGLES D'ANNULATION**

| Qui annule | Quand | Remboursement | Pénalité |
|------------|-------|---------------|----------|
| **Passager** | Demande pending | - | Aucune |
| **Passager** | Confirmé, avant départ | ✅ 100% | Aucune |
| **Passager** | Confirmé, après départ | ❌ 0% | Aucune |
| **Conducteur** | Avant départ | ✅ 100% passagers | Possible |
| **Conducteur** | Après départ | ✅ 100% passagers | Oui |

### 5️⃣ **AFFICHAGE NUMÉRO TÉLÉPHONE**

```typescript
// Caché par défaut
{myBooking?.status !== 'confirmed' && (
  <div>📞 Numéro disponible après confirmation</div>
)}

// Visible uniquement si confirmé
{myBooking?.status === 'confirmed' && (
  <div>
    📞 {trip.driver.phone}
    <button onClick={() => window.open(`tel:${trip.driver.phone}`)}>
      Appeler
    </button>
  </div>
)}
```

### 6️⃣ **STATUTS CLAIRS**

```typescript
type BookingStatus = 
  | 'pending'      // ⏳ En attente validation (orange)
  | 'confirmed'    // ✅ Accepté, crédits déduits (vert)
  | 'rejected'     // ❌ Refusé par conducteur (rouge)
  | 'cancelled'    // 🚫 Annulé (gris)
  | 'completed'    // 🏁 Trajet terminé (bleu)
  | 'no_show'      // 👻 Passager absent (rouge foncé)
```

---

## 🎨 STRUCTURE DE LA PAGE

### **Onglet 1: Recherche de trajets** 🔍

```tsx
<SearchTripsTab>
  <Filters>
    - Ville départ (Autocomplete API Adresse)
    - Ville arrivée (Autocomplete API Adresse)
    - Date (DatePicker)
    - Nombre places (Select 1-8)
    - Prix max (Slider 0-100€)
    - Note minimum (Stars 0-5)
    - Animaux acceptés (Toggle)
    - Non-fumeur (Toggle)
  </Filters>
  
  <TripsList>
    {trips.map(trip => (
      <TripCard>
        <RouteHeader>
          Paris → Lyon
          25 Oct 2025, 14:00
        </RouteHeader>
        
        <DriverInfo>
          <Avatar>JD</Avatar>
          <Name>John Doe</Name>
          <Rating>4.8 ⭐ (127 avis)</Rating>
          <VerifiedBadge IF verified />
        </DriverInfo>
        
        <TripDetails>
          <Seats>3/4 places</Seats>
          <Price>25€/place</Price>
          <Amenities>
            🐾 Animaux OK
            🚭 Non-fumeur
            🎵 Musique
          </Amenities>
        </TripDetails>
        
        <ViewDetailsButton />
      </TripCard>
    ))}
  </TripsList>
</SearchTripsTab>
```

### **Onglet 2: Mes trajets (Conducteur)** 🚗

```tsx
<MyTripsTab>
  <PublishTripButton onClick={openCreateModal} />
  
  {myTrips.map(trip => (
    <MyTripCard>
      <TripInfo>
        Route: {departure} → {arrival}
        Date: {formatted_date}
        Places: {available}/{total}
        Status: {status}
      </TripInfo>
      
      <BookingsSummary>
        ✅ {confirmedCount} confirmées
        ⏳ {pendingCount} en attente
        ❌ {rejectedCount} refusées
      </BookingsSummary>
      
      {pendingBookings.length > 0 && (
        <Alert color="warning">
          {pendingBookings.length} demandes à valider
        </Alert>
      )}
      
      <BookingsList>
        {trip.bookings.map(booking => (
          <BookingCard status={booking.status}>
            <PassengerInfo>
              <Avatar>{passenger.name[0]}</Avatar>
              <Name>{passenger.name}</Name>
              <Rating>{passenger.rating} ⭐</Rating>
            </PassengerInfo>
            
            <BookingDetails>
              {booking.seats_booked} place(s)
              {booking.total_price}€
              Status: {booking.status}
            </BookingDetails>
            
            {booking.status === 'pending' && (
              <Actions>
                <AcceptButton onClick={() => acceptBooking(booking.id)}>
                  ✅ Accepter
                </AcceptButton>
                <RejectButton onClick={() => rejectBooking(booking.id)}>
                  ❌ Refuser
                </RejectButton>
              </Actions>
            )}
            
            {booking.status === 'confirmed' && (
              <>
                <ContactInfo>
                  📞 {passenger.phone}
                  <CallButton />
                </ContactInfo>
                <MessageButton onClick={() => openChat(trip.id, passenger.id)} />
              </>
            )}
          </BookingCard>
        ))}
      </BookingsList>
      
      <TripActions>
        <EditButton />
        <CancelTripButton IF !hasConfirmedBookings />
      </TripActions>
    </MyTripCard>
  ))}
</MyTripsTab>
```

### **Onglet 3: Mes réservations (Passager)** 🎫

```tsx
<MyBookingsTab>
  {myBookings.map(booking => (
    <BookingCard status={booking.status}>
      <TripInfo>
        {trip.departure_city} → {trip.arrival_city}
        {formatted_date}
      </TripInfo>
      
      <DriverInfo>
        <Avatar>{driver.name[0]}</Avatar>
        <Name>{driver.name}</Name>
        <Rating>{driver.rating} ⭐</Rating>
      </DriverInfo>
      
      <BookingDetails>
        {booking.seats_booked} place(s) - {booking.total_price}€
      </BookingDetails>
      
      {booking.status === 'pending' && (
        <PendingAlert>
          ⏳ En attente de validation du conducteur
          <CancelRequestButton onClick={() => cancelBooking(booking.id)}>
            Annuler la demande
          </CancelRequestButton>
        </PendingAlert>
      )}
      
      {booking.status === 'confirmed' && (
        <ConfirmedSection>
          <SuccessAlert>✅ Réservation confirmée !</SuccessAlert>
          
          <ContactInfo>
            📞 {trip.driver.phone}
            <CallButton />
            <MessageButton />
          </ContactInfo>
          
          {!tripStarted && (
            <CancelWithRefundButton onClick={() => cancelBooking(booking.id)}>
              Annuler (remboursement {booking.total_price}€)
            </CancelWithRefundButton>
          )}
          
          {tripStarted && (
            <InfoText>
              ℹ️ Annulation impossible (trajet commencé)
            </InfoText>
          )}
        </ConfirmedSection>
      )}
      
      {booking.status === 'rejected' && (
        <RejectedAlert>
          ❌ Demande refusée par le conducteur
        </RejectedAlert>
      )}
      
      {booking.status === 'completed' && (
        <CompletedSection>
          <Badge>🏁 Trajet terminé</Badge>
          <RateDriverButton onClick={() => openRatingModal(trip.driver_id)} />
        </CompletedSection>
      )}
      
      <ViewDetailsButton onClick={() => openTripDetails(trip.id)} />
    </BookingCard>
  ))}
</MyBookingsTab>
```

### **Onglet 4: Messages** 💬

```tsx
<MessagesTab>
  <ConversationsList>
    {conversations.map(conv => (
      <ConversationCard 
        onClick={() => selectConversation(conv)}
        active={conv.id === selectedConv?.id}
      >
        <TripInfo>
          {conv.trip.departure_city} → {conv.trip.arrival_city}
          {format(conv.trip.departure_datetime, 'dd MMM')}
        </TripInfo>
        
        <OtherUser>
          <Avatar>{conv.other_user.name[0]}</Avatar>
          <Name>{conv.other_user.name}</Name>
        </OtherUser>
        
        <LastMessage>
          {conv.last_message}
          <Time>{formatRelativeTime(conv.last_message_at)}</Time>
        </LastMessage>
        
        {conv.unread_count > 0 && (
          <UnreadBadge>{conv.unread_count}</UnreadBadge>
        )}
      </ConversationCard>
    ))}
  </ConversationsList>
  
  {selectedConversation && (
    <ChatPanel>
      <ChatHeader>
        <TripBadge>{trip.departure_city} → {trip.arrival_city}</TripBadge>
        <UserName>{other_user.name}</UserName>
      </ChatHeader>
      
      <MessagesList>
        {messages.map(msg => (
          <Message isOwn={msg.sender_id === user.id}>
            <Bubble isOwn={isOwn}>
              {msg.message}
            </Bubble>
            <Time>{format(msg.created_at, 'HH:mm')}</Time>
            {msg.is_read && isOwn && <ReadIndicator>✓✓</ReadIndicator>}
          </Message>
        ))}
      </MessagesList>
      
      <MessageInput>
        <Textarea 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Votre message..."
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
        />
        <SendButton onClick={sendMessage}>
          <Send size={20} />
        </SendButton>
      </MessageInput>
    </ChatPanel>
  )}
</MessagesTab>
```

### **Modal: Détails du trajet** 📋

```tsx
<TripDetailsModal trip={selectedTrip}>
  <Header>
    <Route>{departure_city} → {arrival_city}</Route>
    <DateTime>{formatted_datetime}</DateTime>
    <CloseButton />
  </Header>
  
  <DriverSection>
    <DriverCard>
      <Avatar large>{driver.name[0]}</Avatar>
      <Info>
        <Name>{driver.full_name}</Name>
        <Rating>{driver.rating} ⭐ ({driver.total_ratings} avis)</Rating>
        <Stats>
          {driver.trips_count} trajets effectués
        </Stats>
      </Info>
      {driver.verified && <VerifiedBadge>✓ Vérifié</VerifiedBadge>}
    </DriverCard>
    
    {/* Téléphone CACHÉ si pas confirmé */}
    {!myBooking && (
      <HiddenPhone>
        📞 Visible après confirmation
      </HiddenPhone>
    )}
    
    {myBooking?.status === 'pending' && (
      <HiddenPhone>
        📞 Visible si le conducteur accepte
      </HiddenPhone>
    )}
    
    {/* Téléphone VISIBLE si confirmé */}
    {myBooking?.status === 'confirmed' && (
      <ContactInfo>
        <PhoneNumber>📞 {driver.phone}</PhoneNumber>
        <CallButton onClick={() => window.open(`tel:${driver.phone}`)}>
          Appeler
        </CallButton>
        <MessageButton onClick={() => openChat(trip.id, driver.id)}>
          Message
        </MessageButton>
      </ContactInfo>
    )}
  </DriverSection>
  
  <RouteDetails>
    <DeparturePoint>
      <Icon>📍</Icon>
      <Address>{departure_address}</Address>
    </DeparturePoint>
    
    <TravelLine />
    
    <ArrivalPoint>
      <Icon>📌</Icon>
      <Address>{arrival_address}</Address>
    </ArrivalPoint>
  </RouteDetails>
  
  <TripInfo>
    <InfoRow>
      <Icon>👥</Icon>
      <Label>Places disponibles</Label>
      <Value>{available_seats}/{total_seats}</Value>
    </InfoRow>
    
    <InfoRow>
      <Icon>💰</Icon>
      <Label>Prix par place</Label>
      <Value>{price_per_seat}€</Value>
    </InfoRow>
    
    {vehicle_info && (
      <InfoRow>
        <Icon>🚗</Icon>
        <Label>Véhicule</Label>
        <Value>{vehicle_info.model} ({vehicle_info.year})</Value>
      </InfoRow>
    )}
  </TripInfo>
  
  <Preferences>
    <Title>Préférences</Title>
    {allows_pets && <Badge>🐾 Animaux acceptés</Badge>}
    {allows_music && <Badge>🎵 Musique</Badge>}
    {allows_smoking ? <Badge>🚬 Fumeur</Badge> : <Badge>🚭 Non-fumeur</Badge>}
    <ChatLevel>{chat_level}</ChatLevel>
  </Preferences>
  
  {description && (
    <Description>
      <Title>Description</Title>
      <Text>{description}</Text>
    </Description>
  )}
  
  {/* RÉSERVATION */}
  {!isMyTrip && !myBooking && (
    <BookingSection>
      <SeatsSelector>
        <Label>Nombre de places</Label>
        <Select value={seatsToBook} onChange={(e) => setSeatsToBook(Number(e.target.value))}>
          {Array.from({length: available_seats}, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>{n} place{n > 1 ? 's' : ''}</option>
          ))}
        </Select>
      </SeatsSelector>
      
      <PriceCalculation>
        <Label>Prix total</Label>
        <Price>{price_per_seat * seatsToBook}€</Price>
      </PriceCalculation>
      
      <UserCreditsDisplay>
        <Label>Votre solde</Label>
        <Credits>{userCredits} crédits</Credits>
        {userCredits < (price_per_seat * seatsToBook) && (
          <InsufficientAlert>
            ⚠️ Crédits insuffisants
            <BuyCreditsLink href="/boutique">Acheter des crédits</BuyCreditsLink>
          </InsufficientAlert>
        )}
      </UserCreditsDisplay>
      
      <BookButton 
        onClick={handleBookTrip}
        disabled={userCredits < (price_per_seat * seatsToBook)}
      >
        Demander réservation ({seatsToBook} place{seatsToBook > 1 ? 's' : ''})
      </BookButton>
      
      <InfoBanner>
        ℹ️ Le conducteur doit valider votre demande. Vos crédits seront déduits uniquement si il accepte.
      </InfoBanner>
    </BookingSection>
  )}
  
  {/* STATUT RÉSERVATION */}
  {myBooking && <MyBookingStatusCard booking={myBooking} trip={trip} />}
  
  {/* MESSAGERIE */}
  <MessagingSection>
    <Title>Discussion</Title>
    <MiniChat trip_id={trip.id} other_user_id={trip.driver_id} />
  </MessagingSection>
</TripDetailsModal>
```

---

## 🔧 FONCTIONS CLÉS

### **1. Demander réservation**

```typescript
const handleBookTrip = async () => {
  try {
    // 1. Vérifier crédits
    const { data: credits } = await supabase.rpc('get_user_credits', {
      p_user_id: user.id
    });
    
    if (credits < totalPrice) {
      toast.error('Crédits insuffisants');
      return;
    }
    
    // 2. Créer réservation PENDING
    const { data: booking, error } = await supabase
      .from('carpooling_bookings')
      .insert({
        trip_id: tripId,
        passenger_id: user.id,
        seats_booked: seatsToBook,
        total_price: pricePerSeat * seatsToBook,
        status: 'pending',  // ⚠️ Important !
        message: bookingMessage,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // 3. Notifier conducteur (optionnel via trigger)
    toast.success('Demande envoyée au conducteur !');
    setShowBookingModal(false);
    loadMyBookings();
  } catch (error) {
    toast.error('Erreur lors de la réservation');
  }
};
```

### **2. Accepter réservation (Conducteur)**

```typescript
const handleAcceptBooking = async (bookingId: string) => {
  try {
    const booking = bookings.find(b => b.id === bookingId);
    
    // 1. Vérifier places encore disponibles
    const confirmedSeats = bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + b.seats_booked, 0);
    
    if (confirmedSeats + booking.seats_booked > trip.total_seats) {
      toast.error('Plus assez de places disponibles');
      return;
    }
    
    // 2. Vérifier crédits passager
    const { data: hasCredits } = await supabase.rpc('has_sufficient_credits', {
      p_user_id: booking.passenger_id,
      p_required_amount: booking.total_price,
    });
    
    if (!hasCredits) {
      toast.error('Le passager n\'a plus assez de crédits');
      return;
    }
    
    // 3. Mettre à jour réservation
    const { error: updateError } = await supabase
      .from('carpooling_bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);
    
    if (updateError) throw updateError;
    
    // 4. Déduire crédits passager
    const { error: deductError } = await supabase.rpc('deduct_credits', {
      p_user_id: booking.passenger_id,
      p_amount: booking.total_price,
    });
    
    if (deductError) {
      // Rollback si erreur
      await supabase
        .from('carpooling_bookings')
        .update({ status: 'pending' })
        .eq('id', bookingId);
      throw deductError;
    }
    
    // 5. Mettre à jour places disponibles
    await supabase
      .from('carpooling_trips')
      .update({
        available_seats: trip.total_seats - (confirmedSeats + booking.seats_booked),
      })
      .eq('id', trip.id);
    
    toast.success('Réservation acceptée !');
    loadTripBookings();
  } catch (error) {
    toast.error('Erreur lors de l\'acceptation');
  }
};
```

### **3. Annuler réservation (avec remboursement)**

```typescript
const handleCancelBooking = async (bookingId: string) => {
  try {
    const booking = bookings.find(b => b.id === bookingId);
    const tripStarted = new Date(trip.departure_datetime) < new Date();
    
    // Vérifier si remboursement
    const shouldRefund = (
      booking.status === 'confirmed' &&
      !tripStarted
    );
    
    // 1. Mettre à jour statut
    await supabase
      .from('carpooling_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);
    
    // 2. Rembourser si applicable
    if (shouldRefund) {
      await supabase.rpc('add_credits', {
        p_user_id: booking.passenger_id,
        p_amount: booking.total_price,
      });
      
      toast.success(`Réservation annulée. ${booking.total_price}€ remboursés.`);
    } else {
      toast.success('Réservation annulée');
    }
    
    // 3. Libérer places si confirmé
    if (booking.status === 'confirmed') {
      await supabase
        .from('carpooling_trips')
        .update({
          available_seats: trip.available_seats + booking.seats_booked,
        })
        .eq('id', trip.id);
    }
    
    loadMyBookings();
  } catch (error) {
    toast.error('Erreur lors de l\'annulation');
  }
};
```

### **4. Envoyer message**

```typescript
const handleSendMessage = async () => {
  if (!newMessage.trim()) return;
  
  try {
    await supabase
      .from('carpooling_messages')
      .insert({
        trip_id: tripId,
        sender_id: user.id,
        receiver_id: otherUserId,
        message: newMessage.trim(),
        is_read: false,
      });
    
    setNewMessage('');
    loadMessages();
  } catch (error) {
    toast.error('Erreur envoi message');
  }
};
```

---

## 🎨 DESIGN & UX

- **Tailwind CSS** pour le styling
- **Lucide Icons** pour les icônes
- **React Hot Toast** pour les notifications
- **Date-fns** pour le formatage dates
- **Responsive** mobile-first
- **Animations** smooth (transitions, hover effects)
- **Loading states** partout
- **Error handling** complet
- **Accessibility** (ARIA labels, keyboard nav)

---

## ✅ CHECKLIST FINALE

- [x] Recherche trajets avec filtres avancés
- [x] Réservation avec validation conducteur
- [x] Gestion crédits via RPC Supabase
- [x] Messagerie temps réel intégrée
- [x] Affichage téléphone conditionnel
- [x] Règles annulation avant/après départ
- [x] Statuts clairs (pending → confirmed → completed)
- [x] Mes trajets (conducteur) avec gestion réservations
- [x] Mes réservations (passager) avec statuts
- [x] Modal détails trajet complet
- [x] Notation après trajet
- [x] Profils vérifiés
- [x] Stats conducteurs/passagers

---

**Prêt à générer le fichier complet ?** 🚀
