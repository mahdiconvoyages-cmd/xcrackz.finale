# 🚀 Configuration Vercel - Variables d'environnement

## Variables à ajouter dans Vercel

Aller sur : https://vercel.com/dashboard → Votre projet → Settings → Environment Variables

Ajouter ces variables pour **Production, Preview, Development** :

```bash
# Mailjet
MAILJET_API_KEY=993b17d88aefa6e8f93f30f0dec69dd8
MAILJET_SECRET_KEY=9fd2fd041887175690388bb5bfe92af4
MAILJET_FROM_EMAIL=no-reply@xcrackz.com
MAILJET_FROM_NAME=xCrackz

# Supabase
SUPABASE_URL=https://bfrkthzovwpjrvqktdjn.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM

# Email interne
INTERNAL_EMAIL=mahdiconvoyages@gmail.com
```

## ⚠️ IMPORTANT

Avant de pouvoir envoyer des emails, vous DEVEZ vérifier l'email expéditeur dans Mailjet :

1. Aller sur https://app.mailjet.com/account/sender
2. Cliquer sur **Add a Sender Address**
3. Ajouter : `no-reply@xcrackz.com` (ou votre email perso si vous n'avez pas de domaine)
4. Mailjet enverra un email de vérification
5. Cliquer sur le lien de validation

**Sans cette étape, les emails ne partiront PAS !**

## 🚀 Déploiement

Une fois les variables configurées dans Vercel :

```powershell
vercel --prod
```

## 🧪 Test

```powershell
curl -X POST https://votre-app.vercel.app/api/sendInspectionReport `
  -H "Content-Type: application/json" `
  -d '{
    "inspectionId": "uuid-inspection",
    "clientEmail": "test@example.com"
  }'
```

✅ Vous recevrez un email avec le PDF du rapport + ZIP des photos !
