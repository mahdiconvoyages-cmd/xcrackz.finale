# Script de configuration automatique des variables d'environnement Vercel
# Exécuter : .\setup-vercel-env.ps1

Write-Host "🚀 Configuration des variables d'environnement Vercel..." -ForegroundColor Cyan

# Variables à configurer
$envVars = @{
    "MAILJET_API_KEY" = "993b17d88aefa6e8f93f30f0dec69dd8"
    "MAILJET_SECRET_KEY" = "9fd2fd041887175690388bb5bfe92af4"
    "MAILJET_FROM_EMAIL" = "no-reply@xcrackz.com"
    "MAILJET_FROM_NAME" = "xCrackz"
    "SUPABASE_URL" = "https://bfrkthzovwpjrvqktdjn.supabase.co"
    "SUPABASE_SERVICE_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk3ODA3OCwiZXhwIjoyMDc1NTU0MDc4fQ.AUjNlkhMEIer6p847dpy83FzhO0gP5lcKRJZkTXmylM"
    "INTERNAL_EMAIL" = "mahdiconvoyages@gmail.com"
}

Write-Host "`n📝 Variables à configurer :" -ForegroundColor Yellow
foreach ($key in $envVars.Keys) {
    $maskedValue = if ($envVars[$key].Length -gt 20) { 
        $envVars[$key].Substring(0, 20) + "..." 
    } else { 
        $envVars[$key] 
    }
    Write-Host "  ✓ $key = $maskedValue" -ForegroundColor Gray
}

Write-Host "`n⚠️  IMPORTANT :" -ForegroundColor Red
Write-Host "  1. Les variables doivent être configurées MANUELLEMENT dans Vercel Dashboard" -ForegroundColor Yellow
Write-Host "  2. Aller sur : https://vercel.com/dashboard" -ForegroundColor Yellow
Write-Host "  3. Sélectionner votre projet → Settings → Environment Variables" -ForegroundColor Yellow

Write-Host "`n🌐 Ouverture du dashboard Vercel..." -ForegroundColor Cyan
Start-Process "https://vercel.com/dashboard"

Write-Host "`n📋 Instructions :" -ForegroundColor Green
Write-Host "  1. Sélectionnez votre projet dans Vercel" -ForegroundColor White
Write-Host "  2. Allez dans Settings → Environment Variables" -ForegroundColor White
Write-Host "  3. Pour chaque variable ci-dessous, cliquez sur 'Add New'" -ForegroundColor White
Write-Host "  4. Cochez : Production, Preview, Development" -ForegroundColor White
Write-Host "  5. Collez la valeur et cliquez 'Save'" -ForegroundColor White

Write-Host "`n📄 Variables à copier/coller :" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

foreach ($key in $envVars.Keys) {
    Write-Host "`nNom : $key" -ForegroundColor Yellow
    Write-Host "Valeur : $($envVars[$key])" -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
}

Write-Host "`n✅ Une fois les variables configurées dans Vercel, exécutez :" -ForegroundColor Green
Write-Host "   vercel --prod" -ForegroundColor Cyan

Write-Host "`n⚠️  N'oubliez pas de vérifier l'email expéditeur dans Mailjet !" -ForegroundColor Red
Write-Host "   https://app.mailjet.com/account/sender" -ForegroundColor Yellow

# Créer un fichier texte avec toutes les variables pour faciliter le copier/coller
$outputFile = "vercel-env-variables.txt"
$content = @"
# Variables d'environnement Vercel - xCrackz
# À ajouter dans : https://vercel.com/dashboard → Settings → Environment Variables
# Cocher : Production, Preview, Development

MAILJET_API_KEY=$($envVars["MAILJET_API_KEY"])
MAILJET_SECRET_KEY=$($envVars["MAILJET_SECRET_KEY"])
MAILJET_FROM_EMAIL=$($envVars["MAILJET_FROM_EMAIL"])
MAILJET_FROM_NAME=$($envVars["MAILJET_FROM_NAME"])
SUPABASE_URL=$($envVars["SUPABASE_URL"])
SUPABASE_SERVICE_KEY=$($envVars["SUPABASE_SERVICE_KEY"])
INTERNAL_EMAIL=$($envVars["INTERNAL_EMAIL"])

# Instructions :
# 1. Aller sur https://vercel.com/dashboard
# 2. Sélectionner votre projet
# 3. Settings → Environment Variables → Add New
# 4. Copier le nom et la valeur de chaque variable
# 5. Cocher : Production, Preview, Development
# 6. Cliquer Save

# ⚠️ IMPORTANT : Vérifier l'email expéditeur dans Mailjet
# https://app.mailjet.com/account/sender
"@

$content | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "`n💾 Fichier créé : $outputFile" -ForegroundColor Green
Write-Host "   Vous pouvez l'ouvrir pour copier/coller facilement les variables" -ForegroundColor Gray
