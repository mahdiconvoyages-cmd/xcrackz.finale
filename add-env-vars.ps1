# Ajout rapide des variables Vercel
$TOKEN = "d9CwKN7EL6dX75inkamfvbNZ"

Write-Host "🔧 Ajout des variables d'environnement Vercel`n" -ForegroundColor Cyan

# VITE_SUPABASE_ANON_KEY
Write-Host "→ VITE_SUPABASE_ANON_KEY" -ForegroundColor Gray
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzgwNzgsImV4cCI6MjA3NTU1NDA3OH0.ml0TkLYk53U6CqP_iCc8XkZMusFCSI-nYOS0WyV43Nc" | vercel env add VITE_SUPABASE_ANON_KEY production --token=$TOKEN

# VITE_DEEPSEEK_API_KEY
Write-Host "→ VITE_DEEPSEEK_API_KEY" -ForegroundColor Gray
echo "sk-f091258152ee4d5983ff2431b2398e43" | vercel env add VITE_DEEPSEEK_API_KEY production --token=$TOKEN

# VITE_MAPBOX_TOKEN
Write-Host "→ VITE_MAPBOX_TOKEN" -ForegroundColor Gray
echo "pk.eyJ1IjoieGNyYWNreiIsImEiOiJjbWR3dzV3cDMxdXIxMmxzYTI0c2Z0N2lpIn0.PFh0zoPCQK9UueLrLKWd0w" | vercel env add VITE_MAPBOX_TOKEN production --token=$TOKEN

# VITE_ONESIGNAL_APP_ID
Write-Host "→ VITE_ONESIGNAL_APP_ID" -ForegroundColor Gray
echo "b284fe02-642c-40e5-a05f-c50e07edc86d" | vercel env add VITE_ONESIGNAL_APP_ID production --token=$TOKEN

# VITE_GOOGLE_CLIENT_ID
Write-Host "→ VITE_GOOGLE_CLIENT_ID" -ForegroundColor Gray
echo "695959395673-d24r9sj6sj9805h072kndsho8ij0dkgo.apps.googleusercontent.com" | vercel env add VITE_GOOGLE_CLIENT_ID production --token=$TOKEN

# VITE_APP_URL
Write-Host "→ VITE_APP_URL" -ForegroundColor Gray
echo "https://xcrackz.com" | vercel env add VITE_APP_URL production --token=$TOKEN

Write-Host "`n✅ Toutes les variables ajoutées!" -ForegroundColor Green
Write-Host "`n🚀 Redéploiement avec les variables..." -ForegroundColor Yellow
vercel --prod --token=$TOKEN

Write-Host "`n✨ Configuration terminée!" -ForegroundColor Green
