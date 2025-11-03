# ⚡ Configuration rapide Mailjet

## 🔑 Vos clés API

Vous avez déjà votre **API Key** : `993b17d88aefa6e8f93f30f0dec69dd8`

### Il vous manque uniquement :

1. **Secret Key** (clé privée)
   - Aller sur https://app.mailjet.com/account/apikeys
   - Copier votre **Secret Key** (à côté de l'API Key)

2. **Email expéditeur vérifié**
   - Aller sur https://app.mailjet.com/account/sender
   - Ajouter et vérifier votre email (ex: `no-reply@votre-domaine.com`)

3. **Supabase Service Key**
   - Aller sur https://supabase.com/dashboard/project/VOTRE_PROJET/settings/api
   - Copier la **service_role** key (⚠️ ne jamais exposer côté client)

---

## 🚀 Déploiement sur Vercel

### Étape 1 : Ajouter les variables d'environnement

1. Aller sur https://vercel.com/dashboard
2. Sélectionner votre projet
3. **Settings → Environment Variables**
4. Ajouter ces variables (pour **Production, Preview, Development**) :

```
MAILJET_API_KEY=993b17d88aefa6e8f93f30f0dec69dd8
MAILJET_SECRET_KEY=votre_secret_key_mailjet
MAILJET_FROM_EMAIL=no-reply@votre-domaine.com
MAILJET_FROM_NAME=xCrackz
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...votre-service-key
INTERNAL_EMAIL=votre-email@entreprise.com
```

### Étape 2 : Déployer

```powershell
vercel --prod
```

---

## 🧪 Test rapide

Une fois déployé, testez l'API :

```powershell
curl -X POST https://votre-app.vercel.app/api/sendInspectionReport `
  -H "Content-Type: application/json" `
  -d '{
    "inspectionId": "uuid-inspection-existante",
    "clientEmail": "test@example.com"
  }'
```

Si ça fonctionne, vous recevrez :
- ✅ Email avec PDF du rapport
- ✅ ZIP avec toutes les photos
- ✅ Copie sur votre email interne

---

## 📊 Vérifier les envois

### Dans Mailjet
https://app.mailjet.com/stats

### Dans Supabase
```sql
SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10;
```

---

**🎉 C'est prêt ! L'envoi automatique d'email est maintenant opérationnel.**
