# 🔄 Système d'Assignation par Code de Partage

## 📋 Vue d'ensemble

L'application utilise désormais un système d'assignation par **code de partage** au lieu de l'ancien système d'assignation manuelle par contact.

## ✨ Fonctionnalités

### 1. Génération Automatique de Code

Chaque mission créée reçoit automatiquement un **code de partage unique** au format:
```
XZ-ABC-123
```

- **Format**: 10 caractères (2 lettres fixes + 6 aléatoires + tirets)
- **Génération**: Automatique via trigger SQL à la création
- **Unicité**: Garantie par vérification en base de données
- **Lisibilité**: Caractères ambigus exclus (I, O, 0, 1)

### 2. Partage de Mission

#### Pour le créateur:
1. Créer une mission
2. Cliquer sur le bouton **"Partager"** 
3. Le modal affiche le code de partage
4. Copier et envoyer le code à la personne souhaitée

#### Pour le destinataire:
1. Cliquer sur **"Rejoindre une mission"**
2. Saisir le code reçu
3. La mission apparaît dans l'onglet **"Missions Reçues"**

## 🔧 Architecture Technique

### Base de Données

#### Colonnes
- `share_code` (VARCHAR(10) UNIQUE): Code de partage de la mission
- `assigned_to_user_id` (UUID): Utilisateur qui a rejoint la mission via code
- `user_id` (UUID): Créateur de la mission

#### Fonctions SQL
```sql
generate_share_code() → TEXT
```
Génère un code unique au format XZ-ABC-123

```sql
join_mission_with_code(p_share_code TEXT, p_user_id UUID) → JSON
```
Permet à un utilisateur de rejoindre une mission

#### Validations
- ✅ Code valide et mission existante
- ✅ L'utilisateur n'est pas le créateur
- ✅ La mission n'est pas déjà assignée
- ✅ La mission n'est pas terminée/annulée
- ✅ Passage automatique au statut `in_progress`

### Frontend (Web)

#### Composants
- **ShareCodeModal**: Affiche et permet de copier le code
- **JoinMissionModal**: Interface pour rejoindre une mission

#### Pages modifiées
- **TeamMissions.tsx**: Bouton "Partager" au lieu de "Assigner"
- **MissionCreate.tsx**: Affiche le code après création

### Statuts de Mission

Les statuts valides sont:
- `pending`: En attente
- `in_progress`: En cours (automatique lors de l'assignation)
- `completed`: Terminée
- `cancelled`: Annulée

⚠️ **Important**: Le statut `assigned` n'existe **plus** dans la table `missions`

## 📁 Fichiers Importants

### SQL
- `MIGRATION_SHARE_CODE_SYSTEM.sql`: Migration complète du système
- `FIX_JOIN_MISSION_FUNCTION.sql`: Correction de la fonction join

### TypeScript/React
- `src/components/ShareCodeModal.tsx`: Modal de partage
- `src/components/JoinMissionModal.tsx`: Modal pour rejoindre
- `src/pages/TeamMissions.tsx`: Gestion des missions (web)
- `src/lib/shareCode.ts`: Utilitaires de validation de code

## 🚀 Migration

Pour appliquer le nouveau système en base de données:

```sql
-- Exécuter dans Supabase SQL Editor
\i MIGRATION_SHARE_CODE_SYSTEM.sql
```

Cela va:
1. ✅ Créer les colonnes nécessaires
2. ✅ Créer les fonctions et triggers
3. ✅ Générer des codes pour missions existantes
4. ✅ Afficher un rapport de migration

## 🔐 Sécurité

- Les codes sont **uniques** et **aléatoires**
- Une mission ne peut être rejointe que par **un seul** utilisateur
- Le créateur **ne peut pas** rejoindre sa propre mission
- Les missions terminées **ne peuvent plus** être rejointes
- Fonction SQL en mode `SECURITY DEFINER` pour RLS

## 📊 Différences avec l'Ancien Système

| Aspect | Ancien Système | Nouveau Système |
|--------|----------------|-----------------|
| Assignation | Manuelle via liste contacts | Automatique via code |
| Gestion | `mission_assignments` table | Colonne `assigned_to_user_id` |
| Flexibilité | Nécessite contact pré-enregistré | N'importe quel utilisateur |
| Partage | Interface complexe | Simple: copier-coller code |
| Mobile | Système séparé | Unifié web/mobile |

## 🎯 Avantages

1. **Simplicité**: Juste un code à partager
2. **Flexibilité**: Pas besoin de contact pré-enregistré
3. **Rapidité**: Génération automatique du code
4. **Traçabilité**: Historique via `assigned_to_user_id`
5. **UX**: Interface unifiée web/mobile

## 🐛 Dépannage

### La mission n'a pas de code
→ Le trigger devrait générer automatiquement. Vérifier:
```sql
SELECT * FROM missions WHERE share_code IS NULL;
```

### Erreur "Code invalide"
→ Vérifier que le code est au bon format (XZ-ABC-123)

### Erreur "Mission déjà assignée"
→ La mission a déjà été rejointe par quelqu'un d'autre

### Erreur de statut SQL
→ S'assurer que seuls les statuts valides sont utilisés: `pending`, `in_progress`, `completed`, `cancelled`

## 📝 Notes

- Le système `AssignDriverModal` est **déprécié** mais conservé pour compatibilité
- Le système `mission_assignments` peut être supprimé après migration complète
- Les missions mobiles doivent aussi utiliser ce système (à adapter)
