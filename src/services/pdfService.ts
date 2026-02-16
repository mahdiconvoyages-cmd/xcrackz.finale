/**
 * Service d'export PDF pour les devis
 * Utilise jsPDF et jspdf-autotable pour génération professionnelle
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QuoteCalculation } from './pricingGridService';

interface Client {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  siret?: string;
}

interface User {
  email: string;
  // Ajoutez d'autres champs user si disponibles dans votre auth context
}

interface QuotePDFData {
  quote: QuoteCalculation;
  distance: number;
  client: Client;
  user: User;
  fromAddress: string;
  toAddress: string;
  quoteNumber?: string;
  quoteDate?: Date;
}

/**
 * Génère un PDF de devis professionnel
 */
export function generateQuotePDF(data: QuotePDFData): void {
  const {
    quote,
    distance,
    client,
    user,
    fromAddress,
    toAddress,
    quoteNumber = `DEV-${Date.now()}`,
    quoteDate = new Date()
  } = data;

  // Initialiser le PDF (A4)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // === HEADER ===
  // Titre principal
  doc.setFillColor(16, 185, 129); // green-500
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('DEVIS DE TRANSPORT', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${quoteNumber}`, pageWidth / 2, 30, { align: 'center' });

  // === INFO CLIENT & PRESTATAIRE ===
  let yPos = 55;

  // Colonne gauche: Prestataire
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ÉMETTEUR', 15, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(user.email, 15, yPos + 6);
  doc.text(`Date: ${quoteDate.toLocaleDateString('fr-FR')}`, 15, yPos + 12);

  // Colonne droite: Client
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CLIENT', pageWidth - 80, yPos);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(client.name, pageWidth - 80, yPos + 6);
  if (client.email) doc.text(client.email, pageWidth - 80, yPos + 12);
  if (client.phone) doc.text(client.phone, pageWidth - 80, yPos + 18);
  if (client.siret) doc.text(`SIRET: ${client.siret}`, pageWidth - 80, yPos + 24);

  yPos += 40;

  // === TRAJET ===
  doc.setFillColor(239, 246, 255); // blue-50
  doc.rect(10, yPos, pageWidth - 20, 30, 'F');
  doc.setDrawColor(191, 219, 254); // blue-200
  doc.rect(10, yPos, pageWidth - 20, 30, 'S');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text('DÉTAIL DU TRAJET', 15, yPos + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Départ:`, 15, yPos + 15);
  doc.text(fromAddress, 35, yPos + 15);
  doc.text(`Arrivée:`, 15, yPos + 22);
  doc.text(toAddress, 35, yPos + 22);

  yPos += 40;

  // === TABLEAU DÉTAIL CALCUL ===
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105); // slate-700
  doc.text('DÉTAIL DU CALCUL', 15, yPos);

  yPos += 5;

  const tableData = [
    ['Distance parcourue', `${distance} km`, ''],
    ['Type de véhicule', getVehicleTypeLabel(quote.vehicleType), ''],
    ['Grille tarifaire', quote.gridName, ''],
    ['Palier appliqué', quote.tier, ''],
    ['', '', ''],
    ['Prix de base HT', '', `${quote.basePrice.toFixed(2)} €`],
    [`Marge (${quote.marginPercentage}%)`, '', `${quote.marginAmount.toFixed(2)} €`]
  ];

  if (quote.fixedSupplement > 0) {
    tableData.push(['Supplément fixe', '', `${quote.fixedSupplement.toFixed(2)} €`]);
  }

  tableData.push(
    ['', '', ''],
    ['TOTAL HT', '', `${quote.totalHT.toFixed(2)} €`],
    [`TVA (${quote.vatRate}%)`, '', `${quote.vatAmount.toFixed(2)} €`]
  );

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'normal' },
      1: { cellWidth: 70, halign: 'left' },
      2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      // Ligne Total HT
      if (data.row.index === tableData.length - 2) {
        data.cell.styles.fillColor = [219, 234, 254]; // blue-100
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [30, 58, 138]; // blue-900
      }
      // Ligne Total TTC
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fillColor = [16, 185, 129]; // green-500
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontSize = 11;
      }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // === TOTAL TTC (Grand encadré) ===
  doc.setFillColor(16, 185, 129); // green-500
  doc.rect(10, yPos, pageWidth - 20, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL TTC', 20, yPos + 13);
  doc.text(`${quote.totalTTC.toFixed(2)} €`, pageWidth - 20, yPos + 13, { align: 'right' });

  yPos += 30;

  // === FORMULE DE CALCUL ===
  doc.setFillColor(243, 244, 246); // slate-100
  doc.rect(10, yPos, pageWidth - 20, 25, 'F');
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.rect(10, yPos, pageWidth - 20, 25, 'S');

  doc.setTextColor(51, 65, 85); // slate-700
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('FORMULE DE CALCUL:', 15, yPos + 6);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  
  const formulaLines = splitTextToLines(doc, quote.formula, pageWidth - 30);
  formulaLines.forEach((line, index) => {
    doc.text(line, 15, yPos + 12 + (index * 4));
  });

  yPos += 35;

  // === CONDITIONS ===
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(107, 114, 128); // slate-500
  doc.text('Devis valable 30 jours à compter de la date d\'émission.', 15, yPos);
  doc.text('Paiement à réception de facture. Conditions générales disponibles sur demande.', 15, yPos + 5);

  // === FOOTER ===
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');

  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // === TÉLÉCHARGER ===
  const filename = `devis_${client.name.replace(/\s+/g, '_')}_${quoteNumber}_${Date.now()}.pdf`;
  doc.save(filename);

  console.log('✅ PDF généré:', filename);
}

/**
 * Helper: Obtenir le label du type de véhicule
 */
function getVehicleTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    light: '🚗 Véhicule Léger',
    utility: '🚐 Utilitaire',
    heavy: '🚛 Poids Lourd'
  };
  return labels[type] || type;
}

/**
 * Helper: Couper du texte en lignes selon la largeur
 */
function splitTextToLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const words = text.split(' ');
  let currentLine = '';

  words.forEach((word) => {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const textWidth = doc.getTextWidth(testLine);

    if (textWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Exemple d'utilisation:
 * 
 * import { generateQuotePDF } from './pdfService';
 * 
 * const pdfData = {
 *   quote: quoteCalculation,
 *   distance: 85,
 *   client: {
 *     name: "Entreprise ABC",
 *     email: "contact@abc.fr",
 *     siret: "12345678901234"
 *   },
 *   user: {
 *     email: "convoyeur@checksfleet.com"
 *   },
 *   fromAddress: "Paris, France",
 *   toAddress: "Lyon, France"
 * };
 * 
 * generateQuotePDF(pdfData);
 */
