# Script pour tester les images sur Vercel
$TOKEN = "d9CwKN7EL6dX75inkamfvbNZ"

Write-Host "`n🔍 Test des Images sur Vercel`n" -ForegroundColor Cyan

# 1. Obtenir le dernier déploiement
Write-Host "1. Récupération du dernier déploiement..." -ForegroundColor Yellow
$deployments = vercel ls --token=$TOKEN 2>&1 | Select-String "https://" | Select-Object -First 1
$latestUrl = $deployments.ToString().Trim() -replace '.*?(https://[^\s]+).*', '$1'

Write-Host "   URL: $latestUrl`n" -ForegroundColor Green

# 2. Tester les images
Write-Host "2. Test des images...`n" -ForegroundColor Yellow

$images = @(
    "/crm-illustration.png",
    "/inspection-banner.png",
    "/icon-192.png",
    "/icon-512.png"
)

foreach ($img in $images) {
    $url = "$latestUrl$img"
    Write-Host "   Testing: $img" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method Head -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ OK (${response.StatusCode}) - Size: $($response.Headers.'Content-Length') bytes" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ❌ ERREUR: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# 3. Instructions
Write-Host "`n📋 URLs à tester dans le navigateur:" -ForegroundColor Cyan
Write-Host "   CRM Image: $latestUrl/crm-illustration.png" -ForegroundColor White
Write-Host "   Inspection Image: $latestUrl/inspection-banner.png`n" -ForegroundColor White

Write-Host "🌐 Domaines:" -ForegroundColor Cyan
Write-Host "   https://xcrackz.com/crm-illustration.png" -ForegroundColor White
Write-Host "   https://www.xcrackz.com/inspection-banner.png`n" -ForegroundColor White

Write-Host "💡 Si les images fonctionnent sur Vercel URL mais pas sur le domaine:" -ForegroundColor Yellow
Write-Host "   → Purger le cache DNS: ipconfig /flushdns" -ForegroundColor White
Write-Host "   → Vider le cache du navigateur: Ctrl+Shift+Delete" -ForegroundColor White
Write-Host "   → Tester en navigation privée (Ctrl+Shift+N)`n" -ForegroundColor White
