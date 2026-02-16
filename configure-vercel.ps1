# Configuration Vercel - Variables d'environnement + Domaine
# Token Vercel
$VERCEL_TOKEN = "d9CwKN7EL6dX75inkamfvbNZ"

Write-Host "🔧 Configuration de Vercel pour xCrackz" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Ajouter les variables d'environnement
Write-Host "📋 Ajout des variables d'environnement..." -ForegroundColor Yellow

$envVars = @{
    "VITE_SUPABASE_URL" = "https://bfrkthzovwpjrvqktdjn.supabase.co"
    "VITE_SUPABASE_ANON_KEY" = $env:VITE_SUPABASE_ANON_KEY

    "VITE_MAPBOX_TOKEN" = $env:VITE_MAPBOX_TOKEN
    "VITE_ONESIGNAL_APP_ID" = "b284fe02-642c-40e5-a05f-c50e07edc86d"
    "VITE_GOOGLE_CLIENT_ID" = "695959395673-d24r9sj6sj9805h072kndsho8ij0dkgo.apps.googleusercontent.com"
    "VITE_APP_URL" = "https://checksfleet.com"
}

foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    Write-Host "  → Ajout de $key" -ForegroundColor Gray
    
    # Ajouter pour production, preview et development
    vercel env add $key production --token=$VERCEL_TOKEN --yes 2>&1 | Out-Null
    echo $value | vercel env add $key production --token=$VERCEL_TOKEN --yes 2>&1 | Out-Null
    
    vercel env add $key preview --token=$VERCEL_TOKEN --yes 2>&1 | Out-Null
    echo $value | vercel env add $key preview --token=$VERCEL_TOKEN --yes 2>&1 | Out-Null
    
    vercel env add $key development --token=$VERCEL_TOKEN --yes 2>&1 | Out-Null
    echo $value | vercel env add $key development --token=$VERCEL_TOKEN --yes 2>&1 | Out-Null
}

Write-Host "`n✅ Variables d'environnement ajoutées" -ForegroundColor Green

# 2. Ajouter les domaines personnalisés
Write-Host "`n🌐 Ajout des domaines personnalisés..." -ForegroundColor Yellow

Write-Host "  → Ajout de xcrackz.com" -ForegroundColor Gray
vercel domains add xcrackz.com --token=$VERCEL_TOKEN --yes 2>&1 | Out-Null

Write-Host "  → Ajout de www.xcrackz.com" -ForegroundColor Gray
vercel domains add www.xcrackz.com --token=$VERCEL_TOKEN --yes 2>&1 | Out-Null

Write-Host "`n✅ Domaines ajoutés" -ForegroundColor Green

# 3. Redéployer pour prendre en compte les variables
Write-Host "`n🚀 Redéploiement avec les nouvelles variables..." -ForegroundColor Yellow
vercel --prod --yes --token=$VERCEL_TOKEN

Write-Host "`n" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Configuration Vercel Terminée !" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`n📋 Résumé:" -ForegroundColor Cyan
Write-Host "  • Variables d'environnement: 7 ajoutées" -ForegroundColor White
Write-Host "  • Domaines configurés: xcrackz.com, www.xcrackz.com" -ForegroundColor White
Write-Host "  • Déploiement: En cours..." -ForegroundColor White

Write-Host "`n🌍 URLs de votre application:" -ForegroundColor Cyan
Write-Host "  • Production: https://xcrackz.com" -ForegroundColor Green
Write-Host "  • Vercel: https://xcrackz-l9odz4phf-xcrackz.vercel.app" -ForegroundColor Green

Write-Host "`n⚠️  Configuration DNS requise:" -ForegroundColor Yellow
Write-Host "  Chez votre registrar de domaine, configurez:" -ForegroundColor White
Write-Host "`n  Type A:" -ForegroundColor Gray
Write-Host "    Nom: @" -ForegroundColor White
Write-Host "    Valeur: 76.76.21.21" -ForegroundColor White
Write-Host "`n  Type CNAME:" -ForegroundColor Gray
Write-Host "    Nom: www" -ForegroundColor White
Write-Host "    Valeur: cname.vercel-dns.com" -ForegroundColor White

Write-Host "`n📊 Dashboard Vercel:" -ForegroundColor Cyan
Write-Host "  https://vercel.com/xcrackz/xcrackz" -ForegroundColor White

Write-Host "`n✨ Déploiement terminé avec succès!" -ForegroundColor Green
