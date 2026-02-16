# Script pour masquer les URLs de base de données dans tous les messages d'erreur
$files = @(
    "lib\screens\invoices\invoice_form_screen.dart",
    "lib\screens\invoices\invoice_detail_screen.dart",
    "lib\screens\quotes\quote_form_screen.dart",
    "lib\screens\quotes\quote_detail_screen.dart",
    "lib\screens\missions\mission_detail_screen.dart",
    "lib\screens\missions\mission_map_screen.dart",
    "lib\screens\inspections\inspections_screen.dart",
    "lib\screens\document_scanner\document_scanner_pro_screen.dart",
    "lib\widgets\signature_pad_widget.dart"
)

$basePath = "c:\Users\mahdi\Documents\Finality-okok\mobile_flutter\finality_app"

foreach ($file in $files) {
    $fullPath = Join-Path $basePath $file
    if (Test-Path $fullPath) {
        Write-Host "Processing $file..." -ForegroundColor Cyan
        
        # Lire le contenu
        $content = Get-Content $fullPath -Raw
        
        # Ajouter import si pas déjà présent
        if ($content -notmatch "import '.*error_helper\.dart';") {
            $content = $content -replace "(import 'package:flutter/material\.dart';)", "`$1`nimport '../../utils/error_helper.dart';"
            Write-Host "  - Added import" -ForegroundColor Green
        }
        
        # Remplacer les erreurs
        $originalContent = $content
        $content = $content -replace "Text\('Erreur: \`$e'\)", "Text(ErrorHelper.cleanError(e))"
        $content = $content -replace "Text\('Erreur\s+[^:]*:\s*\`$e'\)", "Text(ErrorHelper.cleanError(e))"
        
        if ($content -ne $originalContent) {
            Set-Content $fullPath $content -NoNewline
            Write-Host "  - Replaced error messages" -ForegroundColor Green
        } else {
            Write-Host "  - No changes needed" -ForegroundColor Yellow
        }
    } else {
        Write-Host "File not found: $fullPath" -ForegroundColor Red
    }
}

Write-Host "`nDone! All error messages have been secured." -ForegroundColor Green
