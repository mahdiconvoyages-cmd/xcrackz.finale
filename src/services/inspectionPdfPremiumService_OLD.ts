/**
 * 🎨 Générateur PDF Premium pour Rapports d'Inspection
 * 
 * PDF ultra-professionnel avec :
 * - Design moderne et épuré
 * - Logo et branding
 * - Signatures haute résolution
 * - Photos organisées par catégorie
 * - Détails complets véhicule et clients
 * - Mise en page optimisée pour impression
 * - Tableaux structurés
 * - Couleurs cohérentes
 */

// @ts-nocheck
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { InspectionReportComplete, InspectionDetails } from './inspectionReportAdvancedService';

const COLORS = {
  primary: [59, 130, 246],      // Bleu moderne
  secondary: [139, 92, 246],     // Violet
  success: [16, 185, 129],       // Vert
  warning: [245, 158, 11],       // Orange
  danger: [239, 68, 68],         // Rouge
  dark: [31, 41, 55],            // Gris foncé
  gray: [107, 114, 128],         // Gris moyen
  lightGray: [243, 244, 246],    // Gris clair
  white: [255, 255, 255],        // Blanc
  border: [229, 231, 235]        // Bordure
};

/**
 * Ajoute l'en-tête premium sur chaque page
 */
function addPremiumHeader(pdf: jsPDF, title: string, subtitle?: string) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Bandeau supérieur moderne avec dégradé simulé
  pdf.setFillColor(...COLORS.primary);
  pdf.rect(0, 0, pageWidth, 35, 'F');
  
  // Bande décorative en bas du bandeau
  pdf.setFillColor(...COLORS.secondary);
  pdf.rect(0, 32, pageWidth, 3, 'F');
  
  // Logo / Icône (simulé avec texte)
  pdf.setFillColor(...COLORS.white);
  pdf.circle(20, 17.5, 8, 'F');
  pdf.setTextColor(...COLORS.primary);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('✓', 20, 21, { align: 'center' });
  
  // Titre principal
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, 35, 18);
  
  // Sous-titre si fourni
  if (subtitle) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(subtitle, 35, 26);
  }
  
  // Date/heure en haut à droite
  pdf.setFontSize(8);
  const dateStr = new Date().toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
  const timeStr = new Date().toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  pdf.text(dateStr, pageWidth - 15, 15, { align: 'right' });
  pdf.text(timeStr, pageWidth - 15, 22, { align: 'right' });
  
  return 45; // Position Y après l'en-tête (laisse de l'espace)
}

/**
 * Ajoute le pied de page professionnel
 */
function addFooter(pdf: jsPDF, pageNum: number, totalPages: number, reportRef: string) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  const footerY = pageHeight - 15;
  
  // Ligne de séparation élégante
  pdf.setDrawColor(...COLORS.border);
  pdf.setLineWidth(0.3);
  pdf.line(15, footerY - 5, pageWidth - 15, footerY - 5);
  
  // Informations gauche
  pdf.setTextColor(...COLORS.gray);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Rapport d'inspection - Réf: ${reportRef}`, 15, footerY);
  
  // Numéro de page centre
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Page ${pageNum} / ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
  
  // Date génération droite
  pdf.setFont('helvetica', 'italic');
  pdf.text(
    `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
    pageWidth - 15,
    footerY,
    { align: 'right' }
  );
}

/**
 * Ajoute une section avec titre moderne
 */
function addSection(pdf: jsPDF, yPos: number, title: string, icon?: string, colorType: 'primary' | 'success' | 'warning' | 'danger' = 'primary'): number {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const color = COLORS[colorType];
  
  // Barre latérale colorée
  pdf.setFillColor(...color);
  pdf.rect(15, yPos, 3, 10, 'F');
  
  // Fond de section
  pdf.setFillColor(...COLORS.lightGray);
  pdf.roundedRect(18, yPos, pageWidth - 33, 10, 1.5, 1.5, 'F');
  
  // Icône et titre
  pdf.setTextColor(...color);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  const displayTitle = icon ? `${icon} ${title}` : title;
  pdf.text(displayTitle, 22, yPos + 7);
  
  return yPos + 14;
}

/**
 * Ajoute un tableau de données clé-valeur
 */
function addDataTable(pdf: jsPDF, yPos: number, data: Array<{label: string, value: string, fullWidth?: boolean}>, pageWidth: number): number {
  let currentY = yPos;
  const margin = 20;
  const colWidth = (pageWidth - 2 * margin - 5) / 2; // 5mm d'espace entre colonnes
  
  // Dessiner le cadre du tableau
  const tableHeight = data.length * 7 + 4;
  pdf.setDrawColor(...COLORS.border);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(margin, currentY, pageWidth - 2 * margin, tableHeight, 1, 1, 'S');
  
  currentY += 3;
  
  let col = 0;
  data.forEach((item, index) => {
    const xBase = col === 0 ? margin + 3 : margin + colWidth + 8;
    
    // Label
    pdf.setTextColor(...COLORS.gray);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(item.label, xBase, currentY + 4);
    
    // Valeur
    pdf.setTextColor(...COLORS.dark);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    const valueText = item.value || 'N/A';
    pdf.text(valueText, xBase + 45, currentY + 4);
    
    // Ligne de séparation légère entre les lignes
    if (index < data.length - 1 && col === 1) {
      pdf.setDrawColor(...COLORS.lightGray);
      pdf.setLineWidth(0.1);
      pdf.line(margin + 2, currentY + 6, pageWidth - margin - 2, currentY + 6);
    }
    
    if (item.fullWidth || col === 1) {
      currentY += 7;
      col = 0;
    } else {
      col = 1;
    }
  });
  
  return currentY + 5;
}

/**
 * Ajoute les signatures côte à côte
 */
async function addSignatures(pdf: jsPDF, yPos: number, driverSig?: string, clientSig?: string): Promise<number> {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const sigWidth = (pageWidth - 50) / 2;
  const sigHeight = 35;
  
  // Signature Convoyeur (gauche)
  const leftX = 20;
  pdf.setTextColor(...COLORS.dark);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('✍️ Signature Convoyeur', leftX, yPos);
  
  pdf.setDrawColor(...COLORS.border);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(leftX, yPos + 3, sigWidth, sigHeight, 2, 2, 'S');
  
  if (driverSig) {
    try {
      pdf.addImage(driverSig, 'PNG', leftX + 2, yPos + 5, sigWidth - 4, sigHeight - 4);
    } catch {
      pdf.setTextColor(...COLORS.gray);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Signature non disponible', leftX + sigWidth / 2, yPos + sigHeight / 2 + 3, { align: 'center' });
    }
  } else {
    pdf.setTextColor(...COLORS.gray);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Non signée', leftX + sigWidth / 2, yPos + sigHeight / 2 + 3, { align: 'center' });
  }
  
  // Signature Client (droite)
  const rightX = leftX + sigWidth + 10;
  pdf.setTextColor(...COLORS.dark);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('✍️ Signature Client', rightX, yPos);
  
  pdf.setDrawColor(...COLORS.border);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(rightX, yPos + 3, sigWidth, sigHeight, 2, 2, 'S');
  
  if (clientSig) {
    try {
      pdf.addImage(clientSig, 'PNG', rightX + 2, yPos + 5, sigWidth - 4, sigHeight - 4);
    } catch {
      pdf.setTextColor(...COLORS.gray);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Signature non disponible', rightX + sigWidth / 2, yPos + sigHeight / 2 + 3, { align: 'center' });
    }
  } else {
    pdf.setTextColor(...COLORS.gray);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Non signée', rightX + sigWidth / 2, yPos + sigHeight / 2 + 3, { align: 'center' });
  }
  
  return yPos + sigHeight + 15;
}

/**
 * Ajoute une grille de photos professionnelle
 */
async function addPhotoGrid(pdf: jsPDF, yPos: number, photos: any[], pageWidth: number, title: string): Promise<number> {
  if (!photos || photos.length === 0) return yPos;
  
  let currentY = yPos;
  const photosPerRow = 3;
  const photoSize = 55;
  const spacing = 5;
  const startX = 20;
  
  // Titre de la section
  pdf.setTextColor(...COLORS.dark);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, startX, currentY);
  currentY += 8;
  
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const col = i % photosPerRow;
    const row = Math.floor(i / photosPerRow);
    
    const x = startX + col * (photoSize + spacing);
    const y = currentY + row * (photoSize + spacing + 8);
    
    // Vérifier si on a besoin d'une nouvelle page
    if (y + photoSize > 260) {
      return currentY; // Retourner la position actuelle pour nouvelle page
    }
    
    // Cadre photo avec ombre
    pdf.setFillColor(200, 200, 200);
    pdf.roundedRect(x + 1, y + 1, photoSize, photoSize, 2, 2, 'F');
    
    pdf.setDrawColor(...COLORS.border);
    pdf.setFillColor(...COLORS.white);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, y, photoSize, photoSize, 2, 2, 'FD');
    
    // Image
    try {
      pdf.addImage(photo.url, 'JPEG', x + 1, y + 1, photoSize - 2, photoSize - 2);
    } catch {
      pdf.setTextColor(...COLORS.danger);
      pdf.setFontSize(7);
      pdf.text('Photo indisponible', x + photoSize / 2, y + photoSize / 2, { align: 'center' });
    }
    
    // Catégorie en bas
    if (photo.category) {
      pdf.setFillColor(...COLORS.primary);
      pdf.roundedRect(x, y + photoSize - 8, photoSize, 8, 0, 0, 'F');
      
      pdf.setTextColor(...COLORS.white);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      const catText = photo.category.substring(0, 15);
      pdf.text(catText, x + photoSize / 2, y + photoSize - 3, { align: 'center' });
    }
  }
  
  const totalRows = Math.ceil(photos.length / photosPerRow);
  return currentY + totalRows * (photoSize + spacing + 8) + 5;
}

/**
 * Génère la page de couverture ultra-professionnelle
 */
function generateCoverPage(pdf: jsPDF, report: InspectionReportComplete, type: 'departure' | 'arrival' | 'complete'): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // === BANDEAU SUPÉRIEUR MODERNE ===
  // Dégradé simulé avec plusieurs rectangles
  for (let i = 0; i < 80; i++) {
    const alpha = 1 - (i / 100);
    const [r, g, b] = COLORS.primary;
    pdf.setFillColor(r, g, b);
    pdf.setGState(pdf.GState({ opacity: alpha }));
    pdf.rect(0, i, pageWidth, 1, 'F');
  }
  pdf.setGState(pdf.GState({ opacity: 1 })); // Reset opacity
  
  // === LOGO CENTRAL ===
  pdf.setFillColor(...COLORS.white);
  pdf.circle(pageWidth / 2, 50, 20, 'F');
  pdf.setDrawColor(...COLORS.primary);
  pdf.setLineWidth(2);
  pdf.circle(pageWidth / 2, 50, 20, 'S');
  
  pdf.setTextColor(...COLORS.primary);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text('✓', pageWidth / 2, 56, { align: 'center' });
  
  // === TITRE PRINCIPAL ===
  pdf.setTextColor(...COLORS.dark);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  const mainTitle = type === 'complete' 
    ? 'RAPPORT D\'INSPECTION COMPLET'
    : type === 'departure'
    ? 'INSPECTION DÉPART'
    : 'INSPECTION ARRIVÉE';
  pdf.text(mainTitle, pageWidth / 2, 100, { align: 'center' });
  
  // === SOUS-TITRE ===
  pdf.setTextColor(...COLORS.gray);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Rapport professionnel de contrôle véhicule', pageWidth / 2, 110, { align: 'center' });
  
  // === ENCADRÉ INFORMATIONS VÉHICULE ===
  const boxY = 125;
  const boxHeight = 75;
  
  // Ombre du cadre
  pdf.setFillColor(200, 200, 200);
  pdf.roundedRect(22, boxY + 2, pageWidth - 44, boxHeight, 5, 5, 'F');
  
  // Cadre principal
  pdf.setFillColor(...COLORS.white);
  pdf.setDrawColor(...COLORS.primary);
  pdf.setLineWidth(1);
  pdf.roundedRect(20, boxY, pageWidth - 40, boxHeight, 5, 5, 'FD');
  
  // Bandeau titre du cadre
  pdf.setFillColor(...COLORS.primary);
  pdf.roundedRect(20, boxY, pageWidth - 40, 12, 5, 5, 'F');
  pdf.rect(20, boxY + 7, pageWidth - 40, 5, 'F');
  
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('🚗 INFORMATIONS VÉHICULE', pageWidth / 2, boxY + 8, { align: 'center' });
  
  // Contenu du cadre
  let infoY = boxY + 22;
  const leftCol = 35;
  const rightCol = pageWidth / 2 + 10;
  
  pdf.setTextColor(...COLORS.gray);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Marque:', leftCol, infoY);
  pdf.setTextColor(...COLORS.dark);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(report.vehicle.brand, leftCol + 35, infoY);
  
  pdf.setTextColor(...COLORS.gray);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Modèle:', rightCol, infoY);
  pdf.setTextColor(...COLORS.dark);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(report.vehicle.model, rightCol + 35, infoY);
  
  infoY += 10;
  pdf.setTextColor(...COLORS.gray);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Immatriculation:', leftCol, infoY);
  pdf.setTextColor(...COLORS.dark);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(report.vehicle.plate, leftCol + 35, infoY);
  
  if (report.vehicle.vin) {
    pdf.setTextColor(...COLORS.gray);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('N° Châssis:', rightCol, infoY);
    pdf.setTextColor(...COLORS.dark);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(report.vehicle.vin, rightCol + 35, infoY);
  }
  
  infoY += 10;
  if (report.vehicle.color) {
    pdf.setTextColor(...COLORS.gray);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Couleur:', leftCol, infoY);
    pdf.setTextColor(...COLORS.dark);
    pdf.setFont('helvetica', 'bold');
    pdf.text(report.vehicle.color, leftCol + 35, infoY);
  }
  
  if (report.vehicle.year) {
    pdf.setTextColor(...COLORS.gray);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Année:', rightCol, infoY);
    pdf.setTextColor(...COLORS.dark);
    pdf.setFont('helvetica', 'bold');
    pdf.text(report.vehicle.year.toString(), rightCol + 35, infoY);
  }
  
  infoY += 10;
  if (report.vehicle.vehicle_type) {
    pdf.setTextColor(...COLORS.gray);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Type:', leftCol, infoY);
    pdf.setTextColor(...COLORS.dark);
    pdf.setFont('helvetica', 'bold');
    pdf.text(report.vehicle.vehicle_type, leftCol + 35, infoY);
  }
  
  // === ENCADRÉ MISSION ===
  const missionY = boxY + boxHeight + 15;
  const missionHeight = 40;
  
  pdf.setFillColor(250, 250, 250);
  pdf.setDrawColor(...COLORS.border);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(20, missionY, pageWidth - 40, missionHeight, 3, 3, 'FD');
  
  let mY = missionY + 10;
  pdf.setTextColor(...COLORS.gray);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Référence Mission:', leftCol, mY);
  pdf.setTextColor(...COLORS.primary);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(report.mission.reference, leftCol + 40, mY);
  
  pdf.setTextColor(...COLORS.gray);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Statut:', rightCol, mY);
  pdf.setTextColor(...COLORS.success);
  pdf.setFont('helvetica', 'bold');
  pdf.text(report.mission.status.toUpperCase(), rightCol + 25, mY);
  
  mY += 10;
  pdf.setTextColor(...COLORS.gray);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Date de création:', leftCol, mY);
  pdf.setTextColor(...COLORS.dark);
  pdf.setFont('helvetica', 'bold');
  pdf.text(new Date(report.mission.created_at).toLocaleDateString('fr-FR'), leftCol + 40, mY);
  
  // === PIED DE PAGE ===
  const footerY = pageHeight - 30;
  pdf.setDrawColor(...COLORS.border);
  pdf.setLineWidth(0.5);
  pdf.line(40, footerY, pageWidth - 40, footerY);
  
  pdf.setTextColor(...COLORS.gray);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'italic');
  pdf.text(`Document généré le ${new Date().toLocaleDateString('fr-FR', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`, pageWidth / 2, footerY + 8, { align: 'center' });
  
  pdf.setFontSize(8);
  pdf.text('Ce document est une preuve officielle de l\'état du véhicule', pageWidth / 2, footerY + 15, { align: 'center' });
}

/**
 * Génère les pages d'inspection
 */
async function generateInspectionPages(
  pdf: jsPDF,
  inspection: InspectionDetails,
  type: 'departure' | 'arrival',
  report: InspectionReportComplete,
  startPage: number
): Promise<number> {
  let currentPage = startPage;
  let yPos = 30;
  
  // Nouvelle page pour l'inspection
  if (currentPage > 1) {
    pdf.addPage();
    currentPage++;
  }
  
  yPos = addPremiumHeader(pdf, currentPage, 99, `Inspection ${type === 'departure' ? 'Départ' : 'Arrivée'}`);
  
  // Informations générales
  yPos = addSection(pdf, yPos, '📋 INFORMATIONS GÉNÉRALES');
  yPos = addField(pdf, yPos, 'Date inspection', new Date(inspection.created_at).toLocaleDateString('fr-FR'), 0);
  yPos = addField(pdf, yPos, 'Heure', new Date(inspection.created_at).toLocaleTimeString('fr-FR'), 1);
  yPos = addField(pdf, yPos, 'Statut', inspection.status, 0);
  if (inspection.gps_location_name) {
    yPos = addField(pdf, yPos, 'Lieu', inspection.gps_location_name, 1);
  }
  yPos += 10;
  
  // État du véhicule
  yPos = addSection(pdf, yPos, '🚗 ÉTAT DU VÉHICULE');
  if (inspection.mileage) {
    yPos = addField(pdf, yPos, 'Kilométrage', `${inspection.mileage} km`, 0);
  }
  if (inspection.fuel_level !== undefined) {
    yPos = addField(pdf, yPos, 'Niveau carburant', `${inspection.fuel_level}/8`, 1);
  }
  if (inspection.cleanliness_interior !== undefined) {
    yPos = addField(pdf, yPos, 'Propreté intérieure', `${inspection.cleanliness_interior}/5`, 0);
  }
  if (inspection.cleanliness_exterior !== undefined) {
    yPos = addField(pdf, yPos, 'Propreté extérieure', `${inspection.cleanliness_exterior}/5`, 1);
  }
  yPos += 10;
  
  // Documents
  yPos = addSection(pdf, yPos, '📄 DOCUMENTS');
  yPos = addField(pdf, yPos, 'Carte grise', inspection.has_registration ? '✓ Oui' : '✗ Non', 0);
  yPos = addField(pdf, yPos, 'Assurance', inspection.has_insurance ? '✓ Oui' : '✗ Non', 1);
  yPos = addField(pdf, yPos, 'Tous documents', inspection.has_vehicle_documents ? '✓ Oui' : '✗ Non', 0);
  yPos += 10;
  
  // Équipements
  yPos = addSection(pdf, yPos, '🔧 ÉQUIPEMENTS DE SÉCURITÉ');
  yPos = addField(pdf, yPos, 'Roue de secours', inspection.has_spare_wheel ? '✓ Oui' : '✗ Non', 0);
  yPos = addField(pdf, yPos, 'Cric', inspection.has_jack ? '✓ Oui' : '✗ Non', 1);
  yPos = addField(pdf, yPos, 'Triangle', inspection.has_warning_triangle ? '✓ Oui' : '✗ Non', 0);
  yPos = addField(pdf, yPos, 'Trousse de secours', inspection.has_first_aid_kit ? '✓ Oui' : '✗ Non', 1);
  yPos = addField(pdf, yPos, 'Extincteur', inspection.has_fire_extinguisher ? '✓ Oui' : '✗ Non', 0);
  yPos += 10;
  
  // Notes
  if (inspection.notes || inspection.damages_notes) {
    yPos = addSection(pdf, yPos, '📝 OBSERVATIONS');
    pdf.setTextColor(31, 41, 55);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const notes = inspection.notes || inspection.damages_notes || '';
    const splitNotes = pdf.splitTextToSize(notes, pdf.internal.pageSize.getWidth() - 40);
    pdf.text(splitNotes, 20, yPos);
    yPos += splitNotes.length * 5 + 10;
  }
  
  // Dommages
  if (inspection.damages && inspection.damages.length > 0) {
    if (yPos > 240) {
      pdf.addPage();
      currentPage++;
      yPos = addPremiumHeader(pdf, currentPage, 99, `Inspection ${type === 'departure' ? 'Départ' : 'Arrivée'} - Dommages`);
    }
    
    yPos = addSection(pdf, yPos, '⚠️ DOMMAGES CONSTATÉS', COLORS.warning);
    
    inspection.damages.forEach((damage, index) => {
      if (yPos > 250) {
        pdf.addPage();
        currentPage++;
        yPos = addPremiumHeader(pdf, currentPage, 99, `Inspection ${type === 'departure' ? 'Départ' : 'Arrivée'} - Dommages`);
      }
      
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. ${damage.location}`, 20, yPos);
      yPos += 6;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`Gravité: ${damage.severity === 'minor' ? 'Mineur' : damage.severity === 'moderate' ? 'Modéré' : 'Sévère'}`, 25, yPos);
      yPos += 5;
      pdf.text(damage.description, 25, yPos);
      yPos += 10;
    });
  }
  
  // Signatures
  if (yPos > 200) {
    pdf.addPage();
    currentPage++;
    yPos = addPremiumHeader(pdf, currentPage, 99, `Inspection ${type === 'departure' ? 'Départ' : 'Arrivée'} - Signatures`);
  }
  
  yPos = addSection(pdf, yPos, '✍️ SIGNATURES');
  yPos = await addSignature(pdf, yPos, 'Signature Convoyeur:', inspection.driver_signature, 0);
  yPos = await addSignature(pdf, yPos - 40, 'Signature Client:', inspection.client_signature, 1);
  
  // Photos
  if (inspection.photos && inspection.photos.length > 0) {
    pdf.addPage();
    currentPage++;
    yPos = addPremiumHeader(pdf, currentPage, 99, `Inspection ${type === 'departure' ? 'Départ' : 'Arrivée'} - Photos`);
    
    yPos = addSection(pdf, yPos, '📷 PHOTOGRAPHIES');
    
    const photosPerPage = 6;
    let photoCount = 0;
    
    for (const photo of inspection.photos) {
      if (photoCount > 0 && photoCount % photosPerPage === 0) {
        pdf.addPage();
        currentPage++;
        yPos = addPremiumHeader(pdf, currentPage, 99, `Inspection ${type === 'departure' ? 'Départ' : 'Arrivée'} - Photos`);
      }
      
      const col = photoCount % 2;
      const row = Math.floor((photoCount % photosPerPage) / 2);
      const x = col === 0 ? 15 : 110;
      const y = yPos + (row * 70);
      
      await addPhoto(pdf, x, y, photo.url, 85, 65);
      
      // Légende
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(8);
      pdf.text(photo.category, x + 42.5, y + 68, { align: 'center' });
      
      photoCount++;
    }
    
    currentPage += Math.floor((photoCount - 1) / photosPerPage);
  }
  
  addFooter(pdf, report.mission.reference);
  
  return currentPage;
}

/**
 * Génère le PDF complet
 */
export async function generatePremiumInspectionPDF(
  report: InspectionReportComplete,
  type: 'departure' | 'arrival' | 'complete' = 'complete'
): Promise<{ success: boolean; message: string }> {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    let currentPage = 1;
    
    // Page de couverture
    currentPage = generateCoverPage(pdf, report, type);
    
    // Page d'inspection départ
    if ((type === 'departure' || type === 'complete') && report.inspection_departure) {
      currentPage = await generateInspectionPages(pdf, report.inspection_departure, 'departure', report, currentPage);
    }
    
    // Page d'inspection arrivée
    if ((type === 'arrival' || type === 'complete') && report.inspection_arrival) {
      currentPage = await generateInspectionPages(pdf, report.inspection_arrival, 'arrival', report, currentPage);
    }
    
    // Mettre à jour les numéros de pages
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      // Les numéros sont déjà ajoutés dans addPremiumHeader, on met juste à jour le total
      const pageWidth = pdf.internal.pageSize.getWidth();
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Page ${i}/${totalPages}`, pageWidth - 30, 16);
    }
    
    // Télécharger
    const filename = `inspection_${type}_${report.mission.reference}_${new Date().getTime()}.pdf`;
    pdf.save(filename);
    
    return { success: true, message: 'PDF généré avec succès' };
  } catch (error: any) {
    console.error('❌ Erreur génération PDF:', error);
    return { success: false, message: error.message };
  }
}
