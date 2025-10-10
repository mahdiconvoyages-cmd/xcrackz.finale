import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const getConditionLabel = (condition: string) => {
  switch (condition) {
    case 'excellent': return 'Excellent';
    case 'good': return 'Bon';
    case 'fair': return 'Moyen';
    case 'poor': return 'Mauvais';
    default: return condition;
  }
};

const getPhotoTypeLabel = (type: string) => {
  switch (type) {
    case 'front': return 'Vue avant';
    case 'back': return 'Vue arrière';
    case 'left_side': return 'Côté gauche';
    case 'right_side': return 'Côté droit';
    case 'interior': return 'Intérieur';
    case 'dashboard': return 'Tableau de bord';
    default: return type;
  }
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
        resolve(canvas.toDataURL('image/jpeg', 0.8));
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
  const doc = new jsPDF();
  let yPosition = 20;

  doc.setFontSize(24);
  doc.setTextColor(20, 184, 166);
  doc.text('ÉTAT DES LIEUX', 105, yPosition, { align: 'center' });

  yPosition += 10;
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text('Inspection Véhicule', 105, yPosition, { align: 'center' });

  yPosition += 15;
  doc.setDrawColor(20, 184, 166);
  doc.setLineWidth(0.5);
  doc.line(20, yPosition, 190, yPosition);

  yPosition += 10;

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS VÉHICULE', 20, yPosition);

  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const vehicleInfo = [
    ['Référence mission', mission.reference],
    ['Marque / Modèle', `${mission.vehicle_brand} ${mission.vehicle_model}`],
    ['Plaque d\'immatriculation', mission.vehicle_plate],
    ['Numéro VIN', mission.vehicle_vin || 'N/A'],
    ['Lieu de départ', mission.pickup_address],
    ['Lieu d\'arrivée', mission.delivery_address],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: vehicleInfo,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 110 },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  if (departureInspection) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(18);
    doc.setTextColor(20, 184, 166);
    doc.text('INSPECTION DÉPART', 105, yPosition, { align: 'center' });

    yPosition += 5;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const departureDate = new Date(departureInspection.completed_at || departureInspection.created_at);
    doc.text(
      `Effectuée le ${departureDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      105,
      yPosition,
      { align: 'center' }
    );

    yPosition += 10;
    doc.setDrawColor(20, 184, 166);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('ÉTAT GÉNÉRAL', 20, yPosition);

    yPosition += 8;
    doc.setFont('helvetica', 'normal');

    const departureData = [
      ['État général', getConditionLabel(departureInspection.overall_condition)],
      ['Niveau de carburant', `${departureInspection.fuel_level}%`],
      ['Kilométrage', `${(departureInspection.mileage_km || 0).toLocaleString()} km`],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: departureData,
      theme: 'striped',
      headStyles: { fillColor: [20, 184, 166] },
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 110 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    if (departureInspection.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVATIONS', 20, yPosition);
      yPosition += 6;
      doc.setFont('helvetica', 'normal');

      const splitNotes = doc.splitTextToSize(departureInspection.notes, 170);
      doc.text(splitNotes, 20, yPosition);
      yPosition += splitNotes.length * 5 + 10;
    }

    if (departurePhotos.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('PHOTOGRAPHIES', 20, yPosition);
      yPosition += 8;

      for (let i = 0; i < departurePhotos.length; i++) {
        const photo = departurePhotos[i];

        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        try {
          const imgData = await loadImageAsDataURL(photo.photo_url);
          const imgWidth = 80;
          const imgHeight = 60;

          doc.addImage(imgData, 'JPEG', 20 + (i % 2) * 95, yPosition, imgWidth, imgHeight);

          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(getPhotoTypeLabel(photo.photo_type), 20 + (i % 2) * 95, yPosition + imgHeight + 5);

          if (i % 2 === 1 || i === departurePhotos.length - 1) {
            yPosition += imgHeight + 15;
          }
        } catch (error) {
          console.error('Error loading photo:', error);
        }
      }
    }

    if (departureInspection.signature_url) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      yPosition += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('SIGNATURE', 20, yPosition);
      yPosition += 8;

      try {
        const sigData = await loadImageAsDataURL(departureInspection.signature_url);
        doc.addImage(sigData, 'PNG', 20, yPosition, 60, 30);
      } catch (error) {
        console.error('Error loading signature:', error);
      }
    }
  }

  if (arrivalInspection) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(18);
    doc.setTextColor(20, 184, 166);
    doc.text('INSPECTION ARRIVÉE', 105, yPosition, { align: 'center' });

    yPosition += 5;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const arrivalDate = new Date(arrivalInspection.completed_at || arrivalInspection.created_at);
    doc.text(
      `Effectuée le ${arrivalDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      105,
      yPosition,
      { align: 'center' }
    );

    yPosition += 10;
    doc.setDrawColor(20, 184, 166);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('ÉTAT GÉNÉRAL', 20, yPosition);

    yPosition += 8;
    doc.setFont('helvetica', 'normal');

    const arrivalData = [
      ['État général', getConditionLabel(arrivalInspection.overall_condition)],
      ['Niveau de carburant', `${arrivalInspection.fuel_level}%`],
      ['Kilométrage', `${(arrivalInspection.mileage_km || 0).toLocaleString()} km`],
    ];

    if (departureInspection) {
      const kmDiff = arrivalInspection.mileage_km - departureInspection.mileage_km;
      const fuelDiff = arrivalInspection.fuel_level - departureInspection.fuel_level;

      arrivalData.push(
        ['Distance parcourue', `${kmDiff.toLocaleString()} km`],
        ['Variation carburant', `${fuelDiff > 0 ? '+' : ''}${fuelDiff}%`]
      );
    }

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: arrivalData,
      theme: 'striped',
      headStyles: { fillColor: [20, 184, 166] },
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 110 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    if (arrivalInspection.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVATIONS', 20, yPosition);
      yPosition += 6;
      doc.setFont('helvetica', 'normal');

      const splitNotes = doc.splitTextToSize(arrivalInspection.notes, 170);
      doc.text(splitNotes, 20, yPosition);
      yPosition += splitNotes.length * 5 + 10;
    }

    if (arrivalPhotos.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('PHOTOGRAPHIES', 20, yPosition);
      yPosition += 8;

      for (let i = 0; i < arrivalPhotos.length; i++) {
        const photo = arrivalPhotos[i];

        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        try {
          const imgData = await loadImageAsDataURL(photo.photo_url);
          const imgWidth = 80;
          const imgHeight = 60;

          doc.addImage(imgData, 'JPEG', 20 + (i % 2) * 95, yPosition, imgWidth, imgHeight);

          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(getPhotoTypeLabel(photo.photo_type), 20 + (i % 2) * 95, yPosition + imgHeight + 5);

          if (i % 2 === 1 || i === arrivalPhotos.length - 1) {
            yPosition += imgHeight + 15;
          }
        } catch (error) {
          console.error('Error loading photo:', error);
        }
      }
    }

    if (arrivalInspection.signature_url) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      yPosition += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('SIGNATURE', 20, yPosition);
      yPosition += 8;

      try {
        const sigData = await loadImageAsDataURL(arrivalInspection.signature_url);
        doc.addImage(sigData, 'PNG', 20, yPosition, 60, 30);
      } catch (error) {
        console.error('Error loading signature:', error);
      }
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} sur ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
    doc.text(
      `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
      105,
      285,
      { align: 'center' }
    );
  }

  const filename = `Inspection_${mission.reference}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
