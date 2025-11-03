# 📧 Configuration Mailjet - Envoi automatique d'emails

## 🎯 Pourquoi Mailjet ?

- ✅ **Gratuit jusqu'à 6 000 emails/mois** (200/jour)
- ✅ **Pas de carte bancaire requise** pour le plan gratuit
- ✅ **API simple et fiable**
- ✅ **Support des pièces jointes** sans limite de taille (dans la limite du raisonnable)
- ✅ **Excellent taux de délivrabilité**
- ✅ **Dashboard de suivi** (taux d'ouverture, clics, etc.)
- ✅ **Hébergement français** (conformité RGPD)

---

## 🔧 Étape 1 : Créer un compte Mailjet

1. Aller sur **https://www.mailjet.com/**
2. Cliquer sur **"Sign Up Free"**
3. Remplir le formulaire :
   - Email professionnel
   - Mot de passe
   - Prénom/Nom
   - Nom de l'entreprise : `xCrackz`
4. Vérifier votre email
5. Compléter le profil

---

## 🔑 Étape 2 : Obtenir les clés API

### 2.1 Générer les clés

1. Se connecter à Mailjet
2. Aller dans **Account Settings** (coin supérieur droit)
3. Cliquer sur **REST API** → **API Key Management**
4. Vous verrez :
   - **API Key** (clé publique)
   - **Secret Key** (clé privée)

### 2.2 Copier les clés

```
API Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Secret Key: yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

⚠️ **IMPORTANT** : Ne JAMAIS partager ces clés !

---

## ✉️ Étape 3 : Vérifier un expéditeur

### 3.1 Ajouter un email expéditeur

1. Aller dans **Account Settings → Sender Addresses & Domains**
2. Cliquer sur **Add a Sender Address**
3. Remplir :
   - **Email** : `no-reply@votre-domaine.com` (ou votre email perso)
   - **Name** : `xCrackz`
4. Cliquer sur **Add**

### 3.2 Valider l'email

1. Mailjet envoie un email de vérification
2. Ouvrir votre boîte mail
3. Cliquer sur le lien de validation
4. ✅ L'email est maintenant vérifié

⚠️ **CRITIQUE** : Vous ne pourrez PAS envoyer d'emails sans valider au moins un expéditeur !

---

## 📦 Étape 4 : Installer la dépendance

Dans le dossier racine du projet :

```powershell
npm install node-mailjet
npm install --save-dev @types/node-mailjet
```

---

## 🔐 Étape 5 : Configurer les variables d'environnement

### 5.1 Sur Vercel

1. Aller sur **https://vercel.com/dashboard**
2. Sélectionner votre projet
3. Aller dans **Settings → Environment Variables**
4. Ajouter les variables suivantes :

| Variable | Valeur | Environnements |
|----------|--------|----------------|
| `MAILJET_API_KEY` | Votre API Key Mailjet | Production, Preview, Development |
| `MAILJET_SECRET_KEY` | Votre Secret Key Mailjet | Production, Preview, Development |
| `MAILJET_FROM_EMAIL` | Email vérifié (ex: `no-reply@votre-domaine.com`) | Production, Preview, Development |
| `MAILJET_FROM_NAME` | `xCrackz` | Production, Preview, Development |
| `SUPABASE_URL` | URL de votre projet Supabase | Production, Preview, Development |
| `SUPABASE_SERVICE_KEY` | Service Key Supabase (⚠️ secret !) | Production, Preview, Development |
| `INTERNAL_EMAIL` | Votre email (pour copie interne) | Production, Preview, Development |

### 5.2 En local (.env.local)

Créer un fichier `.env.local` à la racine :

```env
# Mailjet
MAILJET_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAILJET_SECRET_KEY=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
MAILJET_FROM_EMAIL=no-reply@votre-domaine.com
MAILJET_FROM_NAME=xCrackz

# Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...

# Email interne
INTERNAL_EMAIL=votre-email@entreprise.com
```

⚠️ Ajouter `.env.local` dans `.gitignore` !

---

## 🚀 Étape 6 : Déployer sur Vercel

```powershell
# Si Vercel CLI n'est pas installé
npm install -g vercel

# Se connecter
vercel login

# Déployer
vercel --prod
```

---

## 🧪 Étape 7 : Tester l'envoi

### 7.1 Test avec curl

```powershell
curl -X POST https://votre-app.vercel.app/api/sendInspectionReport `
  -H "Content-Type: application/json" `
  -d '{
    "inspectionId": "uuid-d-une-vraie-inspection",
    "clientEmail": "votre-email@test.com"
  }'
```

### 7.2 Vérifier la réception

1. Vérifier votre boîte mail (client)
2. Vérifier `INTERNAL_EMAIL` (copie)
3. Vérifier les pièces jointes :
   - ✅ PDF du rapport
   - ✅ ZIP des photos

### 7.3 Vérifier les logs

Dans Vercel :
- **Deployments → Functions → sendInspectionReport → Logs**

Dans Supabase :
```sql
SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10;
```

Dans Mailjet :
- **Statistics → Email Activity**

---

## 📊 Quotas Mailjet (Plan gratuit)

- **6 000 emails/mois** (200 par jour)
- **Pas de limite de taille** pour les attachments (raisonnable)
- **Tracking inclus** (ouvertures, clics)
- **Support email** inclus

### Upgrade si besoin :

- **Essential** : 9,65€/mois → 30 000 emails/mois
- **Premium** : 20,95€/mois → 60 000 emails/mois + support prioritaire

---

## ✅ Checklist finale

Avant de considérer Mailjet opérationnel :

- [ ] Compte Mailjet créé
- [ ] API Key et Secret Key générées
- [ ] Expéditeur vérifié (email)
- [ ] `node-mailjet` installé
- [ ] Variables d'environnement configurées (Vercel + local)
- [ ] Fonction API déployée sur Vercel
- [ ] Test d'envoi réussi
- [ ] Email reçu avec PDF et ZIP
- [ ] Logs visibles dans `email_logs`
- [ ] Dashboard Mailjet affiche l'email

---

## 🔍 Comparaison Mailjet vs SendGrid

| Critère | Mailjet | SendGrid |
|---------|---------|----------|
| **Gratuit** | 6 000/mois | 100/jour |
| **Carte bancaire** | ❌ Non requise | ✅ Requise |
| **Localisation** | 🇫🇷 France (RGPD) | 🇺🇸 USA |
| **Interface** | Simple, français | Complète, anglais |
| **Support** | Email | Email + docs |
| **Tracking** | ✅ Inclus | ✅ Inclus |
| **Délai envoi** | ~1-2 sec | ~1-2 sec |

**Verdict** : Mailjet est parfait pour démarrer sans contraintes ! 🎉

---

## 🐛 Dépannage

### Erreur : "API Key invalide"
- Vérifier que `MAILJET_API_KEY` et `MAILJET_SECRET_KEY` sont bien configurés
- Régénérer les clés si nécessaire

### Erreur : "Sender non vérifié"
- Vérifier que `MAILJET_FROM_EMAIL` correspond à un email vérifié
- Aller dans Mailjet → Sender Addresses et vérifier

### Email non reçu
- Vérifier les spams
- Vérifier Mailjet Dashboard → Email Activity
- Vérifier `email_logs` table pour le statut

### Attachment trop gros
- Mailjet supporte jusqu'à **15MB** par email
- Solution : héberger le ZIP sur Supabase Storage et envoyer un lien

---

## 📚 Documentation Mailjet

- **API Docs** : https://dev.mailjet.com/
- **Node.js Wrapper** : https://github.com/mailjet/mailjet-apiv3-nodejs
- **Templates** : https://app.mailjet.com/templates
- **Support** : https://www.mailjet.com/support/

---

**🎉 Mailjet est maintenant configuré et prêt à envoyer des rapports automatiques !**
