# Script pour appliquer la simplification des descriptions
# Exécuter avec: .\apply-shop-simplification.ps1

Write-Host "🔄 Application de la simplification des descriptions..." -ForegroundColor Cyan

# Lire le fichier .env pour obtenir les credentials Supabase
if (Test-Path ".env") {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^VITE_SUPABASE_URL=(.+)$') {
            $env:SUPABASE_URL = $matches[1]
        }
        if ($_ -match '^VITE_SUPABASE_ANON_KEY=(.+)$') {
            $env:SUPABASE_KEY = $matches[1]
        }
    }
}

if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_KEY) {
    Write-Host "❌ Erreur: Variables SUPABASE non trouvées dans .env" -ForegroundColor Red
    exit 1
}

# SQL à exécuter
$sql = @"
-- Mettre à jour les descriptions des offres MENSUELLES
UPDATE credits_packages
SET description = '75 crédits par mois + Tracking GPS illimité gratuit'
WHERE name = 'Pro' AND billing_period = 'monthly';

UPDATE credits_packages
SET description = '250 crédits par mois + Tracking GPS illimité gratuit'
WHERE name = 'Business' AND billing_period = 'monthly';

UPDATE credits_packages
SET description = '1000 crédits par mois + Tracking GPS illimité gratuit + Support premium'
WHERE name = 'Enterprise' AND billing_period = 'monthly';

-- Mettre à jour les descriptions des offres ANNUELLES
UPDATE credits_packages
SET description = '75 crédits par mois + Tracking GPS illimité gratuit pendant 12 mois'
WHERE name = 'Pro' AND billing_period = 'annual';

UPDATE credits_packages
SET description = '250 crédits par mois + Tracking GPS illimité gratuit pendant 12 mois'
WHERE name = 'Business' AND billing_period = 'annual';

UPDATE credits_packages
SET description = '1000 crédits par mois + Tracking GPS illimité gratuit + Support premium pendant 12 mois'
WHERE name = 'Enterprise' AND billing_period = 'annual';
"@

# Construire l'URL de l'API REST
$restUrl = "$env:SUPABASE_URL/rest/v1/rpc/exec_sql"

# Headers
$headers = @{
    "apikey" = $env:SUPABASE_KEY
    "Authorization" = "Bearer $env:SUPABASE_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}

# Body
$body = @{
    query = $sql
} | ConvertTo-Json

try {
    Write-Host "📝 Exécution du SQL..." -ForegroundColor Yellow
    
    # Note: Cette méthode nécessite que vous exécutiez le SQL manuellement
    # Car Supabase REST API ne permet pas d'exécuter du SQL arbitraire pour des raisons de sécurité
    
    Write-Host @"
    
⚠️  Pour appliquer ces changements, veuillez :

1. Aller sur: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
2. Copier-coller ce SQL :

$sql

3. Cliquer sur "Run"

"@ -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Instructions affichées!" -ForegroundColor Green
