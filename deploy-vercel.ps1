# Script de Déploiement Automatique xCrackz → Vercel
# PowerShell Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   DEPLOIEMENT XCRACKZ SUR VERCEL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Variables
$VERCEL_TOKEN = "d9CwKN7EL6dX75inkamfvbNZ"
$PROJECT_NAME = "xcrackz"
$DOMAIN = "xcrackz.com"

# Configuration des variables d'environnement
$ENV_VARS = @{
    "VITE_SUPABASE_URL" = "https://bfrkthzovwpjrvqktdjn.supabase.co"
    "VITE_SUPABASE_ANON_KEY" = $env:VITE_SUPABASE_ANON_KEY
    "VITE_MAPBOX_TOKEN" = $env:VITE_MAPBOX_TOKEN
    "VITE_ONESIGNAL_APP_ID" = "b284fe02-642c-40e5-a05f-c50e07edc86d"
    "VITE_GOOGLE_CLIENT_ID" = "695959395673-d24r9sj6sj9805h072kndsho8ij0dkgo.apps.googleusercontent.com"
    "VITE_APP_URL" = "https://checksfleet.com"
}

# 1. Vérifier Vercel CLI
Write-Host "1. Vérification de Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "   ❌ Vercel CLI non installé. Installation..." -ForegroundColor Red
    npm install -g vercel
    Write-Host "   ✅ Vercel CLI installé" -ForegroundColor Green
} else {
    Write-Host "   ✅ Vercel CLI déjà installé" -ForegroundColor Green
}

Write-Host ""

# 2. Configuration du token
Write-Host "2. Configuration du token Vercel..." -ForegroundColor Yellow
$env:VERCEL_TOKEN = $VERCEL_TOKEN
$env:VERCEL_ORG_ID = ""  # Sera auto-détecté
$env:VERCEL_PROJECT_ID = ""  # Sera auto-détecté
Write-Host "   ✅ Token configuré" -ForegroundColor Green
Write-Host ""

# 3. Build du projet
Write-Host "3. Build du projet..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Erreur lors du build" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Build réussi" -ForegroundColor Green
Write-Host ""

# 4. Déploiement sur Vercel
Write-Host "4. Déploiement sur Vercel..." -ForegroundColor Yellow
Write-Host "   Nom du projet: $PROJECT_NAME" -ForegroundColor Cyan
Write-Host "   Domaine: $DOMAIN" -ForegroundColor Cyan
Write-Host ""

# Déploiement en production
vercel --prod --token=$VERCEL_TOKEN --yes

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Erreur lors du déploiement" -ForegroundColor Red
    exit 1
}

Write-Host "   ✅ Déploiement réussi!" -ForegroundColor Green
Write-Host ""

# 5. Configuration des variables d'environnement
Write-Host "5. Configuration des variables d'environnement..." -ForegroundColor Yellow

foreach ($key in $ENV_VARS.Keys) {
    $value = $ENV_VARS[$key]
    Write-Host "   - Ajout de $key..." -ForegroundColor Cyan
    
    # Créer un fichier temporaire avec la valeur
    $tempFile = New-TemporaryFile
    Set-Content -Path $tempFile -Value $value -NoNewline
    
    # Ajouter la variable avec le token
    vercel env add $key production $tempFile --token=$VERCEL_TOKEN --yes 2>$null
    
    # Supprimer le fichier temporaire
    Remove-Item $tempFile
}

Write-Host "   ✅ Variables d'environnement configurées" -ForegroundColor Green
Write-Host ""

# 6. Redéploiement pour prendre en compte les variables
Write-Host "6. Redéploiement avec les variables..." -ForegroundColor Yellow
vercel --prod --token=$VERCEL_TOKEN --yes

Write-Host "   ✅ Redéploiement réussi!" -ForegroundColor Green
Write-Host ""

# 7. Résumé
Write-Host "========================================" -ForegroundColor Green
Write-Host "   DEPLOIEMENT TERMINE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URLs de l'application:" -ForegroundColor Cyan
Write-Host "   - Production: https://$DOMAIN" -ForegroundColor Green
Write-Host "   - WWW: https://www.$DOMAIN" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "   1. Configurer le DNS de votre domaine" -ForegroundColor White
Write-Host "   2. Ajouter $DOMAIN dans Vercel Dashboard" -ForegroundColor White
Write-Host "   3. Tester l'application en production" -ForegroundColor White
Write-Host ""
Write-Host "📋 Commandes utiles:" -ForegroundColor Yellow
Write-Host "   - Voir les logs: vercel logs" -ForegroundColor White
Write-Host "   - Rollback: vercel rollback" -ForegroundColor White
Write-Host "   - Liste des déploiements: vercel ls" -ForegroundColor White
Write-Host ""
