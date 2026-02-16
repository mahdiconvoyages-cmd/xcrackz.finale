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

interface InspectionDocument {
  id: string;
  document_type: string;
  document_title: string;
  document_url: string;
  pages_count: number;
  file_size_kb?: number;
  scanned_at: string;
}

interface InspectionExpense {
  id: string;
  expense_type: 'carburant' | 'peage' | 'transport' | 'imprevu';
  amount: number;
  description?: string;
  receipt_url?: string;
  receipt_pages_count?: number;
  created_at: string;
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
  driver_name?: string;
  driver_signature?: string;
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
  documents?: InspectionDocument[];
  expenses?: InspectionExpense[];
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
    
    // const secondaryColor = [100, 116, 139]; // Gray (unused for now)

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
    // DOCUMENTS ANNEXES (Documents scannés)
    // ==========================================
    
    if (inspection.documents && inspection.documents.length > 0) {
      // Vérifier si on a assez d'espace
      if (currentY > pageHeight - 100) {
        doc.addPage();
        currentY = margin;
        addPageHeader(doc, inspection, primaryColor);
        currentY += 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('📄 Documents Annexes', margin, currentY);
      
      currentY += 8;

      // Tableau des documents
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // En-tête du tableau
      const docTableX = margin;
      const docColWidths = [80, 30, 25, 50];
      const rowHeight = 8;

      // Header
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(docTableX, currentY, docColWidths.reduce((a, b) => a + b), rowHeight, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Titre du document', docTableX + 2, currentY + 5.5);
      doc.text('Pages', docTableX + docColWidths[0] + 2, currentY + 5.5);
      doc.text('Taille', docTableX + docColWidths[0] + docColWidths[1] + 2, currentY + 5.5);
      doc.text('Lien de téléchargement', docTableX + docColWidths[0] + docColWidths[1] + docColWidths[2] + 2, currentY + 5.5);

      currentY += rowHeight;

      // Lignes du tableau
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      for (const document of inspection.documents) {
        // Vérifier si nouvelle page nécessaire
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = margin;
          addPageHeader(doc, inspection, primaryColor);
          currentY += 20;
        }

        // Ligne
        doc.setDrawColor(200, 200, 200);
        doc.rect(docTableX, currentY, docColWidths.reduce((a, b) => a + b), rowHeight);

        // Données
        const titleLines = doc.splitTextToSize(cleanTextForPDF(document.document_title), docColWidths[0] - 4);
        doc.text(titleLines[0], docTableX + 2, currentY + 5.5);

        doc.text(`${document.pages_count}`, docTableX + docColWidths[0] + 2, currentY + 5.5);

        const sizeKb = document.file_size_kb || 0;
        const sizeText = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
        doc.text(sizeText, docTableX + docColWidths[0] + docColWidths[1] + 2, currentY + 5.5);

        // Lien cliquable
        doc.setTextColor(0, 102, 204); // Bleu
        doc.setFont('helvetica', 'underline');
        const linkText = 'Télécharger';
        doc.textWithLink(
          linkText,
          docTableX + docColWidths[0] + docColWidths[1] + docColWidths[2] + 2,
          currentY + 5.5,
          { url: document.document_url }
        );
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');

        currentY += rowHeight;
      }

      currentY += 10;

      // Note explicative
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'italic');
      doc.text(
        'Note: Cliquez sur les liens pour télécharger les documents scannés individuellement.',
        margin,
        currentY
      );
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      currentY += 15;
    }

    // ==========================================
    // RÉCAPITULATIF DES FRAIS
    // ==========================================
    
    if (inspection.expenses && inspection.expenses.length > 0) {
      // Vérifier si on a assez d'espace
      if (currentY > pageHeight - 100) {
        doc.addPage();
        currentY = margin;
        addPageHeader(doc, inspection, primaryColor);
        currentY += 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('💰 Récapitulatif des Frais', margin, currentY);
      
      currentY += 8;

      // Tableau des frais
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const expenseTableX = margin;
      const expenseColWidths = [40, 70, 30, 45];
      const expenseRowHeight = 8;

      // Header
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(expenseTableX, currentY, expenseColWidths.reduce((a, b) => a + b), expenseRowHeight, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Type', expenseTableX + 2, currentY + 5.5);
      doc.text('Description', expenseTableX + expenseColWidths[0] + 2, currentY + 5.5);
      doc.text('Montant', expenseTableX + expenseColWidths[0] + expenseColWidths[1] + 2, currentY + 5.5);
      doc.text('Justificatif', expenseTableX + expenseColWidths[0] + expenseColWidths[1] + expenseColWidths[2] + 2, currentY + 5.5);

      currentY += expenseRowHeight;

      // Calcul du total
      let totalExpenses = 0;

      // Icônes pour chaque type
      const expenseIcons: Record<string, string> = {
        carburant: '⛽',
        peage: '🛣️',
        transport: '🚌',
        imprevu: '❗'
      };

      // Lignes du tableau
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      for (const expense of inspection.expenses) {
        // Vérifier si nouvelle page nécessaire
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = margin;
          addPageHeader(doc, inspection, primaryColor);
          currentY += 20;
        }

        // Ligne
        doc.setDrawColor(200, 200, 200);
        doc.rect(expenseTableX, currentY, expenseColWidths.reduce((a, b) => a + b), expenseRowHeight);

        // Type avec icône
        const icon = expenseIcons[expense.expense_type] || '';
        const typeText = `${icon} ${cleanTextForPDF(expense.expense_type)}`;
        doc.text(typeText, expenseTableX + 2, currentY + 5.5);

        // Description
        const descText = cleanTextForPDF(expense.description || '-');
        const descLines = doc.splitTextToSize(descText, expenseColWidths[1] - 4);
        doc.text(descLines[0], expenseTableX + expenseColWidths[0] + 2, currentY + 5.5);

        // Montant
        const amountText = `${expense.amount.toFixed(2)} €`;
        doc.text(amountText, expenseTableX + expenseColWidths[0] + expenseColWidths[1] + 2, currentY + 5.5);
        totalExpenses += expense.amount;

        // Lien justificatif
        if (expense.receipt_url) {
          doc.setTextColor(0, 102, 204); // Bleu
          doc.setFont('helvetica', 'underline');
          doc.textWithLink(
            'Voir',
            expenseTableX + expenseColWidths[0] + expenseColWidths[1] + expenseColWidths[2] + 2,
            currentY + 5.5,
            { url: expense.receipt_url }
          );
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
        } else {
          doc.setTextColor(150, 150, 150);
          doc.text('Non fourni', expenseTableX + expenseColWidths[0] + expenseColWidths[1] + expenseColWidths[2] + 2, currentY + 5.5);
          doc.setTextColor(0, 0, 0);
        }

        currentY += expenseRowHeight;
      }

      // Ligne de total
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1);
      doc.rect(expenseTableX, currentY, expenseColWidths.reduce((a, b) => a + b), expenseRowHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFillColor(245, 245, 245);
      doc.rect(expenseTableX, currentY, expenseColWidths.reduce((a, b) => a + b), expenseRowHeight, 'F');
      
      doc.text('TOTAL', expenseTableX + 2, currentY + 5.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(11);
      doc.text(
        `${totalExpenses.toFixed(2)} €`,
        expenseTableX + expenseColWidths[0] + expenseColWidths[1] + 2,
        currentY + 5.5
      );
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);

      currentY += expenseRowHeight + 10;

      // Note explicative
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'italic');
      doc.text(
        'Note: Les justificatifs scannés sont disponibles en cliquant sur les liens "Voir".',
        margin,
        currentY
      );
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      currentY += 15;
    }

    // ==========================================
    // SIGNATURES
    // ==========================================
    
    // Vérifier si on a assez d'espace
    if (currentY > pageHeight - 100) {
      doc.addPage();
      currentY = margin;
      addPageHeader(doc, inspection, primaryColor);
      currentY += 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Signatures', margin, currentY);
    
    currentY += 10;

    // 3 signatures côte à côte : Client, Convoyeur, Inspecteur
    const sigWidth = (pageWidth - 2 * margin - 20) / 3;
    const sigHeight = 40;

    // Signature Client
    if (inspection.client_signature) {
      const clientX = margin;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Client', clientX, currentY);
      
      // Nom du signataire AU-DESSUS de la signature
      if (inspection.client_name) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(cleanTextForPDF(inspection.client_name), clientX, currentY + 5);
      }
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(clientX, currentY + 8, sigWidth, sigHeight);
      
      const sigBase64 = inspection.client_signature.startsWith('data:')
        ? inspection.client_signature
        : await imageUrlToBase64(inspection.client_signature);
      
      if (sigBase64) {
        try {
          doc.addImage(
            sigBase64,
            'PNG',
            clientX + 5,
            currentY + 13,
            sigWidth - 10,
            sigHeight - 10,
            'signature-client',
            'FAST'
          );
        } catch (error) {
          console.error('Erreur signature client:', error);
        }
      }
    }

    // Signature Convoyeur
    if (inspection.driver_signature) {
      const driverX = margin + sigWidth + 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Convoyeur', driverX, currentY);
      
      // Nom du signataire AU-DESSUS de la signature
      if (inspection.driver_name) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(cleanTextForPDF(inspection.driver_name), driverX, currentY + 5);
      }
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(driverX, currentY + 8, sigWidth, sigHeight);
      
      const sigBase64 = inspection.driver_signature.startsWith('data:')
        ? inspection.driver_signature
        : await imageUrlToBase64(inspection.driver_signature);
      
      if (sigBase64) {
        try {
          doc.addImage(
            sigBase64,
            'PNG',
            driverX + 5,
            currentY + 13,
            sigWidth - 10,
            sigHeight - 10,
            'signature-driver',
            'FAST'
          );
        } catch (error) {
          console.error('Erreur signature convoyeur:', error);
        }
      }
    }

    // Signature Inspecteur (optionnelle)
    if (inspection.inspector_signature) {
      const inspectorX = margin + (sigWidth + 10) * 2;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Inspecteur', inspectorX, currentY);
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(inspectorX, currentY + 8, sigWidth, sigHeight);
      
      const sigBase64 = inspection.inspector_signature.startsWith('data:')
        ? inspection.inspector_signature
        : await imageUrlToBase64(inspection.inspector_signature);
      
      if (sigBase64) {
        try {
          doc.addImage(
            sigBase64,
            'PNG',
            inspectorX + 5,
            currentY + 13,
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

    // ==========================================
    // FOOTER SUR CHAQUE PAGE
    // ==========================================
    
    const totalPages = (doc as any).internal.pages.length - 1; // -1 car page[0] est vide
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addPageFooter(doc, i, totalPages);
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
function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
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
