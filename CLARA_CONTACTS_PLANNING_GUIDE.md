# 👥📅 Clara - Contacts & Planning - Guide Complet

## 🎯 Vue d'ensemble

Clara peut maintenant **gérer entièrement vos contacts et leurs plannings** ! Elle accède aux disponibilités de vos chauffeurs, vérifie qui est dispo, et vous aide à organiser vos missions.

### ✨ Fonctionnalités

1. **📇 Lister les contacts** - Tous vos contacts avec statuts de disponibilité
2. **📅 Consulter un planning** - Planning détaillé d'un contact spécifique
3. **🔍 Vérifier disponibilité** - Savoir si un chauffeur est dispo à une date
4. **✏️ Modifier planning** - Mettre à jour les disponibilités (si permissions)
5. **📊 Statistiques hebdomadaires** - Vue d'ensemble des dispos de la semaine
6. **🔗 Redirection** - Vers page /contacts pour interface visuelle

---

## 🔒 Restrictions d'Accès - IMPORTANT

### ⚠️ Clara peut UNIQUEMENT accéder :

1. **Aux contacts de l'utilisateur** - Pas d'accès aux contacts d'autres personnes
2. **Contacts avec accès planning activé** - Uniquement ceux avec `has_calendar_access = true`
3. **Pas d'accès universel** - Impossible de voir le planning de personnes non dans les contacts

### ✅ Exemple de fonctionnement

```
Utilisateur: "Est-ce que Jean Dupont est dispo demain ?"

Clara vérifie:
1. ✅ Jean Dupont est dans les contacts de l'utilisateur ?
2. ✅ Accès planning activé pour Jean Dupont ?
3. ✅ Les deux conditions sont remplies → Affiche la dispo
```

### ❌ Cas refusés

```
Utilisateur: "Montre-moi tous les chauffeurs disponibles en France"

Clara: "❌ Je peux uniquement consulter le planning de TES contacts qui t'ont donné accès. 
       Tu as X contact(s) avec accès planning.
       Veux-tu que je te montre leurs disponibilités ?"
```

---

## 📇 1. Lister Tous les Contacts

### Comment ça marche

Clara récupère **tous vos contacts** avec leurs informations et statut de disponibilité du jour.

### Informations affichées

- ✅ **Nom et coordonnées** (email, téléphone)
- 🏷️ **Type de contact:**
  - 🚗 Chauffeur
  - 🏢 Entreprise
  - 👤 Personnel
- 📊 **Statistiques:**
  - Nombre total de contacts
  - Répartition par type
  - Nombre avec accès planning
- 📅 **Disponibilité aujourd'hui:**
  - ✅ Disponible
  - ❌ Indisponible
  - ⏰ Partiellement disponible
  - ❓ Statut inconnu
- 📆 **Prochaine date disponible**
- 🎯 **Nombre de missions** effectuées avec ce contact
- 🔓 **Accès planning** activé ou non
- ⭐ **Statut favori**

### Exemples de conversations

#### Lister tous les contacts

```
Utilisateur: "Clara, montre-moi mes contacts"

Clara: "📇 **12 contact(s) dans votre carnet d'adresses** Mahdi !

📊 **Répartition :**
- 🚗 Chauffeurs : 8
- 🏢 Entreprises : 3
- 👤 Personnels : 1
- 📅 Accès planning : 6/12

📋 **Liste des contacts :**

**1. 🚗 Jean Dupont**
   📧 jean.dupont@email.com
   📞 06 12 34 56 78
   💼 Chauffeur VTC
   ✅ Aujourd'hui : Disponible
   📅 Prochaine dispo : 13/10/2025
   🎯 Missions : 25
   🔓 Planning accessible
   ⭐ Favori

**2. 🚗 Marie Martin**
   📧 marie.martin@email.com
   📞 06 98 76 54 32
   💼 Chauffeur Poids Lourd
   ❌ Aujourd'hui : Indisponible
   📅 Prochaine dispo : 15/10/2025
   🎯 Missions : 18
   🔓 Planning accessible

**3. 🏢 TransportCo SARL**
   📧 contact@transportco.com
   📞 01 23 45 67 89
   ❓ Aujourd'hui : Statut inconnu
   🎯 Missions : 42
   🔒 Planning non accessible

**4. 🚗 Pierre Dubois**
   📧 pierre.dubois@email.com
   📞 06 11 22 33 44
   ⏰ Aujourd'hui : Partiellement dispo
   📅 Prochaine dispo : 12/10/2025
   🎯 Missions : 12
   🔓 Planning accessible

... et 8 autre(s) contact(s)

💡 **Pour consulter un planning**, dis-moi :
"Affiche le planning de Jean Dupont" ou "Est-ce que Marie est dispo cette semaine ?""
```

#### Lister uniquement les chauffeurs

```
Utilisateur: "Quels sont mes chauffeurs ?"

Clara: "🚗 **8 chauffeur(s) dans vos contacts** Mahdi !

📊 **Statistiques :**
- ✅ Disponibles aujourd'hui : 3
- ❌ Indisponibles : 2
- ⏰ Partiellement dispos : 1
- ❓ Non renseignés : 2
- 📅 Accès planning : 5/8

📋 **Vos chauffeurs :**

1. **Jean Dupont** - ✅ Disponible
2. **Marie Martin** - ❌ Indisponible
3. **Pierre Dubois** - ⏰ Partiel (09:00-17:00)
4. **Sophie Bernard** - ✅ Disponible
5. **Luc Moreau** - ❓ Non renseigné
6. **Emma Petit** - ✅ Disponible
7. **Thomas Roux** - ❌ Indisponible
8. **Camille Blanc** - ❓ Non renseigné (pas d'accès planning)

💡 Veux-tu voir qui est dispo cette semaine ?"
```

#### Aucun contact

```
Utilisateur: "Mes contacts"

Clara: "❌ Aucun contact trouvé dans votre carnet d'adresses, Mahdi.

💡 **Pour ajouter des contacts**, tu peux :
- Envoyer une demande de contact depuis la page Contacts
- Demander à quelqu'un de t'ajouter comme contact
- Importer des contacts depuis un fichier

Veux-tu que je te redirige vers la page Contacts ?"
```

---

## 📅 2. Consulter le Planning d'un Contact

### Comment ça marche

Clara affiche **le planning détaillé** d'un contact spécifique avec toutes ses disponibilités.

### Informations affichées

- 📊 **Statistiques de la période:**
  - Jours disponibles (✅)
  - Jours indisponibles (❌)
  - Jours partiellement disponibles (⏰)
  - Jours non renseignés (❓)
- 📅 **Planning par semaine:**
  - Chaque jour avec son statut
  - Horaires si disponibilité partielle
  - Notes du contact
- 🔍 **Détails par jour:**
  - Nom du jour + date
  - Statut avec icône
  - Heures si partiel (ex: 09:00 - 17:00)
  - Notes/commentaires

### Exemples de conversations

#### Planning complet d'un chauffeur

```
Utilisateur: "Affiche le planning de Jean Dupont"

Clara: "📅 **Planning de Jean Dupont**

📊 **Statistiques de la période (30 jours) :**
- ✅ Disponible : 18 jour(s)
- ❌ Indisponible : 6 jour(s)
- ⏰ Partiellement dispo : 3 jour(s)
- ❓ Non renseigné : 3 jour(s)

📅 **Disponibilités par semaine :**

**Semaine du 14/10/2025 au 20/10/2025**
  ✅ lundi 14/10/2025
  ✅ mardi 15/10/2025
  ⏰ mercredi 16/10/2025 (09:00 - 14:00) - _Rendez-vous après-midi_
  ✅ jeudi 17/10/2025
  ❌ vendredi 18/10/2025 - _Congé_
  ❌ samedi 19/10/2025 - _Week-end_
  ❌ dimanche 20/10/2025 - _Week-end_

**Semaine du 21/10/2025 au 27/10/2025**
  ✅ lundi 21/10/2025
  ✅ mardi 22/10/2025
  ✅ mercredi 23/10/2025
  ⏰ jeudi 24/10/2025 (14:00 - 18:00) - _Disponible après-midi uniquement_
  ✅ vendredi 25/10/2025
  ❌ samedi 26/10/2025
  ❌ dimanche 27/10/2025

**Semaine du 28/10/2025 au 03/11/2025**
  ✅ lundi 28/10/2025
  ✅ mardi 29/10/2025
  ✅ mercredi 30/10/2025
  ✅ jeudi 31/10/2025
  ❌ vendredi 01/11/2025 - _Férié_
  ✅ samedi 02/11/2025
  ✅ dimanche 03/11/2025

💡 **Pour vérifier une date précise**, dis-moi :
"Est-ce que Jean Dupont est dispo le 25/10 ?""
```

#### Planning avec peu de disponibilités

```
Utilisateur: "Planning de Marie Martin"

Clara: "📅 **Planning de Marie Martin**

📊 **Statistiques de la période (30 jours) :**
- ✅ Disponible : 5 jour(s)
- ❌ Indisponible : 22 jour(s)
- ⏰ Partiellement dispo : 0 jour(s)
- ❓ Non renseigné : 3 jour(s)

⚠️ Marie a **peu de disponibilités** ce mois-ci.

📅 **Jours disponibles :**
- ✅ vendredi 18/10/2025
- ✅ lundi 21/10/2025
- ✅ mardi 22/10/2025
- ✅ jeudi 31/10/2025
- ✅ samedi 02/11/2025

💡 Si tu as une mission urgente, je peux te proposer d'autres chauffeurs disponibles !"
```

#### Pas d'accès au planning

```
Utilisateur: "Affiche le planning de Sophie Bernard"

Clara: "❌ Vous n'avez pas accès au planning de Sophie Bernard, Mahdi.

💡 **Pour obtenir l'accès**, tu peux :
1. Demander à Sophie de t'autoriser l'accès à son planning
2. Envoyer une demande depuis la page Contacts

Veux-tu que je t'envoie un message type pour demander l'accès ?"
```

#### Contact introuvable

```
Utilisateur: "Planning de Luc Moreau"

Clara: "❌ Contact non trouvé avec ce nom : Luc Moreau

💡 Vérifie l'orthographe ou utilise l'email :
"Affiche le planning de luc.moreau@email.com"

Tu peux aussi dire "Mes contacts" pour voir la liste complète."
```

---

## 🔍 3. Vérifier Disponibilité d'un Chauffeur

### Comment ça marche

Clara vérifie **si un chauffeur est disponible à une date précise** et propose des alternatives si indisponible.

### Informations affichées

- 📅 **Date demandée** (jour + date complète)
- ✅ **Statut:**
  - **Disponible** - Le chauffeur est libre toute la journée
  - **Indisponible** - Le chauffeur n'est pas libre
  - **Partiellement disponible** - Libre sur certaines heures
  - **Inconnu** - Pas renseigné dans le planning
- ⏰ **Horaires** (si disponibilité partielle)
- 📝 **Notes** du chauffeur
- 🔄 **Dates alternatives** (3 prochaines dispos si indisponible)

### Exemples de conversations

#### Chauffeur disponible

```
Utilisateur: "Est-ce que Jean Dupont est dispo demain ?"

Clara: "🔍 **Disponibilité de Jean Dupont**

📅 **Date :** mardi 15/10/2025

✅ **Jean Dupont est DISPONIBLE** ce jour-là !

⏰ **Horaires :** Toute la journée

💡 Vous pouvez lui proposer une mission pour cette date !

Veux-tu que je crée une mission avec Jean comme chauffeur ?"
```

#### Chauffeur disponible avec horaires

```
Utilisateur: "Jean dispo le 16/10 ?"

Clara: "🔍 **Disponibilité de Jean Dupont**

📅 **Date :** mercredi 16/10/2025

✅ **Jean Dupont est DISPONIBLE** ce jour-là !

⏰ **Horaires :** 09:00 - 14:00

📝 **Note :** Rendez-vous médical après-midi

💡 Vérif ie si ta mission peut se faire avant 14h00 !"
```

#### Chauffeur indisponible

```
Utilisateur: "Marie Martin est disponible le 18 octobre ?"

Clara: "🔍 **Disponibilité de Marie Martin**

📅 **Date :** vendredi 18/10/2025

❌ **Marie Martin n'est PAS DISPONIBLE** ce jour-là.

📝 **Raison :** Congé

🔄 **Prochaines dates disponibles :**
  ✅ lundi 21/10/2025
  ✅ mardi 22/10/2025
  ✅ jeudi 31/10/2025

💡 Veux-tu vérifier si un de ces jours convient pour ta mission ?"
```

#### Chauffeur partiellement disponible

```
Utilisateur: "Pierre Dubois dispo le 24/10 ?"

Clara: "🔍 **Disponibilité de Pierre Dubois**

📅 **Date :** jeudi 24/10/2025

⏰ **Pierre Dubois est PARTIELLEMENT DISPONIBLE** ce jour-là.

⏰ **Horaires disponibles :** 14:00 - 18:00

📝 **Note :** Disponible après-midi uniquement

💡 Vérifie si les horaires correspondent à ta mission."
```

#### Planning non renseigné

```
Utilisateur: "Est-ce que Sophie Bernard est dispo le 25/10 ?"

Clara: "🔍 **Disponibilité de Sophie Bernard**

📅 **Date :** vendredi 25/10/2025

❓ **Aucune information de disponibilité** pour cette date.

⚠️ Sophie Bernard n'a pas encore renseigné son planning pour ce jour.

📅 **Dates où elle est disponible :**
  ✅ lundi 28/10/2025
  ✅ mardi 29/10/2025
  ✅ mercredi 30/10/2025

💡 Tu peux la contacter directement pour savoir si elle est libre le 25/10."
```

---

## 📊 4. Statistiques Hebdomadaires

### Comment ça marche

Clara affiche **une vue d'ensemble des disponibilités** de tous vos contacts pour la semaine en cours (lundi à dimanche).

### Informations affichées

- 📅 **Période** (semaine du X au X)
- 📇 **Statistiques:**
  - Nombre total de contacts
  - Contacts avec accès planning
  - Nombre de disponibles
  - Nombre d'indisponibles
  - Nombre de partiellement disponibles
- ✅ **Liste des DISPONIBLES** avec coordonnées
- ⏰ **Liste des PARTIELLEMENT DISPONIBLES**
- ❌ **Liste des INDISPONIBLES**

### Exemples de conversations

#### Statistiques complètes

```
Utilisateur: "Qui est dispo cette semaine ?"

Clara: "📊 **Disponibilités de vos contacts cette semaine** Mahdi !

📅 **Semaine du 14/10/2025 au 20/10/2025**

📇 **Résumé :**
- Total contacts : 12
- Avec accès planning : 6
- ✅ Disponibles : 3
- ❌ Indisponibles : 2
- ⏰ Partiellement dispo : 1

✅ **Contacts DISPONIBLES cette semaine (3) :**

  🚗 **Jean Dupont**
     📧 jean.dupont@email.com
     📞 06 12 34 56 78
     📅 Prochaine dispo : 14/10/2025

  🚗 **Sophie Bernard**
     📧 sophie.bernard@email.com
     📞 06 55 66 77 88
     📅 Prochaine dispo : 14/10/2025

  🚗 **Emma Petit**
     📧 emma.petit@email.com
     📞 06 22 33 44 55
     📅 Prochaine dispo : 15/10/2025

⏰ **Contacts PARTIELLEMENT DISPONIBLES (1) :**

  🚗 **Pierre Dubois** - pierre.dubois@email.com

❌ **Contacts INDISPONIBLES (2) :**

  🚗 Marie Martin
  🚗 Luc Moreau

💡 **Pour plus de détails**, dis-moi :
"Affiche le planning de Jean Dupont" ou "Est-ce que Pierre est dispo le 16/10 ?""
```

#### Peu de contacts disponibles

```
Utilisateur: "Disponibilités de mes chauffeurs"

Clara: "📊 **Disponibilités de vos contacts cette semaine** Mahdi !

📅 **Semaine du 14/10/2025 au 20/10/2025**

📇 **Résumé :**
- Total contacts : 8
- Avec accès planning : 5
- ✅ Disponibles : 1
- ❌ Indisponibles : 4
- ⏰ Partiellement dispo : 0

⚠️ **Attention** : Peu de chauffeurs disponibles cette semaine !

✅ **Contact DISPONIBLE (1) :**

  🚗 **Jean Dupont**
     📧 jean.dupont@email.com
     📞 06 12 34 56 78

❌ **Contacts INDISPONIBLES (4) :**

  🚗 Marie Martin
  🚗 Pierre Dubois
  🚗 Sophie Bernard
  🚗 Luc Moreau

💡 Veux-tu que je vérifie les disponibilités de la semaine prochaine ?"
```

#### Aucun accès planning

```
Utilisateur: "Qui est dispo cette semaine ?"

Clara: "📊 **Disponibilités de vos contacts cette semaine** Mahdi !

📅 **Semaine du 14/10/2025 au 20/10/2025**

📇 **Résumé :**
- Total contacts : 12
- Avec accès planning : 0

⚠️ Vous n'avez accès au planning d'aucun contact.

💡 **Pour voir les disponibilités**, demandez l'accès aux plannings de vos chauffeurs depuis la page Contacts.

Veux-tu que je te redirige vers la page Contacts ?"
```

---

## ✏️ 5. Modifier le Planning d'un Contact

### Comment ça marche

Clara met à jour **les disponibilités d'un contact** si vous avez les permissions nécessaires.

### Informations requises

- 📧 **Contact** (nom ou email)
- 📅 **Date ou plage de dates**
- ✅ **Statut:**
  - Disponible
  - Indisponible
  - Partiellement disponible
- ⏰ **Horaires** (si partiellement disponible)
- 📝 **Notes** (optionnel)

### Exemples de conversations

#### Marquer disponible

```
Utilisateur: "Marque Jean Dupont disponible le 20/10"

Clara: "✅ **Modification du planning de Jean Dupont**

📅 **Date :** vendredi 20/10/2025
✅ **Nouveau statut :** Disponible

✅ Planning mis à jour avec succès !

Jean Dupont est maintenant marqué comme disponible toute la journée le 20/10."
```

#### Marquer indisponible

```
Utilisateur: "Jean n'est pas dispo du 25 au 27 octobre"

Clara: "❌ **Modification du planning de Jean Dupont**

📅 **Période :** 25/10/2025 - 27/10/2025
❌ **Nouveau statut :** Indisponible

Veux-tu ajouter une note (raison de l'indisponibilité) ?"

Utilisateur: "Congé"

Clara: "✅ Planning de Jean Dupont mis à jour : 25/10/2025 - 27/10/2025 → indisponible (3 jour(s))

📝 Note ajoutée : Congé"
```

#### Marquer partiellement disponible

```
Utilisateur: "Marque Pierre disponible le matin du 24/10"

Clara: "⏰ **Modification du planning de Pierre Dubois**

📅 **Date :** jeudi 24/10/2025
⏰ **Statut :** Partiellement disponible

Quels sont les horaires de disponibilité ?"

Utilisateur: "De 8h à 12h"

Clara: "✅ Planning de Pierre Dubois mis à jour : 24/10/2025 → partiellement disponible

⏰ Horaires : 08:00 - 12:00"
```

#### Sans permissions

```
Utilisateur: "Marque Marie disponible demain"

Clara: "❌ Vous n'avez pas les permissions pour modifier le planning de Marie Martin, Mahdi.

💡 **Seuls peuvent modifier le planning :**
- Le contact lui-même
- Les administrateurs
- Les personnes avec permissions spéciales

Si tu veux changer la disponibilité, contacte Marie directement."
```

---

## 🧪 Tests à Effectuer

### 1. Test Liste Contacts

```typescript
Utilisateur: "Clara, mes contacts"

Vérifications:
✅ Liste affichée avec tous les contacts
✅ Statistiques correctes (total, par type, avec accès)
✅ Statut dispo du jour correct (✅❌⏰❓)
✅ Prochaine date dispo affichée
✅ Nombre de missions correct
✅ Accès planning indiqué (🔓🔒)
```

### 2. Test Consulter Planning

```typescript
Utilisateur: "Affiche le planning de Jean Dupont"

Vérifications:
✅ Planning affiché pour 30 jours
✅ Statistiques correctes (dispo, indispo, partiel, non renseigné)
✅ Groupé par semaine
✅ Chaque jour avec statut correct
✅ Horaires affichés si partiel
✅ Notes affichées
```

### 3. Test Vérifier Disponibilité

```typescript
Utilisateur: "Jean est dispo le 25/10 ?"

Vérifications:
✅ Statut correct (disponible/indisponible/partiel/inconnu)
✅ Horaires affichés si partiel
✅ Notes affichées
✅ Dates alternatives proposées si indisponible (3 max)
✅ Message adapté au statut
```

### 4. Test Statistiques Hebdomadaires

```typescript
Utilisateur: "Qui est dispo cette semaine ?"

Vérifications:
✅ Semaine calculée (lundi-dimanche)
✅ Statistiques correctes
✅ Contacts groupés par statut (dispo/indispo/partiel)
✅ Coordonnées complètes affichées
✅ Message si aucun accès planning
```

### 5. Test Modifier Planning

```typescript
Utilisateur: "Marque Jean dispo le 28/10"

Vérifications:
✅ Vérification des permissions
✅ Mise à jour effectuée
✅ Confirmation avec détails
✅ Planning mis à jour dans la base
✅ Nouvelle dispo visible immédiatement
```

---

## 📊 Résumé Technique

### Services Utilisés

| Service | Fonction |
|---------|----------|
| `contactPlanningService.ts` | Gestion contacts et plannings |
| `availabilityService.ts` | Gestion disponibilités calendrier |
| `supabase.contacts` | Table contacts |
| `supabase.availability_calendar` | Table disponibilités |

### Tables Supabase

| Table | Utilisation |
|-------|-------------|
| `contacts` | Liste des contacts utilisateur |
| `availability_calendar` | Disponibilités jour par jour |
| `profiles` | Informations utilisateurs |

### Actions Clara

| Action | Description |
|--------|-------------|
| `list_contacts` | Lister tous les contacts |
| `view_contact_planning` | Consulter planning contact |
| `check_driver_availability` | Vérifier dispo à une date |
| `modify_contact_planning` | Modifier planning contact |
| `get_weekly_availability_stats` | Stats hebdomadaires |

---

## ⚙️ Intégration avec Missions

### Workflow Complet

1. **Utilisateur:** "Qui est dispo cette semaine ?"
2. **Clara:** Affiche liste des dispos
3. **Utilisateur:** "Jean est dispo le 25/10 ?"
4. **Clara:** "✅ Jean Dupont est DISPONIBLE le 25/10"
5. **Utilisateur:** "Crée une mission avec Jean pour le 25/10"
6. **Clara:** Utilise les infos de dispo pour créer la mission

### Suggestion Automatique

```
Utilisateur: "Crée une mission pour le 25/10"

Clara vérifie:
1. Récupère les chauffeurs disponibles le 25/10
2. Propose: "J'ai trouvé 3 chauffeurs disponibles ce jour :
   - Jean Dupont (disponible toute la journée)
   - Sophie Bernard (disponible toute la journée)
   - Pierre Dubois (disponible 14:00-18:00)
   
   Lequel veux-tu assigner ?"
```

---

## ✅ Checklist Complète

### Fichiers Créés
- [x] `src/services/contactPlanningService.ts` (service complet - 950 lignes)
- [x] Ajout actions Clara dans `aiServiceEnhanced.ts`
- [x] Ajout capabilities section dans `aiServiceEnhanced.ts`
- [x] Ajout workflows dans `aiServiceEnhanced.ts`
- [x] `CLARA_CONTACTS_PLANNING_GUIDE.md` (ce fichier)

### Fonctionnalités
- [x] Lister contacts avec statuts
- [x] Consulter planning détaillé
- [x] Vérifier disponibilité à une date
- [x] Modifier planning (si permissions)
- [x] Statistiques hebdomadaires
- [x] Redirection page contacts
- [x] Restriction accès (uniquement contacts autorisés)
- [x] Gestion des erreurs

### Tests
- [ ] Test liste contacts
- [ ] Test consulter planning
- [ ] Test vérifier disponibilité
- [ ] Test stats hebdomadaires
- [ ] Test modifier planning
- [ ] Test restrictions accès
- [ ] Test intégration avec missions

---

## 🚀 Prochaines Étapes

1. **Tester avec Clara:**
   - "Clara, mes contacts"
   - "Qui est dispo cette semaine ?"
   - "Jean Dupont est dispo demain ?"

2. **Améliorer la page Contacts:**
   - Interface visuelle pour gérer les autorisations d'accès planning
   - Calendrier visuel des disponibilités
   - Filtres avancés

3. **Notifications:**
   - Notification quand un contact met à jour son planning
   - Rappel si aucun contact avec accès planning
   - Alerte si peu de dispos cette semaine

4. **Intégration mobile:**
   - Mêmes fonctionnalités sur l'app mobile
   - Notifications push

---

**📘 Clara peut maintenant gérer entièrement vos contacts et plannings ! 👥📅**

**Prochaine étape:** Tester avec: `"Clara, mes contacts"` puis `"Qui est dispo cette semaine ?"`
