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
 */

// @ts-nocheck
import jsPDF from 'jspdf';
import type { InspectionReportComplete, InspectionDetails } from './inspectionReportAdvancedService';

const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  dark: '#1f2937',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  white: '#ffffff'
};

/**
 * Ajoute l'en-tête premium sur chaque page
 */
function addPremiumHeader(pdf: jsPDF, pageNum: number, totalPages: number, title: string) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Bandeau supérieur bleu
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, 0, pageWidth, 25, 'F');
  
  // Titre blanc
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, 15, 16);
  
  // Numéro de page
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Page ${pageNum}/${totalPages}`, pageWidth - 30, 16);
  
  // Ligne de séparation
  pdf.setDrawColor(59, 130, 246);
  pdf.setLineWidth(0.5);
  pdf.line(0, 25, pageWidth, 25);
  
  return 30; // Position Y après l'en-tête
}

/**
 * Ajoute le pied de page
 */
function addFooter(pdf: jsPDF, reportRef: string) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
  
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Rapport généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 15, pageHeight - 12);
  pdf.text(`Référence: ${reportRef}`, pageWidth - 15, pageHeight - 12, { align: 'right' });
}

/**
 * Ajoute une section avec titre
 */
function addSection(pdf: jsPDF, yPos: number, title: string, color: string = COLORS.primary): number {
  const [r, g, b] = hexToRgb(color);
  
  pdf.setFillColor(r, g, b, 0.1);
  pdf.roundedRect(15, yPos, pdf.internal.pageSize.getWidth() - 30, 10, 2, 2, 'F');
  
  pdf.setTextColor(r, g, b);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, 18, yPos + 7);
  
  return yPos + 15;
}

/**
 * Ajoute un champ clé-valeur
 */
function addField(pdf: jsPDF, yPos: number, label: string, value: string, col: number = 0): number {
  const xBase = col === 0 ? 20 : pdf.internal.pageSize.getWidth() / 2 + 5;
  
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(label + ':', xBase, yPos);
  
  pdf.setTextColor(31, 41, 55);
  pdf.setFont('helvetica', 'bold');
  pdf.text(value || 'N/A', xBase + 45, yPos);
  
  return col === 1 ? yPos + 6 : yPos;
}

/**
 * Convertit hex en RGB
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

/**
 * Ajoute une signature
 */
async function addSignature(pdf: jsPDF, yPos: number, label: string, signatureUrl: string | undefined, col: number = 0): Promise<number> {
  const xBase = col === 0 ? 20 : pdf.internal.pageSize.getWidth() / 2 + 10;
  
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(label, xBase, yPos);
  
  if (signatureUrl) {
    try {
      // Dessiner un cadre pour la signature
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.rect(xBase, yPos + 2, 70, 30);
      
      // Ajouter l'image de signature
      pdf.addImage(signatureUrl, 'PNG', xBase + 2, yPos + 4, 66, 26);
    } catch (err) {
      pdf.setTextColor(239, 68, 68);
      pdf.setFontSize(8);
      pdf.text('Signature non disponible', xBase, yPos + 15);
    }
  } else {
    pdf.setTextColor(156, 163, 175);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Non signée', xBase, yPos + 15);
  }
  
  return col === 1 ? yPos + 40 : yPos;
}

/**
 * Ajoute une photo
 */
async function addPhoto(pdf: jsPDF, x: number, y: number, photoUrl: string, width: number = 80, height: number = 60): Promise<void> {
  try {
    // Cadre photo
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.rect(x, y, width, height);
    
    // Image
    pdf.addImage(photoUrl, 'JPEG', x + 1, y + 1, width - 2, height - 2);
  } catch (err) {
    pdf.setTextColor(239, 68, 68);
    pdf.setFontSize(8);
    pdf.text('Photo indisponible', x + width / 2, y + height / 2, { align: 'center' });
  }
}

/**
 * Génère la page de couverture
 */
function generateCoverPage(pdf: jsPDF, report: InspectionReportComplete, type: 'departure' | 'arrival' | 'complete'): number {
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Bandeau bleu complet
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, 0, pageWidth, 100, 'F');
  
  // Titre principal
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  const mainTitle = type === 'complete' 
    ? 'RAPPORT D\'INSPECTION COMPLET'
    : type === 'departure'
    ? 'RAPPORT D\'INSPECTION DÉPART'
    : 'RAPPORT D\'INSPECTION ARRIVÉE';
  pdf.text(mainTitle, pageWidth / 2, 45, { align: 'center' });
  
  // Sous-titre
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Référence: ${report.mission.reference}`, pageWidth / 2, 65, { align: 'center' });
  pdf.text(`${report.vehicle.brand} ${report.vehicle.model}`, pageWidth / 2, 80, { align: 'center' });
  
  // Informations véhicule dans un cadre
  let yPos = 120;
  pdf.setFillColor(243, 244, 246);
  pdf.roundedRect(30, yPos, pageWidth - 60, 80, 5, 5, 'F');
  
  yPos += 15;
  pdf.setTextColor(31, 41, 55);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INFORMATIONS VÉHICULE', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 12;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Marque: ${report.vehicle.brand}`, 50, yPos);
  yPos += 8;
  pdf.text(`Modèle: ${report.vehicle.model}`, 50, yPos);
  yPos += 8;
  pdf.text(`Immatriculation: ${report.vehicle.plate}`, 50, yPos);
  yPos += 8;
  if (report.vehicle.vin) {
    pdf.text(`N° Châssis: ${report.vehicle.vin}`, 50, yPos);
    yPos += 8;
  }
  if (report.vehicle.color) {
    pdf.text(`Couleur: ${report.vehicle.color}`, 50, yPos);
  }
  
  // Date de génération
  yPos = 220;
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'italic');
  pdf.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, yPos, { align: 'center' });
  
  return 1;
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
