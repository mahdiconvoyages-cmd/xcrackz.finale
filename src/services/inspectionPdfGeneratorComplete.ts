/**
 * 📄 GÉNÉRATEUR PDF RAPPORT COMPLET
 * 
 * Génère UN SEUL PDF contenant:
 * ✅ Inspection Départ + Arrivée
 * ✅ Photos embarquées (base64)
 * ✅ Noms des signataires
 * ✅ Signatures embarquées
 * ✅ Design professionnel
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ==========================================
// CONFIGURATION
// ==========================================
const COLORS = {
  primary: '#14b8a6',       // Teal
  secondary: '#6366f1',     // Indigo
  success: '#10b981',       // Green
  warning: '#f59e0b',       // Orange
  danger: '#ef4444',        // Red
  text: '#1f2937',          // Gray-800
  textLight: '#6b7280',     // Gray-500
  border: '#e5e7eb',        // Gray-200
  bg: '#f9fafb',            // Gray-50
};

// ==========================================
// INTERFACES
// ==========================================
interface InspectionPhoto {
  id: string;
  photo_type: string;
  photo_url: string;
  ai_description?: string;
  damage_detected?: boolean;
}

interface VehicleInspection {
  id: string;
  inspection_type: 'departure' | 'arrival';
  overall_condition?: string;
  fuel_level?: number;
  mileage_km?: number;
  notes?: string;
  client_name?: string;
  client_signature?: string;
  driver_name?: string;
  driver_signature?: string;
  keys_count?: number;
  has_vehicle_documents?: boolean;
  external_cleanliness?: string;
  internal_cleanliness?: string;
  created_at: string;
}

interface MissionData {
  reference: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  pickup_address?: string;
  delivery_address?: string;
  pickup_date?: string;
  delivery_date?: string;
}

interface CompletePDFOptions {
  includePhotos: boolean;
  includeSignatures: boolean;
  includeAIDescriptions: boolean;
}

// Documents scannés liés à la mission/inspection
interface ScannedDocument {
  id: string;
  title?: string;
  file_url: string;
  mime_type?: string; // image/png, image/jpeg, application/pdf...
  created_at?: string;
}

// Frais/Dépenses liés à la mission
interface ExpenseItem {
  id: string;
  label: string;
  amount: number;
  currency?: string; // par défaut EUR
  category?: string;
  date?: string; // ISO
}

// ==========================================
// UTILITAIRES
// ==========================================

/**
 * Charger une image et la convertir en base64
 */
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Erreur chargement image:', url, error);
    return null;
  }
}

/**
 * Déterminer le format image attendu par jsPDF à partir du mime/type
 */
function detectImageFormat(mimeType?: string, dataUrl?: string): 'JPEG' | 'PNG' | 'WEBP' {
  const normalizedMime = mimeType?.toLowerCase() || '';

  if (normalizedMime.includes('png')) return 'PNG';
  if (normalizedMime.includes('webp')) return 'WEBP';
  if (normalizedMime.includes('jp')) return 'JPEG';

  if (dataUrl?.startsWith('data:image/')) {
    const separatorIndex = dataUrl.indexOf(';');
    const type = separatorIndex > -1
      ? dataUrl.slice('data:image/'.length, separatorIndex).toLowerCase()
      : dataUrl.slice('data:image/'.length).toLowerCase();
    if (type.includes('png')) return 'PNG';
    if (type.includes('webp')) return 'WEBP';
  }

  return 'JPEG';
}

/**
 * Traduire le type de photo
 */
function getPhotoLabel(type: string): string {
  const labels: Record<string, string> = {
    front: 'Vue avant',
    back: 'Vue arrière',
    left_side: 'Côté gauche',
    right_side: 'Côté droit',
    left_front: 'Avant gauche',
    right_front: 'Avant droit',
    left_back: 'Arrière gauche',
    right_back: 'Arrière droit',
    interior: 'Intérieur',
    dashboard: 'Tableau de bord',
    delivery_receipt: 'Bon de livraison',
  };
  return labels[type] || type;
}

/**
 * Formater une date
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

// ==========================================
// GÉNÉRATEUR PDF PRINCIPAL
// ==========================================

export async function generateCompletePDF(
  mission: MissionData,
  departureInspection: VehicleInspection | null,
  arrivalInspection: VehicleInspection | null,
  departurePhotos: InspectionPhoto[] = [],
  arrivalPhotos: InspectionPhoto[] = [],
  scannedDocuments: ScannedDocument[] = [],
  expenses: ExpenseItem[] = [],
  options: CompletePDFOptions = {
    includePhotos: true,
    includeSignatures: true,
    includeAIDescriptions: true,
  }
): Promise<{ pdf: jsPDF; success: boolean; message: string }> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = margin;

    // ==========================================
    // PAGE DE COUVERTURE
    // ==========================================
    doc.setFillColor(COLORS.primary);
    doc.rect(0, 0, pageWidth, 60, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('RAPPORT D\'INSPECTION', pageWidth / 2, 30, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Véhicule de Transport', pageWidth / 2, 45, { align: 'center' });

    currentY = 80;

    // Informations mission
    doc.setTextColor(COLORS.text);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Informations Mission', margin, currentY);
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const missionInfo = [
      ['Référence:', mission.reference],
      ['Véhicule:', `${mission.vehicle_brand || ''} ${mission.vehicle_model || ''}`],
      ['Immatriculation:', mission.vehicle_plate || 'N/A'],
      ['Départ:', mission.pickup_address || 'N/A'],
      ['Arrivée:', mission.delivery_address || 'N/A'],
    ];

    missionInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 40, currentY);
      currentY += 7;
    });

    currentY += 10;

    // ==========================================
    // INSPECTION DÉPART
    // ==========================================
    if (departureInspection) {
      currentY = await addInspectionSection(
        doc,
        'INSPECTION DÉPART',
        departureInspection,
        departurePhotos,
        currentY,
        pageWidth,
        pageHeight,
        margin,
        options
      );
    }

    // ==========================================
    // INSPECTION ARRIVÉE
    // ==========================================
    if (arrivalInspection) {
      // Nouvelle page pour l'arrivée
      doc.addPage();
      currentY = margin;

      currentY = await addInspectionSection(
        doc,
        'INSPECTION ARRIVÉE',
        arrivalInspection,
        arrivalPhotos,
        currentY,
        pageWidth,
        pageHeight,
        margin,
        options
      );
    }

    // ==========================================
    // PAGE FINALE - RÉSUMÉ
    // ==========================================
    doc.addPage();
    currentY = margin;

    doc.setFillColor(COLORS.success);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('RÉSUMÉ DU TRANSPORT', pageWidth / 2, 25, { align: 'center' });

    currentY = 60;

    // Tableau comparatif
    doc.setTextColor(COLORS.text);

    const compareData = [
      ['', 'Départ', 'Arrivée'],
      [
        'Kilométrage',
        departureInspection?.mileage_km ? `${departureInspection.mileage_km} km` : 'N/A',
        arrivalInspection?.mileage_km ? `${arrivalInspection.mileage_km} km` : 'N/A',
      ],
      [
        'Niveau carburant',
        departureInspection?.fuel_level !== undefined ? `${departureInspection.fuel_level}%` : 'N/A',
        arrivalInspection?.fuel_level !== undefined ? `${arrivalInspection.fuel_level}%` : 'N/A',
      ],
      [
        'État général',
        departureInspection?.overall_condition || 'N/A',
        arrivalInspection?.overall_condition || 'N/A',
      ],
      [
        'Propreté extérieure',
        departureInspection?.external_cleanliness || 'Non renseigné',
        arrivalInspection?.external_cleanliness || 'Non renseigné',
      ],
      [
        'Propreté intérieure',
        departureInspection?.internal_cleanliness || 'Non renseigné',
        arrivalInspection?.internal_cleanliness || 'Non renseigné',
      ],
      [
        'Signataire',
        departureInspection?.client_name || 'Non renseigné',
        arrivalInspection?.client_name || 'Non renseigné',
      ],
      [
        'Date/Heure',
        departureInspection ? formatDate(departureInspection.created_at) : 'N/A',
        arrivalInspection ? formatDate(arrivalInspection.created_at) : 'N/A',
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [compareData[0]],
      body: compareData.slice(1),
      theme: 'striped',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11,
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [245, 245, 245] },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 20;

    // ==========================================
    // DOCUMENTS SCANNÉS (si présents)
    // ==========================================
    if (scannedDocuments.length > 0) {
      doc.addPage();
      currentY = margin;
      currentY = await addScannedDocumentsSection(
        doc,
        scannedDocuments,
        currentY,
        pageWidth,
        pageHeight,
        margin
      );
    }

    // ==========================================
    // FRAIS & DÉPENSES (si présents)
    // ==========================================
    if (expenses.length > 0) {
      if (currentY > pageHeight - 80) {
        doc.addPage();
        currentY = margin;
      }
      currentY = addExpensesSection(
        doc,
        expenses,
        currentY,
        pageWidth,
        margin
      );
    }

    // Distance parcourue
    if (departureInspection?.mileage_km && arrivalInspection?.mileage_km) {
      const distance = arrivalInspection.mileage_km - departureInspection.mileage_km;
      
      doc.setFillColor(COLORS.bg);
      doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 20, 3, 3, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.text);
      doc.text('Distance parcourue pendant le transport:', margin + 5, currentY + 10);
      
      doc.setTextColor(COLORS.primary);
      doc.setFontSize(14);
      doc.text(`${distance} km`, pageWidth - margin - 5, currentY + 10, { align: 'right' });
    }

    // Footer sur toutes les pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(COLORS.textLight);
      doc.text(
        `Rapport généré le ${formatDate(new Date().toISOString())} - Page ${i}/${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        `Mission ${mission.reference}`,
        margin,
        pageHeight - 10
      );
    }

    return {
      pdf: doc,
      success: true,
      message: 'PDF généré avec succès',
    };
  } catch (error: any) {
    console.error('❌ Erreur génération PDF:', error);
    return {
      pdf: new jsPDF(),
      success: false,
      message: error.message || 'Erreur génération PDF',
    };
  }
}

// ==========================================
// SECTION INSPECTION
// ==========================================

async function addInspectionSection(
  doc: jsPDF,
  title: string,
  inspection: VehicleInspection,
  photos: InspectionPhoto[],
  startY: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  options: CompletePDFOptions
): Promise<number> {
  let currentY = startY;

  // Titre section
  doc.setFillColor(inspection.inspection_type === 'departure' ? COLORS.primary : COLORS.secondary);
  doc.rect(0, currentY, pageWidth, 15, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, currentY + 10, { align: 'center' });

  currentY += 25;
  doc.setTextColor(COLORS.text);

  // Informations inspection
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const inspectionInfo = [
    ['Date/Heure:', formatDate(inspection.created_at)],
    ['Kilométrage:', `${inspection.mileage_km || 'N/A'} km`],
    ['Niveau carburant:', inspection.fuel_level !== undefined ? `${inspection.fuel_level}%` : 'N/A'],
    ['État général:', inspection.overall_condition || 'Non renseigné'],
    ['Nombre de clés:', `${inspection.keys_count || 0}`],
    ['Documents bord:', inspection.has_vehicle_documents ? 'Oui' : 'Non'],
  ];

  inspectionInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 50, currentY);
    currentY += 7;
  });

  // Signataire
  if (inspection.client_name) {
    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Signataire:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(inspection.client_name, margin + 50, currentY);
    currentY += 7;
  }

  // Propreté (si présents)
  if (inspection.external_cleanliness || inspection.internal_cleanliness) {
    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Propreté:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    const ext = inspection.external_cleanliness ? `Extérieure: ${inspection.external_cleanliness}` : '';
    const intl = inspection.internal_cleanliness ? `Intérieure: ${inspection.internal_cleanliness}` : '';
    const line = [ext, intl].filter(Boolean).join('  |  ');
    doc.text(line || 'Non renseigné', margin + 50, currentY);
    currentY += 7;
  }

  // Notes
  if (inspection.notes) {
    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Observations:', margin, currentY);
    currentY += 7;
    doc.setFont('helvetica', 'normal');
    const notes = doc.splitTextToSize(inspection.notes, pageWidth - 2 * margin);
    doc.text(notes, margin, currentY);
    currentY += notes.length * 5 + 5;
  }

  // Signatures (client et conducteur) avec noms
  if (options.includeSignatures && (inspection.client_signature || inspection.driver_signature)) {
    currentY += 10;
    const blockTop = currentY;
    let usedHeight = 0;

    // Signature client
    if (inspection.client_signature) {
      try {
        const signatureBase64 = await loadImageAsBase64(inspection.client_signature);
        if (signatureBase64) {
          doc.setFont('helvetica', 'bold');
          doc.text('Signature client:', margin, blockTop);
          doc.addImage(signatureBase64, 'PNG', margin, blockTop + 3, 60, 20);
          // Nom sous la signature
          doc.setFont('helvetica', 'normal');
          const cname = inspection.client_name || 'Signataire';
          doc.text(cname, margin, blockTop + 27);
          usedHeight = Math.max(usedHeight, 30);
        }
      } catch (error) {
        console.error('Erreur chargement signature client:', error);
      }
    }

    // Signature conducteur
    if (inspection.driver_signature) {
      try {
        const signatureBase64 = await loadImageAsBase64(inspection.driver_signature);
        if (signatureBase64) {
          const xRight = margin + 80; // à droite du bloc client
          doc.setFont('helvetica', 'bold');
          doc.text('Signature conducteur:', xRight, blockTop);
          doc.addImage(signatureBase64, 'PNG', xRight, blockTop + 3, 60, 20);
          // Nom sous la signature
          doc.setFont('helvetica', 'normal');
          const dname = inspection.driver_name || 'Conducteur';
          doc.text(dname, xRight, blockTop + 27);
          usedHeight = Math.max(usedHeight, 30);
        }
      } catch (error) {
        console.error('Erreur chargement signature conducteur:', error);
      }
    }

    if (usedHeight > 0) {
      currentY = blockTop + usedHeight + 5;
    }
  }

  // Photos
  if (options.includePhotos && photos.length > 0) {
    currentY += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Photos', margin, currentY);
    currentY += 10;

    // Charger et afficher les photos en grille
    const photosPerRow = 2;
    const photoWidth = (pageWidth - 2 * margin - 10) / photosPerRow;
    const photoHeight = photoWidth * 0.75; // Ratio 4:3

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const col = i % photosPerRow;
      const row = Math.floor(i / photosPerRow);
      
      const x = margin + col * (photoWidth + 10);
      const y = currentY + row * (photoHeight + 25);

      // Vérifier si on a besoin d'une nouvelle page
      if (y + photoHeight + 25 > pageHeight - 30) {
        doc.addPage();
        currentY = margin;
        // Redémarrer le compteur
        continue;
      }

      try {
        const photoBase64 = await loadImageAsBase64(photo.photo_url);
        if (photoBase64) {
          // Bordure
          doc.setDrawColor(COLORS.border);
          doc.rect(x, y, photoWidth, photoHeight);
          
          // Image
          doc.addImage(photoBase64, 'JPEG', x + 1, y + 1, photoWidth - 2, photoHeight - 2);
          
          // Légende
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(getPhotoLabel(photo.photo_type), x + photoWidth / 2, y + photoHeight + 5, { align: 'center' });
          
          // Description IA si disponible
          if (options.includeAIDescriptions && photo.ai_description) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            const desc = doc.splitTextToSize(photo.ai_description, photoWidth - 4);
            doc.text(desc.slice(0, 2), x + 2, y + photoHeight + 10);
          }
        }
      } catch (error) {
        console.error('Erreur chargement photo:', photo.photo_url, error);
      }
    }

    // Calculer la position après toutes les photos
    const totalRows = Math.ceil(photos.length / photosPerRow);
    currentY += totalRows * (photoHeight + 25) + 10;
  }

  return currentY;
}

// ==========================================
// SECTIONS SUPPLÉMENTAIRES: DOCUMENTS + FRAIS
// ==========================================

async function addScannedDocumentsSection(
  doc: jsPDF,
  docs: ScannedDocument[],
  startY: number,
  pageWidth: number,
  pageHeight: number,
  margin: number
): Promise<number> {
  if (docs.length === 0) return startY;

  let y = startY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(COLORS.text);
  doc.text('📎 Documents scannés', margin, y);
  y += 8;

  // grille 2 colonnes
  const perRow = 2;
  const cellWidth = (pageWidth - 2 * margin - 10) / perRow;
  const cellHeight = cellWidth * 0.75;
  const gap = 10;

  for (let i = 0; i < docs.length; i++) {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const x = margin + col * (cellWidth + gap);
    const yCell = y + row * (cellHeight + 22);

    if (yCell + cellHeight + 22 > pageHeight - 30) {
      doc.addPage();
      y = margin;
    }

    const d = docs[i];
    const isImage = (d.mime_type || '').startsWith('image/');

    // cadre
    doc.setDrawColor(COLORS.border);
    doc.rect(x, yCell, cellWidth, cellHeight);

    if (isImage) {
      try {
        const base64 = await loadImageAsBase64(d.file_url);
        if (base64) {
          try {
            const format = detectImageFormat(d.mime_type, base64);
            doc.addImage(base64, format, x + 1, yCell + 1, cellWidth - 2, cellHeight - 2);
          } catch (imageError) {
            console.error('Impossible d\'ajouter l\'image au PDF:', d.file_url, imageError);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(COLORS.textLight);
            doc.text('Aperçu indisponible', x + cellWidth / 2, yCell + cellHeight / 2, { align: 'center' });
          }
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(COLORS.textLight);
          doc.text('Aperçu indisponible', x + cellWidth / 2, yCell + cellHeight / 2, { align: 'center' });
        }
      } catch (e) {
        console.error('Erreur chargement document:', d.file_url, e);
      }
    } else {
      // Icône/placeholder texte
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(COLORS.textLight);
      const label = (d.mime_type || '').toUpperCase().includes('PDF') ? 'PDF' : 'Document';
      doc.text(label, x + cellWidth / 2, yCell + cellHeight / 2, { align: 'center' });
    }

    // titre/nom
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.text);
    const title = d.title || d.file_url.split('/').pop() || 'Document';
    const lines = doc.splitTextToSize(title, cellWidth);
    doc.text(lines.slice(0, 2), x, yCell + cellHeight + 6);
  }

  const totalRows = Math.ceil(docs.length / perRow);
  return y + totalRows * (cellHeight + 22) + 10;
}

function addExpensesSection(
  doc: jsPDF,
  expenses: ExpenseItem[],
  startY: number,
  pageWidth: number,
  margin: number
): number {
  if (expenses.length === 0) return startY;

  let y = startY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(COLORS.text);
  doc.text('💶 Frais & Dépenses', margin, y);
  y += 6;

  const head = [['Date', 'Libellé', 'Catégorie', 'Montant']];
  const body = expenses.map(e => [
    e.date ? formatDate(e.date) : '-',
    e.label,
    e.category || '-',
    `${e.amount.toFixed(2)} ${e.currency || 'EUR'}`,
  ]);

  autoTable(doc, {
    startY: y,
    head,
    body,
    theme: 'striped',
    headStyles: { fillColor: COLORS.secondary, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: margin, right: margin },
  });

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.text);
  doc.text(`Total: ${total.toFixed(2)} ${expenses[0]?.currency || 'EUR'}`, pageWidth - margin, finalY, { align: 'right' });
  return finalY + 6;
}

// ==========================================
// EXPORT
// ==========================================

export async function downloadCompletePDF(
  mission: MissionData,
  departureInspection: VehicleInspection | null,
  arrivalInspection: VehicleInspection | null,
  departurePhotos: InspectionPhoto[] = [],
  arrivalPhotos: InspectionPhoto[] = []
): Promise<boolean> {
  try {
    const result = await generateCompletePDF(
      mission,
      departureInspection,
      arrivalInspection,
      departurePhotos,
      arrivalPhotos
    );

    if (!result.success) {
      throw new Error(result.message);
    }

    const fileName = `Rapport_Complet_${mission.reference}_${new Date().toISOString().split('T')[0]}.pdf`;
    result.pdf.save(fileName);

    return true;
  } catch (error: any) {
    console.error('❌ Erreur téléchargement PDF:', error);
    return false;
  }
}
