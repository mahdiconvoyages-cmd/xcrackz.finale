# Script de correction d'encodage UTF-8 - Version Simple
# Corrige les caracteres accentues mal encodes

# Fonction de remplacement simple
function Fix-Encoding {
    param([string]$filePath)
    
    $content = Get-Content -Path $filePath -Raw -Encoding UTF8
    $changed = $false
    
    # Corrections e accente
    if ($content -match 'r├®fl├®chir') {
        $content = $content -replace 'r├®fl├®chir', 'réfléchir'
        $changed = $true
    }
    if ($content -match '├®quipe') {
        $content = $content -replace '├®quipe', 'équipe'
        $changed = $true
    }
    if ($content -match 'd├®tails') {
        $content = $content -replace 'd├®tails', 'détails'
        $changed = $true
    }
    if ($content -match 'cr├®├®') {
        $content = $content -replace 'cr├®├®', 'créé'
        $changed = $true
    }
    if ($content -match 'priorit├®') {
        $content = $content -replace 'priorit├®', 'priorité'
        $changed = $true
    }
    if ($content -match 'r├®pondra') {
        $content = $content -replace 'r├®pondra', 'répondra'
        $changed = $true
    }
    if ($content -match 'd├®lais') {
        $content = $content -replace 'd├®lais', 'délais'
        $changed = $true
    }
    if ($content -match 'g├®n├®ralement') {
        $content = $content -replace 'g├®n├®ralement', 'généralement'
        $changed = $true
    }
    if ($content -match '├®t├® cr├®├®') {
        $content = $content -replace '├®t├® cr├®├®', 'été créé'
        $changed = $true
    }
    if ($content -match 'probl├¿me') {
        $content = $content -replace 'probl├¿me', 'problème'
        $changed = $true
    }
    if ($content -match 'd├®j├á') {
        $content = $content -replace 'd├®j├á', 'déjà'
        $changed = $true
    }
    if ($content -match 'r├®sultat') {
        $content = $content -replace 'r├®sultat', 'résultat'
        $changed = $true
    }
    if ($content -match 'Types ├®tendus') {
        $content = $content -replace 'Types ├®tendus', 'Types étendus'
        $changed = $true
    }
    if ($content -match 'Ast├®risques') {
        $content = $content -replace 'Ast├®risques', 'Astérisques'
        $changed = $true
    }
    if ($content -match 'G├®rer') {
        $content = $content -replace 'G├®rer', 'Gérer'
        $changed = $true
    }
    if ($content -match 'derni├¿re') {
        $content = $content -replace 'derni├¿re', 'dernière'
        $changed = $true
    }
    if ($content -match 'affich├®') {
        $content = $content -replace 'affich├®', 'affiché'
        $changed = $true
    }
    if ($content -match 'D├®crivez pr├®cis├®ment') {
        $content = $content -replace 'D├®crivez pr├®cis├®ment', 'Décrivez précisément'
        $changed = $true
    }
    if ($content -match 'rencontr├®') {
        $content = $content -replace 'rencontr├®', 'rencontré'
        $changed = $true
    }
    if ($content -match 'essay├®') {
        $content = $content -replace 'essay├®', 'essayé'
        $changed = $true
    }
    
    # Corrections TrackingList
    if ($content -match 'rÃ©el') {
        $content = $content -replace 'rÃ©el', 'réel'
        $changed = $true
    }
    if ($content -match 'Ã‰couter') {
        $content = $content -replace 'Ã‰couter', 'Écouter'
        $changed = $true
    }
    if ($content -match 'sÃ©lectionnÃ©e') {
        $content = $content -replace 'sÃ©lectionnÃ©e', 'sélectionnée'
        $changed = $true
    }
    if ($content -match 'crÃ©Ã©es') {
        $content = $content -replace 'crÃ©Ã©es', 'créées'
        $changed = $true
    }
    if ($content -match 'assignÃ©es') {
        $content = $content -replace 'assignÃ©es', 'assignées'
        $changed = $true
    }
    if ($content -match 'TerminÃ©e') {
        $content = $content -replace 'TerminÃ©e', 'Terminée'
        $changed = $true
    }
    if ($content -match 'AnnulÃ©e') {
        $content = $content -replace 'AnnulÃ©e', 'Annulée'
        $changed = $true
    }
    if ($content -match 'copiÃ©') {
        $content = $content -replace 'copiÃ©', 'copié'
        $changed = $true
    }
    if ($content -match 'CoordonnÃ©es') {
        $content = $content -replace 'CoordonnÃ©es', 'Coordonnées'
        $changed = $true
    }
    if ($content -match 'coordonnÃ©es') {
        $content = $content -replace 'coordonnÃ©es', 'coordonnées'
        $changed = $true
    }
    if ($content -match 'dÃ©finies') {
        $content = $content -replace 'dÃ©finies', 'définies'
        $changed = $true
    }
    if ($content -match 'dÃ©part') {
        $content = $content -replace 'dÃ©part', 'départ'
        $changed = $true
    }
    if ($content -match 'arrivÃ©e') {
        $content = $content -replace 'arrivÃ©e', 'arrivée'
        $changed = $true
    }
    if ($content -match 'estimÃ©e') {
        $content = $content -replace 'estimÃ©e', 'estimée'
        $changed = $true
    }
    if ($content -match 'dÃ©taillÃ©e') {
        $content = $content -replace 'dÃ©taillÃ©e', 'détaillée'
        $changed = $true
    }
    
    if ($changed) {
        Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline
        return $true
    }
    return $false
}

# Trouver et corriger les fichiers
$files = Get-ChildItem -Path "src" -Recurse -Include *.ts,*.tsx
$fixedCount = 0

Write-Host "Correction d'encodage en cours..." -ForegroundColor Cyan

foreach ($file in $files) {
    if (Fix-Encoding -filePath $file.FullName) {
        Write-Host "Corrige: $($file.Name)" -ForegroundColor Green
        $fixedCount++
    }
}

Write-Host ""
Write-Host "Termine! $fixedCount fichiers corriges" -ForegroundColor Yellow
