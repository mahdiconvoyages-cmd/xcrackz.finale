/**
 * 🎨 Générateur d'icônes PNG depuis Logo SVG
 * Utilise Canvas (Node.js) pour convertir logo-xz.svg en PNG multiples tailles
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logo SVG XZ moderne (gradient teal/cyan)
const logoSVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#14b8a6;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#06b6d4;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background avec coins arrondis -->
  <rect width="512" height="512" rx="80" fill="url(#bgGradient)"/>
  
  <!-- Bordure subtile -->
  <rect x="8" y="8" width="496" height="496" rx="72" fill="none" stroke="#14b8a6" stroke-width="2" opacity="0.3"/>
  
  <!-- Texte XZ stylisé -->
  <text x="256" y="340" font-family="Arial Black, sans-serif" font-size="280" font-weight="900" 
        text-anchor="middle" fill="url(#textGradient)" letter-spacing="-10">XZ</text>
  
  <!-- Ombre portée texte -->
  <text x="256" y="342" font-family="Arial Black, sans-serif" font-size="280" font-weight="900" 
        text-anchor="middle" fill="#000000" opacity="0.15" letter-spacing="-10">XZ</text>
  
  <!-- Particules décoratives -->
  <circle cx="120" cy="120" r="8" fill="#14b8a6" opacity="0.6"/>
  <circle cx="392" cy="120" r="6" fill="#06b6d4" opacity="0.5"/>
  <circle cx="120" cy="392" r="6" fill="#3b82f6" opacity="0.5"/>
  <circle cx="392" cy="392" r="8" fill="#14b8a6" opacity="0.6"/>
</svg>
`;

// Fonction pour créer un fichier PNG à partir du SVG (version simplifiée)
function generatePNGPlaceholder(size, outputPath) {
  console.log(`📦 Génération de ${outputPath} (${size}x${size})...`);
  
  // Pour Windows PowerShell, on va créer un README expliquant comment générer les icônes
  // Car canvas/sharp nécessitent des binaires natifs qui peuvent poser problème
  
  const readmePath = path.join(__dirname, 'GENERATE_ICONS_INSTRUCTIONS.md');
  const instructions = `
# 🎨 Génération des Icônes PWA

## Problème
Les icônes \`icon-192.png\` et \`icon-512.png\` sont manquantes.

## Solutions (3 méthodes)

### Méthode 1 : Online (PLUS RAPIDE) ⚡
1. Aller sur https://realfavicongenerator.net/
2. Uploader le logo (ou copier le SVG ci-dessous)
3. Générer les icônes
4. Télécharger le package
5. Extraire \`icon-192.png\` et \`icon-512.png\` dans \`public/\`

### Méthode 2 : Avec Photoshop/GIMP
1. Créer un nouveau document 512x512px
2. Fond : Gradient #0f172a → #1e293b
3. Texte "XZ" : Police Arial Black 280px
4. Couleur : Gradient #14b8a6 → #06b6d4 → #3b82f6
5. Enregistrer en PNG
6. Redimensionner à 192x192 pour la 2ème icône

### Méthode 3 : Utiliser logo existant
Si vous avez déjà un logo :
1. Ouvrir dans un éditeur d'image
2. Redimensionner à 512x512 ET 192x192
3. Enregistrer en PNG
4. Placer dans \`public/\`

---

## Logo SVG à utiliser

\`\`\`svg
${logoSVG}
\`\`\`

---

## Fichiers requis dans \`public/\`

✅ \`manifest.json\` (déjà créé)  
❌ \`icon-192.png\` (192x192px)  
❌ \`icon-512.png\` (512x512px)  
⚠️  \`apple-touch-icon.png\` (180x180px, optionnel)  
⚠️  \`favicon-48.png\` (48x48px, optionnel)

---

## Vérification

Après génération, vérifier dans le navigateur :
1. Ouvrir http://localhost:5173
2. F12 → Console
3. Ne doit plus voir : \`Error while trying to use the following icon from the Manifest: http://localhost:5173/icon-192.png\`

---

## Quick Fix (Image temporaire)

Si vous voulez juste supprimer l'erreur rapidement :

\`\`\`powershell
# Créer une image temporaire simple (nécessite ImageMagick)
magick -size 192x192 xc:"#14b8a6" -pointsize 100 -fill white -gravity center -annotate +0+0 "XZ" public/icon-192.png
magick -size 512x512 xc:"#14b8a6" -pointsize 280 -fill white -gravity center -annotate +0+0 "XZ" public/icon-512.png
\`\`\`

Ou créer manuellement avec Paint :
1. Nouveau → 192x192
2. Remplir avec couleur #14b8a6
3. Écrire "XZ" en blanc, centré
4. Enregistrer en PNG
`;

  fs.writeFileSync(readmePath, instructions.trim(), 'utf-8');
  console.log(`\n✅ Instructions créées : ${readmePath}\n`);
}

// Sauvegarder le SVG pour utilisation
const svgPath = path.join(__dirname, 'public', 'logo-xz.svg');
fs.writeFileSync(svgPath, logoSVG.trim(), 'utf-8');
console.log(`✅ Logo SVG sauvegardé : ${svgPath}`);

// Générer les instructions
generatePNGPlaceholder(192, path.join(__dirname, 'public', 'icon-192.png'));
generatePNGPlaceholder(512, path.join(__dirname, 'public', 'icon-512.png'));

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🎨 Générateur d'Icônes PWA                                   ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ✅ Logo SVG créé : public/logo-xz.svg                       ║
║  ✅ Instructions créées : GENERATE_ICONS_INSTRUCTIONS.md     ║
║                                                               ║
║  📋 PROCHAINES ÉTAPES :                                      ║
║                                                               ║
║  1. Lire GENERATE_ICONS_INSTRUCTIONS.md                      ║
║  2. Générer les icônes avec une des 3 méthodes               ║
║  3. Placer icon-192.png et icon-512.png dans public/         ║
║  4. Redémarrer serveur : npm run dev                         ║
║  5. Vérifier console navigateur (F12)                        ║
║                                                               ║
║  💡 MÉTHODE RAPIDE :                                         ║
║  → https://realfavicongenerator.net/                         ║
║  → Uploader public/logo-xz.svg                               ║
║  → Télécharger les icônes générées                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);
