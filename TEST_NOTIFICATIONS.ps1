#!/usr/bin/env pwsh
# 🧪 SCRIPT DE TEST DES NOTIFICATIONS XCRACKZ

Write-Host "🔔 TEST DES NOTIFICATIONS PUSH" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

$SUPABASE_URL = "https://bfrkthzovwpjrvqktdjn.supabase.co"
$EDGE_FUNCTION = "$SUPABASE_URL/functions/v1/send-notification"

# Demander l'ANON_KEY
Write-Host "📝 Collez votre SUPABASE_ANON_KEY:" -ForegroundColor Yellow
$ANON_KEY = Read-Host

if ([string]::IsNullOrWhiteSpace($ANON_KEY)) {
    Write-Host "❌ ANON_KEY requis. Trouvez-le dans mobile/.env" -ForegroundColor Red
    exit 1
}

# Demander le USER_ID
Write-Host "`n📝 Entrez votre USER_ID (trouvez-le dans Supabase Dashboard → Authentication):" -ForegroundColor Yellow
$USER_ID = Read-Host

if ([string]::IsNullOrWhiteSpace($USER_ID)) {
    Write-Host "❌ USER_ID requis" -ForegroundColor Red
    exit 1
}

# Menu de test
Write-Host "`n🎯 Quel type de notification voulez-vous tester?" -ForegroundColor Green
Write-Host "1. 🚗 Tracking véhicule démarré"
Write-Host "2. 📍 Arrivée imminente"
Write-Host "3. 🎯 Mission assignée"
Write-Host "4. ✅ État des lieux disponible"
Write-Host "5. ✅ Véhicule livré"
Write-Host "6. ⚠️ Problème de livraison"
Write-Host ""

$choice = Read-Host "Votre choix (1-6)"

$body = $null

switch ($choice) {
    "1" {
        Write-Host "`n🚗 Test: Tracking démarré" -ForegroundColor Cyan
        $body = @{
            userId = $USER_ID
            type = "NAVIGATION_ALERT"
            title = "🚗 Tracking démarré"
            message = "Le véhicule ET-500-ET a débuté son trajet. Suivez sa position en temps réel !"
            data = @{
                vehicle_registration = "ET-500-ET"
                mission_id = "test-mission-001"
                screen = "TrackingMap"
            }
            channel = "navigation"
        } | ConvertTo-Json
    }
    "2" {
        Write-Host "`n📍 Test: Arrivée imminente" -ForegroundColor Cyan
        $body = @{
            userId = $USER_ID
            type = "NAVIGATION_ALERT"
            title = "📍 Arrivée imminente"
            message = "ET-500-ET - Arrivée prévue dans 5 minutes"
            data = @{
                vehicle_registration = "ET-500-ET"
                mission_id = "test-mission-001"
                alert_type = "arrival_soon"
                screen = "TrackingMap"
            }
            channel = "navigation"
        } | ConvertTo-Json
    }
    "3" {
        Write-Host "`n🎯 Test: Mission assignée" -ForegroundColor Cyan
        $body = @{
            userId = $USER_ID
            type = "MISSION_ASSIGNED"
            title = "🎯 Nouvelle mission assignée"
            message = "Une mission vous a été assignée par RENAULT TRUCKS Paris`n📦 MISS-2025-001`n🚗 Véhicule: ET-500-ET"
            data = @{
                mission_reference = "MISS-2025-001"
                doneur_ordre = "RENAULT TRUCKS Paris"
                vehicle = "ET-500-ET"
                screen = "MissionDetail"
            }
            channel = "missions"
        } | ConvertTo-Json
    }
    "4" {
        Write-Host "`n✅ Test: État des lieux disponible" -ForegroundColor Cyan
        $body = @{
            userId = $USER_ID
            type = "INSPECTION_REQUIRED"
            title = "✅ État des lieux final disponible"
            message = "L'état des lieux final pour le véhicule ET-500-ET est disponible depuis la page Rapports.`n📦 Mission: MISS-2025-001"
            data = @{
                mission_reference = "MISS-2025-001"
                vehicle_registration = "ET-500-ET"
                inspection_type = "arrivee"
                screen = "MissionReports"
            }
            channel = "updates"
        } | ConvertTo-Json
    }
    "5" {
        Write-Host "`n✅ Test: Véhicule livré" -ForegroundColor Cyan
        $body = @{
            userId = $USER_ID
            type = "MISSION_UPDATED"
            title = "✅ Véhicule livré avec succès"
            message = "Le véhicule ET-000-ET a bien été livré à Jean Dupont (Responsable Parc Auto).`n📍 45 Avenue des Champs-Élysées, 75008 Paris`n🕐 12 oct. 14:30"
            data = @{
                mission_reference = "MISS-2025-001"
                vehicle_registration = "ET-000-ET"
                receptionnaire_nom = "Jean Dupont"
                screen = "MissionDetail"
            }
            channel = "missions"
        } | ConvertTo-Json
    }
    "6" {
        Write-Host "`n⚠️ Test: Problème de livraison" -ForegroundColor Cyan
        $body = @{
            userId = $USER_ID
            type = "MISSION_UPDATED"
            title = "⚠️ Réceptionnaire absent"
            message = "ET-500-ET - Le réceptionnaire n'est pas présent à l'adresse indiquée. Contact en cours.`n📦 Mission: MISS-2025-001"
            data = @{
                mission_reference = "MISS-2025-001"
                vehicle_registration = "ET-500-ET"
                issue_type = "absent"
                screen = "MissionDetail"
            }
            channel = "urgent"
        } | ConvertTo-Json
    }
    default {
        Write-Host "❌ Choix invalide" -ForegroundColor Red
        exit 1
    }
}

# Envoyer la notification
Write-Host "`n🚀 Envoi de la notification..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $EDGE_FUNCTION `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -Headers @{ 
            "Authorization" = "Bearer $ANON_KEY"
            "apikey" = $ANON_KEY
        }
    
    Write-Host "✅ NOTIFICATION ENVOYÉE AVEC SUCCÈS !" -ForegroundColor Green
    Write-Host "`nRéponse:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5 | Write-Host
    
    Write-Host "`n📱 Vérifiez votre téléphone !" -ForegroundColor Yellow
    Write-Host "🔍 Ou consultez les logs:" -ForegroundColor Cyan
    Write-Host "   SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 5;" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ ERREUR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $responseBody = $reader.ReadToEnd()
        Write-Host "`nDétails:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor Gray
    }
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "🔔 Test terminé" -ForegroundColor Cyan
