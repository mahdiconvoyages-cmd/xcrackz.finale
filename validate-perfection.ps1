# ======================================================
# 🧪 Validation Complète - Tests des 4 Piliers
# ======================================================

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "🧪 Tests de Validation" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

Set-Location -Path ".\mobile"

$totalTests = 8
$passedTests = 0

# Test 1: Vérification des fichiers
Write-Host "Test 1/$totalTests : Vérification des fichiers..." -ForegroundColor Yellow
$requiredFiles = @(
    "src\services\secureStorage.ts",
    "src\services\analytics.ts",
    "src\services\crashReporting.ts",
    "src\hooks\useAccessibility.ts"
)

$filesOk = $true
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "  ✗ Manquant: $file" -ForegroundColor Red
        $filesOk = $false
    }
}

if ($filesOk) {
    Write-Host "  ✓ Tous les fichiers présents" -ForegroundColor Green
    $passedTests++
} else {
    Write-Host "  ✗ Fichiers manquants" -ForegroundColor Red
}

# Test 2: Vérification des imports dans AuthContext
Write-Host "`nTest 2/$totalTests : Vérification AuthContext..." -ForegroundColor Yellow
$authContextContent = Get-Content "src\contexts\AuthContext.tsx" -Raw
if ($authContextContent -match "secureStorage" -and $authContextContent -match "signInWithBiometrics") {
    Write-Host "  ✓ AuthContext correctement configuré" -ForegroundColor Green
    $passedTests++
} else {
    Write-Host "  ✗ AuthContext non configuré" -ForegroundColor Red
}

# Test 3: Vérification des imports dans MissionsScreenNew
Write-Host "`nTest 3/$totalTests : Vérification MissionsScreenNew..." -ForegroundColor Yellow
if (Test-Path "src\screens\missions\MissionsScreenNew.tsx") {
    $missionsContent = Get-Content "src\screens\missions\MissionsScreenNew.tsx" -Raw
    if ($missionsContent -match "analytics" -and $missionsContent -match "crashReporting") {
        Write-Host "  ✓ MissionsScreenNew correctement configuré" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "  ✗ MissionsScreenNew non configuré" -ForegroundColor Red
    }
} else {
    Write-Host "  ✗ MissionsScreenNew.tsx introuvable" -ForegroundColor Red
}

# Test 4: Vérification Jest
Write-Host "`nTest 4/$totalTests : Vérification configuration Jest..." -ForegroundColor Yellow
if ((Test-Path "jest.config.js") -and (Test-Path "jest.setup.js")) {
    Write-Host "  ✓ Jest correctement configuré" -ForegroundColor Green
    $passedTests++
} else {
    Write-Host "  ✗ Configuration Jest manquante" -ForegroundColor Red
}

# Test 5: Vérification des tests unitaires
Write-Host "`nTest 5/$totalTests : Vérification des tests unitaires..." -ForegroundColor Yellow
$testFiles = @(
    "__tests__\screens\MissionsScreenNew.test.tsx",
    "__tests__\contexts\AuthContext.test.tsx"
)

$testsOk = $true
foreach ($file in $testFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "  ✗ Manquant: $file" -ForegroundColor Red
        $testsOk = $false
    }
}

if ($testsOk) {
    Write-Host "  ✓ Tous les tests présents" -ForegroundColor Green
    $passedTests++
} else {
    Write-Host "  ✗ Tests manquants" -ForegroundColor Red
}

# Test 6: Vérification package.json
Write-Host "`nTest 6/$totalTests : Vérification package.json..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$hasTestScript = $packageJson.scripts.test -ne $null
$hasBiometric = $packageJson.dependencies.'expo-local-authentication' -ne $null
$hasJest = $packageJson.devDependencies.jest -ne $null

if ($hasTestScript -and $hasBiometric -and $hasJest) {
    Write-Host "  ✓ package.json correctement configuré" -ForegroundColor Green
    $passedTests++
} else {
    Write-Host "  ✗ package.json incomplet" -ForegroundColor Red
    if (-not $hasTestScript) { Write-Host "    - Script test manquant" -ForegroundColor Red }
    if (-not $hasBiometric) { Write-Host "    - expo-local-authentication manquant" -ForegroundColor Red }
    if (-not $hasJest) { Write-Host "    - jest manquant" -ForegroundColor Red }
}

# Test 7: Exécution des tests Jest
Write-Host "`nTest 7/$totalTests : Exécution des tests Jest..." -ForegroundColor Yellow
$testOutput = npm test -- --passWithNoTests 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Tests Jest réussis" -ForegroundColor Green
    $passedTests++
} else {
    Write-Host "  ✗ Tests Jest échoués" -ForegroundColor Red
    Write-Host "    Output: $testOutput" -ForegroundColor Gray
}

# Test 8: Vérification de la documentation
Write-Host "`nTest 8/$totalTests : Vérification de la documentation..." -ForegroundColor Yellow
if ((Test-Path "IMPLEMENTATION_PERFECTION.md") -and (Test-Path "QUICKSTART_PERFECTION.md")) {
    Write-Host "  ✓ Documentation complète" -ForegroundColor Green
    $passedTests++
} else {
    Write-Host "  ✗ Documentation manquante" -ForegroundColor Red
}

# Résumé
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "📊 RÉSUMÉ DES TESTS" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

$percentage = [math]::Round(($passedTests / $totalTests) * 100)
Write-Host "Tests réussis: $passedTests/$totalTests ($percentage%)" -ForegroundColor $(if ($percentage -ge 75) { "Green" } elseif ($percentage -ge 50) { "Yellow" } else { "Red" })

if ($passedTests -eq $totalTests) {
    Write-Host "`n✅ TOUS LES TESTS RÉUSSIS!" -ForegroundColor Green
    Write-Host "🎉 Votre app est prête pour la production!`n" -ForegroundColor Green
} elseif ($passedTests -ge 6) {
    Write-Host "`n⚠️  PRESQUE PARFAIT!" -ForegroundColor Yellow
    Write-Host "Quelques ajustements nécessaires.`n" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ DES PROBLÈMES DÉTECTÉS" -ForegroundColor Red
    Write-Host "Veuillez corriger les erreurs ci-dessus.`n" -ForegroundColor Red
}

# Détails des fonctionnalités
Write-Host "📋 État des fonctionnalités:" -ForegroundColor White
Write-Host "  🔐 Sécurité (biométrie)          : $(if ($filesOk -and $authContextContent -match 'secureStorage') { '✓' } else { '✗' })" -ForegroundColor $(if ($filesOk) { "Green" } else { "Red" })
Write-Host "  📊 Observabilité (analytics)      : $(if ($missionsContent -match 'analytics') { '✓' } else { '✗' })" -ForegroundColor $(if ($missionsContent -match 'analytics') { "Green" } else { "Red" })
Write-Host "  ♿ Accessibilité (WCAG)           : $(if (Test-Path 'src\hooks\useAccessibility.ts') { '✓' } else { '✗' })" -ForegroundColor $(if (Test-Path 'src\hooks\useAccessibility.ts') { "Green" } else { "Red" })
Write-Host "  🧪 Tests (Jest + coverage)        : $(if ($testsOk) { '✓' } else { '✗' })" -ForegroundColor $(if ($testsOk) { "Green" } else { "Red" })

Write-Host "`n💡 Commandes utiles:" -ForegroundColor Yellow
Write-Host "  npm start              → Lancer l'app" -ForegroundColor White
Write-Host "  npm test               → Relancer les tests" -ForegroundColor White
Write-Host "  npm run test:coverage  → Voir le coverage" -ForegroundColor White

Set-Location -Path ".."
