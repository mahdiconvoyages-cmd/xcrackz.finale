# 🚀 FleetCheck - Guide de Démarrage Rapide

Ce guide vous permettra de lancer FleetCheck en moins de 10 minutes !

## ✅ Étape 1 : Vérifier les prérequis

```bash
php --version  # Doit être >= 8.1
composer --version
```

## ✅ Étape 2 : Installation

```bash
# Installer les dépendances
composer install

# Copier le fichier d'environnement
cp .env.php .env

# Générer la clé d'application
php artisan key:generate
```

## ✅ Étape 3 : Configuration Supabase

### 3.1 Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez votre URL et vos clés API

### 3.2 Configurer `.env`

```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-anon-key
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key

DB_HOST=db.votre-projet.supabase.co
DB_DATABASE=postgres
DB_USERNAME=postgres
DB_PASSWORD=votre-mot-de-passe-db
```

### 3.3 Exécuter le script SQL

1. Ouvrez le SQL Editor de Supabase
2. Copiez tout le contenu de `database/migrations/init_schema.sql`
3. Exécutez le script
4. Vérifiez que toutes les tables sont créées

### 3.4 Créer les Storage Buckets

Dans Supabase Storage, créez ces buckets **publics** :
- `avatars`
- `mission-photos`
- `company-logos`

Et ce bucket **privé** :
- `verification-documents`

## ✅ Étape 4 : Configuration Mapbox (optionnel)

1. Créez un compte sur [mapbox.com](https://mapbox.com)
2. Créez un token d'accès
3. Ajoutez-le dans `.env` :

```env
MAPBOX_ACCESS_TOKEN=votre-token-mapbox
```

## ✅ Étape 5 : Configuration Email (optionnel)

Pour Gmail :

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=votre-email@gmail.com
MAIL_PASSWORD=votre-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@fleetcheck.com"
```

> **Note**: Utilisez un "App Password" Gmail, pas votre mot de passe principal.

## ✅ Étape 6 : Lancer l'application

```bash
php artisan serve
```

Ouvrez votre navigateur sur : **http://localhost:8000**

## 🎉 C'est terminé !

Vous devriez voir la landing page de FleetCheck.

### Prochaines étapes :

1. **Créer un compte** : Cliquez sur "Commencer" ou "Inscription"
2. **Remplir le profil** : Nom, email, rôle (Convoyeur ou Donneur d'ordre)
3. **Explorer le Dashboard** : Visualisez vos KPIs et statistiques
4. **Créer votre première mission** : Missions → Nouvelle mission

## 🐛 Problèmes courants

### Erreur : "SQLSTATE[08006] Unable to connect"

➡️ Vérifiez vos identifiants de base de données dans `.env`

### Erreur : "Class 'TCPDF' not found"

➡️ Exécutez : `composer require tecnickcom/tcpdf`

### Erreur : "Supabase unauthorized"

➡️ Vérifiez que vos clés API Supabase sont correctes dans `.env`

### Les photos ne s'affichent pas

➡️ Vérifiez que les buckets Storage sont bien **publics** dans Supabase

## 📚 Documentation complète

Consultez le fichier [README.md](README.md) pour la documentation complète.

## 🆘 Support

Besoin d'aide ?
- 📧 Email : support@fleetcheck.com
- 📖 Docs : https://docs.fleetcheck.com

---

**Bon convoyage avec FleetCheck ! 🚗💨**
