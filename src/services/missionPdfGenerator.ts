import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Mission {
  id: string;
  reference: string;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
  delivery_date: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  distance?: number;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  price: number;
  notes?: string;
  created_at: string;
}

interface Assignment {
  payment_ht?: number;
  commission?: number;
  notes?: string;
  assigned_at?: string;
  status?: string;
  assigner?: {
    email: string;
  };
}

// ✅ FIX UTF-8: Convertir les caractères accentués
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

export async function generateMissionPDF(mission: Mission, assignment?: Assignment) {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait'
  });

  const colors = {
    primary: [20, 184, 166], // Teal-500
    secondary: [6, 182, 212], // Cyan-500
    accent: [99, 102, 241], // Indigo-500
    dark: [15, 23, 42], // Slate-900
    gray: [100, 116, 139], // Slate-500
    lightGray: [226, 232, 240], // Slate-200
    success: [34, 197, 94], // Green-500
    warning: [251, 146, 60], // Orange-400
    info: [59, 130, 246], // Blue-500
    white: [255, 255, 255]
  };

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 0;

  // ========== HEADER AVEC DÉGRADÉ ==========
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Effet de dégradé (simulation avec transparence)
  doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  // doc.setGState(doc.GState({ opacity: 0.4 })); // GState non disponible dans cette version
  doc.circle(pageWidth - 20, 25, 35, 'F');
  doc.circle(15, 25, 25, 'F');
  // doc.setGState(doc.GState({ opacity: 1 }));

  // Icône de camion (emoji simplifié)
  doc.setFontSize(32);
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.text('🚚', margin, 30);

  // Titre
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.text('FEUILLE DE ROUTE', margin + 20, 25);

  // Référence
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(cleanText(mission.reference), margin + 20, 35);

  // Date de création
  doc.setFontSize(9);
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  // doc.setGState(doc.GState({ opacity: 0.8 }));
  doc.text(`Cree le: ${new Date(mission.created_at).toLocaleString('fr-FR')}`, pageWidth - margin, 25, { align: 'right' });
  // doc.setGState(doc.GState({ opacity: 1 }));

  // Statut badge
  const statusColors: any = {
    'pending': colors.warning,
    'in_progress': colors.info,
    'assigned': colors.accent,
    'completed': colors.success
  };
  const statusLabels: any = {
    'pending': 'EN ATTENTE',
    'in_progress': 'EN COURS',
    'assigned': 'ASSIGNEE',
    'completed': 'TERMINEE'
  };

  const statusColor = statusColors[mission.status] || colors.gray;
  const statusLabel = statusLabels[mission.status] || cleanText(mission.status.toUpperCase());

  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth - margin - 45, 32, 45, 8, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.text(statusLabel, pageWidth - margin - 22.5, 37, { align: 'center' });

  y = 58;

  // ========== INFORMATIONS VÉHICULE ==========
  doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 32, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text('VEHICULE', margin + 5, y + 8);

  y += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  doc.text(cleanText(`${mission.vehicle_brand} ${mission.vehicle_model}`), margin + 5, y);

  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
  doc.text(`Immatriculation: ${cleanText(mission.vehicle_plate)}`, margin + 5, y);

  if (mission.distance) {
    doc.text(`Distance: ${mission.distance} km`, pageWidth - margin - 5, y, { align: 'right' });
  }

  if (mission.price > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
    doc.text(`${mission.price.toFixed(2)} EUR`, pageWidth - margin - 5, y - 8, { align: 'right' });
  }

  y += 15;

  // ========== ITINÉRAIRE ==========
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text('ITINERAIRE', margin, y);
  y += 8;

  // Point de départ (VERT)
  doc.setFillColor(220, 252, 231); // Green-100
  doc.setDrawColor(34, 197, 94); // Green-500
  doc.setLineWidth(1);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 40, 3, 3, 'FD');

  // Icône et titre
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61); // Green-700
  doc.text('📍 DEPART', margin + 5, y + 8);

  // Date et heure
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
  doc.text(new Date(mission.pickup_date).toLocaleString('fr-FR', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }), pageWidth - margin - 5, y + 8, { align: 'right' });

  // Adresse
  y += 14;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  const pickupLines = doc.splitTextToSize(cleanText(mission.pickup_address), pageWidth - 2 * margin - 10);
  doc.text(pickupLines, margin + 5, y);
  y += pickupLines.length * 5;

  // Contact
  if (mission.pickup_contact_name) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.text(`Contact: ${cleanText(mission.pickup_contact_name)}`, margin + 5, y);
    if (mission.pickup_contact_phone) {
      doc.text(`Tel: ${mission.pickup_contact_phone}`, margin + 60, y);
    }
    y += 5;
  }

  y += 8;

  // Flèche de trajet
  doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.setLineWidth(2);
  // doc.setLineDash([2, 2], 0); // setLineDash non disponible dans cette version
  const arrowY = y;
  doc.line(margin + 10, arrowY, margin + 10, arrowY + 10);
  doc.line(margin + 10, arrowY + 10, margin + 8, arrowY + 8);
  doc.line(margin + 10, arrowY + 10, margin + 12, arrowY + 8);
  // doc.setLineDash([], 0);

  y += 15;

  // Point d'arrivée (ROUGE)
  doc.setFillColor(254, 226, 226); // Red-100
  doc.setDrawColor(239, 68, 68); // Red-500
  doc.setLineWidth(1);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 40, 3, 3, 'FD');

  // Icône et titre
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // Red-700
  doc.text('📍 ARRIVEE', margin + 5, y + 8);

  // Date et heure
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
  doc.text(new Date(mission.delivery_date).toLocaleString('fr-FR', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }), pageWidth - margin - 5, y + 8, { align: 'right' });

  // Adresse
  y += 14;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  const deliveryLines = doc.splitTextToSize(cleanText(mission.delivery_address), pageWidth - 2 * margin - 10);
  doc.text(deliveryLines, margin + 5, y);
  y += deliveryLines.length * 5;

  // Contact
  if (mission.delivery_contact_name) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.text(`Contact: ${cleanText(mission.delivery_contact_name)}`, margin + 5, y);
    if (mission.delivery_contact_phone) {
      doc.text(`Tel: ${mission.delivery_contact_phone}`, margin + 60, y);
    }
    y += 5;
  }

  y += 12;

  // ========== INFORMATIONS D'ASSIGNATION ==========
  if (assignment) {
    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('INFORMATIONS CHAUFFEUR', margin, y);
    y += 8;

    doc.setFillColor(249, 250, 251); // Gray-50
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 30, 2, 2, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);

    if (assignment.assigner?.email) {
      doc.text(`Assigne par: ${cleanText(assignment.assigner.email)}`, margin + 5, y + 7);
    }

    if (assignment.assigned_at) {
      doc.text(`Date: ${new Date(assignment.assigned_at).toLocaleString('fr-FR')}`, margin + 5, y + 14);
    }

    if (assignment.payment_ht) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
      doc.text(`Paiement HT: ${assignment.payment_ht.toFixed(2)} EUR`, margin + 5, y + 21);
    }

    if (assignment.commission) {
      doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.text(`Commission: ${assignment.commission.toFixed(2)} EUR`, pageWidth - margin - 5, y + 21, { align: 'right' });
    }

    y += 35;

    if (assignment.notes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.text('Notes:', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      const notesLines = doc.splitTextToSize(cleanText(assignment.notes), pageWidth - 2 * margin);
      doc.text(notesLines, margin, y);
      y += notesLines.length * 4;
    }
  }

  // ========== NOTES GÉNÉRALES ==========
  if (mission.notes) {
    y += 5;
    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('NOTES', margin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    const notesLines = doc.splitTextToSize(cleanText(mission.notes), pageWidth - 2 * margin);
    doc.text(notesLines, margin, y);
    y += notesLines.length * 4;
  }

  // ========== PIED DE PAGE ==========
  const footerY = pageHeight - 20;
  doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
  doc.text('XCRACKZ - Solution de gestion de transport', pageWidth / 2, footerY + 5, { align: 'center' });
  doc.text(`Page 1/1`, pageWidth - margin, footerY + 5, { align: 'right' });
  doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, margin, footerY + 5);

  // Téléchargement
  const fileName = `Mission_${cleanText(mission.reference)}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
