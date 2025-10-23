import jsPDF from 'jspdf';

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

export async function generateMissionPDF(mission: Mission, assignment?: Assignment) {
  const doc = new jsPDF();
  
  // Configuration
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // ========== HEADER ==========
  doc.setFillColor(59, 130, 246); // Blue
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('DÉTAILS DE LA MISSION', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text(mission.reference, pageWidth / 2, 32, { align: 'center' });

  y = 55;

  // ========== INFORMATIONS VÉHICULE ==========
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('🚗 Véhicule', margin, y);
  y += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${mission.vehicle_brand} ${mission.vehicle_model}`, margin + 5, y);
  y += 7;
  doc.text(`Plaque: ${mission.vehicle_plate}`, margin + 5, y);
  y += 7;
  doc.text(`Statut: ${mission.status}`, margin + 5, y);
  y += 15;

  // ========== ITINÉRAIRE ==========
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('📍 Itinéraire', margin, y);
  y += 10;

  // Point de départ
  doc.setFillColor(220, 252, 231); // Green light
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 35, 3, 3, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61); // Green dark
  doc.text('Départ', margin + 5, y + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(mission.pickup_address, margin + 5, y + 15);
  doc.text(`Date: ${new Date(mission.pickup_date).toLocaleString('fr-FR')}`, margin + 5, y + 22);
  
  if (mission.pickup_contact_name) {
    doc.text(`Contact: ${mission.pickup_contact_name}`, margin + 5, y + 29);
    if (mission.pickup_contact_phone) {
      doc.text(`📞 ${mission.pickup_contact_phone}`, margin + 80, y + 29);
    }
  }
  
  y += 45;

  // Point d'arrivée
  doc.setFillColor(254, 226, 226); // Red light
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 35, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // Red dark
  doc.text('Arrivée', margin + 5, y + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(mission.delivery_address, margin + 5, y + 15);
  doc.text(`Date: ${new Date(mission.delivery_date).toLocaleString('fr-FR')}`, margin + 5, y + 22);
  
  if (mission.delivery_contact_name) {
    doc.text(`Contact: ${mission.delivery_contact_name}`, margin + 5, y + 29);
    if (mission.delivery_contact_phone) {
      doc.text(`📞 ${mission.delivery_contact_phone}`, margin + 80, y + 29);
    }
  }
  
  y += 45;

  // ========== INFORMATIONS ASSIGNATION ==========
  if (assignment) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('💼 Assignation', margin, y);
    y += 10;

    doc.setFillColor(254, 243, 199); // Orange light
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 30, 3, 3, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    if (assignment.assigner?.email) {
      doc.text(`Assignée par: ${assignment.assigner.email}`, margin + 5, y + 8);
    }
    
    if (assignment.assigned_at) {
      doc.text(`Date d'assignation: ${new Date(assignment.assigned_at).toLocaleString('fr-FR')}`, margin + 5, y + 15);
    }
    
    if (assignment.payment_ht !== undefined) {
      doc.text(`Paiement HT: ${assignment.payment_ht.toFixed(2)}€`, margin + 5, y + 22);
      
      if (assignment.commission) {
        doc.text(`Commission: ${assignment.commission.toFixed(2)}€`, margin + 80, y + 22);
      }
    }
    
    y += 40;
  }

  // ========== NOTES ==========
  if (mission.notes || assignment?.notes) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('📝 Notes', margin, y);
    y += 10;

    doc.setFillColor(239, 246, 255); // Blue light
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 25, 3, 3, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const allNotes = [mission.notes, assignment?.notes].filter(Boolean).join(' | ');
    const splitNotes = doc.splitTextToSize(allNotes, pageWidth - 2 * margin - 10);
    doc.text(splitNotes, margin + 5, y + 8);
    
    y += 35;
  }

  // ========== FOOTER ==========
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, pageWidth / 2, footerY, { align: 'center' });
  doc.text('xCrackz - Gestion de Convoyage', pageWidth / 2, footerY + 6, { align: 'center' });

  // Télécharger le PDF
  const filename = `Mission_${mission.reference}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
