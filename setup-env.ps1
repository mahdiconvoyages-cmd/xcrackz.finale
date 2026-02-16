# Script PowerShell pour configurer les variables d'environnement Vercel
# Exécuter: .\setup-env.ps1

Write-Host "🔧 Configuration des variables d'environnement Vercel..." -ForegroundColor Cyan

# Variables à configurer
$envVars = @{
    "VITE_SUPABASE_URL" = "https://bfrkthzovwpjrvqktdjn.supabase.co"
    "VITE_SUPABASE_ANON_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzgwNzgsImV4cCI6MjA3NTU1NDA3OH0.ml0TkLYk53U6CqP_iCc8XkZMusFCSI-nYOS0WyV43Nc"
    "VITE_GEMINI_API_KEY" = "AIzaSyAsIK3J6NSmvEG478oOHbIkRNp4xy4S_50"
    "VITE_OPENROUTESERVICE_API_KEY" = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImM1YTdjMDg1NGMxNjQ2NDM5NDBhMTZlMDY5YmI4MWM4IiwiaCI6Im11cm11cjY0In0="
    "VITE_MAPBOX_TOKEN" = "$env:VITE_MAPBOX_TOKEN"
}

$count = 0
$total = $envVars.Count

foreach ($key in $envVars.Keys) {
    $count++
    Write-Host "[$count/$total] Configuration: $key" -ForegroundColor Yellow
    
    # Utiliser echo pour passer la valeur à vercel env add
    $value = $envVars[$key]
    Write-Output $value | vercel env add $key production --yes
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $key configuré" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ Erreur pour $key (peut-être déjà existant)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Configuration terminée !" -ForegroundColor Green
Write-Host "🚀 Lancement du déploiement..." -ForegroundColor Cyan

# Déclencher un nouveau déploiement
vercel --prod --yes

Write-Host ""
Write-Host "🎉 Déploiement lancé ! Vérifie sur https://vercel.com/dashboard" -ForegroundColor Green
