# Protection contre les comptes multiples

## Vue d'ensemble

Un système complet a été mis en place pour empêcher les utilisateurs de créer plusieurs comptes sur la plateforme xCrackz.

## Mesures de sécurité implémentées

### 1. Contraintes de base de données

#### Email unique
- Contrainte `UNIQUE` sur la colonne `email` dans la table `profiles`
- Empêche la création de comptes avec le même email
- Gérée automatiquement par PostgreSQL

#### Téléphone indexé
- Index sur la colonne `phone` pour recherche rapide
- Permet la détection de comptes avec le même numéro

### 2. Vérification avant inscription

#### Fonction `check_existing_user()`
```sql
check_existing_user(p_email, p_phone)
```
Vérifie si un utilisateur existe déjà par:
- Email (recherche exacte, insensible à la casse)
- Téléphone (recherche exacte)

Retourne:
- `user_exists`: boolean
- `user_id`: UUID de l'utilisateur existant
- `matched_by`: 'email' ou 'phone'

#### Service côté client
```typescript
accountVerificationService.checkExistingUser(email, phone)
```

### 3. Logging des tentatives

#### Table `account_creation_attempts`
Enregistre chaque tentative de création de compte:
- Email et téléphone
- Adresse IP
- User agent
- Date et heure
- Succès ou échec
- Détection de doublon
- Message d'erreur

#### Fonction `log_account_creation_attempt()`
```sql
log_account_creation_attempt(
  p_email,
  p_phone,
  p_ip_address,
  p_user_agent,
  p_success,
  p_error_message,
  p_duplicate_detected,
  p_existing_user_id
)
```

### 4. Détection des comportements suspects

#### Table `suspicious_accounts`
Stocke les alertes de sécurité:
- Email et téléphone suspects
- Raison de la détection
- Niveau de sévérité (low, medium, high, critical)
- Statut de révision

#### Fonction `detect_suspicious_behavior()`
Détecte automatiquement:
- **Plus de 5 tentatives en 1h depuis la même IP** → Sévérité HIGH
- **Même téléphone pour plusieurs comptes** → Sévérité MEDIUM

### 5. Processus d'inscription sécurisé

1. **Utilisateur soumet le formulaire**
2. **Vérification préalable** : `checkExistingUser(email, phone)`
3. **Si compte existe** :
   - Arrêt de l'inscription
   - Message d'erreur clair
   - Log de la tentative avec `duplicate_detected = true`
   - Détection comportement suspect
4. **Si compte n'existe pas** :
   - Création du compte Supabase Auth
   - Création du profil
   - Log de la tentative réussie
5. **En cas d'erreur** :
   - Log avec message d'erreur
   - Affichage message à l'utilisateur

## Messages d'erreur utilisateur

### Email déjà utilisé
```
Un compte existe déjà avec cette adresse email.
Veuillez vous connecter ou utiliser une autre adresse.
```

### Téléphone déjà utilisé
```
Un compte existe déjà avec ce numéro de téléphone.
Veuillez vous connecter ou utiliser un autre numéro.
```

## Interface d'administration

### Page Sécurité des comptes (`/admin/security`)

#### Statistiques
- Total des tentatives
- Tentatives réussies
- Tentatives en doublon
- Comptes suspects non révisés

#### Onglet "Comptes suspects"
- Liste des comptes détectés comme suspects
- Niveau de sévérité coloré
- Raison de la détection
- Bouton "Marquer vérifié"

#### Onglet "Toutes les tentatives"
- Tableau complet des tentatives
- Filtres par email, téléphone, IP
- Statut (Succès/Échec)
- Badge "Doublon" si détecté

## Recommandations

### Pour les administrateurs

1. **Surveiller régulièrement** `/admin/security`
2. **Examiner les comptes suspects** quotidiennement
3. **Investiguer les tentatives multiples** depuis même IP
4. **Bloquer les comptes frauduleux** si nécessaire

### Améliorations futures possibles

1. **Rate limiting** : Limiter les tentatives par IP
2. **CAPTCHA** : Ajouter après X tentatives échouées
3. **Vérification email** : Confirmer l'email avant activation
4. **Vérification téléphone** : SMS avec code de confirmation
5. **2FA obligatoire** : Pour comptes sensibles
6. **Blocage automatique** : Bloquer IP après seuil critique
7. **KYC (Know Your Customer)** : Vérification d'identité pour comptes pro

## Sécurité des données

- **RLS activé** sur toutes les tables de sécurité
- **Accès admin uniquement** aux logs et comptes suspects
- **Pas de stockage de mots de passe** en clair
- **IP anonymisée** après 90 jours (à implémenter)
- **RGPD compliant** : Droit à l'effacement inclus

## Code source

### Fichiers principaux

- Migration: `supabase/migrations/add_unique_constraints_prevent_duplicate_accounts.sql`
- Service: `src/services/accountVerification.ts`
- Page inscription: `src/pages/Register.tsx`
- Page admin: `src/pages/AccountSecurity.tsx`

### Fonctions SQL disponibles

```sql
-- Vérifier utilisateur existant
SELECT * FROM check_existing_user('test@email.com', '+33612345678');

-- Logger une tentative
SELECT log_account_creation_attempt(
  'test@email.com',
  '+33612345678',
  '192.168.1.1',
  'Mozilla/5.0...',
  false,
  'Email déjà utilisé',
  true,
  'user-uuid-here'
);

-- Détecter comportement suspect
SELECT detect_suspicious_behavior(
  'test@email.com',
  '+33612345678',
  '192.168.1.1'
);
```

## Tests

### Tester la détection de doublons

1. Créer un compte avec email: `test1@example.com`
2. Tenter de créer un autre compte avec le même email
3. Vérifier le message d'erreur
4. Aller sur `/admin/security` et vérifier le log

### Tester la détection de téléphone

1. Créer un compte avec téléphone: `+33612345678`
2. Tenter de créer un autre compte avec le même téléphone
3. Vérifier le message d'erreur
4. Vérifier le log admin

### Tester la détection de comportement suspect

1. Faire 6 tentatives de création en 1h depuis la même IP
2. Vérifier qu'une alerte apparaît dans "Comptes suspects"
3. Vérifier la sévérité (HIGH)

## Support

Pour toute question sur le système de sécurité des comptes, contacter l'équipe technique.
