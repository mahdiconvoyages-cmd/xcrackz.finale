param(
  [string]$ProjectRef,
  [string]$ServiceRoleKey
)

Write-Host "\n== Supabase PDF settings configurator ==\n"

# Ensure Supabase CLI exists
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Host "Supabase CLI non trouvé. Installation..." -ForegroundColor Yellow
  try {
    iwr https://supabase.com/cli/install/windows -UseBasicParsing | iex
  } catch {
    Write-Error "Impossible d'installer la CLI automatiquement. Installe-la puis relance ce script."
    exit 1
  }
}

# Prompt for ProjectRef if missing
if (-not $ProjectRef -or $ProjectRef -eq "") {
  $ProjectRef = Read-Host "Entre ton project-ref (ex: bfrkthzovwpjrvqktdjn)"
}

# Sanitize: allow full URL input and extract subdomain
if ($ProjectRef -match '^https?://([a-z0-9-]+)\.supabase\.co') {
  $ProjectRef = $Matches[1]
}

# Prompt for ServiceRoleKey if missing
if (-not $ServiceRoleKey -or $ServiceRoleKey -eq "") {
  $sec = Read-Host -AsSecureString "Colle la Service Role Key (restera locale)"
  # Convert SecureString to plain text safely in memory
  $ServiceRoleKey = (New-Object System.Net.NetworkCredential('', $sec)).Password
}

$FunctionURL = "https://$ProjectRef.supabase.co/functions/v1"
Write-Host "\nProject Ref: $ProjectRef"
Write-Host "Function URL: $FunctionURL"

# Login if needed
Write-Host "\nConnexion à Supabase (une fenêtre peut s'ouvrir)..." -ForegroundColor Cyan
supabase login
if ($LASTEXITCODE -ne 0) { Write-Error "Echec login Supabase"; exit 1 }

# Link project
Write-Host "Association du dossier au projet..." -ForegroundColor Cyan
supabase link --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { Write-Error "Echec link projet"; exit 1 }

# Create a migration file with the settings
$timestamp = (Get-Date).ToString("yyyyMMddHHmmss")
$migFile = "supabase/migrations/${timestamp}_set_pdf_settings.sql"
$sql = @"
-- Set Supabase Edge Function URL and Service Role Key for PDF generation
ALTER DATABASE postgres SET app.supabase_function_url = '$FunctionURL';
ALTER DATABASE postgres SET app.supabase_service_role_key = '$ServiceRoleKey';

-- Verify
SELECT current_setting('app.supabase_function_url', true) as function_url;
SELECT CASE WHEN current_setting('app.supabase_service_role_key', true) <> '' THEN 'OK' ELSE 'NULL' END as service_key_status;
"@

New-Item -ItemType File -Path $migFile -Force | Out-Null
Set-Content -Path $migFile -Value $sql -Encoding UTF8
Write-Host "Migration créée: $migFile" -ForegroundColor Green

# Apply migration remotely
Write-Host "Application de la migration sur la base distante..." -ForegroundColor Cyan
supabase db remote commit
if ($LASTEXITCODE -ne 0) { Write-Error "Echec de l'application des migrations"; exit 1 }

Write-Host "\n✅ Paramètres configurés. Tu peux relancer SETUP_TRIGGERS_PDF_AUTO.sql (section vérification) pour confirmer." -ForegroundColor Green
