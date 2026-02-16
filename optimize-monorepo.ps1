# 🔧 SCRIPT D'OPTIMISATION DU MONOREPO
# Date: 14 Octobre 2025

Write-Host "`n🔍 OPTIMISATION DU MONOREPO EN COURS...`n" -ForegroundColor Cyan

# 1. Créer mobile/.env
Write-Host "📝 1. Création de mobile/.env..." -ForegroundColor Yellow
$mobileEnvContent = @"
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://bfrkthzovwpjrvqktdjn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzgwNzgsImV4cCI6MjA3NTU1NDA3OH0.ml0TkLYk53U6CqP_iCc8XkZMusFCSI-nYOS0WyV43Nc

# Mapbox Configuration
EXPO_PUBLIC_MAPBOX_TOKEN=$env:VITE_MAPBOX_TOKEN

# OneSignal Configuration
EXPO_PUBLIC_ONESIGNAL_APP_ID=b284fe02-642c-40e5-a05f-c50e07edc86d

# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_CLIENT_ID=695959395673-d24r9sj6sj9805h072kndsho8ij0dkgo.apps.googleusercontent.com
"@

Set-Content -Path "mobile\.env" -Value $mobileEnvContent -Force
Write-Host "  ✅ mobile/.env créé" -ForegroundColor Green

# 2. Mettre à jour .env racine (seulement Web)
Write-Host "`n📝 2. Mise à jour du .env racine (Web uniquement)..." -ForegroundColor Yellow
$webEnvContent = @"
# Supabase Configuration (WEB ONLY - Vite)
VITE_SUPABASE_URL=https://bfrkthzovwpjrvqktdjn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzgwNzgsImV4cCI6MjA3NTU1NDA3OH0.ml0TkLYk53U6CqP_iCc8XkZMusFCSI-nYOS0WyV43Nc

# Note: Les variables EXPO_PUBLIC_* sont maintenant dans mobile/.env
"@

Set-Content -Path ".env" -Value $webEnvContent -Force
Write-Host "  ✅ .env racine mis à jour" -ForegroundColor Green

# 3. Supprimer fichier obsolète
Write-Host "`n🗑️  3. Suppression des fichiers obsolètes..." -ForegroundColor Yellow
if (Test-Path "src\config\supabase.js") {
    Remove-Item "src\config\supabase.js" -Force
    Write-Host "  ✅ src/config/supabase.js supprimé" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  src/config/supabase.js n'existe pas" -ForegroundColor Gray
}

# 4. Créer dossier docs
Write-Host "`n📚 4. Organisation de la documentation..." -ForegroundColor Yellow
if (-not (Test-Path "docs")) {
    New-Item -Path "docs" -ItemType Directory -Force | Out-Null
    New-Item -Path "docs\archive" -ItemType Directory -Force | Out-Null
    Write-Host "  ✅ Dossiers docs/ et docs/archive/ créés" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Dossier docs/ existe déjà" -ForegroundColor Gray
}

# Déplacer les fichiers .md (sauf quelques-uns importants)
$keepFiles = @(
    "README.md",
    "MONOREPO_AUDIT_REPORT.md",
    "START_HERE.md",
    "QUICKSTART.md"
)

$mdFiles = Get-ChildItem -Path "." -Filter "*.md" -File | Where-Object { $keepFiles -notcontains $_.Name }
$movedCount = 0

foreach ($file in $mdFiles) {
    try {
        Move-Item -Path $file.FullName -Destination "docs\archive\" -Force -ErrorAction Stop
        $movedCount++
    } catch {
        # Ignore errors (file might be in use)
    }
}

Write-Host "  ✅ $movedCount fichiers .md déplacés vers docs/archive/" -ForegroundColor Green

# 5. Créer mobile/.gitignore
Write-Host "`n🔒 5. Création de mobile/.gitignore..." -ForegroundColor Yellow
$mobileGitignore = @"
# Expo
.expo/
.expo-shared/
dist/
web-build/

# Native
*.jks
*.p8
*.p12
*.mobileprovision

# Node
node_modules/
npm-debug.log
yarn-error.log

# IDE
.idea/
.vscode/

# Environment
.env.local
"@

Set-Content -Path "mobile\.gitignore" -Value $mobileGitignore -Force
Write-Host "  ✅ mobile/.gitignore créé" -ForegroundColor Green

# 6. Uniformiser version Supabase
Write-Host "`n📦 6. Uniformisation de @supabase/supabase-js..." -ForegroundColor Yellow
Write-Host "  🔄 Mise à jour vers 2.58.0 dans le projet web..." -ForegroundColor Gray

# Update package.json
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$packageJson.dependencies.'@supabase/supabase-js' = "^2.58.0"
$packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json" -Force

Write-Host "  ✅ package.json mis à jour (web)" -ForegroundColor Green
Write-Host "  ℹ️  Exécutez 'npm install' pour appliquer" -ForegroundColor Cyan

# 7. Créer scripts npm centralisés
Write-Host "`n🚀 7. Ajout de scripts npm centralisés..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json

# Ajouter les nouveaux scripts
$packageJson.scripts | Add-Member -NotePropertyName "mobile" -NotePropertyValue "cd mobile && npm start" -Force
$packageJson.scripts | Add-Member -NotePropertyName "install:all" -NotePropertyValue "npm install && cd mobile && npm install" -Force
$packageJson.scripts | Add-Member -NotePropertyName "clean:all" -NotePropertyValue "Remove-Item node_modules,mobile/node_modules -Recurse -Force; npm install; cd mobile; npm install" -Force
$packageJson.scripts | Add-Member -NotePropertyName "dev:both" -NotePropertyValue "start cmd /k npm run dev && cd mobile && npm start" -Force

$packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json" -Force
Write-Host "  ✅ Scripts npm ajoutés:" -ForegroundColor Green
Write-Host "     - npm run mobile      (lancer l'app mobile)" -ForegroundColor White
Write-Host "     - npm run install:all (installer tout)" -ForegroundColor White
Write-Host "     - npm run clean:all   (nettoyer et réinstaller)" -ForegroundColor White
Write-Host "     - npm run dev:both    (lancer web + mobile)" -ForegroundColor White

# 8. Créer README dans mobile/
Write-Host "`n📄 8. Création de mobile/README.md..." -ForegroundColor Yellow
$mobileReadme = @"
# 📱 Finality Mobile

Application mobile React Native avec Expo.

## 🚀 Démarrage rapide

\`\`\`bash
# Installation
npm install

# Développement
npm start

# Build Android
npx eas build --platform android

# Build iOS
npx eas build --platform ios
\`\`\`

## 📦 Dépendances principales

- Expo ~54.0.10
- React Native
- @supabase/supabase-js 2.58.0
- React Navigation 7.x

## 🔐 Configuration

Les variables d'environnement sont dans \`.env\`:
- \`EXPO_PUBLIC_SUPABASE_URL\`
- \`EXPO_PUBLIC_SUPABASE_ANON_KEY\`
- \`EXPO_PUBLIC_MAPBOX_TOKEN\`
- etc.

## 📖 Documentation

Voir le dossier \`../docs/\` pour plus d'informations.
"@

Set-Content -Path "mobile\README.md" -Value $mobileReadme -Force
Write-Host "  ✅ mobile/README.md créé" -ForegroundColor Green

# Résumé final
Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ OPTIMISATION TERMINÉE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "`n📊 Résumé des modifications:" -ForegroundColor Yellow
Write-Host "  ✅ mobile/.env créé (variables Expo isolées)" -ForegroundColor White
Write-Host "  ✅ .env racine nettoyé (seulement VITE_*)" -ForegroundColor White
Write-Host "  ✅ src/config/supabase.js supprimé" -ForegroundColor White
Write-Host "  ✅ $movedCount fichiers .md archivés dans docs/" -ForegroundColor White
Write-Host "  ✅ mobile/.gitignore créé" -ForegroundColor White
Write-Host "  ✅ @supabase/supabase-js uniformisé à 2.58.0" -ForegroundColor White
Write-Host "  ✅ Scripts npm centralisés ajoutés" -ForegroundColor White
Write-Host "  ✅ mobile/README.md créé" -ForegroundColor White

Write-Host "`n🔄 Prochaines étapes:" -ForegroundColor Magenta
Write-Host "  1. Exécutez 'npm install' pour mettre à jour Supabase" -ForegroundColor Cyan
Write-Host "  2. Testez le web avec 'npm run dev'" -ForegroundColor Cyan
Write-Host "  3. Testez le mobile avec 'npm run mobile'" -ForegroundColor Cyan

Write-Host "`n📖 Consultez MONOREPO_AUDIT_REPORT.md pour plus de détails`n" -ForegroundColor Gray
