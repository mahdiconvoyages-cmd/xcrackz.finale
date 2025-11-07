/**
 * Service de génération PDF optimisé pour inspections
 * 
 * Fonctionnalités:
 * - Conversion photos en base64 pour embed dans PDF
 * - Mise en page professionnelle
 * - Support signatures
 * - Métadonnées complètes
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
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
  driver_name?: string;
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
    // Télécharger l'image
    const response = await FileSystem.downloadAsync(
      url,
      FileSystem.cacheDirectory + 'temp_image.jpg'
    );

    // Lire en base64
    const base64 = await FileSystem.readAsStringAsync(response.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return `data:image/jpeg;base64,${base64}`;
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
    if (type.includes('front') || type.includes('back') || type.includes('left') || type.includes('right')) {
      exterior.push(photo);
    } else if (type.includes('interior') || type.includes('dashboard') || type.includes('trunk')) {
      interior.push(photo);
    } else if (type.includes('damage') || type.includes('scratch')) {
      damages.push(photo);
    } else {
      interior.push(photo);
    }
  });

  return { exterior, interior, damages };
}

/**
 * Générer le HTML du rapport avec photos en base64
 */
async function generateReportHTML(inspection: InspectionData): Promise<string> {
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

  // Convertir signatures en base64 si présentes
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

  // Organiser les photos
  const { exterior, interior, damages } = organizePhotos(inspection.photos || []);

  const typeLabel = inspection.inspection_type === 'departure' ? 'DÉPART' : 'ARRIVÉE';
  const typeColor = inspection.inspection_type === 'departure' ? '#10b981' : '#3b82f6';

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
    
    /* En-tête */
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
    
    .header .date {
      font-size: 14px;
      opacity: 0.85;
    }
    
    /* Sections */
    .section {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-icon {
      font-size: 20px;
    }
    
    /* Grille d'informations */
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
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .info-value {
      font-size: 14px;
      font-weight: 500;
      color: #111827;
    }
    
    /* État du véhicule */
    .condition-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 15px;
    }
    
    .condition-item {
      background: white;
      padding: 10px;
      border-radius: 6px;
      text-align: center;
      border: 1px solid #e5e7eb;
    }
    
    .condition-value {
      font-size: 18px;
      font-weight: 700;
      color: ${typeColor};
      margin-bottom: 4px;
    }
    
    .condition-label {
      font-size: 11px;
      color: #6b7280;
    }
    
    /* Équipements */
    .equipment-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-top: 15px;
    }
    
    .equipment-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: white;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    
    .equipment-icon {
      font-size: 16px;
    }
    
    .equipment-label {
      font-size: 13px;
      color: #374151;
    }
    
    /* Photos */
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
    
    /* Signatures */
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
    
    .signature-label {
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
      margin-bottom: 10px;
    }
    
    .signature-image {
      max-width: 100%;
      max-height: 150px;
      margin: 10px auto;
    }
    
    .signature-name {
      font-size: 14px;
      font-weight: 500;
      color: #111827;
      margin-top: 10px;
    }
    
    /* Notes */
    .notes {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 6px;
      font-size: 14px;
      line-height: 1.8;
      color: #78350f;
      margin-top: 15px;
    }
    
    /* Footer */
    .footer {
      text-align: center;
      padding: 20px;
      margin-top: 30px;
      border-top: 2px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
    }
    
    /* Print styles */
    @media print {
      body {
        background: white;
      }
      
      .header {
        background: ${typeColor} !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      .photo-item {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- En-tête -->
    <div class="header">
      <h1>🚗 Rapport d'Inspection ${typeLabel}</h1>
      <div class="subtitle">Mission ${inspection.mission?.reference || 'N/A'}</div>
      <div class="date">
        ${format(new Date(inspection.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
      </div>
    </div>

    <!-- Informations Mission -->
    <div class="section">
      <div class="section-title">
        <span class="section-icon">📍</span>
        Itinéraire
      </div>
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

    <!-- Véhicule -->
    <div class="section">
      <div class="section-title">
        <span class="section-icon">🚙</span>
        Véhicule
      </div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Marque & Modèle</div>
          <div class="info-value">${inspection.mission?.vehicle_brand || ''} ${inspection.mission?.vehicle_model || ''}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Immatriculation</div>
          <div class="info-value">${inspection.mission?.vehicle_plate || 'N/A'}</div>
        </div>
      </div>
      
      ${inspection.mileage_km || inspection.fuel_level ? `
      <div class="condition-grid">
        ${inspection.mileage_km ? `
        <div class="condition-item">
          <div class="condition-value">${inspection.mileage_km}</div>
          <div class="condition-label">Kilomètres</div>
        </div>
        ` : ''}
        ${inspection.fuel_level ? `
        <div class="condition-item">
          <div class="condition-value">${inspection.fuel_level}%</div>
          <div class="condition-label">Carburant</div>
        </div>
        ` : ''}
        ${inspection.keys_count ? `
        <div class="condition-item">
          <div class="condition-value">${inspection.keys_count}</div>
          <div class="condition-label">Clés</div>
        </div>
        ` : ''}
      </div>
      ` : ''}
    </div>

    <!-- État général -->
    ${inspection.overall_condition || inspection.windshield_condition ? `
    <div class="section">
      <div class="section-title">
        <span class="section-icon">⚙️</span>
        État Général
      </div>
      <div class="info-grid">
        ${inspection.overall_condition ? `
        <div class="info-item">
          <div class="info-label">État global</div>
          <div class="info-value">${inspection.overall_condition}</div>
        </div>
        ` : ''}
        ${inspection.windshield_condition ? `
        <div class="info-item">
          <div class="info-label">Pare-brise</div>
          <div class="info-value">${inspection.windshield_condition}</div>
        </div>
        ` : ''}
        ${inspection.external_cleanliness ? `
        <div class="info-item">
          <div class="info-label">Propreté extérieure</div>
          <div class="info-value">${inspection.external_cleanliness}</div>
        </div>
        ` : ''}
        ${inspection.internal_cleanliness ? `
        <div class="info-item">
          <div class="info-label">Propreté intérieure</div>
          <div class="info-value">${inspection.internal_cleanliness}</div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    <!-- Équipements -->
    <div class="section">
      <div class="section-title">
        <span class="section-icon">🔧</span>
        Équipements
      </div>
      <div class="equipment-grid">
        <div class="equipment-item">
          <span class="equipment-icon">${inspection.has_spare_wheel ? '✅' : '❌'}</span>
          <span class="equipment-label">Roue de secours</span>
        </div>
        <div class="equipment-item">
          <span class="equipment-icon">${inspection.has_repair_kit ? '✅' : '❌'}</span>
          <span class="equipment-label">Kit de réparation</span>
        </div>
        <div class="equipment-item">
          <span class="equipment-icon">${inspection.has_vehicle_documents ? '✅' : '❌'}</span>
          <span class="equipment-label">Documents véhicule</span>
        </div>
        <div class="equipment-item">
          <span class="equipment-icon">${inspection.has_registration_card ? '✅' : '❌'}</span>
          <span class="equipment-label">Carte grise</span>
        </div>
        <div class="equipment-item">
          <span class="equipment-icon">${inspection.vehicle_is_full ? '✅' : '❌'}</span>
          <span class="equipment-label">Réservoir plein</span>
        </div>
      </div>
    </div>

    <!-- Photos Extérieures -->
    ${exterior.length > 0 ? `
    <div class="section">
      <div class="section-title">
        <span class="section-icon">📸</span>
        Photos Extérieures (${exterior.length})
      </div>
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

    <!-- Photos Intérieures -->
    ${interior.length > 0 ? `
    <div class="section">
      <div class="section-title">
        <span class="section-icon">🪑</span>
        Photos Intérieures (${interior.length})
      </div>
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

    <!-- Photos Dommages -->
    ${damages.length > 0 ? `
    <div class="section">
      <div class="section-title">
        <span class="section-icon">⚠️</span>
        Dommages Constatés (${damages.length})
      </div>
      <div class="photos-grid">
        ${damages.map(photo => `
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

    <!-- Notes -->
    ${inspection.notes ? `
    <div class="section">
      <div class="section-title">
        <span class="section-icon">📝</span>
        Remarques
      </div>
      <div class="notes">${inspection.notes}</div>
    </div>
    ` : ''}

    <!-- Signatures -->
    ${clientSignatureBase64 || inspectorSignatureBase64 ? `
    <div class="section">
      <div class="section-title">
        <span class="section-icon">✍️</span>
        Signatures
      </div>
      <div class="signatures">
        ${inspectorSignatureBase64 ? `
        <div class="signature-box">
          <div class="signature-label">Convoyeur${inspection.driver_name ? ` - ${inspection.driver_name}` : ''}</div>
          <img src="${inspectorSignatureBase64}" alt="Signature convoyeur" class="signature-image" />
        </div>
        ` : ''}
        ${clientSignatureBase64 ? `
        <div class="signature-box">
          <div class="signature-label">Client${inspection.client_name ? ` - ${inspection.client_name}` : ''}</div>
          <img src="${clientSignatureBase64}" alt="Signature client" class="signature-image" />
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <p>Document généré le ${format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr })}</p>
      <p>Rapport d'inspection certifié conforme</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Générer et partager le PDF
 */
export async function generateAndShareInspectionPDF(
  inspection: InspectionData
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    console.log('📄 Génération du PDF avec photos base64...');

    // Générer le HTML avec photos en base64
    const html = await generateReportHTML(inspection);

    // Générer le PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    console.log('✅ PDF généré:', uri);

    // Nom du fichier (nettoyer les caractères invalides)
    const reference = (inspection.mission?.reference || inspection.id).replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `inspection_${inspection.inspection_type}_${reference}.pdf`;

    if (Platform.OS === 'ios') {
      // iOS: Partager directement
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Rapport d'inspection ${inspection.inspection_type}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      // Android: Sauvegarder dans le dossier documents
      const newUri = FileSystem.documentDirectory + fileName;
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Rapport d'inspection ${inspection.inspection_type}`,
      });
    }

    return { success: true, uri };
  } catch (error: any) {
    console.error('❌ Erreur génération PDF:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Générer le PDF et le sauvegarder localement
 */
export async function generateInspectionPDF(
  inspection: InspectionData
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    console.log('📄 Génération du PDF...');

    const html = await generateReportHTML(inspection);

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Nom du fichier (nettoyer les caractères invalides)
    const reference = (inspection.mission?.reference || inspection.id).replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `inspection_${inspection.inspection_type}_${reference}.pdf`;
    const newUri = FileSystem.documentDirectory + fileName;

    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    console.log('✅ PDF sauvegardé:', newUri);

    return { success: true, uri: newUri };
  } catch (error: any) {
    console.error('❌ Erreur génération PDF:', error);
    return { success: false, error: error.message };
  }
}
