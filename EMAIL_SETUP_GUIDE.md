# 📧 Guide de Configuration Email Automatique

## ✅ Ce qui est déjà fait

1. ✅ **html2pdf.js installé** - Pour la conversion HTML → PDF
2. ✅ **emailService.ts créé** - Service d'envoi d'emails avec pièces jointes
3. ✅ **Fonction Edge Supabase** - `supabase/functions/send-email/index.ts`
4. ✅ **Integration dans Billing.tsx** - Bouton "Send" appelle l'API automatiquement
5. ✅ **Génération PDF base64** - Pour les pièces jointes

## 🚀 Étapes de déploiement

### 1. Installer Supabase CLI

```powershell
# Avec npm
npm install -g supabase

# Ou avec Scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 2. Se connecter à Supabase

```powershell
# Login
supabase login

# Lier le projet (récupérer le project-id depuis le dashboard Supabase)
supabase link --project-ref votre-project-id
```

### 3. Créer un compte Resend (Service Email)

1. Aller sur **https://resend.com**
2. S'inscrire (gratuit : 100 emails/jour, 3000 emails/mois)
3. Vérifier votre domaine ou utiliser un domaine de test
4. Créer une API Key dans **Settings → API Keys**

### 4. Configurer les secrets Supabase

```powershell
# Définir la clé API Resend
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
```

### 5. Modifier l'email expéditeur

Éditer `supabase/functions/send-email/index.ts` ligne 57 :

```typescript
from: 'noreply@votredomaine.com', // Remplacer par votre domaine vérifié sur Resend
```

### 6. Déployer la fonction Edge

```powershell
# Déployer
supabase functions deploy send-email

# Vérifier le déploiement
supabase functions list
```

### 7. Tester l'envoi d'email

1. Ouvrir l'application web
2. Aller dans **Facturation**
3. Créer une facture de test avec un email client
4. Cliquer sur le bouton **Send** (icône enveloppe)
5. Vérifier que l'email arrive avec le PDF en pièce jointe

## 🔧 Alternative : Utiliser un autre service email

### Option A : SendGrid

```typescript
// Dans supabase/functions/send-email/index.ts
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || ''

const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SENDGRID_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: 'noreply@votredomaine.com' },
    subject: subject,
    content: [{ type: 'text/html', value: html }],
    attachments: attachments.map(att => ({
      content: att.content,
      filename: att.filename,
      type: att.type,
      disposition: 'attachment'
    }))
  })
})
```

### Option B : Utiliser votre propre SMTP

Modifier la fonction pour utiliser un client SMTP Deno :

```typescript
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const client = new SMTPClient({
  connection: {
    hostname: "smtp.gmail.com",
    port: 465,
    tls: true,
    auth: {
      username: Deno.env.get('SMTP_USER'),
      password: Deno.env.get('SMTP_PASSWORD'),
    },
  },
});

await client.send({
  from: "noreply@votredomaine.com",
  to: to,
  subject: subject,
  html: html,
  attachments: attachments.map(att => ({
    filename: att.filename,
    content: att.content,
    encoding: "base64",
  })),
});
```

## 🐛 Dépannage

### Erreur "No email service configured"

- ✅ Vérifier que `RESEND_API_KEY` est défini : `supabase secrets list`
- ✅ Redéployer la fonction après modification des secrets

### Erreur CORS

- ✅ Vérifier que les headers CORS sont présents (déjà dans le code)
- ✅ Vérifier l'URL de la fonction Edge dans `emailService.ts`

### Email non reçu

- ✅ Vérifier les logs : `supabase functions logs send-email`
- ✅ Vérifier le domaine expéditeur sur Resend
- ✅ Vérifier les spams du destinataire

### PDF corrompu en pièce jointe

- ✅ Vérifier que `html2pdf.js` est bien installé
- ✅ Vérifier la conversion base64 dans `generatePDFBase64()`

## 📊 Monitoring

```powershell
# Voir les logs en temps réel
supabase functions logs send-email --tail

# Voir les invocations
supabase functions stats send-email
```

## 💰 Coûts

### Resend (Gratuit)
- ✅ 100 emails/jour
- ✅ 3 000 emails/mois
- ✅ Parfait pour démarrer

### SendGrid (Gratuit)
- ✅ 100 emails/jour
- ✅ Pour toujours

### Supabase Edge Functions
- ✅ 500 000 invocations/mois (gratuit)
- ✅ 2 GB de bande passante/mois (gratuit)

## 🎯 Fonctionnalités actuelles

Une fois déployé, le système permet :

1. **Envoi automatique** - Clic sur "Send" → Email envoyé immédiatement
2. **PDF en pièce jointe** - Facture/devis au format PDF professionnel
3. **Email HTML** - Template professionnel avec gradient et styling
4. **Mise à jour statut** - `draft` → `sent` automatiquement
5. **Tracking** - Logs dans Supabase pour suivre les envois

## 📝 Prochaines améliorations possibles

- [ ] **Historique des envois** - Table `email_logs` dans Supabase
- [ ] **Retry automatique** - En cas d'échec d'envoi
- [ ] **Templates personnalisables** - Modifier le contenu des emails
- [ ] **Envoi en masse** - Sélectionner plusieurs factures
- [ ] **Tracking d'ouverture** - Savoir si l'email a été ouvert
- [ ] **Pièces jointes multiples** - Ajouter d'autres fichiers

## ✅ Checklist de mise en production

- [ ] Compte Resend créé et vérifié
- [ ] Domaine email configuré
- [ ] API Key Resend ajoutée aux secrets Supabase
- [ ] Fonction `send-email` déployée
- [ ] Email expéditeur modifié dans le code
- [ ] Test d'envoi réussi
- [ ] Monitoring configuré
- [ ] Documentation utilisateur créée
