/**
 * 🎨 SERVICE PDF PREMIUM V2 - ULTRA PROFESSIONNEL
 * 
 * Génération de rapports d'inspection au design impeccable
 * - Layout moderne et épuré
 * - Tableaux structurés
 * - Photos en grille professionnelle
 * - Signatures de qualité
 * - Optimisé pour l'impression
 */

// @ts-nocheck
import jsPDF from 'jspdf';
import type { InspectionReportComplete, InspectionDetails } from './inspectionReportAdvancedService';

// === COULEURS PROFESSIONNELLES ===
const C = {
  primary: [59, 130, 246],    // Bleu
  secondary: [139, 92, 246],   // Violet
  success: [16, 185, 129],     // Vert
  warning: [245, 158, 11],     // Orange
  danger: [239, 68, 68],       // Rouge
  dark: [31, 41, 55],          // Gris foncé
  gray: [107, 114, 128],       // Gris
  lightGray: [243, 244, 246],  // Gris très clair
  white: [255, 255, 255],      // Blanc
  border: [229, 231, 235]      // Bordures
};

/**
 * Ajoute l'en-tête professionnel
 */
function addHeader(pdf: jsPDF, title: string, subtitle?: string) {
  const W = pdf.internal.pageSize.getWidth();
  
  // Bandeau bleu
  pdf.setFillColor(...C.primary);
  pdf.rect(0, 0, W, 30, 'F');
  
  // Accent violet
  pdf.setFillColor(...C.secondary);
  pdf.rect(0, 27, W, 3, 'F');
  
  // Logo circulaire
  pdf.setFillColor(...C.white);
  pdf.circle(18, 15, 7, 'F');
  pdf.setTextColor(...C.primary);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('✓', 18, 18, { align: 'center' });
  
  // Titre
  pdf.setTextColor(...C.white);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, 30, 14);
  
  // Sous-titre
  if (subtitle) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(subtitle, 30, 22);
  }
  
  // Date/heure
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  pdf.setFontSize(8);
  pdf.text(date, W - 12, 13, { align: 'right' });
  pdf.text(time, W - 12, 20, { align: 'right' });
  
  return 40; // Position Y après header
}

/**
 * Ajoute le pied de page
 */
function addFooter(pdf: jsPDF, pageNum: number, totalPages: number, ref: string) {
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const Y = H - 12;
  
  pdf.setDrawColor(...C.border);
  pdf.setLineWidth(0.2);
  pdf.line(15, Y - 3, W - 15, Y - 3);
  
  pdf.setTextColor(...C.gray);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Réf: ${ref}`, 15, Y);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${pageNum} / ${totalPages}`, W / 2, Y, { align: 'center' });
  
  pdf.setFont('helvetica', 'italic');
  const dateStr = new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR');
  pdf.text(dateStr, W - 15, Y, { align: 'right' });
}

/**
 * Ajoute une section
 */
function addSection(pdf: jsPDF, y: number, title: string, icon: string = '📋', color = C.primary): number {
  const W = pdf.internal.pageSize.getWidth();
  
  // Barre latérale
  pdf.setFillColor(...color);
  pdf.rect(15, y, 3, 9, 'F');
  
  // Fond section
  pdf.setFillColor(...C.lightGray);
  pdf.roundedRect(18, y, W - 33, 9, 1, 1, 'F');
  
  // Titre
  pdf.setTextColor(...color);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${icon} ${title}`, 22, y + 6);
  
  return y + 12;
}

/**
 * Ajoute un tableau de données
 */
function addTable(pdf: jsPDF, y: number, rows: Array<[string, string]>): number {
  const W = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const rowHeight = 6;
  const tableHeight = rows.length * rowHeight + 2;
  
  // Cadre
  pdf.setDrawColor(...C.border);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(margin, y, W - 2 * margin, tableHeight, 1, 1, 'S');
  
  let currentY = y + 1;
  
  rows.forEach((row, i) => {
    const [label, value] = row;
    
    // Label
    pdf.setTextColor(...C.gray);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(label, margin + 3, currentY + 4);
    
    // Valeur
    pdf.setTextColor(...C.dark);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(value || 'N/A', margin + 50, currentY + 4);
    
    // Ligne séparation
    if (i < rows.length - 1) {
      pdf.setDrawColor(...C.lightGray);
      pdf.setLineWidth(0.1);
      pdf.line(margin + 2, currentY + rowHeight, W - margin - 2, currentY + rowHeight);
    }
    
    currentY += rowHeight;
  });
  
  return currentY + 5;
}

/**
 * Ajoute un tableau de checkboxes (oui/non)
 */
function addCheckTable(pdf: jsPDF, y: number, items: Array<[string, boolean]>): number {
  const W = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const colWidth = (W - 2 * margin - 4) / 2;
  const rowHeight = 6;
  
  let currentY = y;
  let col = 0;
  
  // Cadre global
  const tableHeight = Math.ceil(items.length / 2) * rowHeight + 2;
  pdf.setDrawColor(...C.border);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(margin, y, W - 2 * margin, tableHeight, 1, 1, 'S');
  
  currentY += 1;
  
  items.forEach((item, index) => {
    const [label, checked] = item;
    const xBase = col === 0 ? margin + 3 : margin + colWidth + 6;
    
    // Icône
    pdf.setFontSize(9);
    if (checked) {
      pdf.setTextColor(...C.success);
      pdf.text('✓', xBase, currentY + 4);
    } else {
      pdf.setTextColor(...C.danger);
      pdf.text('✗', xBase, currentY + 4);
    }
    
    // Label
    pdf.setTextColor(...C.dark);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(label, xBase + 5, currentY + 4);
    
    if (col === 1 || index === items.length - 1) {
      // Ligne de séparation
      if (index < items.length - 1) {
        pdf.setDrawColor(...C.lightGray);
        pdf.setLineWidth(0.1);
        pdf.line(margin + 2, currentY + rowHeight, W - margin - 2, currentY + rowHeight);
      }
      currentY += rowHeight;
      col = 0;
    } else {
      col = 1;
    }
  });
  
  return currentY + 5;
}

/**
 * Ajoute les signatures
 */
async function addSignatures(pdf: jsPDF, y: number, driverSig?: string, clientSig?: string): Promise<number> {
  const W = pdf.internal.pageSize.getWidth();
  const sigW = (W - 50) / 2;
  const sigH = 32;
  
  // Signature Convoyeur
  pdf.setTextColor(...C.dark);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('✍️ Signature Convoyeur', 20, y);
  
  pdf.setDrawColor(...C.border);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(20, y + 2, sigW, sigH, 2, 2, 'S');
  
  if (driverSig) {
    try {
      pdf.addImage(driverSig, 'PNG', 21, y + 3, sigW - 2, sigH - 2);
    } catch {
      pdf.setTextColor(...C.gray);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Signature indisponible', 20 + sigW / 2, y + sigH / 2 + 2, { align: 'center' });
    }
  } else {
    pdf.setTextColor(...C.gray);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Non signée', 20 + sigW / 2, y + sigH / 2 + 2, { align: 'center' });
  }
  
  // Signature Client
  const rightX = 30 + sigW;
  pdf.setTextColor(...C.dark);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('✍️ Signature Client', rightX, y);
  
  pdf.setDrawColor(...C.border);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(rightX, y + 2, sigW, sigH, 2, 2, 'S');
  
  if (clientSig) {
    try {
      pdf.addImage(clientSig, 'PNG', rightX + 1, y + 3, sigW - 2, sigH - 2);
    } catch {
      pdf.setTextColor(...C.gray);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Signature indisponible', rightX + sigW / 2, y + sigH / 2 + 2, { align: 'center' });
    }
  } else {
    pdf.setTextColor(...C.gray);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Non signée', rightX + sigW / 2, y + sigH / 2 + 2, { align: 'center' });
  }
  
  return y + sigH + 12;
}

/**
 * Ajoute une grille de photos
 */
async function addPhotoGrid(pdf: jsPDF, y: number, photos: any[]): Promise<number> {
  if (!photos || photos.length === 0) return y;
  
  const W = pdf.internal.pageSize.getWidth();
  const photosPerRow = 3;
  const photoSize = 54;
  const spacing = 4;
  const startX = 20;
  
  let currentY = y;
  const maxY = 250; // Limite pour nouvelle page
  
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const col = i % photosPerRow;
    const row = Math.floor(i / photosPerRow);
    
    const x = startX + col * (photoSize + spacing);
    const photoY = currentY + row * (photoSize + spacing + 10);
    
    // Nouvelle page si besoin
    if (photoY + photoSize > maxY) {
      return currentY; // Signal pour nouvelle page
    }
    
    // Ombre
    pdf.setFillColor(210, 210, 210);
    pdf.roundedRect(x + 1, photoY + 1, photoSize, photoSize, 2, 2, 'F');
    
    // Cadre photo
    pdf.setFillColor(...C.white);
    pdf.setDrawColor(...C.border);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, photoY, photoSize, photoSize, 2, 2, 'FD');
    
    // Image
    try {
      pdf.addImage(photo.url, 'JPEG', x + 1, photoY + 1, photoSize - 2, photoSize - 2);
    } catch {
      pdf.setTextColor(...C.danger);
      pdf.setFontSize(7);
      pdf.text('Photo non disponible', x + photoSize / 2, photoY + photoSize / 2, { align: 'center' });
    }
    
    // Badge catégorie
    if (photo.category) {
      pdf.setFillColor(...C.primary);
      pdf.roundedRect(x, photoY + photoSize - 7, photoSize, 7, 0, 0, 'F');
      
      pdf.setTextColor(...C.white);
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'bold');
      const cat = (photo.category || '').substring(0, 12);
      pdf.text(cat, x + photoSize / 2, photoY + photoSize - 3, { align: 'center' });
    }
  }
  
  const totalRows = Math.ceil(photos.length / photosPerRow);
  return currentY + totalRows * (photoSize + spacing + 10);
}

/**
 * PAGE DE COUVERTURE
 */
function generateCoverPage(pdf: jsPDF, report: InspectionReportComplete, type: string) {
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  
  // Bandeau bleu en haut
  pdf.setFillColor(...C.primary);
  pdf.rect(0, 0, W, 70, 'F');
  
  // Accent violet
  pdf.setFillColor(...C.secondary);
  pdf.rect(0, 67, W, 3, 'F');
  
  // Logo central
  pdf.setFillColor(...C.white);
  pdf.circle(W / 2, 45, 18, 'F');
  pdf.setDrawColor(...C.primary);
  pdf.setLineWidth(2);
  pdf.circle(W / 2, 45, 18, 'S');
  
  pdf.setTextColor(...C.primary);
  pdf.setFontSize(26);
  pdf.setFont('helvetica', 'bold');
  pdf.text('✓', W / 2, 52, { align: 'center' });
  
  // Titre principal
  pdf.setTextColor(...C.dark);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  const title = type === 'complete' ? 'RAPPORT COMPLET' : type === 'departure' ? 'INSPECTION DÉPART' : 'INSPECTION ARRIVÉE';
  pdf.text(title, W / 2, 90, { align: 'center' });
  
  pdf.setTextColor(...C.gray);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Rapport Professionnel de Contrôle Véhicule', W / 2, 100, { align: 'center' });
  
  // Bloc informations véhicule
  const boxY = 115;
  const boxH = 70;
  
  // Ombre
  pdf.setFillColor(210, 210, 210);
  pdf.roundedRect(22, boxY + 2, W - 44, boxH, 4, 4, 'F');
  
  // Cadre
  pdf.setFillColor(...C.white);
  pdf.setDrawColor(...C.primary);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(20, boxY, W - 40, boxH, 4, 4, 'FD');
  
  // Bandeau titre
  pdf.setFillColor(...C.primary);
  pdf.roundedRect(20, boxY, W - 40, 11, 4, 4, 'F');
  pdf.rect(20, boxY + 6, W - 40, 5, 'F');
  
  pdf.setTextColor(...C.white);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('🚗 VÉHICULE', W / 2, boxY + 7.5, { align: 'center' });
  
  // Informations
  let infoY = boxY + 20;
  const leftX = 35;
  const rightX = W / 2 + 10;
  
  pdf.setTextColor(...C.gray);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Marque', leftX, infoY);
  pdf.setTextColor(...C.dark);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(report.vehicle.brand, leftX + 30, infoY);
  
  pdf.setTextColor(...C.gray);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Modèle', rightX, infoY);
  pdf.setTextColor(...C.dark);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(report.vehicle.model, rightX + 30, infoY);
  
  infoY += 10;
  pdf.setTextColor(...C.gray);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Immatriculation', leftX, infoY);
  pdf.setTextColor(...C.primary);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(report.vehicle.plate, leftX + 30, infoY);
  
  if (report.vehicle.vin) {
    pdf.setTextColor(...C.gray);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('N° Châssis', rightX, infoY);
    pdf.setTextColor(...C.dark);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text(report.vehicle.vin, rightX + 30, infoY);
  }
  
  infoY += 10;
  if (report.vehicle.color) {
    pdf.setTextColor(...C.gray);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Couleur', leftX, infoY);
    pdf.setTextColor(...C.dark);
    pdf.setFont('helvetica', 'bold');
    pdf.text(report.vehicle.color, leftX + 30, infoY);
  }
  
  if (report.vehicle.year) {
    pdf.setTextColor(...C.gray);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Année', rightX, infoY);
    pdf.setTextColor(...C.dark);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(report.vehicle.year), rightX + 30, infoY);
  }
  
  // Bloc mission
  const missionY = boxY + boxH + 12;
  pdf.setFillColor(...C.lightGray);
  pdf.roundedRect(20, missionY, W - 40, 35, 3, 3, 'F');
  
  let mY = missionY + 10;
  pdf.setTextColor(...C.gray);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Référence Mission', leftX, mY);
  pdf.setTextColor(...C.primary);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(report.mission.reference, leftX + 35, mY);
  
  pdf.setTextColor(...C.gray);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Statut', rightX, mY);
  pdf.setTextColor(...C.success);
  pdf.setFont('helvetica', 'bold');
  pdf.text(report.mission.status.toUpperCase(), rightX + 20, mY);
  
  mY += 10;
  pdf.setTextColor(...C.gray);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Créé le', leftX, mY);
  pdf.setTextColor(...C.dark);
  pdf.setFont('helvetica', 'bold');
  pdf.text(new Date(report.mission.created_at).toLocaleDateString('fr-FR'), leftX + 35, mY);
  
  // Pied de page
  const footY = H - 25;
  pdf.setDrawColor(...C.border);
  pdf.line(35, footY, W - 35, footY);
  
  pdf.setTextColor(...C.gray);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'italic');
  const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  pdf.text(`Document généré le ${dateStr}`, W / 2, footY + 7, { align: 'center' });
  
  pdf.setFontSize(7);
  pdf.text('Ce document constitue une preuve officielle de l\'état du véhicule', W / 2, footY + 13, { align: 'center' });
}

/**
 * PAGES D'INSPECTION
 */
async function generateInspectionPages(pdf: jsPDF, inspection: InspectionDetails, type: string, report: InspectionReportComplete, pageNum: number, totalPages: number) {
  pdf.addPage();
  
  const W = pdf.internal.pageSize.getWidth();
  const inspType = type === 'departure' ? 'Départ' : 'Arrivée';
  
  let y = addHeader(pdf, `INSPECTION ${inspType.toUpperCase()}`, `${report.vehicle.brand} ${report.vehicle.model} - ${report.vehicle.plate}`);
  
  // === INFORMATIONS GÉNÉRALES ===
  y = addSection(pdf, y, 'Informations Générales', '📋', C.primary);
  y = addTable(pdf, y, [
    ['Date', new Date(inspection.created_at).toLocaleDateString('fr-FR')],
    ['Heure', new Date(inspection.created_at).toLocaleTimeString('fr-FR')],
    ['Statut', inspection.status || 'N/A'],
    ['Lieu', inspection.gps_location_name || 'Non renseigné']
  ]);
  y += 5;
  
  // === ÉTAT DU VÉHICULE ===
  y = addSection(pdf, y, 'État du Véhicule', '🚗', C.primary);
  const vehicleData: Array<[string, string]> = [];
  if (inspection.mileage) vehicleData.push(['Kilométrage', `${inspection.mileage} km`]);
  if (inspection.fuel_level !== undefined) vehicleData.push(['Niveau carburant', `${inspection.fuel_level}/8`]);
  if (inspection.cleanliness_interior !== undefined) vehicleData.push(['Propreté intérieure', `${'⭐'.repeat(inspection.cleanliness_interior)} (${inspection.cleanliness_interior}/5)`]);
  if (inspection.cleanliness_exterior !== undefined) vehicleData.push(['Propreté extérieure', `${'⭐'.repeat(inspection.cleanliness_exterior)} (${inspection.cleanliness_exterior}/5)`]);
  if (vehicleData.length > 0) {
    y = addTable(pdf, y, vehicleData);
    y += 5;
  }
  
  // === DOCUMENTS ===
  y = addSection(pdf, y, 'Documents', '📄', C.primary);
  y = addCheckTable(pdf, y, [
    ['Carte grise', inspection.has_registration || false],
    ['Assurance', inspection.has_insurance || false],
    ['Contrôle technique', inspection.has_vehicle_documents || false]
  ]);
  y += 5;
  
  // === ÉQUIPEMENTS ===
  y = addSection(pdf, y, 'Équipements de Sécurité', '🔧', C.primary);
  y = addCheckTable(pdf, y, [
    ['Roue de secours', inspection.has_spare_wheel || false],
    ['Cric et clés', inspection.has_jack || false],
    ['Triangle de signalisation', inspection.has_warning_triangle || false],
    ['Trousse de secours', inspection.has_first_aid_kit || false],
    ['Extincteur', inspection.has_fire_extinguisher || false],
    ['Gilet de sécurité', true] // Par défaut
  ]);
  y += 5;
  
  // === OBSERVATIONS ===
  if (inspection.notes || inspection.damages_notes) {
    if (y > 230) {
      pdf.addPage();
      y = addHeader(pdf, `INSPECTION ${inspType.toUpperCase()}`, 'Observations');
      pageNum++;
    }
    
    y = addSection(pdf, y, 'Observations', '📝', C.warning);
    const notes = inspection.notes || inspection.damages_notes || '';
    const splitNotes = pdf.splitTextToSize(notes, W - 45);
    
    pdf.setFillColor(...C.lightGray);
    const notesHeight = splitNotes.length * 5 + 4;
    pdf.roundedRect(20, y, W - 40, notesHeight, 2, 2, 'F');
    
    pdf.setTextColor(...C.dark);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(splitNotes, 23, y + 4);
    
    y += notesHeight + 8;
  }
  
  // === DOMMAGES ===
  if (inspection.damages && inspection.damages.length > 0) {
    if (y > 200) {
      pdf.addPage();
      y = addHeader(pdf, `INSPECTION ${inspType.toUpperCase()}`, 'Dommages constatés');
      pageNum++;
    }
    
    y = addSection(pdf, y, `Dommages Constatés (${inspection.damages.length})`, '⚠️', C.danger);
    
    inspection.damages.forEach((damage, i) => {
      if (y > 240) {
        pdf.addPage();
        y = addHeader(pdf, `INSPECTION ${inspType.toUpperCase()}`, 'Dommages constatés (suite)');
        pageNum++;
      }
      
      const severityColor = damage.severity === 'severe' ? C.danger : damage.severity === 'moderate' ? C.warning : C.gray;
      const severityText = damage.severity === 'severe' ? 'Sévère' : damage.severity === 'moderate' ? 'Modéré' : 'Mineur';
      
      pdf.setTextColor(...C.dark);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${i + 1}. ${damage.location}`, 23, y);
      y += 5;
      
      pdf.setTextColor(...severityColor);
      pdf.setFontSize(8);
      pdf.text(`Gravité: ${severityText}`, 28, y);
      y += 5;
      
      pdf.setTextColor(...C.dark);
      pdf.setFont('helvetica', 'normal');
      const desc = pdf.splitTextToSize(damage.description, W - 50);
      pdf.text(desc, 28, y);
      y += desc.length * 4 + 5;
    });
    
    y += 5;
  }
  
  // === SIGNATURES ===
  if (y > 180) {
    pdf.addPage();
    y = addHeader(pdf, `INSPECTION ${inspType.toUpperCase()}`, 'Signatures');
    pageNum++;
  }
  
  y = addSection(pdf, y, 'Signatures', '✍️', C.success);
  y = await addSignatures(pdf, y, inspection.driver_signature, inspection.client_signature);
  
  // === PHOTOS ===
  if (inspection.photos && inspection.photos.length > 0) {
    pdf.addPage();
    y = addHeader(pdf, `INSPECTION ${inspType.toUpperCase()}`, `Photos (${inspection.photos.length})`);
    pageNum++;
    
    y = addSection(pdf, y, `Photographies (${inspection.photos.length} photos)`, '📷', C.primary);
    y = await addPhotoGrid(pdf, y, inspection.photos);
    
    // Si beaucoup de photos, gérer les pages suivantes
    const remainingPhotos = inspection.photos.slice(9); // Après 9 photos (3x3)
    if (remainingPhotos.length > 0) {
      let photoIndex = 9;
      while (photoIndex < inspection.photos.length) {
        pdf.addPage();
        y = addHeader(pdf, `INSPECTION ${inspType.toUpperCase()}`, 'Photos (suite)');
        pageNum++;
        
        const batch = inspection.photos.slice(photoIndex, photoIndex + 9);
        y = 45;
        y = await addPhotoGrid(pdf, y, batch);
        photoIndex += 9;
      }
    }
  }
  
  addFooter(pdf, pageNum, totalPages, report.mission.reference);
  
  return pageNum;
}

/**
 * FONCTION PRINCIPALE
 */
export async function generatePremiumInspectionPDF(
  report: InspectionReportComplete,
  returnBlob: boolean = false
): Promise<Blob | { success: boolean; message: string }> {
  try {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    const type = report.reportType || 'complete';
    
    // Page de couverture
    generateCoverPage(pdf, report, type);
    
    let pageNum = 1;
    const totalPages = 10; // Estimation
    
    // Pages d'inspection
    if ((type === 'departure' || type === 'complete') && report.departure) {
      pageNum = await generateInspectionPages(pdf, report.departure, 'departure', report, pageNum, totalPages);
    }
    
    if ((type === 'arrival' || type === 'complete') && report.arrival) {
      pageNum = await generateInspectionPages(pdf, report.arrival, 'arrival', report, pageNum, totalPages);
    }
    
    // Retourner Blob ou télécharger
    if (returnBlob) {
      return pdf.output('blob');
    } else {
      const filename = `Inspection_${type}_${report.mission?.reference || 'rapport'}_${Date.now()}.pdf`;
      pdf.save(filename);
      return { success: true, message: 'PDF généré avec succès !' };
    }
  } catch (error: any) {
    console.error('❌ Erreur génération PDF:', error);
    if (returnBlob) {
      throw error;
    }
    return { success: false, message: error.message || 'Erreur inconnue' };
  }
}
