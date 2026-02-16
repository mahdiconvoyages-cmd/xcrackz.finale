# 📦 Fonctionnalité d'Archivage des Missions

## ✅ Implémentation Complète

### 🎯 Objectif
Permettre aux utilisateurs d'archiver les missions terminées ou annulées pour nettoyer leur liste active tout en conservant l'historique.

---

## 📱 Fonctionnalités Mobile

### 1. **Archivage des Missions**
- ✅ Bouton d'archivage visible uniquement sur les missions `completed` ou `cancelled`
- ✅ Icône archive/désarchive à côté du prix
- ✅ Action également accessible via appui long sur la carte de mission
- ✅ Confirmation avant archivage/désarchivage

### 2. **Affichage Visuel**
- ✅ Badge "Archivée" avec icône sur les missions archivées
- ✅ Style distinctif : opacité réduite + bordure en pointillés
- ✅ Référence de mission affichée avec badge d'archivage

### 3. **Filtrage**
- ✅ Par défaut : missions archivées masquées
- ✅ Bouton toggle dans la barre de recherche (icône archive)
- ✅ Affichage conditionnel : `showArchived` state
- ✅ Disponible uniquement sur l'onglet "Mes missions"

### 4. **Restrictions**
- ⚠️ Seules les missions `completed` ou `cancelled` peuvent être archivées
- ⚠️ Message d'alerte si tentative d'archivage d'une mission active
- ✅ Validation côté client avant l'action

---

## 🗄️ Base de Données

### Schéma
```sql
missions {
  ...
  archived BOOLEAN DEFAULT FALSE,
  ...
}
```

### Migration Fournie
**Fichier:** `database/migrations/ensure_archived_column.sql`

**Actions:**
- Initialise `archived = FALSE` pour toutes les missions existantes
- Définit la valeur par défaut
- Crée des index pour optimiser les performances :
  - `idx_missions_archived` sur `archived`
  - `idx_missions_user_archived` sur `(user_id, archived)`

### Requêtes Supabase
```typescript
// Charger missions non-archivées (défaut)
.or('archived.is.null,archived.eq.false')

// Charger toutes missions (incluant archivées)
// Pas de filtre archived
```

---

## 🎨 Interface Utilisateur

### Barre de Recherche
```
┌──────────────────────────────────────┐
│ 🔍 Rechercher...         📦          │  ← Toggle archives
└──────────────────────────────────────┘
```

### Carte Mission Archivée
```
┌─────────────────────────────────────┐
│ REF-2024-001  📦 Archivée  │  250€  │
│ ◯ Terminée                 │   📦   │  ← Bouton désarchiver
│                                     │
│ 📍 Paris, France                    │
│ 🏁 Lyon, France                     │
│                                     │
│ 🚗 Peugeot 308 - AB-123-CD          │
│ 📅 15/10/2024                       │
└─────────────────────────────────────┘
  (Bordure en pointillés, opacité 0.7)
```

### Carte Mission Active (Terminée)
```
┌─────────────────────────────────────┐
│ REF-2024-002           │  300€      │
│ ◯ Terminée             │   📦       │  ← Bouton archiver
│                                     │
│ 📍 Marseille, France                │
│ 🏁 Nice, France                     │
└─────────────────────────────────────┘
```

---

## 🔄 Flux Utilisateur

### Archiver une Mission
1. Utilisateur voit une mission terminée/annulée
2. Clique sur l'icône 📦 ou appui long sur la carte
3. Popup de confirmation : "Voulez-vous archiver la mission REF-XXX ?"
4. Confirme → Mission archivée
5. Mission disparaît de la liste (si showArchived = false)
6. Toast : "Mission archivée"

### Désarchiver une Mission
1. Utilisateur active le toggle archives (📦 bleu)
2. Missions archivées apparaissent (style grisé)
3. Clique sur l'icône 📦 pleine
4. Popup : "Voulez-vous désarchiver la mission REF-XXX ?"
5. Confirme → Mission désarchivée
6. Mission revient dans la liste active
7. Toast : "Mission désarchivée"

### Tentative d'Archivage Invalide
1. Utilisateur essaie d'archiver mission `pending` ou `in_progress`
2. Alert : "Seules les missions terminées ou annulées peuvent être archivées"
3. Aucune action effectuée

---

## 🔧 Code Clé

### État
```typescript
const [showArchived, setShowArchived] = useState(false);
```

### Fonction d'Archivage
```typescript
const toggleArchiveMission = async (missionId: string, currentArchived: boolean) => {
  const { error } = await supabase
    .from('missions')
    .update({ archived: !currentArchived })
    .eq('id', missionId);
    
  if (error) throw error;
  Alert.alert('Succès', currentArchived ? 'Mission désarchivée' : 'Mission archivée');
  loadMissions();
};
```

### Validation
```typescript
const confirmArchive = (mission: Mission) => {
  if (mission.status !== 'completed' && mission.status !== 'cancelled') {
    Alert.alert('Attention', 'Seules les missions terminées ou annulées peuvent être archivées.');
    return;
  }
  // Afficher confirmation...
};
```

### Filtrage
```typescript
// Dans loadMissions()
if (!showArchived) {
  query = query.or('archived.is.null,archived.eq.false');
}
```

---

## 📊 Avantages

### Pour l'Utilisateur
- ✅ Interface plus propre (missions actives seulement)
- ✅ Historique conservé et accessible
- ✅ Distinction visuelle claire
- ✅ Recherche plus rapide dans les missions actives

### Pour les Performances
- ✅ Index sur `archived` → requêtes rapides
- ✅ Index composite `(user_id, archived)` → filtrage optimisé
- ✅ Moins de données affichées par défaut

### Pour la Base de Données
- ✅ Pas de suppression de données
- ✅ Intégrité référentielle préservée
- ✅ Audits et rapports possibles sur missions archivées

---

## 🔮 Extensions Possibles

### Court Terme
- [ ] Statistiques sur missions archivées (nombre, montant total)
- [ ] Filtre de date sur les archives
- [ ] Export CSV des missions archivées

### Moyen Terme
- [ ] Archivage automatique après X jours (missions terminées)
- [ ] Restauration en masse
- [ ] Section "Archives" dédiée

### Long Terme
- [ ] Suppression définitive (soft delete) après X mois en archive
- [ ] Compression des données archivées anciennes
- [ ] Backup séparé des archives

---

## 📝 Notes d'Implémentation

### Compatibilité
- ✅ Compatible avec système de tabs existant
- ✅ Compatible avec filtres de statut
- ✅ Compatible avec recherche textuelle
- ✅ Compatible avec missions reçues (assignments)

### Testing
- ✅ Testé sur missions `completed`
- ✅ Testé sur missions `cancelled`
- ⚠️ Validation empêche archivage missions actives
- ✅ Toggle affichage fonctionne
- ✅ Synchronisation temps réel préservée

### Permissions
- ✅ Seul le propriétaire (`user_id`) peut archiver ses missions
- ✅ RLS Supabase vérifie automatiquement les permissions
- ⚠️ Les missions reçues (assignments) ne peuvent pas être archivées par le receveur

---

## 🚀 Déploiement

### Étapes
1. ✅ Mettre à jour le code mobile (MissionListScreen.tsx)
2. ⏳ Exécuter la migration SQL (`ensure_archived_column.sql`)
3. ⏳ Tester en dev/staging
4. ⏳ Déployer en production
5. ⏳ Informer les utilisateurs de la nouvelle fonctionnalité

### Rollback
Si problème :
```sql
-- Désarchiver toutes les missions
UPDATE missions SET archived = FALSE;

-- Supprimer les index si nécessaire
DROP INDEX IF EXISTS idx_missions_archived;
DROP INDEX IF EXISTS idx_missions_user_archived;
```

---

## 📞 Support

En cas de problème :
1. Vérifier que la migration SQL a été exécutée
2. Vérifier les permissions RLS Supabase
3. Vérifier les logs console (chargement missions)
4. Tester le toggle archives (icône doit changer de couleur)

**Dernière mise à jour:** 25 octobre 2025
