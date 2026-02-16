Add-Type -AssemblyName System.Drawing

function Create-Logo {
    # Logo principal 512x512 avec fond blanc
    $size = 512
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    # Fond blanc
    $graphics.Clear([System.Drawing.Color]::White)
    
    # Couleur bleue
    $blue = [System.Drawing.Color]::FromArgb(255, 0, 102, 255)
    $blueBrush = New-Object System.Drawing.SolidBrush($blue)
    
    # Centre
    $center = $size / 2
    
    # Dessiner le X avec des rectangles tournés
    $graphics.TranslateTransform($center, $center)
    
    # Première barre (45°)
    $graphics.RotateTransform(45)
    $graphics.FillRectangle($blueBrush, -35, -135, 70, 270)
    $graphics.ResetTransform()
    
    # Deuxième barre (-45°)
    $graphics.TranslateTransform($center, $center)
    $graphics.RotateTransform(-45)
    $graphics.FillRectangle($blueBrush, -35, -135, 70, 270)
    $graphics.ResetTransform()
    
    # Point central
    $blueTransparent = [System.Drawing.Color]::FromArgb(80, 0, 102, 255)
    $transparentBrush = New-Object System.Drawing.SolidBrush($blueTransparent)
    $graphics.FillEllipse($transparentBrush, $center - 30, $center - 30, 60, 60)
    
    # Sauvegarder
    $bitmap.Save("$PSScriptRoot\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Host "✓ logo.png créé" -ForegroundColor Green
}

function Create-Foreground {
    # Foreground 512x512 transparent avec marges 20%
    $size = 512
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    # Fond transparent
    $graphics.Clear([System.Drawing.Color]::Transparent)
    
    # Couleur bleue
    $blue = [System.Drawing.Color]::FromArgb(255, 0, 102, 255)
    $blueBrush = New-Object System.Drawing.SolidBrush($blue)
    
    # Centre
    $center = $size / 2
    
    # Dessiner le X réduit (20% de marges)
    $graphics.TranslateTransform($center, $center)
    
    # Première barre (45°) - réduite
    $graphics.RotateTransform(45)
    $graphics.FillRectangle($blueBrush, -30, -110, 60, 220)
    $graphics.ResetTransform()
    
    # Deuxième barre (-45°) - réduite
    $graphics.TranslateTransform($center, $center)
    $graphics.RotateTransform(-45)
    $graphics.FillRectangle($blueBrush, -30, -110, 60, 220)
    $graphics.ResetTransform()
    
    # Point central
    $blueTransparent = [System.Drawing.Color]::FromArgb(80, 0, 102, 255)
    $transparentBrush = New-Object System.Drawing.SolidBrush($blueTransparent)
    $graphics.FillEllipse($transparentBrush, $center - 25, $center - 25, 50, 50)
    
    # Sauvegarder
    $bitmap.Save("$PSScriptRoot\logo_foreground.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Host "✓ logo_foreground.png créé" -ForegroundColor Green
}

Write-Host "Génération des logos..." -ForegroundColor Cyan
Create-Logo
Create-Foreground
Write-Host "`n✅ Les deux fichiers ont été créés avec succès!" -ForegroundColor Green
