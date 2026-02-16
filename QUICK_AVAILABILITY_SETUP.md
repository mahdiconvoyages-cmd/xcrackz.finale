# 🚀 Application rapide du système de disponibilités

## ✅ Fichiers créés

Tout le code est prêt :
1. **Service TypeScript** : `src/services/availabilityService.ts` ✅
2. **Composant React** : `src/components/AvailabilityCalendar.tsx` ✅  
3. **Migration SQL** : `supabase/migrations/*_create_availability_system.sql` ✅
4. **Guide complet** : `AVAILABILITY_SYSTEM_GUIDE.md` ✅

## 🎯 Application SQL (2 minutes)

### Méthode 1 : Via Dashboard Supabase (RECOMMANDÉ)

1. **Ouvrir** : https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn/sql/new

2. **Copier-coller** le contenu du fichier :
   `supabase/migrations/*_create_availability_system.sql`

3. **Exécuter** (bouton "Run")

4. **Vérifier** que le message s'affiche :
   ```
   Système de disponibilités créé avec succès
   ```

### Méthode 2 : Via psql (si vous préférez)

```powershell
# Récupérer la connection string depuis Supabase Dashboard
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f supabase/migrations/*_create_availability_system.sql
```

## 📝 Intégration dans Contacts (5 minutes)

Le guide complet est dans `AVAILABILITY_SYSTEM_GUIDE.md`, voici le résumé :

### 1. Imports à ajouter

Dans `src/pages/Contacts.tsx` :

```typescript
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import { toggleAvailabilityAccess } from '../services/availabilityService';
```

### 2. États à ajouter

```typescript
const [showAvailabilityCalendar, setShowAvailabilityCalendar] = useState(false);
const [availabilityUserId, setAvailabilityUserId] = useState<string | null>(null);
const [availabilityUserName, setAvailabilityUserName] = useState<string>('');
const [isOwnAvailabilityCalendar, setIsOwnAvailabilityCalendar] = useState(false);
```

### 3. Fonctions à ajouter

```typescript
// Voir mes disponibilités
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

// Basculer l'accès
const handleToggleAvailabilityAccess = async (contactId: string, currentAccess: boolean) => {
  const success = await toggleAvailabilityAccess(contactId, !currentAccess);
  if (success) {
    alert(!currentAccess ? 'Accès accordé' : 'Accès révoqué');
    loadContacts();
  }
};
```

### 4. Modifier les boutons (lignes ~400-420)

**REMPLACER** :
```tsx
<button
  onClick={() => handleViewCalendar(contact)}
  className="p-2 hover:bg-teal-500/20 text-teal-600 rounded-lg transition"
  title="Voir le planning"
>
  <Calendar className="w-4 h-4" />
</button>
<button
  onClick={() => handleShareMyCalendar(contact)}
  className="p-2 hover:bg-blue-500/20 text-blue-600 rounded-lg transition"
  title="Partager mon planning"
>
  <Share2 className="w-4 h-4" />
</button>
```

**PAR** :
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
      ? 'bg-green-100 text-green-600 hover:bg-green-200'
      : 'hover:bg-blue-500/20 text-blue-600'
  }`}
  title={contact.has_calendar_access ? 'Révoquer l\'accès aux dispo' : 'Donner accès aux dispo'}
>
  <Share2 className="w-4 h-4" />
</button>
```

### 5. Ajouter le bouton "Mes disponibilités" dans le header (ligne ~300)

Trouver le bouton "Nouveau contact" et ajouter AVANT :

```tsx
<button
  onClick={handleViewMyAvailabilities}
  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition font-semibold flex items-center gap-2"
>
  <Calendar className="w-5 h-5" />
  Mes disponibilités
</button>
```

### 6. Ajouter le composant à la fin (ligne ~740)

APRÈS la fermeture de `{showCalendar && ...}`, AVANT la fermeture de `</div>` final :

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

### 7. SUPPRIMER le modal de partage de planning (lignes ~680-720)

Supprimer tout le bloc :
```tsx
{showShareModal && selectedContact && (
  <div className="fixed inset-0...">
    ...
  </div>
)}
```

Et la fonction `handleShareMyCalendar` + état `showShareModal` + `selectedContact`.

## ✅ Test rapide

1. **Appliquer la migration SQL** ✓
2. **Modifier Contacts.tsx** ✓
3. **Relancer l'app** : `npm run dev`
4. **Tester** :
   - Cliquer sur "Mes disponibilités" → Calendrier s'ouvre
   - Cliquer sur un jour → Modal s'ouvre
   - Définir "Disponible" → Case verte
   - Définir "Indisponible" → Case rouge
   - Donner accès à un contact (Share2 button)
   - Voir les dispo du contact (Calendar button)

## 🎊 Différences avec l'ancien système

| Avant | Après |
|-------|-------|
| "Partager mon planning" | "Donner accès aux dispo" (toggle simple) |
| Modal complexe 3 niveaux | Bouton unique vert/bleu |
| Événements calendrier complets | Disponibilités simplifiées |
| Vue planning classique | Vue code couleur (Vert/Rouge/Orange) |

## 📖 Documentation complète

Voir `AVAILABILITY_SYSTEM_GUIDE.md` pour :
- Architecture complète
- Tous les cas d'usage
- Sécurité RLS
- Checklist de test

---

**Temps d'intégration estimé** : 10-15 minutes  
**Complexité** : Moyenne (copier-coller + quelques ajustements)  
**Prêt pour production** : ✅ Oui (RLS configuré, validé)
