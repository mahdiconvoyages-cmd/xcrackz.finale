/**
 * 🎨 GÉNÉRATEUR PDF MODERNE - Rapports d'inspection
 * 
 * Design moderne violet avec:
 * - Header avec logo et infos mission
 * - Photos en grille 2x2 avec légendes
 * - Sections départ/arrivée séparées
 * - Schémas visuels pour les dommages
 * - Footer avec signatures
 * - Export optimisé pour impression
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ==========================================
// CONFIGURATION DESIGN
// ==========================================
const COLORS = {
  primary: '#8B7BE8',        // Violet principal
  primaryDark: '#6B5BC8',    // Violet foncé
  background: '#F8F7FF',     // Fond violet clair
  text: '#2D2A3E',           // Texte foncé
  textLight: '#6B7280',      // Texte gris
  border: '#E5E1F8',         // Bordure violet clair
  success: '#10B981',        // Vert
  warning: '#F59E0B',        // Orange
  danger: '#EF4444',         // Rouge
  white: '#FFFFFF',
};

const FONTS = {
  title: 20,
  subtitle: 14,
  body: 10,
  small: 8,
};

// ==========================================
// INTERFACES
// ==========================================
interface InspectionPhoto {
  id: string;
  photo_type: string;
  photo_url: string;
  description?: string;
  created_at: string;
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
  has_registration_card?: boolean;
  vehicle_is_full?: boolean;
  windshield_condition?: string;
  external_cleanliness?: string;
  internal_cleanliness?: string;
  completed_at: string;
  created_at: string;
}

interface MissionData {
  reference: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  vehicle_vin?: string;
  pickup_address: string;
  delivery_address: string;
  pickup_time?: string;
  delivery_time?: string;
}

// ==========================================
// UTILITAIRES
// ==========================================

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
};

const getPhotoTypeLabel = (type: string): string => {
  const labels: { [key: string]: string } = {
    front: '🚗 Vue Avant',
    back: '🚗 Vue Arrière',
    left_front: '◀️ Avant Gauche',
    left_back: '◀️ Arrière Gauche',
    right_front: '▶️ Avant Droit',
    right_back: '▶️ Arrière Droit',
    interior: '🪑 Intérieur',
    dashboard: '📊 Tableau de bord',
    delivery_receipt: '📄 PV de livraison',
    optional: '📸 Photo complémentaire',
  };
  return labels[type] || type;
};

const getConditionLabel = (condition?: string): string => {
  const labels: { [key: string]: string } = {
    excellent: '⭐⭐⭐⭐⭐ Excellent',
    good: '⭐⭐⭐⭐ Bon',
    fair: '⭐⭐⭐ Moyen',
    poor: '⭐⭐ Mauvais',
    very_poor: '⭐ Très mauvais',
  };
  return labels[condition || 'good'] || condition || 'Non renseigné';
};

const getWindshieldLabel = (condition?: string): string => {
  const labels: { [key: string]: string } = {
    perfect: '✓ Parfait',
    minor_chips: '⚠ Petits impacts',
    crack: '✗ Fissure',
    needs_replacement: '✗✗ À remplacer',
  };
  return labels[condition || 'perfect'] || condition || 'Non renseigné';
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Non renseigné';
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
};

// ==========================================
// CHARGEMENT IMAGES
// ==========================================

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', url, error);
    return null;
  }
}

// ==========================================
// GÉNÉRATION PDF
// ==========================================

export async function generateInspectionPDFModern(
  mission: MissionData,
  departureInspection: VehicleInspection | null,
  arrivalInspection: VehicleInspection | null,
  departurePhotos: InspectionPhoto[] = [],
  arrivalPhotos: InspectionPhoto[] = []
): Promise<{ pdf: jsPDF; success: boolean; message: string }> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // ==========================================
    // 1. HEADER MODERNE
    // ==========================================
    
    // Background header violet
    const [r, g, b] = hexToRgb(COLORS.primary);
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Titre blanc
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(FONTS.title);
    doc.setFont('helvetica', 'bold');
    doc.text('RAPPORT D\'INSPECTION VÉHICULE', pageWidth / 2, 15, { align: 'center' });

    // Référence mission
    doc.setFontSize(FONTS.body);
    doc.setFont('helvetica', 'normal');
    doc.text(`Référence: ${mission.reference}`, pageWidth / 2, 23, { align: 'center' });

    // Date génération
    doc.setFontSize(FONTS.small);
    doc.text(`Généré le ${formatDate(new Date().toISOString())}`, pageWidth / 2, 30, { align: 'center' });

    yPos = 55;

    // ==========================================
    // 2. INFORMATIONS VÉHICULE
    // ==========================================
    
    doc.setTextColor(...hexToRgb(COLORS.text));
    doc.setFontSize(FONTS.subtitle);
    doc.setFont('helvetica', 'bold');
    doc.text('🚗 INFORMATIONS VÉHICULE', margin, yPos);
    yPos += 8;

    // Box avec fond clair
    const [bgR, bgG, bgB] = hexToRgb(COLORS.background);
    doc.setFillColor(bgR, bgG, bgB);
    doc.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, 35, 3, 3, 'F');

    doc.setFontSize(FONTS.body);
    doc.setFont('helvetica', 'normal');
    
    const vehicleInfo = [
      [`Marque/Modèle:`, `${mission.vehicle_brand} ${mission.vehicle_model}`],
      [`Immatriculation:`, mission.vehicle_plate],
      [`VIN:`, mission.vehicle_vin || 'Non renseigné'],
      [`Départ:`, mission.pickup_address],
      [`Arrivée:`, mission.delivery_address],
    ];

    vehicleInfo.forEach(([label, value], index) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin + 5, yPos + 5 + index * 6);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 50, yPos + 5 + index * 6);
    });

    yPos += 45;

    // ==========================================
    // 3. INSPECTION DÉPART
    // ==========================================
    
    if (departureInspection) {
      // Vérifier si nouvelle page nécessaire
      if (yPos > pageHeight - 100) {
        doc.addPage();
        yPos = margin;
      }

      // Titre section
      doc.setFillColor(...hexToRgb(COLORS.success));
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(FONTS.subtitle);
      doc.setFont('helvetica', 'bold');
      doc.text('📤 INSPECTION DE DÉPART', margin + 3, yPos + 5.5);
      yPos += 12;

      doc.setTextColor(...hexToRgb(COLORS.text));

  // Informations inspection
  await addInspectionDetails(doc, departureInspection, margin, yPos, pageWidth);
  // Bloc propreté (si présent)
  yPos = addCleanlinessBlock(doc, departureInspection, margin, yPos + 40, pageWidth);

      // Photos départ
      if (departurePhotos.length > 0) {
        yPos = await addPhotoGrid(
          doc,
          departurePhotos,
          'Photos de départ',
          margin,
          yPos,
          pageWidth,
          pageHeight
        );
      }

      // Signatures (si présentes)
  yPos = await addSignaturesBlock(doc, departureInspection, margin, yPos);
    }

    // ==========================================
    // 4. INSPECTION ARRIVÉE
    // ==========================================
    
    if (arrivalInspection) {
      // Nouvelle page pour arrivée
      doc.addPage();
      yPos = margin;

      // Titre section
      doc.setFillColor(...hexToRgb(COLORS.warning));
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(FONTS.subtitle);
      doc.setFont('helvetica', 'bold');
      doc.text('📥 INSPECTION D\'ARRIVÉE', margin + 3, yPos + 5.5);
      yPos += 12;

      doc.setTextColor(...hexToRgb(COLORS.text));

  // Informations inspection
  await addInspectionDetails(doc, arrivalInspection, margin, yPos, pageWidth);
  // Bloc propreté (si présent)
  yPos = addCleanlinessBlock(doc, arrivalInspection, margin, yPos + 40, pageWidth);

      // Photos arrivée
      if (arrivalPhotos.length > 0) {
        yPos = await addPhotoGrid(
          doc,
          arrivalPhotos,
          'Photos d\'arrivée',
          margin,
          yPos,
          pageWidth,
          pageHeight
        );
      }

      // Signatures (si présentes)
  yPos = await addSignaturesBlock(doc, arrivalInspection, margin, yPos);
    }

    // ==========================================
    // 5. COMPARAISON DÉPART/ARRIVÉE (si les deux existent)
    // ==========================================
    
    if (departureInspection && arrivalInspection) {
      doc.addPage();
      yPos = margin;

      doc.setFontSize(FONTS.subtitle);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...hexToRgb(COLORS.primary));
      doc.text('📊 COMPARAISON DÉPART / ARRIVÉE', margin, yPos);
      yPos += 10;

      const comparisonData = [
        ['Critère', 'Départ', 'Arrivée', 'Différence'],
        [
          'Kilométrage',
          `${departureInspection.mileage_km || 0} km`,
          `${arrivalInspection.mileage_km || 0} km`,
          `+${(arrivalInspection.mileage_km || 0) - (departureInspection.mileage_km || 0)} km`,
        ],
        [
          'Niveau carburant',
          `${departureInspection.fuel_level !== undefined ? `${departureInspection.fuel_level}%` : 'N/A'}`,
          `${arrivalInspection.fuel_level !== undefined ? `${arrivalInspection.fuel_level}%` : 'N/A'}`,
          `${(arrivalInspection.fuel_level || 0) - (departureInspection.fuel_level || 0) >= 0 ? '+' : ''}${(arrivalInspection.fuel_level || 0) - (departureInspection.fuel_level || 0)}%`,
        ],
        [
          'État général',
          getConditionLabel(departureInspection.overall_condition),
          getConditionLabel(arrivalInspection.overall_condition),
          departureInspection.overall_condition === arrivalInspection.overall_condition ? '=' : '≠',
        ],
        [
          'Propreté extérieure',
          departureInspection.external_cleanliness || 'Non renseigné',
          arrivalInspection.external_cleanliness || 'Non renseigné',
          '-',
        ],
        [
          'Propreté intérieure',
          departureInspection.internal_cleanliness || 'Non renseigné',
          arrivalInspection.internal_cleanliness || 'Non renseigné',
          '-',
        ],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [comparisonData[0]],
        body: comparisonData.slice(1),
        theme: 'grid',
        headStyles: {
          fillColor: hexToRgb(COLORS.primary),
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: FONTS.body,
        },
        bodyStyles: {
          fontSize: FONTS.body,
        },
        margin: { left: margin, right: margin },
      });
    }

    // ==========================================
    // 6. FOOTER SUR TOUTES LES PAGES
    // ==========================================
    
    const totalPages = doc.internal.pages.length - 1; // -1 car pages[0] est vide
    
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Ligne de séparation
      const [borderR, borderG, borderB] = hexToRgb(COLORS.border);
      doc.setDrawColor(borderR, borderG, borderB);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
      
      // Texte footer
      doc.setFontSize(FONTS.small);
      doc.setTextColor(...hexToRgb(COLORS.textLight));
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Rapport d'inspection - ${mission.reference}`,
        margin,
        pageHeight - 12
      );
      doc.text(
        `Page ${i} / ${totalPages}`,
        pageWidth - margin,
        pageHeight - 12,
        { align: 'right' }
      );
    }

    return {
      pdf: doc,
      success: true,
      message: 'PDF généré avec succès',
    };
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return {
      pdf: new jsPDF(),
      success: false,
      message: error.message || 'Erreur génération PDF',
    };
  }
}

// ==========================================
// FONCTIONS AUXILIAIRES
// ==========================================

async function addInspectionDetails(
  doc: jsPDF,
  inspection: VehicleInspection,
  x: number,
  y: number,
  pageWidth: number
): Promise<void> {
  const boxWidth = pageWidth - 2 * x;
  
  // Box fond
  const [bgR, bgG, bgB] = hexToRgb(COLORS.background);
  doc.setFillColor(bgR, bgG, bgB);
  doc.roundedRect(x, y, boxWidth, 35, 3, 3, 'F');

  doc.setFontSize(FONTS.body);
  doc.setTextColor(...hexToRgb(COLORS.text));

  const details = [
    [`Date:`, formatDate(inspection.completed_at)],
    [`Kilométrage:`, `${inspection.mileage_km || 'N/A'} km`],
    [
      `Carburant:`,
      `$${''}` // placeholder to preserve array shape below
    ],
    [`État général:`, getConditionLabel(inspection.overall_condition)],
  ];

  // Remplacer la valeur carburant avec un format pourcentage ou N/A
  const fuelValue =
    inspection.fuel_level !== undefined ? `${inspection.fuel_level}%` : 'N/A';
  details[2][1] = fuelValue;

  // Colonne gauche
  details.slice(0, 2).forEach(([label, value], index) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, x + 5, y + 7 + index * 7);
    doc.setFont('helvetica', 'normal');
    doc.text(value, x + 35, y + 7 + index * 7);
  });

  // Colonne droite
  details.slice(2, 4).forEach(([label, value], index) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, x + boxWidth / 2, y + 7 + index * 7);
    doc.setFont('helvetica', 'normal');
    doc.text(value, x + boxWidth / 2 + 30, y + 7 + index * 7);
  });

  // Informations spécifiques départ
  if (inspection.keys_count !== undefined) {
    doc.setFont('helvetica', 'bold');
    doc.text('Clés:', x + 5, y + 21);
    doc.setFont('helvetica', 'normal');
    doc.text(`${inspection.keys_count}`, x + 35, y + 21);
  }

  if (inspection.windshield_condition) {
    doc.setFont('helvetica', 'bold');
    doc.text('Pare-brise:', x + boxWidth / 2, y + 21);
    doc.setFont('helvetica', 'normal');
    doc.text(getWindshieldLabel(inspection.windshield_condition), x + boxWidth / 2 + 30, y + 21);
  }

  // Client
  if (inspection.client_name) {
    doc.setFont('helvetica', 'bold');
    doc.text('Client:', x + 5, y + 28);
    doc.setFont('helvetica', 'normal');
    doc.text(inspection.client_name, x + 35, y + 28);
  }

  // Notes
  if (inspection.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(FONTS.small);
    const splitNotes = doc.splitTextToSize(inspection.notes, boxWidth - 10);
    doc.text(splitNotes, x + 5, y + 35);
  }
}

// Bloc additionnel pour afficher propreté extérieure/intérieure en texte simple
function addCleanlinessBlock(
  doc: jsPDF,
  inspection: VehicleInspection,
  x: number,
  y: number,
  pageWidth: number
): number {
  const hasExternal = !!inspection.external_cleanliness;
  const hasInternal = !!inspection.internal_cleanliness;
  if (!hasExternal && !hasInternal) return y; // rien à faire

  const boxWidth = pageWidth - 2 * x;
  const [bgR, bgG, bgB] = hexToRgb(COLORS.background);
  doc.setFillColor(bgR, bgG, bgB);
  const height = hasExternal && hasInternal ? 18 : 12;
  doc.roundedRect(x, y, boxWidth, height, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.body);
  doc.setTextColor(...hexToRgb(COLORS.text));
  doc.text('Propreté', x + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  if (hasExternal) {
    doc.text('Extérieure:', x + 35, y + 6);
    doc.text(inspection.external_cleanliness as string, x + 70, y + 6);
  }
  if (hasInternal) {
    const lineY = hasExternal ? y + 12 : y + 6;
    doc.text('Intérieure:', x + 35, lineY);
    doc.text(inspection.internal_cleanliness as string, x + 70, lineY);
  }

  return y + height + 8; // retourner le nouveau y après le bloc
}

async function addPhotoGrid(
  doc: jsPDF,
  photos: InspectionPhoto[],
  title: string,
  x: number,
  y: number,
  pageWidth: number,
  pageHeight: number
): Promise<number> {
  let currentY = y;

  // Titre section photos
  doc.setFontSize(FONTS.body);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(COLORS.text));
  doc.text(title + ` (${photos.length})`, x, currentY);
  currentY += 8;

  // Configuration grille 2x2
  const cols = 2;
  const imageSize = (pageWidth - 2 * x - 10) / cols; // 10mm d'espacement
  const spacing = 5;

  for (let i = 0; i < photos.length; i += cols) {
    // Vérifier si besoin nouvelle page
    if (currentY + imageSize + 15 > pageHeight - 30) {
      doc.addPage();
      currentY = x;
    }

    // Dessiner 2 photos côte à côte
    for (let j = 0; j < cols && i + j < photos.length; j++) {
      const photo = photos[i + j];
      const xPos = x + j * (imageSize + spacing);

      // Box photo avec bordure
      const [borderR, borderG, borderB] = hexToRgb(COLORS.border);
      doc.setDrawColor(borderR, borderG, borderB);
      doc.setLineWidth(0.5);
      doc.rect(xPos, currentY, imageSize, imageSize);

      // Label type de photo
      doc.setFillColor(...hexToRgb(COLORS.primary));
      doc.rect(xPos, currentY + imageSize, imageSize, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(FONTS.small);
      doc.setFont('helvetica', 'bold');
      const label = getPhotoTypeLabel(photo.photo_type);
      doc.text(label, xPos + imageSize / 2, currentY + imageSize + 4, { align: 'center' });

      // Charger et afficher l'image
      try {
        const imgData = await loadImageAsBase64(photo.photo_url);
        if (imgData) {
          doc.addImage(imgData, 'JPEG', xPos + 1, currentY + 1, imageSize - 2, imageSize - 2);
        } else {
          // Placeholder si image non chargée
          doc.setTextColor(...hexToRgb(COLORS.textLight));
          doc.setFontSize(FONTS.small);
          doc.text('Image non disponible', xPos + imageSize / 2, currentY + imageSize / 2, { align: 'center' });
        }
      } catch (error) {
        console.error('Error loading photo:', photo.photo_url, error);
      }

      // Description si disponible
      if (photo.description) {
        doc.setTextColor(...hexToRgb(COLORS.text));
        doc.setFontSize(FONTS.small);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(photo.description, imageSize - 4);
        doc.text(descLines.slice(0, 2), xPos + 2, currentY + imageSize + 10);
      }
    }

    currentY += imageSize + 20; // Hauteur image + label + description
  }

  return currentY + 5;
}

// Ajoute les signatures client/conducteur avec affichage du nom sous l'image
async function addSignaturesBlock(
  doc: jsPDF,
  inspection: VehicleInspection,
  x: number,
  y: number
): Promise<number> {
  const hasClient = !!inspection.client_signature;
  const hasDriver = !!inspection.driver_signature;
  if (!hasClient && !hasDriver) return y;

  const blockTop = y + 8;
  doc.setFontSize(FONTS.body);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(COLORS.text));
  doc.text('✍️ Signatures', x, y + 5);

  let usedHeight = 0;

  // Client signature on the left
  if (hasClient) {
    try {
      const sig = await loadImageAsBase64(inspection.client_signature as string);
      if (sig) {
        doc.setFont('helvetica', 'bold');
        doc.text('Client:', x, blockTop);
        doc.addImage(sig, 'PNG', x, blockTop + 3, 60, 20);
        doc.setFont('helvetica', 'normal');
        doc.text(inspection.client_name || 'Signataire', x, blockTop + 27);
        usedHeight = Math.max(usedHeight, 30);
      }
    } catch (e) {
      console.error('Erreur chargement signature client:', e);
    }
  }

  // Driver signature on the right
  if (hasDriver) {
    try {
      const sig = await loadImageAsBase64(inspection.driver_signature as string);
      if (sig) {
        const xRight = x + 80;
        doc.setFont('helvetica', 'bold');
        doc.text('Conducteur:', xRight, blockTop);
        doc.addImage(sig, 'PNG', xRight, blockTop + 3, 60, 20);
        doc.setFont('helvetica', 'normal');
        doc.text(inspection.driver_name || 'Conducteur', xRight, blockTop + 27);
        usedHeight = Math.max(usedHeight, 30);
      }
    } catch (e) {
      console.error('Erreur chargement signature conducteur:', e);
    }
  }

  return blockTop + usedHeight + 5;
}

// ==========================================
// EXPORT
// ==========================================

export default generateInspectionPDFModern;
