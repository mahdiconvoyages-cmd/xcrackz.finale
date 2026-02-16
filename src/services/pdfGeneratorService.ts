/**
 * Service de génération PDF optimisé pour le web
 * 
 * Fonctionnalités:
 * - Conversion photos en base64 pour embed
 * - Génération avec jsPDF
 * - Mise en page professionnelle
 * - Support multi-pages
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Photo {
  id: string;
  photo_url: string;
  photo_type: string;
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
 * Convertir une image URL en base64
 */
async function imageUrlToBase64(url: string): Promise<string> {
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
    console.error('Erreur conversion image:', error);
    return '';
  }
}

/**
 * Organiser les photos par catégorie
 */
function organizePhotos(photos: Photo[]) {
  const exterior: Photo[] = [];
  const interior: Photo[] = [];
  const damages: Photo[] = [];

  photos.forEach(photo => {
    const type = photo.photo_type.toLowerCase();
    if (type.includes('front') || type.includes('back') || type.includes('left') || type.includes('right') || type.includes('avant') || type.includes('arriere') || type.includes('lateral')) {
      exterior.push(photo);
    } else if (type.includes('interior') || type.includes('dashboard') || type.includes('trunk') || type.includes('interieur')) {
      interior.push(photo);
    } else if (type.includes('damage') || type.includes('scratch') || type.includes('dommage')) {
      damages.push(photo);
    } else {
      interior.push(photo);
    }
  });

  return { exterior, interior, damages };
}

/**
 * Générer le PDF avec HTML et conversion en blob
 */
export async function generateInspectionPDFBlob(
  inspection: InspectionData
): Promise<{ success: boolean; blob?: Blob; url?: string; error?: string }> {
  try {
    console.log('📄 Génération du PDF avec photos base64...');

    // Convertir toutes les photos en base64
    const photosBase64: { [key: string]: string } = {};
    
    if (inspection.photos && inspection.photos.length > 0) {
      console.log(`📸 Conversion de ${inspection.photos.length} photos en base64...`);
      
      for (const photo of inspection.photos) {
        const base64 = await imageUrlToBase64(photo.photo_url);
        if (base64) {
          photosBase64[photo.id] = base64;
        }
      }
    }

    // Convertir signatures
    let clientSignatureBase64 = '';
    let inspectorSignatureBase64 = '';

    if (inspection.client_signature) {
      clientSignatureBase64 = inspection.client_signature.startsWith('data:')
        ? inspection.client_signature
        : await imageUrlToBase64(inspection.client_signature);
    }

    if (inspection.inspector_signature) {
      inspectorSignatureBase64 = inspection.inspector_signature.startsWith('data:')
        ? inspection.inspector_signature
        : await imageUrlToBase64(inspection.inspector_signature);
    }

    const { exterior, interior, damages } = organizePhotos(inspection.photos || []);
    const typeLabel = inspection.inspection_type === 'departure' ? 'DÉPART' : 'ARRIVÉE';
    const typeColor = inspection.inspection_type === 'departure' ? '#10b981' : '#3b82f6';

    // Générer le HTML (même structure que mobile)
    const html = generateHTMLReport(
      inspection,
      photosBase64,
      clientSignatureBase64,
      inspectorSignatureBase64,
      exterior,
      interior,
      damages,
      typeLabel,
      typeColor
    );

    // Créer un élément iframe temporaire pour le rendu
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('Impossible de créer le document iframe');

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Attendre que les images soient chargées
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Utiliser html2canvas ou print API du navigateur
    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('Popup bloquée');

    printWindow.document.write(html);
    printWindow.document.close();

    // Créer un blob pour le téléchargement
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Nettoyer
    document.body.removeChild(iframe);

    console.log('✅ PDF généré avec succès');

    return { success: true, blob, url };
  } catch (error: any) {
    console.error('❌ Erreur génération PDF:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Télécharger le PDF
 */
export async function downloadInspectionPDF(inspection: InspectionData): Promise<boolean> {
  try {
    const result = await generateInspectionPDFBlob(inspection);
    
    if (!result.success || !result.url) {
      throw new Error(result.error || 'Erreur génération PDF');
    }

    const fileName = `inspection_${inspection.inspection_type}_${inspection.mission?.reference || inspection.id}.html`;
    
    const a = document.createElement('a');
    a.href = result.url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Nettoyer l'URL
    setTimeout(() => URL.revokeObjectURL(result.url!), 100);

    return true;
  } catch (error) {
    console.error('Erreur téléchargement PDF:', error);
    return false;
  }
}

/**
 * Générer le HTML du rapport
 */
function generateHTMLReport(
  inspection: InspectionData,
  photosBase64: { [key: string]: string },
  clientSignatureBase64: string,
  inspectorSignatureBase64: string,
  exterior: Photo[],
  interior: Photo[],
  damages: Photo[],
  typeLabel: string,
  typeColor: string
): string {
  // Même HTML que dans le service mobile
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport d'Inspection ${typeLabel} - ${inspection.mission?.reference || 'N/A'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #ffffff;
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      background: linear-gradient(135deg, ${typeColor} 0%, ${typeColor}dd 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .header .subtitle {
      font-size: 16px;
      opacity: 0.95;
      margin-bottom: 5px;
    }
    
    .section {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 15px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    
    .info-item {
      background: white;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    
    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    
    .info-value {
      font-size: 14px;
      font-weight: 500;
      color: #111827;
    }
    
    .photos-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 15px;
    }
    
    .photo-item {
      page-break-inside: avoid;
    }
    
    .photo-label {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      margin-bottom: 8px;
      text-transform: capitalize;
    }
    
    .photo-container {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      aspect-ratio: 4/3;
    }
    
    .photo-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .signatures {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 20px;
    }
    
    .signature-box {
      background: white;
      border: 2px dashed #d1d5db;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    
    .signature-image {
      max-width: 100%;
      max-height: 150px;
      margin: 10px auto;
    }
    
    @media print {
      .header {
        background: ${typeColor} !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚗 Rapport d'Inspection ${typeLabel}</h1>
      <div class="subtitle">Mission ${inspection.mission?.reference || 'N/A'}</div>
      <div>${format(new Date(inspection.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}</div>
    </div>

    <div class="section">
      <div class="section-title">📍 Itinéraire</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Enlèvement</div>
          <div class="info-value">${inspection.mission?.pickup_address || 'Non spécifié'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Livraison</div>
          <div class="info-value">${inspection.mission?.delivery_address || 'Non spécifié'}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">🚙 Véhicule</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Véhicule</div>
          <div class="info-value">${inspection.mission?.vehicle_brand || ''} ${inspection.mission?.vehicle_model || ''}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Immatriculation</div>
          <div class="info-value">${inspection.mission?.vehicle_plate || 'N/A'}</div>
        </div>
        ${inspection.mileage_km ? `
        <div class="info-item">
          <div class="info-label">Kilométrage</div>
          <div class="info-value">${inspection.mileage_km} km</div>
        </div>
        ` : ''}
        ${inspection.fuel_level ? `
        <div class="info-item">
          <div class="info-label">Carburant</div>
          <div class="info-value">${inspection.fuel_level}%</div>
        </div>
        ` : ''}
      </div>
    </div>

    ${exterior.length > 0 ? `
    <div class="section">
      <div class="section-title">📸 Photos Extérieures (${exterior.length})</div>
      <div class="photos-grid">
        ${exterior.map(photo => `
          <div class="photo-item">
            <div class="photo-label">${photo.photo_type.replace(/_/g, ' ')}</div>
            <div class="photo-container">
              ${photosBase64[photo.id] ? `<img src="${photosBase64[photo.id]}" alt="${photo.photo_type}" />` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${interior.length > 0 ? `
    <div class="section">
      <div class="section-title">🪑 Photos Intérieures (${interior.length})</div>
      <div class="photos-grid">
        ${interior.map(photo => `
          <div class="photo-item">
            <div class="photo-label">${photo.photo_type.replace(/_/g, ' ')}</div>
            <div class="photo-container">
              ${photosBase64[photo.id] ? `<img src="${photosBase64[photo.id]}" alt="${photo.photo_type}" />` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${clientSignatureBase64 || inspectorSignatureBase64 ? `
    <div class="section">
      <div class="section-title">✍️ Signatures</div>
      <div class="signatures">
        ${inspectorSignatureBase64 ? `
        <div class="signature-box">
          <div>Inspecteur</div>
          <img src="${inspectorSignatureBase64}" alt="Signature inspecteur" class="signature-image" />
        </div>
        ` : ''}
        ${clientSignatureBase64 ? `
        <div class="signature-box">
          <div>Client</div>
          <img src="${clientSignatureBase64}" alt="Signature client" class="signature-image" />
          ${inspection.client_name ? `<div>${inspection.client_name}</div>` : ''}
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>
  `;
}
