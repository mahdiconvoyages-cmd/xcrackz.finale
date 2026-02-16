import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface InspectionPhoto {
  id: string;
  photo_type: string;
  photo_url: string;
  created_at: string;
}

interface VehicleInspection {
  id: string;
  inspection_type: 'departure' | 'arrival';
  overall_condition: string;
  fuel_level: number;
  mileage_km: number;
  notes: string;
  signature_url: string | null;
  // Signatures enrichies
  driver_signature?: string | null;
  driver_name?: string | null;
  client_signature?: string | null;
  client_name?: string | null;
  completed_at: string;
  created_at: string;
}

interface MissionData {
  reference: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  vehicle_vin: string;
  pickup_address: string;
  delivery_address: string;
}

// ✅ FIX UTF-8
const cleanText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ýÿ]/g, 'y')
    .replace(/ç/g, 'c')
    .replace(/ñ/g, 'n')
    .replace(/[ÀÁÂÃÄÅ]/g, 'A')
    .replace(/[ÈÉÊË]/g, 'E')
    .replace(/[ÌÍÎÏ]/g, 'I')
    .replace(/[ÒÓÔÕÖ]/g, 'O')
    .replace(/[ÙÚÛÜ]/g, 'U')
    .replace(/Ç/g, 'C')
    .replace(/Ñ/g, 'N')
    .replace(/€/g, 'EUR')
    .replace(/°/g, 'deg');
};

const getConditionLabel = (condition: string) => {
  const labels: any = {
    'excellent': 'Excellent',
    'good': 'Bon',
    'fair': 'Moyen',
    'poor': 'Mauvais'
  };
  return cleanText(labels[condition] || condition);
};

const getPhotoTypeLabel = (type: string) => {
  const labels: any = {
    'front': 'Vue avant',
    'back': 'Vue arriere',
    'left_side': 'Cote gauche',
    'right_side': 'Cote droit',
    'interior': 'Interieur',
    'dashboard': 'Tableau de bord',
    'damage': 'Dommage',
    'other': 'Autre'
  };
  return labels[type] || cleanText(type);
};

const loadImageAsDataURL = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        reject(new Error('Cannot get canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

export const generateInspectionPDF = async (
  mission: MissionData,
  departureInspection: VehicleInspection | null,
  arrivalInspection: VehicleInspection | null,
  departurePhotos: InspectionPhoto[],
  arrivalPhotos: InspectionPhoto[]
) => {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait'
  });

  const colors = {
    primary: [20, 184, 166],
    secondary: [6, 182, 212],
    dark: [15, 23, 42],
    gray: [100, 116, 139],
    lightGray: [241, 245, 249],
    success: [34, 197, 94],
    warning: [251, 191, 36],
    danger: [239, 68, 68],
    white: [255, 255, 255]
  };

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 0;

  // ========== HEADER ==========
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Gradient effect removed (no setGState typings); keep simple decorative circles
  doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  doc.circle(pageWidth - 25, 25, 40, 'F');
  doc.circle(20, 25, 30, 'F');

  // Icône
  doc.setFontSize(28);
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.text('📋', margin, 30);

  // Titre
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORT D\'INSPECTION', margin + 18, 22);

  // Sous-titre
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Etat des lieux du vehicule', margin + 18, 32);

  // Référence mission
  doc.setFontSize(10);
  doc.text(`Mission: ${cleanText(mission.reference)}`, pageWidth - margin, 25, { align: 'right' });
  doc.setFontSize(8);
  doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - margin, 32, { align: 'right' });

  y = 58;

  // ========== INFORMATIONS VÉHICULE ==========
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 28, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text('INFORMATIONS VEHICULE', margin + 5, y + 8);

  y += 14;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  doc.text(cleanText(`${mission.vehicle_brand} ${mission.vehicle_model}`), margin + 5, y);

  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
  doc.text(`Immatriculation: ${cleanText(mission.vehicle_plate)}`, margin + 5, y);
  
  if (mission.vehicle_vin) {
    doc.text(`VIN: ${cleanText(mission.vehicle_vin)}`, pageWidth - margin - 5, y, { align: 'right' });
  }

  y += 12;

  // ========== INSPECTION DE DÉPART ==========
  if (departureInspection) {
    y += 5;
  doc.setDrawColor(colors.success[0], colors.success[1], colors.success[2]);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
    doc.text('📍 INSPECTION DE DEPART', margin, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  // TS2556 fix: replace spread with explicit RGB components
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.text(new Date(departureInspection.completed_at).toLocaleString('fr-FR'), pageWidth - margin, y, { align: 'right' });

    y += 8;

    // Tableau des détails
    const departureData = [
      ['Etat general', getConditionLabel(departureInspection.overall_condition)],
      ['Niveau carburant', `${departureInspection.fuel_level}%`],
      ['Kilometrage', `${departureInspection.mileage_km} km`]
    ];

    (doc as any).autoTable({
      startY: y,
      head: [['Critere', 'Valeur']],
      body: departureData,
      theme: 'grid',
      headStyles: {
        fillColor: colors.success,
        textColor: colors.white,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: colors.dark
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      },
      margin: { left: margin, right: margin }
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // Notes
    if (departureInspection.notes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.text('Notes:', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      const notesLines = doc.splitTextToSize(cleanText(departureInspection.notes), pageWidth - 2 * margin);
      doc.text(notesLines, margin, y);
      y += notesLines.length * 4 + 3;
    }

    // Photos de départ
    if (departurePhotos.length > 0) {
      y += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
      doc.text(`Photos de depart (${departurePhotos.length})`, margin, y);
      y += 8;

      const photoWidth = 40;
      const photoHeight = 30;
      const photosPerRow = 4;
      const photoSpacing = 5;

      for (let i = 0; i < departurePhotos.length; i++) {
        if (y + photoHeight + 15 > pageHeight - 20) {
          doc.addPage();
          y = margin;
        }

        const photo = departurePhotos[i];
        const col = i % photosPerRow;
        const x = margin + col * (photoWidth + photoSpacing);

        if (col === 0 && i > 0) {
          y += photoHeight + 15;
        }

        try {
          const imageData = await loadImageAsDataURL(photo.photo_url);
          doc.addImage(imageData, 'JPEG', x, y, photoWidth, photoHeight);
          
          doc.setDrawColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
          doc.setLineWidth(0.5);
          doc.rect(x, y, photoWidth, photoHeight);

          doc.setFontSize(7);
          doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
          const label = getPhotoTypeLabel(photo.photo_type);
          doc.text(label, x + photoWidth / 2, y + photoHeight + 4, { align: 'center' });
        } catch (error) {
          console.error('Error loading photo:', error);
          doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
          doc.rect(x, y, photoWidth, photoHeight, 'F');
          doc.setFontSize(8);
          doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
          doc.text('Image non disponible', x + photoWidth / 2, y + photoHeight / 2, { align: 'center' });
        }
      }

      y += photoHeight + 15;
    }

    // Signatures (convoyeur + client)
    if (departureInspection.driver_signature || departureInspection.client_signature || departureInspection.signature_url) {
      y += 5;
      if (y + 30 > pageHeight - 20) {
        doc.addPage();
        y = margin;
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.text('Signatures:', margin, y);
      y += 5;

      const sigWidth = 60;
      const sigHeight = 20;
      const gap = 10;
      let xPos = margin;

      // Convoyeur
      if (departureInspection.driver_signature) {
        try {
          const driverData = await loadImageAsDataURL(departureInspection.driver_signature);
          doc.addImage(driverData, 'PNG', xPos, y, sigWidth, sigHeight);
        } catch (e) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
          doc.text('Signature convoyeur indisponible', xPos, y + 10);
        }
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
        doc.text(`Convoyeur${departureInspection.driver_name ? ': ' + cleanText(departureInspection.driver_name) : ''}`, xPos, y + sigHeight + 5);
        xPos += sigWidth + gap;
      }

      // Client
      const clientSig = departureInspection.client_signature || departureInspection.signature_url;
      if (clientSig) {
        try {
          const clientData = await loadImageAsDataURL(clientSig);
          doc.addImage(clientData, 'PNG', xPos, y, sigWidth, sigHeight);
        } catch (e) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
          doc.text('Signature client indisponible', xPos, y + 10);
        }
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
        doc.text(`Client${departureInspection.client_name ? ': ' + cleanText(departureInspection.client_name) : ''}`, xPos, y + sigHeight + 5);
      }

      y += sigHeight + 10;
    }
  }

  // ========== INSPECTION D'ARRIVÉE ==========
  if (arrivalInspection) {
    if (y + 50 > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }

    y += 8;
  doc.setDrawColor(colors.danger[0], colors.danger[1], colors.danger[2]);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.danger[0], colors.danger[1], colors.danger[2]);
    doc.text('📍 INSPECTION D\'ARRIVEE', margin, y);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.text(new Date(arrivalInspection.completed_at).toLocaleString('fr-FR'), pageWidth - margin, y, { align: 'right' });

    y += 8;

    // Tableau des détails
    const arrivalData = [
      ['Etat general', getConditionLabel(arrivalInspection.overall_condition)],
      ['Niveau carburant', `${arrivalInspection.fuel_level}%`],
      ['Kilometrage', `${arrivalInspection.mileage_km} km`]
    ];

    // Calcul différence kilométrage
    if (departureInspection) {
      const kmDiff = arrivalInspection.mileage_km - departureInspection.mileage_km;
      arrivalData.push(['Distance parcourue', `${kmDiff} km`]);
    }

    (doc as any).autoTable({
      startY: y,
      head: [['Critere', 'Valeur']],
      body: arrivalData,
      theme: 'grid',
      headStyles: {
        fillColor: colors.danger,
        textColor: colors.white,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: colors.dark
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      },
      margin: { left: margin, right: margin }
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // Notes
    if (arrivalInspection.notes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.text('Notes:', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      const notesLines = doc.splitTextToSize(cleanText(arrivalInspection.notes), pageWidth - 2 * margin);
      doc.text(notesLines, margin, y);
      y += notesLines.length * 4 + 3;
    }

    // Photos d'arrivée
    if (arrivalPhotos.length > 0) {
      y += 5;
      if (y + 50 > pageHeight - 20) {
        doc.addPage();
        y = margin;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.danger[0], colors.danger[1], colors.danger[2]);
      doc.text(`Photos d'arrivee (${arrivalPhotos.length})`, margin, y);
      y += 8;

      const photoWidth = 40;
      const photoHeight = 30;
      const photosPerRow = 4;
      const photoSpacing = 5;

      for (let i = 0; i < arrivalPhotos.length; i++) {
        if (y + photoHeight + 15 > pageHeight - 20) {
          doc.addPage();
          y = margin;
        }

        const photo = arrivalPhotos[i];
        const col = i % photosPerRow;
        const x = margin + col * (photoWidth + photoSpacing);

        if (col === 0 && i > 0) {
          y += photoHeight + 15;
        }

        try {
          const imageData = await loadImageAsDataURL(photo.photo_url);
          doc.addImage(imageData, 'JPEG', x, y, photoWidth, photoHeight);
          
          doc.setDrawColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
          doc.setLineWidth(0.5);
          doc.rect(x, y, photoWidth, photoHeight);

          doc.setFontSize(7);
          doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
          const label = getPhotoTypeLabel(photo.photo_type);
          doc.text(label, x + photoWidth / 2, y + photoHeight + 4, { align: 'center' });
        } catch (error) {
          console.error('Error loading photo:', error);
          doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
          doc.rect(x, y, photoWidth, photoHeight, 'F');
          doc.setFontSize(8);
          doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
          doc.text('Image non disponible', x + photoWidth / 2, y + photoHeight / 2, { align: 'center' });
        }
      }

      y += photoHeight + 15;
    }

    // Signatures (convoyeur + client) arrivée
    if (arrivalInspection.driver_signature || arrivalInspection.client_signature || arrivalInspection.signature_url) {
      y += 5;
      if (y + 30 > pageHeight - 20) {
        doc.addPage();
        y = margin;
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.text('Signatures:', margin, y);
      y += 5;

      const sigWidthA = 60;
      const sigHeightA = 20;
      const gapA = 10;
      let xPosA = margin;

      if (arrivalInspection.driver_signature) {
        try {
          const driverDataA = await loadImageAsDataURL(arrivalInspection.driver_signature);
          doc.addImage(driverDataA, 'PNG', xPosA, y, sigWidthA, sigHeightA);
        } catch (e) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
          doc.text('Signature convoyeur indisponible', xPosA, y + 10);
        }
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
        doc.text(`Convoyeur${arrivalInspection.driver_name ? ': ' + cleanText(arrivalInspection.driver_name) : ''}`, xPosA, y + sigHeightA + 5);
        xPosA += sigWidthA + gapA;
      }

      const clientSigA = arrivalInspection.client_signature || arrivalInspection.signature_url;
      if (clientSigA) {
        try {
          const clientDataA = await loadImageAsDataURL(clientSigA);
          doc.addImage(clientDataA, 'PNG', xPosA, y, sigWidthA, sigHeightA);
        } catch (e) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
          doc.text('Signature client indisponible', xPosA, y + 10);
        }
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
        doc.text(`Client${arrivalInspection.client_name ? ': ' + cleanText(arrivalInspection.client_name) : ''}`, xPosA, y + sigHeightA + 5);
      }
    }
  }

  // ========== PIED DE PAGE (toutes les pages) ==========
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 15;
    
  doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.text('CHECKSFLEET - Rapport d\'inspection vehicule', pageWidth / 2, footerY + 5, { align: 'center' });
    doc.text(`Page ${i}/${totalPages}`, pageWidth - margin, footerY + 5, { align: 'right' });
    doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, margin, footerY + 5);
  }

  // Téléchargement
  const fileName = `Inspection_${cleanText(mission.reference)}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
