/**
 * Service de génération PDF professionnel pour rapports d'inspection
 * 
 * Fonctionnalités:
 * - Photos embedées en base64
 * - Mise en page professionnelle avec jsPDF
 * - Métadonnées PDF complètes
 * - Support multi-pages automatique
 * - Headers et footers sur chaque page
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Nettoyer le texte pour le PDF (éviter les hiéroglyphes)
 */
function cleanTextForPDF(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .normalize('NFD') // Décomposer les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Retirer les accents
    .replace(/[^\x00-\x7F]/g, ''); // Retirer les caractères non-ASCII
}

interface Photo {
  id?: string;
  photo_url: string;
  photo_type: string;
  created_at?: string;
}

interface InspectionData {
  id: string;
  inspection_type: 'departure' | 'arrival';
  created_at: string;
  completed_at?: string;
  mileage_km?: number;
  fuel_level?: number;
  overall_condition?: string;
  windshield_condition?: string;
  external_cleanliness?: string;
  internal_cleanliness?: string;
  keys_count?: number;
  has_spare_wheel?: boolean;
  has_repair_kit?: boolean;
  has_vehicle_documents?: boolean;
  has_registration_card?: boolean;
  vehicle_is_full?: boolean;
  notes?: string;
  client_name?: string;
  client_signature?: string;
  inspector_signature?: string;
  mission?: {
    reference: string;
    pickup_address: string;
    delivery_address: string;
    vehicle_brand: string;
    vehicle_model: string;
    vehicle_plate: string;
    client_name?: string;
    client_email?: string;
    client_phone?: string;
  };
  photos?: Photo[];
}

/**
 * Convertir une image URL en base64 avec retry
 */
async function imageUrlToBase64(url: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      if (i === retries - 1) {
        console.error('Erreur conversion image après', retries, 'tentatives:', error);
        return '';
      }
      // Attendre avant de réessayer
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return '';
}

/**
 * Générer un PDF professionnel avec jsPDF
 */
export async function generateInspectionPDFPro(
  inspection: InspectionData
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
  try {
    console.log('📄 Génération PDF professionnel...');

    // Créer le document PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Métadonnées
    doc.setProperties({
      title: `Inspection ${inspection.inspection_type} - ${inspection.mission?.reference || 'N/A'}`,
      subject: `Rapport d'inspection véhicule`,
      author: 'Finality Transport',
      keywords: 'inspection, véhicule, transport, convoyage',
      creator: 'Finality Transport Platform'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = margin;

    // Couleurs
    const primaryColor = inspection.inspection_type === 'departure' 
      ? [16, 185, 129] // Green
      : [59, 130, 246]; // Blue
    
    const secondaryColor = [100, 116, 139]; // Gray

    // ==========================================
    // HEADER PAGE 1
    // ==========================================
    
    // Rectangle header avec gradient simulé
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // Titre
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const title = inspection.inspection_type === 'departure' 
      ? 'INSPECTION ENLEVEMENT' 
      : 'INSPECTION LIVRAISON';
    doc.text(title, pageWidth / 2, 20, { align: 'center' });
    
    // Sous-titre
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Mission ${cleanTextForPDF(inspection.mission?.reference) || 'N/A'}`,
      pageWidth / 2,
      30,
      { align: 'center' }
    );
    
    // Date
    doc.setFontSize(10);
    doc.text(
      format(new Date(inspection.created_at), "d MMMM yyyy 'a' HH:mm", { locale: fr }),
      pageWidth / 2,
      38,
      { align: 'center' }
    );

    currentY = 60;

    // ==========================================
    // INFORMATIONS VÉHICULE
    // ==========================================
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('🚗 Véhicule', margin, currentY);
    
    currentY += 8;
    
    // Box informations
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 35);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    currentY += 8;
    doc.text(
      `Marque/Modele: ${cleanTextForPDF(inspection.mission?.vehicle_brand) || 'N/A'} ${cleanTextForPDF(inspection.mission?.vehicle_model) || 'N/A'}`,
      margin + 5,
      currentY
    );
    
    currentY += 7;
    doc.text(
      `Immatriculation: ${cleanTextForPDF(inspection.mission?.vehicle_plate) || 'N/A'}`,
      margin + 5,
      currentY
    );
    
    currentY += 7;
    if (inspection.mileage_km !== undefined) {
      doc.text(
        `Kilometrage: ${inspection.mileage_km.toLocaleString('fr-FR')} km`,
        margin + 5,
        currentY
      );
    }
    
    currentY += 7;
    if (inspection.fuel_level !== undefined) {
      doc.text(
        `Niveau carburant: ${inspection.fuel_level}%`,
        margin + 5,
        currentY
      );
    }

    currentY += 15;

    // ==========================================
    // ITINÉRAIRE
    // ==========================================
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Itineraire', margin, currentY);
    
    currentY += 8;
    
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 25);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    currentY += 7;
    const pickupLines = doc.splitTextToSize(
      `Enlevement: ${cleanTextForPDF(inspection.mission?.pickup_address) || 'Non specifie'}`,
      pageWidth - 2 * margin - 10
    );
    doc.text(pickupLines, margin + 5, currentY);
    
    currentY += pickupLines.length * 5 + 3;
    const deliveryLines = doc.splitTextToSize(
      `Livraison: ${cleanTextForPDF(inspection.mission?.delivery_address) || 'Non specifie'}`,
      pageWidth - 2 * margin - 10
    );
    doc.text(deliveryLines, margin + 5, currentY);

    currentY += deliveryLines.length * 5 + 10;

    // ==========================================
    // ETAT GENERAL
    // ==========================================
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Etat General', margin, currentY);
    
    currentY += 8;
    
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const stateBoxHeight = 30;
    doc.rect(margin, currentY, pageWidth - 2 * margin, stateBoxHeight);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    currentY += 8;
    doc.text(
      `Etat general: ${cleanTextForPDF(inspection.overall_condition) || 'N/A'}`,
      margin + 5,
      currentY
    );

    currentY += 7;
    if (inspection.external_cleanliness) {
      doc.text(
        `Proprete exterieure: ${cleanTextForPDF(inspection.external_cleanliness)}`,
        margin + 5,
        currentY
      );
    }

    currentY += 7;
    if (inspection.internal_cleanliness) {
      doc.text(
        `Proprete interieure: ${cleanTextForPDF(inspection.internal_cleanliness)}`,
        margin + 5,
        currentY
      );
    }

    currentY += 12;

    // ==========================================
    // NOTES
    // ==========================================
    
    if (inspection.notes) {
      // Vérifier si on a assez d'espace, sinon nouvelle page
      if (currentY > pageHeight - 80) {
        doc.addPage();
        currentY = margin;
        addPageHeader(doc, inspection, primaryColor);
        currentY += 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes', margin, currentY);
      
      currentY += 8;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const notesLines = doc.splitTextToSize(cleanTextForPDF(inspection.notes), pageWidth - 2 * margin - 10);
      doc.rect(margin, currentY, pageWidth - 2 * margin, notesLines.length * 5 + 10);
      
      currentY += 7;
      doc.text(notesLines, margin + 5, currentY);
      
      currentY += notesLines.length * 5 + 15;
    }

    // ==========================================
    // PHOTOS
    // ==========================================
    
    if (inspection.photos && inspection.photos.length > 0) {
      console.log(`📸 Conversion de ${inspection.photos.length} photos en base64...`);
      
      // Nouvelle page pour les photos
      doc.addPage();
      currentY = margin;
      addPageHeader(doc, inspection, primaryColor);
      currentY += 20;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`📸 Photos (${inspection.photos.length})`, margin, currentY);
      
      currentY += 10;

      // Grille 2x2
      const photosPerRow = 2;
      const photoWidth = (pageWidth - 2 * margin - 10) / photosPerRow;
      const photoHeight = photoWidth * 0.75; // Ratio 4:3

      let photoIndex = 0;
      let row = 0;
      let col = 0;

      for (const photo of inspection.photos) {
        // Vérifier si on a besoin d'une nouvelle page
        if (currentY + photoHeight + 20 > pageHeight - 20) {
          doc.addPage();
          currentY = margin;
          addPageHeader(doc, inspection, primaryColor);
          currentY += 20;
          row = 0;
        }

        // Convertir l'image en base64
        const base64 = await imageUrlToBase64(photo.photo_url);
        
        if (base64) {
          const x = margin + col * (photoWidth + 5);
          const y = currentY + row * (photoHeight + 15);

          // Label photo
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(
            photo.photo_type.replace(/_/g, ' '),
            x,
            y - 2
          );

          // Cadre photo
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.rect(x, y, photoWidth, photoHeight);

          try {
            // Ajouter l'image
            doc.addImage(
              base64,
              'JPEG',
              x + 1,
              y + 1,
              photoWidth - 2,
              photoHeight - 2,
              `photo-${photoIndex}`,
              'FAST'
            );
          } catch (error) {
            console.error('Erreur ajout image:', error);
            // Afficher un placeholder
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('Image non disponible', x + photoWidth / 2, y + photoHeight / 2, {
              align: 'center'
            });
            doc.setTextColor(0, 0, 0);
          }
        }

        col++;
        if (col >= photosPerRow) {
          col = 0;
          row++;
        }

        photoIndex++;
      }

      currentY += Math.ceil(inspection.photos.length / photosPerRow) * (photoHeight + 15) + 10;
    }

    // ==========================================
    // SIGNATURES
    // ==========================================
    
    // Vérifier si on a assez d'espace
    if (currentY > pageHeight - 80) {
      doc.addPage();
      currentY = margin;
      addPageHeader(doc, inspection, primaryColor);
      currentY += 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Signatures', margin, currentY);
    
    currentY += 10;

    const sigWidth = (pageWidth - 2 * margin - 10) / 2;
    const sigHeight = 40;

    // Signature inspecteur
    if (inspection.inspector_signature) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Inspecteur', margin, currentY);
      
      currentY += 5;
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, currentY, sigWidth, sigHeight);
      
      const sigBase64 = inspection.inspector_signature.startsWith('data:')
        ? inspection.inspector_signature
        : await imageUrlToBase64(inspection.inspector_signature);
      
      if (sigBase64) {
        try {
          doc.addImage(
            sigBase64,
            'PNG',
            margin + 5,
            currentY + 5,
            sigWidth - 10,
            sigHeight - 10,
            'signature-inspector',
            'FAST'
          );
        } catch (error) {
          console.error('Erreur signature inspecteur:', error);
        }
      }
    }

    // Signature client
    if (inspection.client_signature) {
      const clientX = margin + sigWidth + 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Client', clientX, currentY);
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(clientX, currentY + 5, sigWidth, sigHeight);
      
      const sigBase64 = inspection.client_signature.startsWith('data:')
        ? inspection.client_signature
        : await imageUrlToBase64(inspection.client_signature);
      
      if (sigBase64) {
        try {
          doc.addImage(
            sigBase64,
            'PNG',
            clientX + 5,
            currentY + 10,
            sigWidth - 10,
            sigHeight - 10,
            'signature-client',
            'FAST'
          );
        } catch (error) {
          console.error('Erreur signature client:', error);
        }
      }

      if (inspection.client_name) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(cleanTextForPDF(inspection.client_name), clientX + sigWidth / 2, currentY + sigHeight + 10, {
          align: 'center'
        });
      }
    }

    // ==========================================
    // FOOTER SUR CHAQUE PAGE
    // ==========================================
    
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addPageFooter(doc, i, totalPages, inspection);
    }

    console.log('✅ PDF généré avec succès');

    const blob = doc.output('blob');
    return { success: true, blob };

  } catch (error: any) {
    console.error('❌ Erreur génération PDF:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ajouter un header sur les pages suivantes
 */
function addPageHeader(doc: jsPDF, inspection: InspectionData, color: number[]) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(0, 0, pageWidth, 15, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const title = inspection.inspection_type === 'departure' ? 'ENLÈVEMENT' : 'LIVRAISON';
  doc.text(
    `${title} - ${inspection.mission?.reference || 'N/A'}`,
    pageWidth / 2,
    10,
    { align: 'center' }
  );
  
  doc.setTextColor(0, 0, 0);
}

/**
 * Ajouter un footer sur chaque page
 */
function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number, inspection: InspectionData) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  
  // Gauche: Date génération
  doc.text(
    `Genere le ${format(new Date(), 'dd/MM/yyyy a HH:mm', { locale: fr })}`,
    20,
    pageHeight - 10
  );
  
  // Centre: Finality Transport
  doc.text(
    'Finality Transport - Rapport d\'inspection',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  
  // Droite: Pagination
  doc.text(
    `Page ${pageNum}/${totalPages}`,
    pageWidth - 20,
    pageHeight - 10,
    { align: 'right' }
  );
  
  doc.setTextColor(0, 0, 0);
}

/**
 * Télécharger le PDF
 */
export async function downloadInspectionPDFPro(inspection: InspectionData): Promise<boolean> {
  try {
    const result = await generateInspectionPDFPro(inspection);
    
    if (!result.success || !result.blob) {
      throw new Error(result.error || 'Erreur génération PDF');
    }

    const fileName = `inspection_${inspection.inspection_type}_${inspection.mission?.reference || inspection.id}.pdf`;
    
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Erreur téléchargement PDF:', error);
    return false;
  }
}
