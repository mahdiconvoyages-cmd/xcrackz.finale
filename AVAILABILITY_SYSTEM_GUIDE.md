# 📅 Système de Disponibilités - Guide Complet

## 🎯 Objectif

Créer un système de calendrier de disponibilités où :
- ✅ **Chaque utilisateur** gère ses propres disponibilités (vert = disponible, rouge = indisponible)
- ✅ **"Accès au planning"** → **"Accès aux disponibilités"**
- ✅ **Partage de disponibilités** entre contacts
- ✅ **Vue calendrier** pour voir les disponibilités de ses contacts

## ✅ Ce qui a été créé

### 1. Migration SQL (`supabase/migrations/create_availability_system.sql`)

**Table `availability_calendar`** :
```sql
- id: UUID
- user_id: UUID (référence à profiles)
- date: DATE
- status: 'available' | 'unavailable' | 'partially_available'
- start_time: TIME (optionnel pour "partiellement disponible")
- end_time: TIME (optionnel)
- notes: TEXT (optionnel)
```

**Vue `contact_availability`** :
- Affiche les disponibilités des contacts qui ont donné l'accès
- Filtre automatique par `has_calendar_access = true`

**Fonctions SQL** :
- `set_availability()` - Définir une disponibilité pour un jour
- `set_availability_range()` - Définir sur plusieurs jours
- `delete_availability()` - Supprimer une disponibilité

**RLS (Row Level Security)** :
- Utilisateur peut voir/modifier ses propres disponibilités
- Utilisateur peut voir les disponibilités de ses contacts (si accès autorisé)

### 2. Service TypeScript (`src/services/availabilityService.ts`)

**Fonctions disponibles** :
```typescript
// Définir une disponibilité
setAvailability(userId, date, status, startTime?, endTime?, notes?)

// Définir pour une plage de dates
setAvailabilityRange(userId, startDate, endDate, status, ...)

// Récupérer mes disponibilités
getMyAvailabilities(userId, startDate, endDate)

// Récupérer les disponibilités d'un contact
getContactAvailabilities(contactUserId, startDate, endDate)

// Récupérer toutes les disponibilités de mes contacts
getAllContactsAvailabilities(viewerId, startDate, endDate)

// Supprimer une disponibilité
deleteAvailability(userId, date)

// Basculer l'accès aux disponibilités
toggleAvailabilityAccess(contactId, hasAccess)
```

### 3. Composant React (`src/components/AvailabilityCalendar.tsx`)

**Features** :
- ✅ Vue calendrier mensuel
- ✅ Couleurs : Vert (disponible), Rouge (indisponible), Orange (partiel)
- ✅ Mode jour unique ou mode plage
- ✅ Modal d'édition avec heures pour disponibilité partielle
- ✅ Lecture seule pour les contacts
- ✅ Édition pour son propre calendrier

**Props** :
```typescript
{
  userId: string;          // ID de l'utilisateur dont on affiche les dispo
  userName: string;        // Nom à afficher
  isOwnCalendar: boolean;  // true = éditable, false = lecture seule
  onClose: () => void;
}
```

## 🚀 Étapes d'intégration

### Étape 1 : Appliquer la migration SQL

```sql
-- Dans le SQL Editor de Supabase, exécuter :
-- Le contenu de supabase/migrations/create_availability_system.sql
```

Ou via CLI :
```powershell
supabase db push
```

### Étape 2 : Modifier la page Contacts

#### A. Ajouter les imports

```typescript
// Dans src/pages/Contacts.tsx, ajouter :
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import { toggleAvailabilityAccess } from '../services/availabilityService';
```

#### B. Ajouter les états

```typescript
const [showAvailabilityCalendar, setShowAvailabilityCalendar] = useState(false);
const [availabilityUserId, setAvailabilityUserId] = useState<string | null>(null);
const [availabilityUserName, setAvailabilityUserName] = useState<string>('');
const [isOwnAvailabilityCalendar, setIsOwnAvailabilityCalendar] = useState(false);
```

#### C. Ajouter les fonctions

```typescript
// Voir mes propres disponibilités
const handleViewMyAvailabilities = () => {
  if (!user) return;
  setAvailabilityUserId(user.id);
  setAvailabilityUserName('Mes disponibilités');
  setIsOwnAvailabilityCalendar(true);
  setShowAvailabilityCalendar(true);
};

// Voir les disponibilités d'un contact
const handleViewContactAvailabilities = async (contact: Contact) => {
  if (!contact.has_calendar_access) {
    alert('Ce contact ne partage pas ses disponibilités avec vous');
    return;
  }

  // Récupérer l'ID utilisateur du contact
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', contact.email)
    .single();

  if (profile) {
    setAvailabilityUserId(profile.id);
    setAvailabilityUserName(contact.name);
    setIsOwnAvailabilityCalendar(false);
    setShowAvailabilityCalendar(true);
  }
};

// Basculer l'accès aux disponibilités
const handleToggleAvailabilityAccess = async (contactId: string, currentAccess: boolean) => {
  const newAccess = !currentAccess;
  const success = await toggleAvailabilityAccess(contactId, newAccess);
  
  if (success) {
    alert(newAccess 
      ? 'Accès aux disponibilités accordé' 
      : 'Accès aux disponibilités révoqué'
    );
    loadContacts();
  }
};
```

#### D. Modifier les boutons d'action

**Remplacer** :
```tsx
<button
  onClick={() => handleViewCalendar(contact)}
  className="p-2 hover:bg-teal-500/20 text-teal-600 rounded-lg transition"
  title="Voir le planning"
>
  <Calendar className="w-4 h-4" />
</button>
```

**Par** :
```tsx
<button
  onClick={() => handleViewContactAvailabilities(contact)}
  className="p-2 hover:bg-teal-500/20 text-teal-600 rounded-lg transition"
  title="Voir les disponibilités"
  disabled={!contact.has_calendar_access}
>
  <Calendar className="w-4 h-4" />
</button>
<button
  onClick={() => handleToggleAvailabilityAccess(contact.id, contact.has_calendar_access)}
  className={`p-2 rounded-lg transition ${
    contact.has_calendar_access
      ? 'bg-green-100 text-green-600'
      : 'hover:bg-blue-500/20 text-blue-600'
  }`}
  title={contact.has_calendar_access ? 'Révoquer l\'accès' : 'Donner accès aux dispo'}
>
  <Share2 className="w-4 h-4" />
</button>
```

#### E. Supprimer le modal de partage de planning

Supprimer le modal "Partager mon planning" (lignes ~680-720) car il est remplacé par le toggle direct.

#### F. Ajouter le composant de calendrier

```tsx
{showAvailabilityCalendar && availabilityUserId && (
  <AvailabilityCalendar
    userId={availabilityUserId}
    userName={availabilityUserName}
    isOwnCalendar={isOwnAvailabilityCalendar}
    onClose={() => {
      setShowAvailabilityCalendar(false);
      setAvailabilityUserId(null);
      setAvailabilityUserName('');
      setIsOwnAvailabilityCalendar(false);
    }}
  />
)}
```

#### G. Ajouter un bouton "Mes disponibilités" dans le header

```tsx
<button
  onClick={handleViewMyAvailabilities}
  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition font-semibold flex items-center gap-2"
>
  <Calendar className="w-5 h-5" />
  Mes disponibilités
</button>
```

## 🎨 Design et UX

### Code couleur
- 🟢 **Vert** : Disponible (toute la journée)
- 🔴 **Rouge** : Indisponible
- 🟠 **Orange** : Partiellement disponible (avec heures)

### Modes d'utilisation
1. **Mode jour** : Cliquer sur un jour pour définir sa disponibilité
2. **Mode plage** : Activer le mode, sélectionner début et fin → Définir la disponibilité pour toute la plage

### Interaction
- **Mon calendrier** : Cliquable, éditable
- **Calendrier d'un contact** : Lecture seule, affiche les disponibilités

## 📊 Cas d'usage

### Scénario 1 : Je définis mes disponibilités
1. Cliquer sur "Mes disponibilités"
2. Cliquer sur un jour (ex: 15 octobre)
3. Sélectionner "Disponible" / "Indisponible" / "Partiellement"
4. Si partiel, définir heures (ex: 14h - 18h)
5. Enregistrer

### Scénario 2 : Je donne accès à un contact
1. Aller dans Contacts
2. Cliquer sur le bouton de partage (Share2) à côté d'un contact
3. Le contact peut maintenant voir mes disponibilités

### Scénario 3 : Je consulte les disponibilités d'un contact
1. Le contact doit m'avoir donné accès (icône verte)
2. Cliquer sur le bouton calendrier (Calendar)
3. Vue du calendrier avec les disponibilités en couleur

### Scénario 4 : Définir disponibilités pour plusieurs jours
1. Activer "Mode plage"
2. Cliquer sur le premier jour (ex: 20 oct)
3. Cliquer sur le dernier jour (ex: 25 oct)
4. Définir le statut (ex: Indisponible)
5. Tous les jours entre les 2 sont mis à jour

## 🔒 Sécurité (RLS)

- ✅ Un utilisateur voit uniquement ses propres disponibilités
- ✅ Un utilisateur voit les disponibilités de ses contacts SI `has_calendar_access = true`
- ✅ Impossible de modifier les disponibilités d'un autre utilisateur
- ✅ Accès révocable à tout moment

## 📱 Mobile (TODO futur)

Pour implémenter sur mobile :
1. Créer `mobile/src/components/AvailabilityCalendar.tsx` (React Native version)
2. Utiliser `react-native-calendars` ou composant custom
3. Réutiliser les services (`availabilityService.ts`)

## ✅ Checklist de test

- [ ] Migration SQL appliquée sans erreur
- [ ] Composant `AvailabilityCalendar` importe sans erreur
- [ ] Page Contacts mise à jour
- [ ] Bouton "Mes disponibilités" visible et fonctionnel
- [ ] Calendrier s'ouvre et affiche le mois courant
- [ ] Clic sur un jour ouvre le modal d'édition
- [ ] Enregistrement d'une disponibilité fonctionne
- [ ] Couleurs s'affichent correctement (vert, rouge, orange)
- [ ] Mode plage fonctionne
- [ ] Bouton de partage (Share2) bascule l'accès
- [ ] Vue des disponibilités d'un contact (lecture seule) fonctionne
- [ ] Suppression d'une disponibilité fonctionne
- [ ] Navigation mois précédent/suivant fonctionne
- [ ] Bouton "Aujourd'hui" fonctionne

## 🎊 Résultat final

**Avant** :
- "Partager mon planning" → Modal complexe avec 3 niveaux
- Planning = événements calendrier complets

**Après** :
- "Donner accès aux dispo" → Toggle simple (Share2 icon)
- Disponibilités = Vue simplifiée Vert/Rouge/Orange
- Plus adapté pour la gestion d'équipe et la disponibilité

**Avantages** :
- ✅ Plus simple et intuitif
- ✅ Code couleur immédiat
- ✅ Mode plage pour définir rapidement
- ✅ Parfait pour savoir qui est disponible quand
- ✅ Pas besoin de partager tout son calendrier personnel

---

**Date de création** : 11 octobre 2025  
**Statut** : Prêt pour intégration  
**Fichiers créés** : 
- `supabase/migrations/create_availability_system.sql`
- `src/services/availabilityService.ts`
- `src/components/AvailabilityCalendar.tsx`
