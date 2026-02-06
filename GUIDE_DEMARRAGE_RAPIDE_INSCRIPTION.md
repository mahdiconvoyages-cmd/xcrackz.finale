# 🚀 GUIDE DE DÉMARRAGE RAPIDE - Système d'Inscription Intelligent

## ⚡ Installation (5 minutes)

### 1️⃣ Appliquer la migration SQL

**Option A - Via Supabase Dashboard (recommandé)** :
```bash
1. Ouvrez https://app.supabase.com
2. Sélectionnez votre projet Finality
3. Allez dans "SQL Editor"
4. Cliquez "New Query"
5. Copiez-collez le contenu de ADD_INTELLIGENT_SIGNUP_SYSTEM.sql
6. Cliquez "Run" (▶️)
7. Vérifiez "Success. No rows returned" ✅
```

**Option B - Via CLI** :
```bash
# Si vous avez psql installé
psql -h db.votre-projet.supabase.co \
     -U postgres \
     -d postgres \
     -f ADD_INTELLIGENT_SIGNUP_SYSTEM.sql

# Mot de passe : Votre password Supabase Database
```

### 2️⃣ Installer les dépendances Flutter

```bash
cd mobile_flutter/finality_app
flutter pub get
flutter clean
flutter pub get  # Deux fois pour être sûr
```

### 3️⃣ Tester l'installation

```bash
# Vérifier qu'il n'y a pas d'erreurs
flutter analyze lib/screens/auth/signup_wizard_screen.dart
flutter analyze lib/services/fraud_prevention_service.dart
flutter analyze lib/services/validation_service.dart

# Résultat attendu : Aucune erreur ✅
```

---

## 🧪 Test rapide

### 📱 Tester sur émulateur

```bash
# Lancer l'émulateur Android/iOS
flutter run

# Actions à tester :
1. Sur écran login, cliquer "Créer un compte maintenant"
2. Sélectionner "Particulier"
3. Remplir : Nom, Email, Téléphone, Mot de passe
4. Passer les étapes suivantes
5. Accepter conditions
6. Cliquer "Créer mon compte"

# Résultat attendu :
✅ Compte créé
✅ Redirection vers home
✅ Profil créé dans table profiles
```

### 🗄️ Vérifier la base de données

```sql
-- Vérifier que les nouvelles colonnes existent
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('siret', 'logo_url', 'device_fingerprint', 'profile_completion_percentage');

-- Vérifier que les nouvelles tables existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('fraud_detection_logs', 'signup_blacklist', 'signup_attempts');

-- Vérifier qu'il y a des données
SELECT * FROM profiles ORDER BY created_at DESC LIMIT 1;
SELECT * FROM signup_attempts ORDER BY created_at DESC LIMIT 1;
```

---

## 🔧 Configuration API INSEE (Optionnel mais recommandé)

### Pourquoi API INSEE ?

- ✅ Vérification SIRET automatique
- ✅ Auto-remplissage adresse légale
- ✅ Validation format + existence réelle
- ✅ **GRATUIT** (service public)

### Étapes d'inscription

1. **Créer un compte INSEE** :
   - Aller sur https://api.insee.fr/
   - Cliquer "S'inscrire"
   - Remplir le formulaire (email professionnel conseillé)
   - Confirmer l'email

2. **Créer une application** :
   - Se connecter
   - Aller dans "Mes applications"
   - Cliquer "Créer une application"
   - Nom : "Finality Signup"
   - Description : "Validation SIRET pour inscription"
   - Sélectionner API : **"Sirene V3"**
   - Valider

3. **Récupérer les credentials** :
   - Consumer Key : `XXXXXXXXXXXXXXX`
   - Consumer Secret : `YYYYYYYYYYYYYY`

4. **Obtenir le token Bearer** :
   ```bash
   # Via curl
   curl -X POST "https://api.insee.fr/token" \
     -H "Authorization: Basic $(echo -n 'CONSUMER_KEY:CONSUMER_SECRET' | base64)" \
     -d "grant_type=client_credentials"
   
   # Résultat :
   {
     "access_token": "VOTRE_TOKEN_BEARER",
     "expires_in": 604800
   }
   ```

5. **Ajouter le token dans le code** :
   
   Ouvrir `mobile_flutter/finality_app/lib/services/validation_service.dart`
   
   Ligne **122**, remplacer :
   ```dart
   // 'Authorization': 'Bearer VOTRE_TOKEN_INSEE', // À ajouter en production
   ```
   
   Par :
   ```dart
   'Authorization': 'Bearer VOTRE_ACCESS_TOKEN_ICI',
   ```

### ⚠️ Sans token INSEE

Si vous ne configurez pas l'API INSEE :
- ✅ Validation format SIRET (14 chiffres)
- ✅ Validation checksum (algorithme Luhn)
- ❌ Pas de vérification existence réelle
- ❌ Pas d'auto-remplissage adresse

---

## 📊 Monitoring & Dashboard

### Requêtes SQL utiles

**1. Taux de succès inscription (7 derniers jours)** :
```sql
SELECT 
  COUNT(*) FILTER (WHERE success = true) as reussies,
  COUNT(*) FILTER (WHERE success = false) as echouees,
  ROUND(COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*), 2) as taux_succes_pourcent,
  AVG(step_reached) as etape_moyenne_abandon
FROM signup_attempts
WHERE created_at > NOW() - INTERVAL '7 days';
```

**2. Utilisateurs avec profil incomplet** :
```sql
SELECT 
  id,
  full_name,
  email,
  profile_completion_percentage,
  onboarding_completed
FROM profiles
WHERE profile_completion_percentage < 100
ORDER BY profile_completion_percentage DESC;
```

**3. Tentatives frauduleuses bloquées** :
```sql
SELECT 
  email,
  check_type,
  flagged_reason,
  severity,
  created_at
FROM fraud_detection_logs
WHERE check_result = 'fail'
ORDER BY created_at DESC
LIMIT 10;
```

**4. Top abandons par étape** :
```sql
SELECT 
  step_reached as etape,
  CASE step_reached
    WHEN 1 THEN 'Type utilisateur'
    WHEN 2 THEN 'Infos personnelles'
    WHEN 3 THEN 'Infos entreprise'
    WHEN 4 THEN 'Vérification'
    WHEN 5 THEN 'Banking'
    WHEN 6 THEN 'Fraud check'
    WHEN 7 THEN 'Récapitulatif'
  END as nom_etape,
  COUNT(*) as nombre_abandons
FROM signup_attempts
WHERE success = false
GROUP BY step_reached
ORDER BY nombre_abandons DESC;
```

---

## 🔐 Gestion de la fraude

### Ajouter un élément à la blacklist

```sql
-- Bloquer un email
INSERT INTO signup_blacklist (type, value, reason, severity)
VALUES ('email', 'spam@example.com', 'Email frauduleux détecté', 'high');

-- Bloquer un SIRET
INSERT INTO signup_blacklist (type, value, reason, severity)
VALUES ('siret', '12345678901234', 'Entreprise fictive', 'critical');

-- Bloquer temporairement une IP (expire dans 24h)
INSERT INTO signup_blacklist (type, value, reason, severity, expires_at)
VALUES ('ip', '192.168.1.100', 'Trop de tentatives', 'medium', NOW() + INTERVAL '24 hours');
```

### Voir les comptes suspects

```sql
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.siret,
  p.suspicious_flag,
  p.device_fingerprint,
  p.registration_ip,
  p.created_at
FROM profiles p
WHERE p.suspicious_flag = true
ORDER BY p.created_at DESC;
```

### Vérifier un profil manuellement

```sql
-- Voir le score de fraude d'un utilisateur
SELECT 
  user_id,
  check_type,
  check_result,
  details,
  severity
FROM fraud_detection_logs
WHERE user_id = 'UUID_DU_USER'
ORDER BY created_at DESC;
```

---

## 🐛 Dépannage

### Problème : "device_info_plus not found"

```bash
# Solution
cd mobile_flutter/finality_app
flutter clean
flutter pub get
```

### Problème : "Token INSEE manquant"

Si vous voyez ce message, deux options :

**Option 1 - Ignorer** : Le système fonctionnera avec validation locale seulement
**Option 2 - Configurer** : Suivre les étapes "Configuration API INSEE" ci-dessus

### Problème : Profile completion bloqué à 0%

```sql
-- Vérifier que le trigger existe
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'trg_update_profile_completion';

-- Si absent, réappliquer la migration
\i ADD_INTELLIGENT_SIGNUP_SYSTEM.sql
```

### Problème : Erreur "SIRET déjà utilisé" alors que c'est faux

```sql
-- Vérifier la table profiles
SELECT id, siret, full_name, email 
FROM profiles 
WHERE siret = 'VOTRE_SIRET';

-- Si doublon, supprimer l'ancien (avec précaution !)
-- DELETE FROM profiles WHERE id = 'UUID_A_SUPPRIMER';
```

---

## 📱 Captures d'écran attendues

### Étape 1 - Type utilisateur
```
[Image: 3 cartes - Entreprise, Conducteur, Particulier]
```

### Étape 2 - Infos personnelles
```
[Image: Avatar circulaire + formulaire (nom, email, phone, password)]
```

### Étape 3 - Infos entreprise (si entreprise)
```
[Image: Logo carré + formulaire (entreprise, SIRET, taille)]
```

### Étape 7 - Récapitulatif
```
[Image: Liste récap + checkbox conditions + bouton "Créer mon compte"]
```

---

## ✅ Checklist de validation

Avant de considérer le système prêt :

- [ ] Migration SQL appliquée avec succès
- [ ] `flutter pub get` sans erreurs
- [ ] Test inscription complète (Particulier) réussi
- [ ] Test inscription complète (Entreprise avec SIRET) réussi
- [ ] Profil créé visible dans Supabase Dashboard
- [ ] Profile completion calculé correctement (> 0%)
- [ ] Tentative d'inscription loggée dans `signup_attempts`
- [ ] Test email dupliqué → Erreur "déjà utilisé"
- [ ] Test SIRET dupliqué → Erreur "déjà associé"
- [ ] Test email jetable (test@tempmail.com) → Erreur

---

## 📞 Support

**Documentation complète** : [INTELLIGENT_SIGNUP_SYSTEM.md](INTELLIGENT_SIGNUP_SYSTEM.md)

**Questions** : Créer une issue GitHub

**Urgence** : support@finality.app

---

## 🎯 Prochaines étapes recommandées

1. **SMS OTP** : Intégrer Twilio/Vonage pour vérification téléphone
2. **Email vérification** : Activer confirmation email Supabase
3. **KYC** : Upload pièce d'identité + Kbis
4. **Dashboard admin** : Interface de gestion blacklist
5. **Notifications** : Alertes sur tentatives suspectes

---

✅ **Système prêt pour production après validation de la checklist !**

Date création : 2024-12-21  
Version : 1.0.0
