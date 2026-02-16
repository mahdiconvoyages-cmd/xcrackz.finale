# 🌐 Guide - Configuration Domaine xcrackz.com sur Vercel

## 🎯 Objectif

Connecter votre domaine **xcrackz.com** à votre projet Vercel.

Lien Dashboard Vercel : https://vercel.com/xcrackz/~/deployments

---

## 📋 Étapes Complètes

### **1. Ajouter le Domaine dans Vercel**

1. **Dashboard Vercel** :
   - https://vercel.com/xcrackz

2. **Sélectionner le projet** :
   - Cliquez sur votre projet (probablement "finality-okok" ou similaire)

3. **Settings → Domains** :
   - Cliquez sur "Add Domain"

4. **Ajouter les domaines** :
   ```
   xcrackz.com
   www.xcrackz.com
   ```

5. **Vercel affiche les DNS à configurer** :
   - Type A record pour `xcrackz.com`
   - CNAME record pour `www.xcrackz.com`

---

### **2. Configurer DNS chez votre Registrar**

#### **Où vous avez acheté xcrackz.com** (ex: OVH, GoDaddy, Namecheap, etc.)

1. **Login** sur le site de votre registrar

2. **Gérer DNS / Manage DNS** pour xcrackz.com

3. **Ajouter les enregistrements** :

   **A Record (pour xcrackz.com)** :
   ```
   Type: A
   Name: @ (ou laissez vide)
   Value: 76.76.21.21
   TTL: 3600 (ou Auto)
   ```

   **CNAME Record (pour www)** :
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 3600 (ou Auto)
   ```

4. **Sauvegarder**

---

### **3. Vérifier la Configuration**

1. **Retour dans Vercel** :
   - Attendez 5-30 minutes (propagation DNS)

2. **Refresh** la page Domains dans Vercel

3. **Vercel affiche** :
   ```
   ✅ xcrackz.com - Valid Configuration
   ✅ www.xcrackz.com - Valid Configuration
   ```

4. **SSL Automatique** :
   - Vercel génère automatiquement le certificat SSL
   - Attendre 1-2 minutes

5. **Tester** :
   - https://xcrackz.com → Votre app
   - https://www.xcrackz.com → Redirect vers xcrackz.com (ou votre choix)
   - http://xcrackz.com → Redirect vers HTTPS ✅

---

### **4. Configuration Avancée (Optionnel)**

#### **Redirection www → non-www (Recommandé)**

1. Vercel → Settings → Domains

2. Trouver `www.xcrackz.com`

3. Cliquez sur **Edit** → **Redirect to** `xcrackz.com`

**Résultat** :
```
https://www.xcrackz.com → https://xcrackz.com (redirect 301)
```

#### **Domaine Principal**

1. Vercel → Settings → Domains

2. Définir `xcrackz.com` comme **Primary Domain**

3. Tous les autres domaines redirectent automatiquement vers lui

---

## 🛠️ Selon votre Registrar

### **OVH** :

1. Espace Client → Domaines → xcrackz.com
2. Zone DNS
3. Ajouter une entrée → Type A → @ → 76.76.21.21
4. Ajouter une entrée → Type CNAME → www → cname.vercel-dns.com
5. Valider

### **GoDaddy** :

1. My Products → Domains → xcrackz.com → DNS
2. Add Record → Type A → Host @ → Points to 76.76.21.21
3. Add Record → Type CNAME → Host www → Points to cname.vercel-dns.com
4. Save

### **Namecheap** :

1. Dashboard → Domain List → Manage → Advanced DNS
2. Add New Record → A Record → Host @ → Value 76.76.21.21
3. Add New Record → CNAME Record → Host www → Value cname.vercel-dns.com
4. Save

### **Cloudflare** (Si vous l'utilisez) :

1. Dashboard → Sites → xcrackz.com → DNS
2. Add record → A → Name @ → IPv4 address 76.76.21.21 → Proxy status OFF (nuage gris)
3. Add record → CNAME → Name www → Target cname.vercel-dns.com → Proxy status OFF
4. Save

⚠️ **Important** : Si Cloudflare, désactivez le proxy (nuage gris) sinon conflit avec Vercel SSL.

---

## ✅ Checklist de Vérification

### **DNS Propagation**

- [ ] Vérifier avec **https://dnschecker.org** :
  - Entrer `xcrackz.com`
  - Type A → Doit afficher `76.76.21.21`
  - Répéter pour `www.xcrackz.com` (Type CNAME)

### **Domaine Actif**

- [ ] https://xcrackz.com fonctionne
- [ ] https://www.xcrackz.com fonctionne (ou redirige)
- [ ] http://xcrackz.com redirige vers HTTPS
- [ ] SSL certificat valide (cadenas vert)

### **Vercel Dashboard**

- [ ] Domaines affichés en vert (Valid)
- [ ] SSL émis automatiquement
- [ ] Primary domain défini

### **Performance**

- [ ] Test vitesse : https://pagespeed.web.dev
- [ ] Test SSL : https://www.ssllabs.com/ssltest

---

## 🚨 Problèmes Courants

### **"Invalid Configuration" après 1h**

**Cause** : DNS mal configurés

**Solution** :
1. Vérifier les valeurs exactes (pas d'espace, bon type)
2. Supprimer anciens enregistrements conflictuels
3. Attendre 24-48h (propagation lente parfois)

### **"Too Many Redirects"**

**Cause** : Cloudflare proxy activé

**Solution** :
1. Cloudflare → DNS → Cliquer sur le nuage orange → Passer en gris
2. Ou désactiver SSL Cloudflare (laisser Vercel gérer)

### **SSL Pending**

**Cause** : Vercel attend validation DNS

**Solution** :
1. Attendre 5 minutes après DNS valides
2. Vercel → Refresh SSL
3. Si toujours pending après 30 min → Support Vercel

### **www ne fonctionne pas**

**Cause** : CNAME mal configuré

**Solution** :
1. Vérifier CNAME : `www` → `cname.vercel-dns.com` (sans http://)
2. Pas de trailing dot : ~~`cname.vercel-dns.com.`~~ ❌
3. Correct : `cname.vercel-dns.com` ✅

---

## 📊 Configuration DNS Finale

**Votre zone DNS doit ressembler à ça** :

```
Type    Name    Value                       TTL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A       @       76.76.21.21                 3600
CNAME   www     cname.vercel-dns.com        3600
```

**Optionnel (email)** :
```
MX      @       mail.xcrackz.com            3600  (priority 10)
TXT     @       "v=spf1 include:..."        3600
```

---

## 🎨 Bonus : Open Graph & SEO

Ajouter dans `index.html` :

```html
<!-- Open Graph -->
<meta property="og:title" content="xCrackz - Gestion de Convoyage" />
<meta property="og:description" content="Plateforme SaaS pour organiser, suivre et facturer vos missions de convoyage automobile" />
<meta property="og:image" content="https://xcrackz.com/logo.svg" />
<meta property="og:url" content="https://xcrackz.com" />
<meta property="og:type" content="website" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="xCrackz" />
<meta name="twitter:description" content="Gestion de convoyage automobile" />
<meta name="twitter:image" content="https://xcrackz.com/logo.svg" />

<!-- SEO -->
<meta name="keywords" content="convoyage, automobile, gestion, flotte, SaaS, xcrackz" />
<link rel="canonical" href="https://xcrackz.com" />
```

---

## 📞 Support

**Problème persistant ?**

1. **Vercel Support** : https://vercel.com/support
2. **Registrar Support** : Selon où vous avez acheté le domaine
3. **DNS Tools** :
   - https://dnschecker.org
   - https://mxtoolbox.com
   - https://www.whatsmydns.net

---

## 🚀 Après Configuration

### **Ce que vous pouvez faire** :

1. **Email professionnel** :
   - `contact@xcrackz.com`
   - `support@xcrackz.com`
   - Via Google Workspace, Zoho Mail, etc.

2. **Sous-domaines** :
   - `app.xcrackz.com` → Application principale
   - `api.xcrackz.com` → API backend
   - `docs.xcrackz.com` → Documentation

3. **Analytics** :
   - Vercel Analytics activés
   - Google Analytics
   - Google Search Console

4. **CDN Global** :
   - Vercel Edge Network (automatique)
   - Cache optimisé
   - DDoS protection

---

**xCrackz.com** - Votre marque est en ligne ! 🌐🚀

**Build Status:** ✅ Ready  
**Domain:** xcrackz.com  
**Last Update:** 11/10/2025
