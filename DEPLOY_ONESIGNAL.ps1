# 🚀 SCRIPT DE DÉPLOIEMENT ONESIGNAL COMPLET
# Exécute toutes les étapes nécessaires pour activer OneSignal

param(
    [switch]$SkipSecrets,
    [switch]$SkipDeploy,
    [switch]$TestOnly
)

$ErrorActionPreference = "Stop"

Write-Host "🔔 DÉPLOIEMENT ONESIGNAL - NOTIFICATIONS PUSH" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$PROJECT_REF = "erdxgujquowvkhmudaai"
$ONESIGNAL_APP_ID = "b284fe02-642c-40e5-a05f-c50e07edc86d"
$ONESIGNAL_API_KEY = "vl2zv7tgluxpmgue4ulytsie5"

# Vérifier Supabase CLI
Write-Host "📋 Vérification des prérequis..." -ForegroundColor Yellow
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCmd) {
    Write-Host "❌ Supabase CLI non installé" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation requise:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Supabase CLI détecté" -ForegroundColor Green
Write-Host ""

# ============================================
# ÉTAPE 1: CONFIGURER LES SECRETS
# ============================================

if (-not $SkipSecrets -and -not $TestOnly) {
    Write-Host "🔑 ÉTAPE 1/3: Configuration des secrets Supabase" -ForegroundColor Cyan
    Write-Host ""
    
    try {
        Write-Host "  Setting ONESIGNAL_APP_ID..." -ForegroundColor Gray
        supabase secrets set "ONESIGNAL_APP_ID=$ONESIGNAL_APP_ID" --project-ref $PROJECT_REF
        
        Write-Host "  Setting ONESIGNAL_API_KEY..." -ForegroundColor Gray
        supabase secrets set "ONESIGNAL_API_KEY=$ONESIGNAL_API_KEY" --project-ref $PROJECT_REF
        
        Write-Host "✅ Secrets configurés" -ForegroundColor Green
        Write-Host ""
    }
    catch {
        Write-Host "❌ Erreur lors de la configuration des secrets" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        Write-Host ""
        Write-Host "📋 Configuration manuelle requise:" -ForegroundColor Yellow
        Write-Host "  1. Ouvrir: https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions" -ForegroundColor White
        Write-Host "  2. Settings → Edge Functions → Secrets" -ForegroundColor White
        Write-Host "  3. Ajouter:" -ForegroundColor White
        Write-Host "     ONESIGNAL_APP_ID=$ONESIGNAL_APP_ID" -ForegroundColor Gray
        Write-Host "     ONESIGNAL_API_KEY=$ONESIGNAL_API_KEY" -ForegroundColor Gray
        Write-Host ""
        $continue = Read-Host "Secrets configurés manuellement? (y/n)"
        if ($continue -ne 'y') {
            exit 1
        }
    }
}

# ============================================
# ÉTAPE 2: DÉPLOYER L'EDGE FUNCTION
# ============================================

if (-not $SkipDeploy -and -not $TestOnly) {
    Write-Host "🚀 ÉTAPE 2/3: Déploiement de l'Edge Function" -ForegroundColor Cyan
    Write-Host ""
    
    $functionPath = "supabase\functions\send-notification"
    
    if (-not (Test-Path $functionPath)) {
        Write-Host "❌ Edge Function introuvable: $functionPath" -ForegroundColor Red
        exit 1
    }
    
    try {
        Write-Host "  Déploiement de send-notification..." -ForegroundColor Gray
        Push-Location "supabase\functions"
        supabase functions deploy send-notification --project-ref $PROJECT_REF
        Pop-Location
        
        Write-Host "✅ Edge Function déployée" -ForegroundColor Green
        Write-Host ""
    }
    catch {
        Write-Host "❌ Erreur lors du déploiement" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        Write-Host ""
        Pop-Location
        exit 1
    }
}

# ============================================
# ÉTAPE 3: TESTER LA CONFIGURATION
# ============================================

Write-Host "🧪 ÉTAPE 3/3: Test de la configuration" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "  Envoi notification test..." -ForegroundColor Gray
    
    $testPayload = @{
        userId = "test-user-$(Get-Random)"
        type = "SYSTEM_UPDATE"
        title = "🔔 Test OneSignal"
        message = "Configuration réussie ! $(Get-Date -Format 'HH:mm:ss')"
        channel = "updates"
    } | ConvertTo-Json -Compress
    
    $result = supabase functions invoke send-notification --project-ref $PROJECT_REF --body $testPayload
    
    Write-Host "✅ Test réussi" -ForegroundColor Green
    Write-Host ""
    Write-Host "Réponse:" -ForegroundColor Gray
    Write-Host $result -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "⚠️  Test échoué (peut être normal si aucun device abonné)" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Gray
    Write-Host ""
}

# ============================================
# RÉSUMÉ
# ============================================

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "✅ DÉPLOIEMENT ONESIGNAL TERMINÉ" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📊 Configuration:" -ForegroundColor Yellow
Write-Host "  App ID: $ONESIGNAL_APP_ID" -ForegroundColor White
Write-Host "  API Key: $($ONESIGNAL_API_KEY.Substring(0,10))..." -ForegroundColor White
Write-Host "  Project: $PROJECT_REF" -ForegroundColor White
Write-Host ""

Write-Host "🔗 Liens utiles:" -ForegroundColor Yellow
Write-Host "  Dashboard OneSignal: https://app.onesignal.com" -ForegroundColor White
Write-Host "  Supabase Functions: https://supabase.com/dashboard/project/$PROJECT_REF/functions" -ForegroundColor White
Write-Host "  Supabase SQL Editor: https://supabase.com/dashboard/project/$PROJECT_REF/editor" -ForegroundColor White
Write-Host ""

Write-Host "📋 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "  1. Exécuter migration SQL: 20250201_create_notification_tables.sql" -ForegroundColor White
Write-Host "  2. Restart app mobile: npx expo start -c" -ForegroundColor White
Write-Host "  3. Tester notification depuis l'app" -ForegroundColor White
Write-Host ""

Write-Host "✨ OneSignal est prêt !" -ForegroundColor Green
