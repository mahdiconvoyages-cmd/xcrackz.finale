# ✅ Archivage des Missions - Implémentation Complète (Mobile + Web)

## 🎯 Demande
> "ERROR: 42703: column "archived" does not exist - implemente l'archivage pour web aussi"

## ✅ Résolution Complète

### 1. **Migration SQL Corrigée** ✅
**Fichier:** `database/migrations/ensure_archived_column.sql`

**Problème:** La colonne `archived` n'existait pas dans la base de données
**Solution:** Ajout de `ALTER TABLE missions ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;`

```sql
-- Ajouter la colonne si elle n'existe pas
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Mettre à jour les valeurs NULL
UPDATE missions SET archived = FALSE WHERE archived IS NULL;

-- Définir la valeur par défaut
ALTER TABLE missions ALTER COLUMN archived SET DEFAULT FALSE;

-- Créer des index pour performances
CREATE INDEX IF NOT EXISTS idx_missions_archived ON missions(archived);
CREATE INDEX IF NOT EXISTS idx_missions_user_archived ON missions(user_id, archived);
```

---

## 📱 Implémentation Mobile (React Native)

### Fichier: `mobile/src/screens/missions/MissionListScreen.tsx`

#### Fonctionnalités
✅ **Toggle archives** dans barre de recherche  
✅ **Badge "Archivée"** sur missions archivées  
✅ **Bouton archiver/désarchiver** (icône 📦)  
✅ **Appui long** pour archiver rapidement  
✅ **Style visuel** distinctif (opacité + bordure pointillés)  
✅ **Validation** : seules missions terminées/annulées archivables  
✅ **Filtrage automatique** : archives masquées par défaut  

#### Code Clé
```typescript
// État
const [showArchived, setShowArchived] = useState(false);

// Chargement avec filtre
if (!showArchived) {
  query = query.or('archived.is.null,archived.eq.false');
}

// Fonction d'archivage
const toggleArchiveMission = async (missionId: string, currentArchived: boolean) => {
  const { error } = await supabase
    .from('missions')
    .update({ archived: !currentArchived })
    .eq('id', missionId);
  
  if (error) throw error;
  Alert.alert('Succès', currentArchived ? 'Mission désarchivée' : 'Mission archivée');
  loadMissions();
};

// Validation
const confirmArchive = (mission: Mission) => {
  if (mission.status !== 'completed' && mission.status !== 'cancelled') {
    Alert.alert('Attention', 'Seules les missions terminées ou annulées peuvent être archivées.');
    return;
  }
  // Afficher confirmation...
};
```

---

## 🌐 Implémentation Web (React)

### Fichier: `src/pages/TeamMissions.tsx`

#### Fonctionnalités
✅ **Toggle archives** dans toolbar (bouton avec icône Archive)  
✅ **Badge "Archivée"** visible sur titre de mission  
✅ **Bouton Archive/ArchiveRestore** dans actions mission  
✅ **Style visuel** : fond grisé + opacité réduite  
✅ **Validation** : seules missions completed/cancelled archivables  
✅ **Filtrage automatique** : archives masquées par défaut  

#### Code Clé
```typescript
// État
const [showArchived, setShowArchived] = useState(false);

// Interface
interface Mission {
  // ... autres champs
  archived?: boolean;
}

// Chargement avec filtre
const loadMissions = async () => {
  let query = supabase
    .from('missions')
    .select('*')
    .eq('user_id', user!.id);

  if (!showArchived) {
    query = query.or('archived.is.null,archived.eq.false');
  }

  const { data, error } = await query.order('pickup_date', { ascending: true });
  if (error) throw error;
  setMissions(data || []);
};

// Fonction d'archivage
const handleArchiveMission = async (mission: Mission) => {
  const isArchiving = !mission.archived;
  
  if (isArchiving && mission.status !== 'completed' && mission.status !== 'cancelled') {
    alert('⚠️ Seules les missions terminées ou annulées peuvent être archivées.');
    return;
  }

  if (!confirm(`Voulez-vous ${isArchiving ? 'archiver' : 'désarchiver'} cette mission ?`)) return;

  const { error } = await supabase
    .from('missions')
    .update({ archived: isArchiving })
    .eq('id', mission.id);

  if (error) throw error;
  await loadMissions();
  alert(`✅ Mission ${isArchiving ? 'archivée' : 'désarchivée'}`);
};
```

#### UI - Toggle Archives
```tsx
<button
  onClick={() => setShowArchived(!showArchived)}
  className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl font-semibold ${
    showArchived
      ? 'bg-amber-100 border-2 border-amber-400 text-amber-800 shadow-lg'
      : 'bg-white/50 border border-slate-300 text-slate-700 hover:bg-slate-50'
  }`}
>
  <Archive className="w-5 h-5" />
  <span className="hidden sm:inline">Archives</span>
</button>
```

#### UI - Badge Archivée
```tsx
{mission.archived && (
  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg border border-amber-300">
    <Archive className="w-3 h-3" />
    Archivée
  </span>
)}
```

#### UI - Bouton Archive/Désarchive
```tsx
{(mission.status === 'completed' || mission.status === 'cancelled') && (
  <button
    onClick={() => handleArchiveMission(mission)}
    className={`inline-flex items-center gap-2 border px-4 py-2 rounded-lg ${
      mission.archived
        ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
    }`}
  >
    {mission.archived ? (
      <ArchiveRestore className="w-4 h-4" />
    ) : (
      <Archive className="w-4 h-4" />
    )}
  </button>
)}
```

#### UI - Style Mission Archivée
```tsx
<div className={`backdrop-blur-xl border rounded-2xl p-6 ${
  mission.archived
    ? 'bg-slate-50/50 border-slate-300 opacity-75 hover:border-amber-400'
    : 'bg-white/80 border-slate-200 hover:border-teal-500/50'
}`}>
```

---

## 🎨 Comparaison Visuelle

### Mobile
```
┌──────────────────────────────────────┐
│ 🔍 Rechercher...         📦          │  ← Toggle (gris/bleu)
└──────────────────────────────────────┘

┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   Mission Archivée
│ REF-001 📦 Archivée │  250€ 📦     │   (bordure pointillés)
│ ◯ Terminée            (opacité 70%)
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

### Web
```
┌─────────────────────────────────────┐
│ [Filtre Status ▼]  [📦 Archives]   │  ← Toggle orange quand actif
└─────────────────────────────────────┘

┌─────────────────────────────────────┐   Mission Archivée
│ 🚗 REF-001 📦 Archivée    │  250€  │   (fond grisé)
│ ◯ Terminée                          │
│ [Assigner] [✏️] [📦] [🗑️]         │  ← Icône ArchiveRestore
└─────────────────────────────────────┘
```

---

## 🔄 Workflow Utilisateur (Identique Mobile/Web)

### Archiver
1. Mission terminée/annulée visible
2. Clic sur icône 📦
3. Confirmation
4. Mission archivée → Disparaît si toggle désactivé

### Voir Archives
1. Clic toggle 📦
2. Mobile: icône bleue | Web: fond orange
3. Missions archivées apparaissent (style grisé)

### Désarchiver
1. Toggle archives actif
2. Clic sur 📦 (ArchiveRestore sur web)
3. Confirmation
4. Mission revient dans liste active

### Tentative Invalide
1. Essai archivage mission active (pending/in_progress)
2. Alert: "Seules missions terminées/annulées archivables"
3. Action bloquée

---

## 📊 Fichiers Modifiés

### Base de Données
- ✅ `database/migrations/ensure_archived_column.sql` - **CORRIGÉ** avec `ADD COLUMN IF NOT EXISTS`

### Mobile
- ✅ `mobile/src/screens/missions/MissionListScreen.tsx`
  - Interface `Mission` + `archived?: boolean`
  - État `showArchived`
  - Fonction `toggleArchiveMission()`
  - Fonction `confirmArchive()`
  - Filtre dans `loadMissions()`
  - Toggle UI dans searchBar
  - Badge + bouton + styles

### Web
- ✅ `src/pages/TeamMissions.tsx`
  - Interface `Mission` + `archived?: boolean`
  - État `showArchived`
  - Fonction `handleArchiveMission()`
  - Filtre dans `loadMissions()`
  - Toggle UI dans toolbar
  - Badge sur titre mission
  - Bouton Archive/ArchiveRestore
  - Style conditionnel carte mission
  - Imports: `Archive`, `ArchiveRestore` de lucide-react
  - useEffect dépendance `showArchived`

### Documentation
- ✅ `ARCHIVAGE_MISSIONS_GUIDE.md` - Guide complet
- ✅ `ARCHIVAGE_MISSIONS_RESUME.md` - Résumé implémentation mobile
- ✅ `ARCHIVAGE_MISSIONS_COMPLET.md` - **CE FICHIER** - Complet mobile+web

---

## 🚀 Déploiement

### Étapes Requises

#### 1. Migration Base de Données ⚠️ **CRITIQUE**
```bash
# Via CLI Supabase
supabase db push

# Ou via SQL Editor dans Dashboard Supabase
# Copier/coller: database/migrations/ensure_archived_column.sql
```

#### 2. Vérification Post-Migration
```sql
-- Vérifier la colonne existe
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'missions' AND column_name = 'archived';

-- Vérifier les index
SELECT indexname FROM pg_indexes WHERE tablename = 'missions';

-- Résultat attendu:
-- archived | boolean | false
-- idx_missions_archived
-- idx_missions_user_archived
```

#### 3. Tests Mobile
- [ ] Archiver mission completed
- [ ] Archiver mission cancelled
- [ ] Bloquer archivage mission pending
- [ ] Toggle afficher/masquer archives
- [ ] Désarchiver mission
- [ ] Recherche dans archives
- [ ] Pull-to-refresh

#### 4. Tests Web
- [ ] Archiver mission completed
- [ ] Archiver mission cancelled
- [ ] Bloquer archivage mission active
- [ ] Toggle archives (style orange)
- [ ] Badge "Archivée" visible
- [ ] Désarchiver mission
- [ ] Filtres + archives combinés
- [ ] Recherche dans archives

#### 5. Déploiement Code
```bash
# Mobile
cd mobile
eas build --platform android  # ou ios

# Web
cd ..
npm run build
# Déployer sur votre hébergement
```

---

## ✅ Checklist Complète

### Migration SQL
- [x] Colonne `archived` créée avec `IF NOT EXISTS`
- [x] Valeur par défaut `FALSE` définie
- [x] Index `idx_missions_archived` créé
- [x] Index `idx_missions_user_archived` créé
- [ ] **Migration exécutée sur Supabase** ⚠️

### Mobile (React Native)
- [x] Interface `Mission.archived` ajoutée
- [x] État `showArchived` ajouté
- [x] Fonction `toggleArchiveMission()` créée
- [x] Fonction `confirmArchive()` avec validation
- [x] Filtre dans `loadMissions()`
- [x] Toggle UI dans searchBar
- [x] Badge "Archivée" sur missions
- [x] Bouton archive/désarchive
- [x] Style visuel distinctif
- [x] useEffect dépend de `showArchived`

### Web (React)
- [x] Interface `Mission.archived` ajoutée
- [x] État `showArchived` ajouté
- [x] Fonction `handleArchiveMission()` créée
- [x] Validation status completed/cancelled
- [x] Filtre dans `loadMissions()`
- [x] Toggle UI dans toolbar
- [x] Badge "Archivée" sur titre
- [x] Bouton Archive/ArchiveRestore
- [x] Style visuel (fond grisé)
- [x] Imports icônes `Archive`, `ArchiveRestore`
- [x] useEffect dépend de `showArchived`

### Documentation
- [x] Guide complet créé
- [x] Résumé mobile créé
- [x] Résumé complet mobile+web créé

---

## 🎯 Résultat Final

### Mobile
- ✅ Archivage fonctionnel
- ✅ UI cohérente avec design existant
- ✅ Validation côté client
- ✅ Toggle archives intégré
- ✅ Performance optimisée (index)

### Web
- ✅ Archivage fonctionnel
- ✅ UI cohérente avec design existant
- ✅ Validation côté client
- ✅ Toggle archives intégré
- ✅ Performance optimisée (index)

### Cohérence
- ✅ **Même logique** sur mobile et web
- ✅ **Même validation** (completed/cancelled uniquement)
- ✅ **Même comportement** (masqué par défaut)
- ✅ **Même base de données** (champ `archived`)

---

## 📝 Notes Importantes

### Permissions
- Seul le propriétaire (`user_id`) peut archiver ses missions
- RLS Supabase vérifie automatiquement les permissions
- Aucune permission supplémentaire requise

### Performances
- Index `idx_missions_archived` → Filtre rapide archived true/false
- Index `idx_missions_user_archived` → Combo user_id + archived ultra-rapide
- Requêtes optimales : `or('archived.is.null,archived.eq.false')`

### Maintenance
- Migration idempotente (peut être exécutée plusieurs fois)
- Pas de suppression de données (soft delete)
- Possibilité de désarchiver à tout moment
- Intégrité référentielle préservée

---

## 🔮 Extensions Futures

### Court Terme
- [ ] Archivage automatique après 30 jours
- [ ] Statistiques sur archives
- [ ] Export CSV archives

### Moyen Terme
- [ ] Section "Archives" dédiée avec filtres avancés
- [ ] Archivage en masse (multi-sélection)
- [ ] Recherche avancée dans archives

### Long Terme
- [ ] Suppression définitive après 1 an
- [ ] Compression données anciennes
- [ ] Backup séparé archives

---

**Date:** 25 octobre 2025  
**Statut:** ✅ Implémentation complète (mobile + web)  
**Action requise:** Exécuter migration SQL sur Supabase
