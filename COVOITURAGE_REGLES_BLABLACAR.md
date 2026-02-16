# 🚗 Règles de Covoiturage xCrackz - Type BlaBlaCar

## 📅 Date de création : 11 octobre 2025  
## 💳 Système de paiement : **Crédits xCrackz + Espèces**

---

## 🎯 Objectif

Implémenter un système de covoiturage **identique à BlaBlaCar** avec toutes ses règles, restrictions, et fonctionnalités avancées pour garantir une expérience utilisateur optimale et sécurisée.

### 💰 Principe de Paiement

**Système hybride avec crédits xCrackz** :
- 💳 **2 crédits xCrackz** = publier un trajet en tant que conducteur
- 💳 **2 crédits xCrackz** = réserver un trajet en tant que passager
- 💶 **Paiement en espèces** = prix du trajet payé directement au conducteur le jour J
- ✅ **Aucun frais supplémentaire** pour les passagers
- 🎁 **0€ de commission** pour les conducteurs (ils reçoivent 100% du prix)

**Exemple conducteur** :
- Publier Paris → Lyon : **2 crédits déduits**
- Recevoir au départ : **60€ en espèces** (30€ × 2 places)

**Exemple passager** :
- Réserver 2 places Paris → Lyon : **2 crédits bloqués**
- Payer au conducteur : **60€ en espèces** (30€ × 2 places)

---

## 📋 TABLE DES MATIÈRES

1. [Règles Conducteur](#règles-conducteur)
2. [Règles Passager](#règles-passager)
3. [Tarification](#tarification)
4. [Réservation et Confirmation](#réservation-et-confirmation)
5. [Annulation](#annulation)
6. [Système de Notation](#système-de-notation)
7. [Profil et Vérifications](#profil-et-vérifications)
8. [Messagerie](#messagerie)
9. [Préférences de Voyage](#préférences-de-voyage)
10. [Sécurité et Fraude](#sécurité-et-fraude)

---

## 1️⃣ RÈGLES CONDUCTEUR

### 1.1 Création d'un Trajet

#### ✅ Informations Obligatoires

- **Départ** :
  - Adresse complète ou ville
  - Point de rendez-vous précis
  - Horaire de départ (heure exacte)
  
- **Arrivée** :
  - Adresse complète ou ville
  - Point de dépose

- **Date et Heure** :
  - Date du trajet (aujourd'hui ou future)
  - Heure de départ (format 24h)
  - ⚠️ Impossible de publier un trajet dans le passé

- **Places** :
  - Nombre de places disponibles : **1 à 8 passagers maximum**
  - Par défaut : 3 places

- **Prix par place** :
  - Minimum : **2€** par place
  - Maximum : **Calculé selon barème BlaBlaCar** (voir section Tarification)
  - Recommandation affichée selon distance

#### ℹ️ Informations Optionnelles

- **Description du trajet** (max 1000 caractères)
- **Points intermédiaires** (étapes)
- **Véhicule** :
  - Marque et modèle
  - Couleur
  - Plaque d'immatriculation (masquée partiellement)
  
- **Préférences** :
  - Animaux acceptés : Oui/Non
  - Fumeur : Oui/Non
  - Musique : Oui/Non
  - Bavardage : Bla/BlaBla/BlaBlaBla
  - Maximum 2 à l'arrière : Oui/Non
  - trotinettes acceptés : Oui/Non
- **Bagages** :
  - Petit sac à dos uniquement
  - Sac de taille moyenne
  - Grand sac / Valise

### 1.2 Gestion des Réservations

#### 📩 Réception de réservations

- **Notification immédiate** par :
  - 
  - Notification push (mobile)
  - Notification dans l'application

- **Délai de réponse** :
  - **Maximum 24 heures** pour accepter/refuser
  - ⚠️ Après 24h sans réponse : **réservation automatiquement refusée**
  - Impact sur le **taux d'acceptation** du profil

#### ✅ Acceptation

- Réduction automatique des places disponibles
- Envoi de confirmation au passager
- Échange de coordonnées (téléphone masqué)
- Accès à la messagerie directe

#### ❌ Refus

- **Motifs possibles** :
  - Profil incomplet
  - Manque d'avis
  - Préférences incompatibles
  - Autre (facultatif de préciser)

- Impact : Aucun sur le conducteur si justifié
- Le passager est notifié et peut chercher un autre trajet

### 1.3 Modifications et Annulations

#### ✏️ Modifications

**Autorisées AVANT toute réservation confirmée** :
- Changement d'horaire (± 2 heures max)
- Changement de lieu de départ/arrivée
- Modification du prix (± 20% max)
- Ajout/suppression de places

**Interdites APRÈS réservations confirmées** :
- ⚠️ Changements majeurs non autorisés
- Exception : Accord mutuel avec tous les passagers
- Nécessite nouvelle confirmation de chaque passager

#### ❌ Annulation

**Délais** :
- **Plus de 24h avant le départ** :
  - Remboursement intégral des passagers
  - Aucune pénalité pour le conducteur
  
- **Moins de 24h avant le départ** :
  - Remboursement intégral des passagers
  - ⚠️ **Pénalité conducteur** : Avis négatif automatique
  - Impact sur le **taux de fiabilité**
  
- **Annulations répétées** :
  - 3 annulations en moins de 30 jours = **Compte suspendu**

### 1.4 Après le Trajet

- **Confirmation de réalisation** :
  - Le conducteur confirme que le trajet a eu lieu
  - Permet le déblocage du paiement
  
- **Notation des passagers** :
  - Délai : **14 jours** après le trajet
  - Critères : Ponctualité, Respect, Convivialité

---

## 2️⃣ RÈGLES PASSAGER

### 2.1 Recherche de Trajet

#### 🔍 Filtres Disponibles

- **Critères de base** :
  - Ville de départ / Ville d'arrivée
  - Date (±3 jours affichés)
  - Nombre de places nécessaires
  
- **Filtres avancés** :
  - Prix maximum
  - Heure de départ (matin/après-midi/soir)
  - Note minimum du conducteur (⭐ 4.0+)
  - Préférences :
    - Accepte les animaux
    - Non-fumeur uniquement
    - Femmes uniquement (pour passagères)
  - Réservation instantanée (sans validation)

### 2.2 Réservation

#### 📝 Processus Standard

1. **Sélection du nombre de places** (1 à places disponibles)
2. **Message au conducteur** (obligatoire, min 20 caractères) :
   - Présentation brève
   - Point de rendez-vous souhaité
   - Informations sur bagages
   
3. **Validation de la réservation**
4. **Attente de confirmation** (max 24h)

#### ⚡ Réservation Instantanée

**Conditions d'activation** (par le conducteur) :
- Profil complété à 100%
- Minimum 3 avis positifs
- Photo de profil validée
- Téléphone vérifié

**Fonctionnement** :
- Pas d'attente de validation
- Confirmation immédiate
- Places réservées instantanément
- Paiement immédiat

### 2.3 Confirmation et Paiement

#### 💳 Système de Paiement xCrackz

**Réservation par Crédit** :
- **2 crédits xCrackz = 1 réservation de covoiturage**
- Les crédits sont **bloqués** (non déduits) lors de la réservation
- Les crédits sont **définitivement déduits** uniquement si :
  - Le trajet est confirmé ET réalisé
  - Le passager était présent

**Paiement du Trajet** :
- 💶 **Espèces uniquement** avec le conducteur
- Montant exact affiché lors de la réservation
- Pas de frais supplémentaires
- Paiement en main propre au moment du départ

#### 💰 Coût pour le Passager

**Exemple de trajet à 20€ pour 1 place** :

| Item | Coût |
|------|------|
| Prix du trajet (à payer en espèces) | 20€ 💶 |
| Réservation (2 crédits xCrackz) | 2 crédits 🎫 |
| **Total** | **20€ + 2 crédits** |

**Exemple pour 2 places** :
- Prix total en espèces : **40€** (20€ × 2)
- Crédits bloqués : **2 crédits** (forfait peu importe le nb de places)

**Avantages** :
- ✅ Pas de frais bancaires
- ✅ Paiement direct au conducteur
- ✅ Système simple et transparent
- ✅ 2 crédits pour N places (pas de surcoût)

#### 🔒 Gestion des Crédits

**Blocage des crédits** :
- **2 crédits bloqués** dès la réservation
- Crédits **toujours visibles dans le solde** mais marqués "réservés"
- Visible dans le profil : "X crédits bloqués"

**Déblocage des crédits** :
- ✅ **Remboursés (2 crédits)** si :
  - Conducteur annule le trajet
  - Trajet annulé > 24h avant départ
  - Conducteur refuse la réservation
  
- ❌ **Définitivement déduits (2 crédits)** si :
  - Trajet réalisé avec succès
  - Annulation passager < 24h avant
  - No-show (absence du passager)

### 2.4 Annulation Passager

#### ⏰ Délais de Remboursement

| Délai d'annulation | Remboursement | Frais retenus |
|-------------------|---------------|---------------|
| **Plus de 24h avant** | 100% - frais de service | Frais service (1€) |
| **Moins de 24h avant** | 50% du prix | Frais service + 50% |
| **Moins de 2h avant** | 0% | 100% perdu |
| **No-show** (absent) | 0% | 100% perdu |

**Annulations répétées** :
- 3 annulations tardives = **Compte suspendu 30 jours**
- 5 annulations tardives = **Compte définitivement bloqué**

---

## 3️⃣ TARIFICATION

### 3.1 Prix Recommandé

**Calcul automatique selon la distance** :

| Distance | Prix recommandé par place |
|----------|---------------------------|
| 0-50 km | 0,05€/km (min 2€) |
| 51-100 km | 0,06€/km |
| 101-200 km | 0,07€/km |
| 201-400 km | 0,08€/km |
| 400+ km | 0,09€/km |

**Exemple** :
- Paris → Lyon (470 km) :
  - Prix recommandé : **42€** par place
  - Fourchette autorisée : **30€ - 55€**

### 3.2 Limites de Prix

#### 🚫 Prix Minimum

- **2€** par place minimum
- Objectif : Éviter les trajets "gratuits" (sécurité)

#### ⚠️ Prix Maximum

**Calcul du plafond** :
```
Prix max = (Distance en km × 0,15€) + 5€
```

**Exemples** :
- 50 km : Max **12,50€**
- 100 km : Max **20€**
- 200 km : Max **35€**
- 500 km : Max **80€**

**Justification** :
- Empêcher les arnaques
- Partager les frais, pas faire du profit
- Conforme à la législation française (covoiturage ≠ taxi)

### 3.3 Cas Particuliers

#### 🚗 Trajets Urbains (< 30 km)

- Prix minimum : **2€**
- Prix recommandé : **3-5€**
- Durée moyenne : < 1h

#### 🛣️ Trajets Longue Distance (> 500 km)

- Prix recommandé affiché
- Possibilité de négociation (messagerie)
- Plusieurs pauses recommandées (affichées)

#### 🔄 Trajets Réguliers (Domicile-Travail)

- Abonnement possible (réservation récurrente)
- Prix fixe négocié avec le conducteur
- Priorité sur les places

---

## 4️⃣ RÉSERVATION ET CONFIRMATION

### 4.1 Statuts de Réservation

| Statut | Description | Actions possibles |
|--------|-------------|-------------------|
| **pending** | En attente validation conducteur | Annuler (remboursement total) |
| **confirmed** | Acceptée par le conducteur | Annuler (selon délais), Messagerie |
| **rejected** | Refusée par le conducteur | Rechercher autre trajet |
| **cancelled_by_passenger** | Annulée par le passager | Aucune |
| **cancelled_by_driver** | Annulée par le conducteur | Remboursement automatique |
| **completed** | Trajet réalisé | Noter le conducteur |
| **no_show** | Passager absent | Aucune (argent perdu) |

### 4.2 Notifications

#### 📧 Email

- Confirmation de réservation
- Acceptation/Refus du conducteur
- Rappel 24h avant le départ
- Rappel 2h avant le départ
- Demande d'avis après le trajet

#### 📱 Push Notifications (Mobile)

- Réponse du conducteur (instantané)
- Nouveau message (instantané)
- Rappel 1h avant le départ
- Conducteur en route (si partagé)

#### 📲 SMS (Optionnel)

- Rappel 24h avant (si activé)
- Coordonnées du conducteur 2h avant

---

## 5️⃣ ANNULATION

### 5.1 Annulation Conducteur

#### 📊 Impact sur le Profil

**Taux de fiabilité** :
```
Taux = (Trajets réalisés / Trajets publiés) × 100
```

- **95-100%** : Excellent (badge vert)
- **90-94%** : Bon (badge jaune)
- **< 90%** : Attention (badge orange)
- **< 80%** : ⚠️ **Compte en révision**

#### 🚨 Sanctions

| Annulations | Sanction |
|-------------|----------|
| 1 annulation < 24h | Avertissement |
| 2 annulations < 24h (30j) | Suspension 7 jours |
| 3 annulations < 24h (30j) | Suspension 30 jours |
| 5 annulations < 24h (6 mois) | **Bannissement définitif** |

### 5.2 Annulation Passager

#### 💳 Récupération des Crédits selon le Délai

**Politique de remboursement des crédits** :

| Moment d'annulation | Crédits recréd | Crédits perdus | Pénalité |
|--------------------|----------------|----------------|----------|
| **> 24h avant** | ✅ **2 crédits** | - | Aucune |
| **2-24h avant** | ❌ **0 crédit** | 2 crédits | ⚠️ Avertissement |
| **< 2h avant** | ❌ **0 crédit** | 2 crédits | ⚠️⚠️ Grave |
| **No-show** | ❌ **0 crédit** | 2 crédits | 🚫 Suspension possible |

**Note importante** :
- Le passager ne verse **jamais d'argent** avant le trajet
- Seuls les 2 crédits de réservation sont en jeu
- L'argent en espèces est payé directement au conducteur le jour J

#### ⚠️ Accumulation de Pénalités

| Annulations < 24h | Sanction |
|-------------------|----------|
| 1ère annulation | Avertissement simple |
| 2 annulations (30j) | Suspension 7 jours |
| 3 annulations (30j) | Suspension 30 jours |
| 5 annulations (6 mois) | **Bannissement définitif** |

### 5.3 Cas de Force Majeure

**Exceptions remboursement intégral** :
- Accident de voiture (justificatif)
- Maladie grave (certificat médical)
- Décès dans la famille (acte de décès)
- Catastrophe naturelle
- Grève nationale des transports

**Procédure** :
1. Contacter le support immédiatement
2. Fournir justificatifs sous 48h
3. Examen au cas par cas
4. Remboursement ou crédit si validé

---

## 6️⃣ SYSTÈME DE NOTATION

### 6.1 Critères de Notation

#### 👤 Pour le Conducteur

**3 critères notés sur 5 étoiles** :

1. **Conduite** ⭐⭐⭐⭐⭐
   - Sécurité
   - Respect du code de la route
   - Souplesse de conduite

2. **Ponctualité** ⏰⭐⭐⭐⭐⭐
   - À l'heure au départ
   - Respect des horaires annoncés
   - Communication si retard

3. **Convivialité** 😊⭐⭐⭐⭐⭐
   - Accueil
   - Respect des préférences
   - Ambiance générale

**Note globale** = Moyenne des 3 critères

#### 👥 Pour le Passager

**2 critères notés sur 5 étoiles** :

1. **Ponctualité** ⏰⭐⭐⭐⭐⭐
   - À l'heure au rendez-vous
   - Prévient si retard

2. **Respect** 🤝⭐⭐⭐⭐⭐
   - Propreté
   - Comportement
   - Respect du conducteur et autres passagers

**Note globale** = Moyenne des 2 critères

### 6.2 Commentaires

#### 📝 Règles de Modération

**Autorisés** :
- Commentaires constructifs
- Faits objectifs
- Ressenti personnel

**Interdits** :
- Insultes, propos discriminatoires
- Informations personnelles (numéro, adresse)
- Hors sujet (politique, religion)
- Faux avis

**Modération** :
- Signalement possible par l'utilisateur
- Examen sous 48h
- Suppression si non conforme

#### ⭐ Badges Automatiques

| Note moyenne | Badge | Couleur |
|--------------|-------|---------|
| 4,8 - 5,0 | Conducteur Exemplaire ⭐⭐⭐ | Or |
| 4,5 - 4,7 | Conducteur Excellent ⭐⭐ | Argent |
| 4,0 - 4,4 | Conducteur Fiable ⭐ | Bronze |
| < 4,0 | Aucun badge | - |

### 6.3 Impact des Notes

#### 📉 Notes Faibles

**Note moyenne < 4.0** :
- Profil mis en avant uniquement si prix très bas
- Réservation instantanée désactivée
- Avertissement affiché aux passagers

**Note moyenne < 3.0** :
- ⚠️ **Compte en révision**
- Obligation de formation (vidéo sécurité)
- Limite de 2 trajets/semaine
- Si < 3.0 après 10 trajets supplémentaires → **Suspension**

---

## 7️⃣ PROFIL ET VÉRIFICATIONS

### 7.1 Profil Obligatoire

#### ✅ Informations Requises

**Pour TOUS** :
- Nom complet (vérifié)
- Photo de profil (visage visible)
- Numéro de téléphone (vérifié par SMS)
- Adresse email (vérifiée)
- Date de naissance (18+ obligatoire)

**Pour CONDUCTEURS uniquement** :
- Permis de conduire :
  - Numéro
  - Date d'obtention
  - Photo recto/verso
  - ⚠️ Vérifié manuellement par l'équipe
  
- Véhicule :
  - Carte grise (photo)
  - Assurance en cours de validité
  - Marque, modèle, couleur
  - Plaque d'immatriculation

### 7.2 Niveaux de Vérification

#### 🔵 Niveau 1 - Basique (automatique)

- Email vérifié ✓
- Téléphone vérifié ✓
- Photo de profil ajoutée ✓

**Autorise** : Réserver des trajets en tant que passager

#### 🟢 Niveau 2 - Confirmé (vérification manuelle)

- Niveau 1 ✓
- Pièce d'identité vérifiée ✓
- Minimum 3 trajets avec bonne note ✓

**Autorise** : 
- Profil mis en avant dans les résultats
- Badge "Profil vérifié" ✅

#### 🟡 Niveau 3 - Conducteur Vérifié

- Niveau 2 ✓
- Permis de conduire vérifié ✓
- Assurance vérifiée ✓
- Carte grise vérifiée ✓

**Autorise** :
- Publier des trajets
- Réservation instantanée (après 3 avis)

#### ⭐ Niveau 4 - Expert

- Niveau 3 ✓
- 50+ trajets réalisés
- Note moyenne ≥ 4.7
- Taux de fiabilité ≥ 98%
- Aucune annulation < 24h (12 derniers mois)

**Avantages** :
- Badge "Expert" ⭐⭐⭐
- Profil prioritaire dans les résultats
- Accès fonctionnalités premium
- Frais de service réduits (-20%)

### 7.3 Documents Acceptés

#### 📄 Pièce d'Identité

- Carte d'identité nationale
- Passeport
- Permis de conduire

**Format** : Scan ou photo HD, recto/verso

#### 🚗 Permis de Conduire

**Catégories acceptées** :
- Permis B (voiture)
- Permis B1 (quadricycle lourd)

**Ancienneté** :
- Minimum **1 an** pour publier trajets
- Exception : Conduite accompagnée (AAC) validée

#### 🛡️ Assurance

- Attestation d'assurance en cours
- Nom du conducteur sur l'attestation
- Date de validité > 30 jours

---

## 8️⃣ MESSAGERIE

### 8.1 Chat Intégré

#### 💬 Fonctionnalités

**Avant réservation** :
- Questions sur le trajet
- Négociation du point de rendez-vous
- Informations sur les bagages

**Après confirmation** :
- Échange de coordonnées (masquées)
- Partage de localisation en temps réel (optionnel)
- Modifications de dernière minute

#### 🔒 Sécurité

**Messages masqués** :
- Numéros de téléphone : `06 ** ** ** 12`
- Emails : `j***@gmail.com`
- Déblocage après confirmation mutuelle

**Contenu interdit** :
- Insultes, harcèlement
- Demande de paiement hors plateforme
- Liens externes suspects
- Contenu sexuel

**Modération IA** :
- Détection automatique de contenu inapproprié
- Alerte immédiate aux modérateurs
- Suspension du compte si récidive

### 8.2 Notifications

**Temps réel** :
- Nouveau message : Push instantané
- Réponse du conducteur : Email + Push
- Rappel si pas de réponse (24h)

---

## 9️⃣ PRÉFÉRENCES DE VOYAGE

### 9.1 Options Conducteur

#### 🐾 Animaux

- **Acceptés** : Chiens, chats (en cage/laisse)
- **Refusés** : Animaux exotiques
- **Précision** : Taille max (petit/moyen/grand)

#### 🚬 Tabac

- **Non-fumeur** : Interdit dans le véhicule
- **Fumeur** : Pauses cigarette possibles
- ⚠️ Mention obligatoire dans le profil

#### 🎵 Musique

- **Radio** : Type de musique préféré
- **Silence** : Voyage calme
- **Bavardage** : Niveau de discussion
  - 🤐 **Bla** : Calme, silence apprécié
  - 💬 **BlaBla** : Discussion normale
  - 🗣️ **BlaBlaBla** : Très bavard

#### 🎒 Bagages

- **Petit** : Sac à dos uniquement
- **Moyen** : Sac de voyage (40L)
- **Grand** : Valise (jusqu'à 23kg)
- **XL** : Équipement spécial (ski, vélo)

### 9.2 Filtres Passager

**Filtres disponibles** :
- Accepte les animaux
- Non-fumeur uniquement
- Musique acceptée
- Niveau de bavardage
- Femmes uniquement (conductrice)
- Places arrière libres (max 2)

---

## 🔟 SÉCURITÉ ET FRAUDE

### 10.1 Détection de Fraude

#### 🚨 Indicateurs Suspects

**Profil** :
- Création récente + trajet longue distance immédiat
- Plusieurs comptes depuis même IP
- Photos de stock / fausses photos
- Informations incohérentes

**Comportement** :
- Demande de paiement hors plateforme
- Prix anormalement bas/haut
- Annulations répétées
- Messages spam

**Actions automatiques** :
- Alerte aux modérateurs
- Gel temporaire du compte
- Vérification manuelle obligatoire

### 10.2 Règles de Sécurité

#### ✅ Bonnes Pratiques

**Conducteur** :
- Vérifier identité du passager (photo profil)
- Ne jamais démarrer sans confirmation
- Signaler comportement suspect
- Ne pas accepter paiement cash supplémentaire

**Passager** :
- Vérifier note du conducteur (min 4.0)
- Lire les avis récents
- Partager son trajet avec un proche
- Signaler si véhicule différent

#### 🚫 Comportements Interdits

**Bannissement immédiat** :
- Harcèlement sexuel
- Agression physique/verbale
- Conduite en état d'ivresse
- Demande de services sexuels
- Trafic illégal
- Fraude documentaire

### 10.3 Signalement

#### 📢 Processus

1. **Bouton "Signaler"** :
   - Profil utilisateur
   - Message spécifique
   - Trajet complet

2. **Catégories** :
   - Comportement inapproprié
   - Arnaque/Fraude
   - Faux profil
   - Contenu offensant
   - Problème de sécurité

3. **Traitement** :
   - Examen sous **2 heures** si urgent
   - Décision sous **24 heures** si non urgent
   - Notification du signaleur

4. **Sanctions** :
   - Avertissement (1er incident)
   - Suspension 7-30 jours (récidive)
   - Bannissement définitif (grave)

### 10.4 Assurance et Responsabilité

#### 🛡️ Couverture

**Assurance conducteur** :
- Responsabilité civile obligatoire
- Vérification validité tous les 6 mois
- Exclusion si assurance expirée

**Assurance plateforme** :
- Aucune responsabilité en cas d'accident
- Clause de non-responsabilité acceptée à l'inscription
- Recommandation d'assurance complémentaire

#### ⚠️ Clause Légale

> "xCrackz met en relation des conducteurs et des passagers mais n'est pas responsable de la réalisation du trajet, de la sécurité, ou des dommages pouvant survenir. Les utilisateurs reconnaissent voyager sous leur propre responsabilité."

---

## 📱 FONCTIONNALITÉS MOBILES

### 11.1 Notifications Push

- Nouveau message instantané
- Confirmation de réservation
- Rappel 24h, 2h, 30min avant départ
- Conducteur proche du point de rendez-vous (géolocalisation)

### 11.2 Partage de Localisation

**Optionnel** :
- Le conducteur partage sa position en temps réel
- Le passager voit l'approche du conducteur
- Désactivation automatique 1h après le départ

### 11.3 Mode Hors-ligne

- Trajets réservés accessibles sans internet
- Coordonnées du conducteur/passager enregistrées
- Messagerie synchronisée à la reconnexion

---

## 📊 STATISTIQUES ET BADGES

### 12.1 Profil Conducteur

**Affichage public** :
- Note globale ⭐ (X.X/5)
- Nombre de trajets réalisés
- Taux d'acceptation des réservations
- Taux de fiabilité (trajets non annulés)
- Membre depuis (mois/année)
- Badges obtenus

**Exemples de badges** :
- 🏆 **Expert** : 50+ trajets, note ≥ 4.7
- ⚡ **Réservation instantanée activée**
- ✅ **Profil vérifié**
- 🎖️ **100 trajets réalisés**
- 🌟 **Note parfaite 5.0**

### 12.2 Profil Passager

**Affichage public** :
- Note globale ⭐ (X.X/5)
- Nombre de trajets effectués
- Membre depuis
- Badges

**Exemples de badges** :
- 🎒 **Voyageur régulier** : 20+ trajets
- ⭐ **Passager modèle** : Note ≥ 4.8
- ✅ **Profil vérifié**

---

## ✅ CHECKLIST D'IMPLÉMENTATION

### Phase 1 - Base (Prioritaire)

- [x] ✅ Création de trajet avec validation
- [ ] ⏳ Recherche avancée avec filtres
- [ ] ⏳ Système de réservation (pending/confirmed)
- [ ] ⏳ Messagerie intégrée
- [ ] ⏳ Calcul automatique du prix recommandé
- [ ] ⏳ Gestion des annulations avec règles

### Phase 2 - Paiement

- [ ] ⏳ Intégration Mollie
- [ ] ⏳ Blocage du paiement jusqu'à confirmation
- [ ] ⏳ Remboursements automatiques
- [ ] ⏳ Système de crédits

### Phase 3 - Social

- [ ] ⏳ Système de notation (conducteur + passager)
- [ ] ⏳ Commentaires et avis
- [ ] ⏳ Badges automatiques
- [ ] ⏳ Statistiques profil

### Phase 4 - Sécurité

- [ ] ⏳ Vérification documents (permis, assurance)
- [ ] ⏳ Détection de fraude
- [ ] ⏳ Signalement et modération
- [ ] ⏳ Sanctions automatiques

### Phase 5 - Premium

- [ ] ⏳ Réservation instantanée
- [ ] ⏳ Partage de localisation temps réel
- [ ] ⏳ Trajets récurrents (abonnement)
- [ ] ⏳ Mode expert

---

## 📞 SUPPORT ET AIDE

### Centre d'Aide

**Catégories** :
- Comment publier un trajet ?
- Comment réserver une place ?
- Problème de paiement
- Annulation et remboursement
- Litige avec un utilisateur
- Vérification des documents

**Délais de réponse** :
- Email : 24-48h
- Ticket urgent : 2h
- Téléphone : Uniquement cas graves (fraude, sécurité)

---

**Version** : 1.0  
**Dernière mise à jour** : 11 octobre 2025  
**Basé sur** : Règles BlaBlaCar (2024-2025)  
**Conformité** : Loi française covoiturage (partage de frais uniquement)
