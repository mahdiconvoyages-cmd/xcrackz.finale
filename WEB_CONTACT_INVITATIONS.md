# Web Contact Invitations - Documentation

## Vue d'ensemble
Système d'invitations pour les contacts dans l'interface web, permettant aux utilisateurs d'envoyer, accepter et refuser des invitations de contact.

## Modifications apportées

### 1. Page Contacts (`src/pages/Contacts.tsx`)

#### Nouveaux imports
```tsx
import { Bell, Check, X } from 'lucide-react';
import {
  sendContactInvitation,
  getReceivedInvitations,
  acceptContactInvitation,
  rejectContactInvitation,
  ContactInvitation
} from '../services/contactInvitationService';
```

#### Nouveaux états
```tsx
const [invitations, setInvitations] = useState<ContactInvitation[]>([]);
const [viewMode, setViewMode] = useState<'contacts' | 'invitations'>('contacts');
```

#### Fonctions ajoutées

**loadInvitations()**
- Charge les invitations reçues au démarrage
- Appelée dans `useEffect`

**handleAcceptInvitation(invitationId: string)**
- Accepte une invitation de contact
- Crée automatiquement la relation bidirectionnelle
- Rafraîchit les listes de contacts et d'invitations

**handleRejectInvitation(invitationId: string)**
- Refuse une invitation de contact
- Demande confirmation avant de refuser
- Rafraîchit la liste des invitations

**handleAddContact() - Modifié**
- N'ajoute plus directement le contact
- **Envoie une invitation** via `sendContactInvitation()`
- L'autre utilisateur doit accepter pour établir la connexion

#### Interface utilisateur

**Toggle de vue** (2 boutons)
- **Mes contacts** : Affiche les contacts acceptés uniquement
- **Invitations** : Affiche les invitations en attente avec badge de notification

**Vue Contacts**
- Liste des contacts avec `invitation_status = 'accepted'`
- Recherche et filtres par type
- Fonctionnalités existantes préservées

**Vue Invitations**
- Cartes d'invitation avec :
  - Nom de l'expéditeur
  - Type de contact (Client, Chauffeur, Fournisseur)
  - Email et téléphone
  - Date de réception
  - **Bouton Accepter** (vert avec icône Check)
  - **Bouton Refuser** (rouge avec icône X)

## Flux d'invitation

### Envoi d'invitation
1. Utilisateur A recherche Utilisateur B par email/téléphone
2. Utilisateur A clique sur "Ajouter"
3. Une **invitation** est envoyée (plus d'ajout direct)
4. Statut : `pending`

### Réception et gestion
1. Utilisateur B voit un **badge de notification** sur l'onglet Invitations
2. Utilisateur B bascule vers la vue **Invitations**
3. Utilisateur B peut :
   - **Accepter** → Le contact est ajouté des deux côtés
   - **Refuser** → L'invitation est marquée comme rejetée

### Relation bidirectionnelle
Quand l'Utilisateur B accepte :
- Contact créé : A → B (`invitation_status = 'accepted'`)
- Contact créé : B → A (relation inverse automatique)
- Les deux utilisateurs voient le contact dans leur liste

## Sécurité

### Validation côté client
- Impossible de s'ajouter soi-même
- Vérification des invitations existantes
- Confirmation avant refus

### Sécurité côté base de données
- RLS policies sur la table `contacts`
- Fonctions SQL sécurisées :
  - `create_contact_invitation()`
  - `accept_contact_invitation()`
  - `reject_contact_invitation()`

## Migration SQL

**Fichier** : `supabase/migrations/20251011_add_contact_invitation_system.sql`

**Colonnes ajoutées** :
- `invitation_status` : 'pending' | 'accepted' | 'rejected'
- `invited_by` : UUID de l'expéditeur
- `invited_user_id` : UUID du destinataire
- `invitation_sent_at` : Timestamp d'envoi
- `invitation_responded_at` : Timestamp de réponse

**Vues** :
- `contact_invitations_received` : Invitations reçues avec infos expéditeur
- `contact_invitations_sent` : Invitations envoyées avec infos destinataire

## Service d'invitation

**Fichier** : `src/services/contactInvitationService.ts`

**Fonctions disponibles** :
- `sendContactInvitation()` : Envoyer une invitation
- `getReceivedInvitations()` : Récupérer les invitations reçues
- `getSentInvitations()` : Récupérer les invitations envoyées
- `acceptContactInvitation()` : Accepter une invitation
- `rejectContactInvitation()` : Refuser une invitation
- `getPendingInvitationsCount()` : Compter les invitations en attente

## Synchronisation Mobile

Le même système est implémenté dans l'application mobile :
- **Fichier** : `mobile/src/screens/ContactsScreen.tsx`
- **Service** : `mobile/src/services/contactInvitationService.ts`
- Interface identique avec React Native
- Même logique métier

## Prochaines améliorations possibles

1. **Notifications en temps réel**
   - Utiliser Supabase Realtime
   - Notifier instantanément les nouvelles invitations

2. **Historique des invitations**
   - Voir les invitations refusées
   - Possibilité de renvoyer une invitation

3. **Messages personnalisés**
   - Ajouter un message optionnel à l'invitation
   - Expliquer la raison de la demande

4. **Suggestions de contacts**
   - Basées sur les missions communes
   - Contacts fréquents d'autres utilisateurs

## Compatibilité

- ✅ Web (React + TypeScript)
- ✅ Mobile (React Native + Expo)
- ✅ Base de données (Supabase PostgreSQL)
- ✅ Sécurité RLS activée

---

**Date de mise en œuvre** : 11 Octobre 2025
**Statut** : ✅ Complet et fonctionnel
