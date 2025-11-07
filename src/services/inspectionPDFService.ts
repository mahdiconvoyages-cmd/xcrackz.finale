import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';

interface InspectionPhoto {
  id: string;
  photo_url: string;
  photo_type: string;
  description?: string;
}

interface VehicleInspection {
  id: string;
  mission_id: string;
  inspection_type: 'departure' | 'arrival';
  mileage_km?: number;
  fuel_level?: number;
  notes?: string;
  inspector_signature?: string;
  client_signature?: string;
  completed_at?: string;
  vehicle_info?: {
    brand?: string;
    model?: string;
    plate?: string;
    year?: number;
    color?: string;
  };
}

interface GeneratePDFParams {
  inspection: VehicleInspection;
  photos: InspectionPhoto[];
  missionReference?: string;
}

/**
 * Convertit une image en Base64 pour l'inclure dans le PDF
 * Utilise la nouvelle API FileSystem (expo-file-system v19+)
 */
async function imageToBase64(uri: string): Promise<string> {
  try {
    // Nouvelle méthode recommandée pour expo-file-system v19+
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Erreur conversion image:', error);
    return '';
  }
}

/**
 * Télécharge une image depuis une URL et la convertit en Base64
 */
async function downloadImageToBase64(url: string): Promise<string> {
  try {
    const filename = url.substring(url.lastIndexOf('/') + 1);
    const fileUri = `${(FileSystem as any).documentDirectory}${filename}`;
    
    const downloadResult = await FileSystem.downloadAsync(url, fileUri);
    
    if (downloadResult.status === 200) {
      return await imageToBase64(downloadResult.uri);
    }
    return '';
  } catch (error) {
    console.error('Erreur téléchargement image:', error);
    return '';
  }
}

/**
 * Génère le HTML pour un rapport d'inspection
 */
export async function generateInspectionHTML(params: GeneratePDFParams): Promise<string> {
  const { inspection, photos, missionReference } = params;

  const typeLabel = inspection.inspection_type === 'departure' ? 'DÉPART' : 'ARRIVÉE';
  const vehicleInfo = inspection.vehicle_info || {};
  const vehicleLabel = `${vehicleInfo.brand || ''} ${vehicleInfo.model || ''} ${vehicleInfo.plate || ''}`.trim();

  // Organiser les photos par type
  const photosByType: { [key: string]: string } = {};
  for (const photo of photos) {
    if (photo.photo_url) {
      const base64 = await downloadImageToBase64(photo.photo_url);
      if (base64) {
        photosByType[photo.photo_type] = base64;
      }
    }
  }

  const photoTypes = [
    { key: 'front', label: 'Vue avant' },
    { key: 'back', label: 'Vue arrière' },
    { key: 'left_side', label: 'Côté gauche' },
    { key: 'right_side', label: 'Côté droit' },
    { key: 'interior', label: 'Intérieur' },
    { key: 'dashboard', label: 'Tableau de bord' },
  ];

  const photosHTML = photoTypes
    .map(
      (type) => `
        <div style="width: 48%; margin-bottom: 20px; page-break-inside: avoid;">
          <div style="border: 2px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #f9fafb;">
            <div style="background: #14b8a6; padding: 8px; text-align: center;">
              <p style="color: white; font-weight: 600; font-size: 12px; margin: 0;">${type.label}</p>
            </div>
            ${
              photosByType[type.key]
                ? `<img src="${photosByType[type.key]}" style="width: 100%; height: 200px; object-fit: cover; display: block;" />`
                : `<div style="width: 100%; height: 200px; display: flex; align-items: center; justify-content: center; background: #e5e7eb;">
                     <p style="color: #9ca3af; font-size: 14px; margin: 0;">Aucune photo</p>
                   </div>`
            }
          </div>
        </div>
      `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Inspection ${typeLabel} - ${vehicleLabel}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #1f2937;
          padding: 30px;
          background-color: #ffffff;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 4px solid #14b8a6;
          padding-bottom: 20px;
        }
        
        .header h1 {
          color: #14b8a6;
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .header p {
          color: #6b7280;
          font-size: 14px;
        }
        
        .info-section {
          background-color: #f9fafb;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 30px;
          border: 1px solid #e5e7eb;
        }
        
        .info-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .info-item {
          flex: 1;
          min-width: 200px;
        }
        
        .info-item label {
          display: block;
          font-size: 11px;
          color: #14b8a6;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
          font-weight: 600;
        }
        
        .info-item p {
          color: #1f2937;
          font-size: 14px;
          font-weight: 500;
        }
        
        .section-title {
          font-size: 18px;
          color: #1f2937;
          font-weight: bold;
          margin: 30px 0 15px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #14b8a6;
        }
        
        .photos-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        
        .notes-section {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        
        .notes-section h3 {
          color: #92400e;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .notes-section p {
          color: #78350f;
          font-size: 13px;
          line-height: 1.6;
        }
        
        .signatures {
          display: flex;
          justify-content: space-around;
          margin-top: 40px;
          page-break-inside: avoid;
        }
        
        .signature-box {
          text-align: center;
          width: 40%;
        }
        
        .signature-box label {
          display: block;
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          margin-bottom: 10px;
          font-weight: 600;
        }
        
        .signature-box img {
          width: 200px;
          height: 100px;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          background: #f9fafb;
          object-fit: contain;
          padding: 5px;
        }
        
        .signature-box .empty {
          width: 200px;
          height: 100px;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          background: #f9fafb;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-size: 12px;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          color: #9ca3af;
          font-size: 11px;
        }
        
        @media print {
          body {
            padding: 20px;
          }
          
          .photos-grid {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <!-- En-tête -->
      <div class="header">
        <h1>📋 INSPECTION ${typeLabel}</h1>
        <p>${vehicleLabel}</p>
        ${missionReference ? `<p style="margin-top: 8px; font-weight: 600; color: #14b8a6;">Mission: ${missionReference}</p>` : ''}
      </div>

      <!-- Informations véhicule -->
      <div class="info-section">
        <div class="info-grid">
          <div class="info-item">
            <label>Marque</label>
            <p>${vehicleInfo.brand || 'N/A'}</p>
          </div>
          <div class="info-item">
            <label>Modèle</label>
            <p>${vehicleInfo.model || 'N/A'}</p>
          </div>
          <div class="info-item">
            <label>Immatriculation</label>
            <p>${vehicleInfo.plate || 'N/A'}</p>
          </div>
          <div class="info-item">
            <label>Année</label>
            <p>${vehicleInfo.year || 'N/A'}</p>
          </div>
          <div class="info-item">
            <label>Couleur</label>
            <p>${vehicleInfo.color || 'N/A'}</p>
          </div>
        </div>
      </div>

      <!-- Détails inspection -->
      <div class="info-section">
        <div class="info-grid">
          <div class="info-item">
            <label>📍 Kilométrage</label>
            <p>${inspection.mileage_km ? `${inspection.mileage_km.toLocaleString('fr-FR')} km` : 'Non renseigné'}</p>
          </div>
          <div class="info-item">
            <label>⛽ Niveau de carburant</label>
            <p>${inspection.fuel_level ? `${inspection.fuel_level}%` : 'Non renseigné'}</p>
          </div>
          <div class="info-item">
            <label>📅 Date d'inspection</label>
            <p>${inspection.completed_at ? new Date(inspection.completed_at).toLocaleDateString('fr-FR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'En cours'}</p>
          </div>
        </div>
      </div>

      <!-- Photos -->
      <h2 class="section-title">📸 Photos du véhicule</h2>
      <div class="photos-grid">
        ${photosHTML}
      </div>

      <!-- Notes -->
      ${inspection.notes ? `
        <div class="notes-section">
          <h3>📝 Notes et observations</h3>
          <p>${inspection.notes}</p>
        </div>
      ` : ''}

      <!-- Signatures -->
      <h2 class="section-title">✍️ Signatures</h2>
      <div class="signatures">
        <div class="signature-box">
          <label>Signature de l'inspecteur</label>
          ${inspection.inspector_signature 
            ? `<img src="${inspection.inspector_signature}" alt="Signature inspecteur" />` 
            : '<div class="empty">Non signée</div>'}
        </div>
        <div class="signature-box">
          <label>Signature du client</label>
          ${inspection.client_signature 
            ? `<img src="${inspection.client_signature}" alt="Signature client" />` 
            : '<div class="empty">Non signée</div>'}
        </div>
      </div>

      <!-- Pied de page -->
      <div class="footer">
        <p>Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        <p style="margin-top: 8px;">Inspection ID: ${inspection.id}</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Génère et partage un PDF d'inspection
 */
export async function generateAndShareInspectionPDF(
  inspection: VehicleInspection,
  photos: InspectionPhoto[],
  missionReference?: string
): Promise<{ success: boolean; uri?: string; message: string }> {
  try {
    // Générer le HTML
    const html = await generateInspectionHTML({ inspection, photos, missionReference });

    // Générer le PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Vérifier si le partage est disponible
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (!isAvailable) {
      return {
        success: false,
        message: 'Le partage de fichiers n\'est pas disponible sur cet appareil',
      };
    }

    const typeLabel = inspection.inspection_type === 'departure' ? 'depart' : 'arrivee';
    const filename = `inspection-${typeLabel}-${inspection.mission_id.substring(0, 8)}.pdf`;

    // Partager le PDF
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Partager ${filename}`,
      UTI: 'com.adobe.pdf',
    });

    return {
      success: true,
      uri,
      message: 'PDF généré et partagé avec succès',
    };
  } catch (error: any) {
    console.error('Erreur génération PDF:', error);
    return {
      success: false,
      message: error.message || 'Impossible de générer le PDF',
    };
  }
}

/**
 * Génère un PDF et l'upload vers Supabase Storage
 */
export async function generateAndUploadInspectionPDF(
  inspection: VehicleInspection,
  photos: InspectionPhoto[],
  missionReference?: string
): Promise<{ success: boolean; url?: string; message: string }> {
  try {
    // Générer le HTML
    const html = await generateInspectionHTML({ inspection, photos, missionReference });

    // Générer le PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Lire le fichier PDF en base64 (nouvelle API expo-file-system v19+)
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convertir en blob
    const blob = await (await fetch(`data:application/pdf;base64,${base64}`)).blob();

    // Upload vers Supabase Storage
    const typeLabel = inspection.inspection_type === 'departure' ? 'depart' : 'arrivee';
    const filename = `inspection-${typeLabel}-${inspection.id}.pdf`;
    const filePath = `inspections/${inspection.mission_id}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('inspection-pdfs')
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('inspection-pdfs')
      .getPublicUrl(filePath);

    // Mettre à jour l'inspection avec l'URL du PDF
    const { error: updateError } = await supabase
      .from('vehicle_inspections')
      .update({ pdf_url: urlData.publicUrl })
      .eq('id', inspection.id);

    if (updateError) throw updateError;

    return {
      success: true,
      url: urlData.publicUrl,
      message: 'PDF généré et uploadé avec succès',
    };
  } catch (error: any) {
    console.error('Erreur upload PDF:', error);
    return {
      success: false,
      message: error.message || 'Impossible d\'uploader le PDF',
    };
  }
}

/**
 * Imprime un PDF d'inspection
 */
export async function printInspectionPDF(
  inspection: VehicleInspection,
  photos: InspectionPhoto[],
  missionReference?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Générer le HTML
    const html = await generateInspectionHTML({ inspection, photos, missionReference });

    // Imprimer
    await Print.printAsync({
      html,
    });

    return {
      success: true,
      message: 'Document envoyé à l\'impression',
    };
  } catch (error: any) {
    console.error('Erreur impression PDF:', error);
    return {
      success: false,
      message: error.message || 'Impossible d\'imprimer le document',
    };
  }
}
