# ✅ Checklist Système d'Inscription Intelligent

## 📊 État Actuel : 85% Fonctionnel

---

## ✅ COMPLÉTÉ

### Backend SQL (100%)
- ✅ 19 colonnes ajoutées à `profiles`
- ✅ 3 tables créées (`fraud_detection_logs`, `signup_blacklist`, `signup_attempts`)
- ✅ 6 fonctions PostgreSQL créées
- ✅ 5 RLS policies configurées
- ✅ Triggers auto-update profile completion
- ✅ Indexes de performance
- ✅ Migration SQL exécutée dans Supabase

### Frontend Web (100%)
- ✅ SignupWizard.tsx (1184 lignes) - 7 étapes
- ✅ validationService.ts (487 lignes)
- ✅ fraudPreventionService.ts (329 lignes)
- ✅ Routes configurées (/register, /signup, /inscription)
- ✅ Material-UI v7 installé et configuré
- ✅ Thème personnalisé (violet gradient)
- ✅ Design moderne avec animations
- ✅ React dédupliqué (vite.config.ts)

### Mobile Flutter (100%)
- ✅ signup_wizard_screen.dart (1052 lignes)
- ✅ fraud_prevention_service.dart
- ✅ validation_service.dart
- ✅ Intégration complète

---

## ⚠️ À COMPLÉTER POUR 100%

### 1. ❌ Supabase Storage Bucket (CRITIQUE)

**Problème** : Upload avatar/logo échouera si bucket n'existe pas

**Solution** :
```sql
-- À exécuter dans Supabase SQL Editor

-- 1. Créer le bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies RLS pour upload public
CREATE POLICY "Anyone can upload avatars"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can read avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = owner);

CREATE POLICY "Authenticated users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = owner);
```

**Test** :
```bash
# Dans console navigateur après inscription
# Vérifier que l'upload fonctionne sans erreur
```

---

### 2. ❌ Trigger Création Profile Automatique (CRITIQUE)

**Problème** : Le profil n'est pas créé automatiquement après signup Supabase Auth

**Solution** :
```sql
-- À exécuter dans Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    user_type,
    company,
    siret,
    company_size,
    fleet_size,
    legal_address,
    bank_iban,
    avatar_url,
    logo_url,
    device_fingerprint,
    registration_ip,
    suspicious_flag,
    app_role
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'user_type',
    NEW.raw_user_meta_data->>'company',
    NEW.raw_user_meta_data->>'siret',
    NEW.raw_user_meta_data->>'company_size',
    COALESCE((NEW.raw_user_meta_data->>'fleet_size')::INTEGER, 0),
    NEW.raw_user_meta_data->>'legal_address',
    NEW.raw_user_meta_data->>'bank_iban',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'logo_url',
    NEW.raw_user_meta_data->>'device_fingerprint',
    NEW.raw_user_meta_data->>'registration_ip',
    COALESCE((NEW.raw_user_meta_data->>'suspicious_flag')::BOOLEAN, FALSE),
    COALESCE(NEW.raw_user_meta_data->>'app_role', 'convoyeur')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Test** :
```bash
# Créer un compte test
# Vérifier dans Supabase Dashboard > Table Editor > profiles
# Ligne créée automatiquement avec les données du wizard
```

---

### 3. ⚠️ Email de Confirmation (OPTIONNEL - Recommandé)

**État** : Supabase envoie l'email par défaut (design basique)

**Amélioration** :
1. Aller dans **Supabase Dashboard** > **Authentication** > **Email Templates**
2. Personnaliser le template "Confirm signup"
3. Ajouter votre logo et couleurs de marque

**Template suggéré** :
```html
<h2>Bienvenue sur Finality ! 👋</h2>
<p>Cliquez sur le lien ci-dessous pour confirmer votre email :</p>
<p><a href="{{ .ConfirmationURL }}">Confirmer mon email</a></p>
<p style="color: #667eea;">Merci de votre confiance !</p>
```

---

### 4. ⚠️ API INSEE pour SIRET (OPTIONNEL)

**État** : Validation basique (format + checksum) fonctionne

**Pour validation complète** :
1. Créer compte sur https://api.insee.fr
2. Obtenir Bearer token (gratuit : 30 req/min)
3. Ajouter à `.env.local` :
```bash
VITE_INSEE_API_KEY=your_bearer_token_here
```

4. Activer dans le code (déjà préparé) :
```typescript
// Dans src/services/validationService.ts
// Les appels API INSEE sont déjà implémentés
// Il suffit de fournir la clé
```

**Avantages** :
- ✅ Vérification entreprise existe vraiment
- ✅ Récupération nom légal automatique
- ✅ Détection SIRET radié/fermé

---

### 5. ⚠️ Test Complet End-to-End (CRITIQUE)

**À faire maintenant** :

#### Test Web
```bash
# 1. Ouvrir http://localhost:5173/register

# 2. Tester parcours Company :
- Sélectionner "Entreprise"
- Remplir nom + upload avatar
- Remplir SIRET (14 chiffres valides)
- Remplir email + téléphone + password
- IBAN (optionnel)
- Accepter CGU
- Soumettre

# 3. Vérifier :
- ✅ Compte créé dans auth.users
- ✅ Profile créé dans profiles
- ✅ Avatar uploadé dans Storage
- ✅ signup_attempts logué
- ✅ Email confirmation reçu
- ✅ Redirect vers /login fonctionne

# 4. Tester parcours Driver/Individual (skip étape entreprise)
```

#### Test Mobile Flutter
```bash
cd mobile
flutter run

# Même parcours que web
# + Test device fingerprinting natif
```

---

### 6. ❌ Gestion Erreurs Production (IMPORTANT)

**Améliorer UX erreurs** :

```typescript
// Dans SignupWizard.tsx - handleSubmit()
// Actuellement : alert() basique
// À remplacer par :

import { toast } from 'react-toastify';

// Remplacer :
alert('Inscription réussie ! Un email de confirmation a été envoyé.');

// Par :
toast.success('🎉 Inscription réussie ! Vérifiez votre email.', {
  position: 'top-center',
  autoClose: 5000
});
```

**Gérer erreurs spécifiques** :
```typescript
catch (err: any) {
  if (err.message.includes('duplicate key')) {
    setError('Un compte existe déjà avec cet email ou SIRET');
  } else if (err.code === 'auth/weak-password') {
    setError('Mot de passe trop faible');
  } else if (err.code === 'storage/unauthorized') {
    setError('Erreur upload image. Vérifiez les permissions Storage.');
  } else {
    setError('Erreur : ' + err.message);
  }
}
```

---

### 7. ⚠️ Variables d'Environnement Vercel (Production)

**Vérifier dans Vercel Dashboard** :
```bash
# Settings > Environment Variables

VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_INSEE_API_KEY=your_token (optionnel)
```

**Rebuild après ajout variables** :
```bash
# Dans Vercel dashboard : Deployments > ... > Redeploy
```

---

## 🧪 Plan de Test Final

### Test 1 : Inscription Company
```
✅ Étape 1 : Sélection "Entreprise"
✅ Étape 2 : Avatar upload
✅ Étape 3 : SIRET valide (88234567800012)
✅ Étape 4 : Email unique + phone + password fort
✅ Étape 5 : IBAN (optionnel)
✅ Étape 6 : Fraud check vert
✅ Étape 7 : Accepter CGU + Submit
✅ Résultat : Compte créé, email reçu
```

### Test 2 : Inscription Driver
```
✅ Étape 1 : Sélection "Convoyeur"
✅ Étape 2 : Avatar upload
⏭️ Étape 3 : SKIP automatique
✅ Étape 4-7 : Idem Company
```

### Test 3 : Fraude Détection
```
❌ Email jetable (@10minutemail.com) → Score 50+
❌ SIRET déjà utilisé → Score 50+
❌ 5 tentatives même IP/1h → Score 30+
❌ Password too weak → Bloqué étape 4
```

---

## 📋 Checklist Déploiement

Avant de déclarer "Production Ready" :

- [ ] Bucket Storage créé avec policies
- [ ] Trigger handle_new_user créé
- [ ] Test inscription Company réussi
- [ ] Test inscription Driver réussi
- [ ] Test fraud detection fonctionnel
- [ ] Email confirmation reçu
- [ ] Variables Vercel configurées
- [ ] Build production réussi
- [ ] Test sur mobile (iOS/Android)
- [ ] Monitoring erreurs activé (Sentry)

---

## 🚀 Prochaines Améliorations (Post-100%)

1. **SMS OTP** : Vérification téléphone par SMS (Twilio)
2. **KYC** : Upload documents légaux (KBIS, CNI)
3. **Admin Dashboard** : Gestion blacklist + logs fraude
4. **Webhook Stripe** : Paiement crédits
5. **2FA** : Authentification deux facteurs

---

## 📞 Support

Si blocage :
1. Vérifier logs Supabase : **Dashboard > Logs**
2. Console navigateur : F12 > Network/Console
3. Tester RPC functions : Supabase SQL Editor
```

