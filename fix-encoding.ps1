# Script de correction d'encodage UTF-8
# Corrige les caractères accentués mal encodés dans les fichiers TypeScript/TSX

$replacements = @{
    # Caractères accentués courants
    '├®' = 'é'
    '├á' = 'à'
    'Ã©' = 'é'
    'Ã¨' = 'è'
    'Ã ' = 'à'
    '├«' = 'ë'
    '├¿' = 'ï'
    '├®' = 'é'
    '├¬' = 'ê'
    '├´' = 'ô'
    '├╗' = 'û'
    '├º' = 'ù'
    '├⌐' = 'ç'
    'Ã¢' = 'â'
    'Ã´' = 'ô'
    'Ã®' = 'î'
    'Ã»' = 'û'
    'Ã¼' = 'ü'
    'Ã§' = 'ç'
    'Ã«' = 'ë'
    'Ã¯' = 'ï'
    'Ã¿' = 'ÿ'
    
    # Majuscules accentuées
    'Ã‰' = 'É'
    'Ãˆ' = 'È'
    'Ã€' = 'À'
    'Ã‡' = 'Ç'
    'ÃŠ' = 'Ê'
    'Ã"' = 'Ô'
    'Ã‹' = 'Ë'
    
    # Symboles spéciaux
    'ÔÇó' = '•'
    'Ô£à' = '✓'
    'ÔÜá´©Å' = '🎯'
    '­ƒôï' = '📝'
    '­ƒô®' = '📞'
    '­ƒÜ¿' = '❌'
    '­ƒÜü' = '✅'
    '­ƒÖ¥' = '💡'
    '­ƒÆ░' = '🎉'
    
    # Guillemets et apostrophes
    'ÔÇï' = '«'
    'ÔÇ║' = '»'
    'ÔÇÖ' = '"'
    'ÔÇØ' = '"'
    'ÔÇÖ' = "'"
    'ÔÇÖ' = "'"
}

# Fichiers à corriger
$files = Get-ChildItem -Path "src" -Recurse -Include *.ts,*.tsx

$totalFiles = 0
$totalReplacements = 0

Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  CORRECTION D'ENCODAGE UTF-8" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    $fileReplacements = 0
    
    foreach ($key in $replacements.Keys) {
        $count = ([regex]::Matches($content, [regex]::Escape($key))).Count
        if ($count -gt 0) {
            $content = $content -replace [regex]::Escape($key), $replacements[$key]
            $fileReplacements += $count
        }
    }
    
    if ($fileReplacements -gt 0) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "✅ $($file.Name): $fileReplacements corrections" -ForegroundColor Green
        $totalFiles++
        $totalReplacements += $fileReplacements
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Fichiers corrigés: $totalFiles" -ForegroundColor Yellow
Write-Host "Total corrections: $totalReplacements" -ForegroundColor Yellow
Write-Host ""
Write-Host "✨ Encodage UTF-8 corrigé avec succès!" -ForegroundColor Green
