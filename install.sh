#!/bin/bash

# FleetCheck - Script d'installation rapide
# Usage: ./install.sh

set -e

echo "🚀 Installation de FleetCheck PHP..."
echo ""

# Vérifier PHP
if ! command -v php &> /dev/null; then
    echo "❌ PHP n'est pas installé. Installez PHP 8.1+ d'abord."
    exit 1
fi

PHP_VERSION=$(php -r 'echo PHP_VERSION;')
echo "✅ PHP $PHP_VERSION détecté"

# Vérifier Composer
if ! command -v composer &> /dev/null; then
    echo "❌ Composer n'est pas installé. Installez Composer d'abord."
    exit 1
fi

echo "✅ Composer détecté"

# Installation des dépendances
echo ""
echo "📦 Installation des dépendances PHP..."
composer install --no-interaction --prefer-dist

# Configuration
echo ""
echo "⚙️ Configuration de l'environnement..."

if [ ! -f .env ]; then
    cp .env.php .env
    echo "✅ Fichier .env créé"
else
    echo "⚠️  Fichier .env existe déjà"
fi

# Génération de la clé
echo ""
echo "🔑 Génération de la clé d'application..."
php artisan key:generate

# Création des dossiers de storage
echo ""
echo "📁 Création des dossiers de storage..."
mkdir -p storage/app/avatars
mkdir -p storage/app/mission-photos
mkdir -p storage/app/company-logos
mkdir -p storage/logs
mkdir -p storage/framework/{cache,sessions,views}

echo "✅ Dossiers créés"

# Instructions finales
echo ""
echo "✅ Installation terminée !"
echo ""
echo "📝 Prochaines étapes :"
echo ""
echo "1. Configurez votre fichier .env avec vos credentials Supabase :"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD"
echo ""
echo "2. Exécutez le script SQL sur Supabase :"
echo "   database/migrations/init_schema.sql"
echo ""
echo "3. Créez les Storage Buckets dans Supabase :"
echo "   - avatars (public)"
echo "   - mission-photos (public)"
echo "   - company-logos (public)"
echo "   - verification-documents (private)"
echo ""
echo "4. Lancez le serveur de développement :"
echo "   php artisan serve"
echo ""
echo "5. Ouvrez votre navigateur sur :"
echo "   http://localhost:8000"
echo ""
echo "📖 Pour plus d'informations, consultez README.md ou QUICKSTART.md"
echo ""
echo "🎉 Bon convoyage avec FleetCheck !"
