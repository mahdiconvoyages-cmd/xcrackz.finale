# ============================================
# DIAGNOSTIC COMPLET - FINALITY (Mobile + Web)
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " DIAGNOSTIC COMPLET FINALITY" -ForegroundColor Cyan
Write-Host " Mobile + Web" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$script:totalTests = 0
$script:passedTests = 0
$script:failedTests = 0
$script:warnings = @()
$script:errors = @()
$script:criticalIssues = @()

function Test-Item-Custom {
    param(
        [string]$Path,
        [string]$Description,
        [bool]$Critical = $false
    )
    
    $script:totalTests++
    $exists = Test-Path $Path
    
    if ($exists) {
        Write-Host "[OK] " -ForegroundColor Green -NoNewline
        Write-Host $Description
        $script:passedTests++
        return $true
    } else {
        Write-Host "[FAIL] " -ForegroundColor Red -NoNewline
        Write-Host $Description
        $script:failedTests++
        
        if ($Critical) {
            $script:criticalIssues += $Description
        } else {
            $script:errors += $Description
        }
        return $false
    }
}

function Test-Command {
    param(
        [string]$Command,
        [string]$Description,
        [bool]$Critical = $false
    )
    
    $script:totalTests++
    try {
        $null = Get-Command $Command -ErrorAction Stop
        Write-Host "[OK] " -ForegroundColor Green -NoNewline
        Write-Host $Description
        $script:passedTests++
        return $true
    } catch {
        Write-Host "[FAIL] " -ForegroundColor Red -NoNewline
        Write-Host $Description
        $script:failedTests++
        
        if ($Critical) {
            $script:criticalIssues += $Description
        } else {
            $script:errors += $Description
        }
        return $false
    }
}

function Test-PackageJson {
    param(
        [string]$Path,
        [string]$Package,
        [string]$Description
    )
    
    $script:totalTests++
    if (Test-Path $Path) {
        $content = Get-Content $Path -Raw | ConvertFrom-Json
        $hasPackage = $content.dependencies.$Package -or $content.devDependencies.$Package
        
        if ($hasPackage) {
            Write-Host "[OK] " -ForegroundColor Green -NoNewline
            Write-Host $Description
            $script:passedTests++
            return $true
        } else {
            Write-Host "[FAIL] " -ForegroundColor Red -NoNewline
            Write-Host $Description
            $script:failedTests++
            $script:warnings += $Description
            return $false
        }
    } else {
        Write-Host "[FAIL] " -ForegroundColor Red -NoNewline
        Write-Host "$Description (package.json non trouvé)"
        $script:failedTests++
        $script:errors += $Description
        return $false
    }
}

# ============================================
# SECTION 1: ENVIRONNEMENT SYSTÈME
# ============================================
Write-Host "`n[1] ENVIRONNEMENT SYSTEME" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor DarkGray

Test-Command "node" "Node.js installé" -Critical $true
Test-Command "npm" "npm installé" -Critical $true

if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    $script:totalTests++
    if ($versionNumber -ge 18) {
        Write-Host "[OK] " -ForegroundColor Green -NoNewline
        Write-Host "Node.js version >= 18 ($nodeVersion)"
        $script:passedTests++
    } else {
        Write-Host "[FAIL] " -ForegroundColor Red -NoNewline
        Write-Host "Node.js version >= 18 (trouvé: $nodeVersion)"
        $script:failedTests++
        $script:criticalIssues += "Node.js version < 18"
    }
}

# ============================================
# SECTION 2: PROJET WEB
# ============================================
Write-Host "`n[2] PROJET WEB" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor DarkGray

Test-Item-Custom "package.json" "package.json racine" -Critical $true
Test-Item-Custom "node_modules" "node_modules installé"
Test-Item-Custom "src" "Dossier src/" -Critical $true
Test-Item-Custom "src/main.tsx" "Point d'entrée main.tsx" -Critical $true
Test-Item-Custom "src/App.tsx" "Composant App.tsx" -Critical $true
Test-Item-Custom "index.html" "Fichier index.html" -Critical $true
Test-Item-Custom "vite.config.ts" "Configuration Vite"
Test-Item-Custom "tsconfig.json" "Configuration TypeScript"
Test-Item-Custom "tailwind.config.js" "Configuration Tailwind"

# Vérification des dépendances Web
if (Test-Path "package.json") {
    Write-Host "`n  Dépendances critiques Web:" -ForegroundColor DarkCyan
    Test-PackageJson "package.json" "react" "  → React"
    Test-PackageJson "package.json" "react-dom" "  → React DOM"
    Test-PackageJson "package.json" "vite" "  → Vite"
    Test-PackageJson "package.json" "@supabase/supabase-js" "  → Supabase JS"
    Test-PackageJson "package.json" "react-router-dom" "  → React Router"
}

# ============================================
# SECTION 3: STRUCTURE WEB
# ============================================
Write-Host "`n[3] STRUCTURE WEB" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor DarkGray

Test-Item-Custom "src/components" "Dossier components/"
Test-Item-Custom "src/pages" "Dossier pages/"
Test-Item-Custom "src/contexts" "Dossier contexts/"
Test-Item-Custom "src/hooks" "Dossier hooks/"
Test-Item-Custom "src/lib" "Dossier lib/"
Test-Item-Custom "src/services" "Dossier services/"
Test-Item-Custom "src/utils" "Dossier utils/"
Test-Item-Custom "src/styles" "Dossier styles/"

# ============================================
# SECTION 4: PROJET MOBILE
# ============================================
Write-Host "`n[4] PROJET MOBILE" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor DarkGray

Test-Item-Custom "mobile" "Dossier mobile/" -Critical $true
Test-Item-Custom "mobile/package.json" "package.json mobile" -Critical $true
Test-Item-Custom "mobile/node_modules" "node_modules mobile"
Test-Item-Custom "mobile/App.tsx" "App.tsx mobile" -Critical $true
Test-Item-Custom "mobile/app.json" "Configuration app.json"
Test-Item-Custom "mobile/tsconfig.json" "TypeScript config mobile"

# Vérification des dépendances Mobile
if (Test-Path "mobile/package.json") {
    Write-Host "`n  Dépendances critiques Mobile:" -ForegroundColor DarkCyan
    Test-PackageJson "mobile/package.json" "expo" "  → Expo"
    Test-PackageJson "mobile/package.json" "react-native" "  → React Native"
    Test-PackageJson "mobile/package.json" "@react-navigation/native" "  → React Navigation"
    Test-PackageJson "mobile/package.json" "@supabase/supabase-js" "  → Supabase JS"
    Test-PackageJson "mobile/package.json" "@react-native-async-storage/async-storage" "  → AsyncStorage"
}

# ============================================
# SECTION 5: STRUCTURE MOBILE
# ============================================
Write-Host "`n[5] STRUCTURE MOBILE" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor DarkGray

Test-Item-Custom "mobile/src" "Dossier src/"
Test-Item-Custom "mobile/src/components" "Dossier components/"
Test-Item-Custom "mobile/src/screens" "Dossier screens/"
Test-Item-Custom "mobile/src/navigation" "Dossier navigation/"
Test-Item-Custom "mobile/src/contexts" "Dossier contexts/"
Test-Item-Custom "mobile/src/services" "Dossier services/"
Test-Item-Custom "mobile/src/theme" "Dossier theme/"
Test-Item-Custom "mobile/src/hooks" "Dossier hooks/"
Test-Item-Custom "mobile/assets" "Dossier assets/"

# ============================================
# SECTION 6: SYSTÈME DE THÈME MOBILE
# ============================================
Write-Host "`n[6] SYSTEME DE THEME MOBILE" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor DarkGray

Test-Item-Custom "mobile/src/theme/index.ts" "Theme principal" -Critical $true
Test-Item-Custom "mobile/src/contexts/ThemeContext.tsx" "ThemeContext" -Critical $true
Test-Item-Custom "mobile/src/components/TopBar.tsx" "TopBar avec toggle"

# Vérification du contenu du thème
if (Test-Path "mobile/src/theme/index.ts") {
    $themeContent = Get-Content "mobile/src/theme/index.ts" -Raw
    $script:totalTests++
    if ($themeContent -match "lightTheme" -and $themeContent -match "darkTheme") {
        Write-Host "[OK] " -ForegroundColor Green -NoNewline
        Write-Host "lightTheme et darkTheme définis"
        $script:passedTests++
    } else {
        Write-Host "[FAIL] " -ForegroundColor Red -NoNewline
        Write-Host "lightTheme ou darkTheme manquant"
        $script:failedTests++
        $script:errors += "Thèmes light/dark incomplets"
    }
}

# Vérification ThemeProvider dans App.tsx
if (Test-Path "mobile/App.tsx") {
    $appContent = Get-Content "mobile/App.tsx" -Raw
    $script:totalTests++
    if ($appContent -match "ThemeProvider") {
        Write-Host "[OK] " -ForegroundColor Green -NoNewline
        Write-Host "ThemeProvider intégré dans App.tsx"
        $script:passedTests++
    } else {
        Write-Host "[FAIL] " -ForegroundColor Red -NoNewline
        Write-Host "ThemeProvider non intégré"
        $script:failedTests++
        $script:warnings += "ThemeProvider non utilisé dans App.tsx"
    }
}

# ============================================
# SECTION 7: CONFIGURATION
# ============================================
Write-Host "`n[7] CONFIGURATION" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor DarkGray

Test-Item-Custom ".env" "Fichier .env racine"
Test-Item-Custom "mobile/.env" "Fichier .env mobile"

# Vérification des variables d'environnement Web
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    $script:totalTests++
    if ($envContent -match "VITE_SUPABASE_URL") {
        Write-Host "[OK] " -ForegroundColor Green -NoNewline
        Write-Host "VITE_SUPABASE_URL défini"
        $script:passedTests++
    } else {
        Write-Host "[FAIL] " -ForegroundColor Red -NoNewline
        Write-Host "VITE_SUPABASE_URL manquant"
        $script:failedTests++
        $script:criticalIssues += "VITE_SUPABASE_URL manquant (Web)"
    }
    
    $script:totalTests++
    if ($envContent -match "VITE_SUPABASE_ANON_KEY") {
        Write-Host "[OK] " -ForegroundColor Green -NoNewline
        Write-Host "VITE_SUPABASE_ANON_KEY défini"
        $script:passedTests++
    } else {
        Write-Host "[FAIL] " -ForegroundColor Red -NoNewline
        Write-Host "VITE_SUPABASE_ANON_KEY manquant"
        $script:failedTests++
        $script:criticalIssues += "VITE_SUPABASE_ANON_KEY manquant (Web)"
    }
}

# Vérification des variables d'environnement Mobile
if (Test-Path "mobile/.env") {
    $mobileEnvContent = Get-Content "mobile/.env" -Raw
    $script:totalTests++
    if ($mobileEnvContent -match "EXPO_PUBLIC_SUPABASE_URL") {
        Write-Host "[OK] " -ForegroundColor Green -NoNewline
        Write-Host "EXPO_PUBLIC_SUPABASE_URL défini"
        $script:passedTests++
    } else {
        Write-Host "[FAIL] " -ForegroundColor Red -NoNewline
        Write-Host "EXPO_PUBLIC_SUPABASE_URL manquant"
        $script:failedTests++
        $script:criticalIssues += "EXPO_PUBLIC_SUPABASE_URL manquant (Mobile)"
    }
    
    $script:totalTests++
    if ($mobileEnvContent -match "EXPO_PUBLIC_SUPABASE_ANON_KEY") {
        Write-Host "[OK] " -ForegroundColor Green -NoNewline
        Write-Host "EXPO_PUBLIC_SUPABASE_ANON_KEY défini"
        $script:passedTests++
    } else {
        Write-Host "[FAIL] " -ForegroundColor Red -NoNewline
        Write-Host "EXPO_PUBLIC_SUPABASE_ANON_KEY manquant"
        $script:failedTests++
        $script:criticalIssues += "EXPO_PUBLIC_SUPABASE_ANON_KEY manquant (Mobile)"
    }
}

# ============================================
# SECTION 8: SUPABASE
# ============================================
Write-Host "`n[8] SUPABASE" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor DarkGray

Test-Item-Custom "supabase" "Dossier supabase/"
Test-Item-Custom "supabase/migrations" "Dossier migrations/"
Test-Item-Custom "supabase/functions" "Dossier functions/"

# Compter les migrations
if (Test-Path "supabase/migrations") {
    $migrations = Get-ChildItem "supabase/migrations" -Filter "*.sql"
    $script:totalTests++
    if ($migrations.Count -gt 0) {
        Write-Host "[OK] " -ForegroundColor Green -NoNewline
        Write-Host "Migrations trouvées ($($migrations.Count) fichiers)"
        $script:passedTests++
    } else {
        Write-Host "[WARN] " -ForegroundColor Yellow -NoNewline
        Write-Host "Aucune migration trouvée"
        $script:warnings += "Aucune migration Supabase"
    }
}

# ============================================
# SECTION 9: ÉCRANS MOBILE
# ============================================
Write-Host "`n[9] ECRANS MOBILE" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor DarkGray

Test-Item-Custom "mobile/src/screens/DashboardScreen.tsx" "Dashboard Screen"
Test-Item-Custom "mobile/src/screens/MissionsScreen.tsx" "Missions Screen"
Test-Item-Custom "mobile/src/screens/InspectionScreen.tsx" "Inspection Screen"
Test-Item-Custom "mobile/src/screens/CreateMissionWizard.tsx" "Create Mission Wizard"
Test-Item-Custom "mobile/src/screens/GPSTrackingScreen.tsx" "GPS Tracking Screen"

# ============================================
# SECTION 10: PAGES WEB
# ============================================
Write-Host "`n[10] PAGES WEB" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor DarkGray

if (Test-Path "src/pages") {
    $pages = Get-ChildItem "src/pages" -Filter "*.tsx" -Recurse
    $script:totalTests++
    if ($pages.Count -gt 0) {
        Write-Host "[OK] " -ForegroundColor Green -NoNewline
        Write-Host "Pages trouvées ($($pages.Count) fichiers)"
        $script:passedTests++
        
        # Liste des pages importantes
        $importantPages = @("Dashboard", "Login", "Missions", "Inspection")
        foreach ($pageName in $importantPages) {
            $found = $pages | Where-Object { $_.Name -match $pageName }
            if ($found) {
                Write-Host "  → " -NoNewline -ForegroundColor DarkGray
                Write-Host "$pageName found" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "[WARN] " -ForegroundColor Yellow -NoNewline
        Write-Host "Aucune page trouvée"
        $script:warnings += "Aucune page Web trouvée"
    }
}

# ============================================
# RÉSUMÉ FINAL
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " RESUME DU DIAGNOSTIC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nStatistiques:" -ForegroundColor White
Write-Host "  Total tests      : $script:totalTests" -ForegroundColor Gray
Write-Host "  Reussis          : " -NoNewline -ForegroundColor Gray
Write-Host "$script:passedTests" -ForegroundColor Green
Write-Host "  Echoues          : " -NoNewline -ForegroundColor Gray
Write-Host "$script:failedTests" -ForegroundColor Red
$percentage = [math]::Round(($script:passedTests / $script:totalTests) * 100, 2)
Write-Host "  Taux de reussite : " -NoNewline -ForegroundColor Gray

if ($percentage -ge 90) {
    Write-Host "$percentage%" -ForegroundColor Green
} elseif ($percentage -ge 70) {
    Write-Host "$percentage%" -ForegroundColor Yellow
} else {
    Write-Host "$percentage%" -ForegroundColor Red
}

# Problèmes critiques
if ($script:criticalIssues.Count -gt 0) {
    Write-Host "`nPROBLEMES CRITIQUES:" -ForegroundColor Red
    foreach ($issue in $script:criticalIssues) {
        Write-Host "  [!] $issue" -ForegroundColor Red
    }
}

# Erreurs
if ($script:errors.Count -gt 0) {
    Write-Host "`nERREURS:" -ForegroundColor Red
    foreach ($error in $script:errors) {
        Write-Host "  [-] $error" -ForegroundColor Red
    }
}

# Avertissements
if ($script:warnings.Count -gt 0) {
    Write-Host "`nAVERTISSEMENTS:" -ForegroundColor Yellow
    foreach ($warning in $script:warnings) {
        Write-Host "  [~] $warning" -ForegroundColor Yellow
    }
}

# Statut final
Write-Host "`n========================================" -ForegroundColor Cyan
if ($script:criticalIssues.Count -eq 0 -and $percentage -ge 80) {
    Write-Host " STATUT: OPERATIONNEL" -ForegroundColor Green
    Write-Host " Les deux projets sont prets!" -ForegroundColor Green
} elseif ($script:criticalIssues.Count -gt 0) {
    Write-Host " STATUT: PROBLEMES CRITIQUES" -ForegroundColor Red
    Write-Host " Action requise avant lancement" -ForegroundColor Red
} else {
    Write-Host " STATUT: ATTENTION REQUISE" -ForegroundColor Yellow
    Write-Host " Quelques corrections necessaires" -ForegroundColor Yellow
}
Write-Host "========================================`n" -ForegroundColor Cyan
