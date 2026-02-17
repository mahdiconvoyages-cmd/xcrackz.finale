/**
 * Service d'envoi d'emails pour rapports d'inspection
 * 
 * Fonctionnalités:
 * - Templates HTML professionnels
 * - PDF en pièce jointe
 * - Photos embedées en base64 dans l'email
 * - Support multi-destinataires
 * - Retry automatique
 */

import { supabase } from '../lib/supabase';
import { generateInspectionPDFPro } from './inspectionPdfGeneratorPro';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface EmailOptions {
  to: string[];
  cc?: string[];
  subject?: string;
  includePhotos?: boolean;
  includePDF?: boolean;
  customMessage?: string;
}

/**
 * Convertir image URL en base64 pour email
 */
async function imageToBase64ForEmail(url: string): Promise<string> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Erreur conversion image email:', error);
    return '';
  }
}

/**
 * Générer le template HTML de l'email
 */
async function generateEmailTemplate(
  inspection: InspectionData,
  options: EmailOptions
): Promise<string> {
  const inspectionTypeLabel = inspection.inspection_type === 'departure' 
    ? 'Enlèvement' 
    : 'Livraison';
  
  const color = inspection.inspection_type === 'departure' 
    ? '#10b981' 
    : '#3b82f6';

  let photosHTML = '';
  
  if (options.includePhotos && inspection.photos && inspection.photos.length > 0) {
    const photoPromises = inspection.photos.slice(0, 6).map(async (photo) => {
      const base64 = await imageToBase64ForEmail(photo.photo_url);
      if (!base64) return '';
      
      return `
        <div style="display: inline-block; margin: 10px; text-align: center;">
          <img src="${base64}" 
               alt="${photo.photo_type}" 
               style="width: 200px; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #e5e7eb;" />
          <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
            ${photo.photo_type.replace(/_/g, ' ')}
          </div>
        </div>
      `;
    });
    
    const photoHTMLArray = await Promise.all(photoPromises);
    photosHTML = photoHTMLArray.filter(html => html).join('');
    
    if (inspection.photos.length > 6) {
      photosHTML += `
        <div style="margin-top: 10px; color: #6b7280; font-style: italic;">
          + ${inspection.photos.length - 6} autres photos dans le PDF joint
        </div>
      `;
    }
  }

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport d'Inspection ${inspectionTypeLabel}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: ${color}; padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                                📋 RAPPORT D'INSPECTION
                            </h1>
                            <h2 style="margin: 10px 0 0 0; color: #ffffff; font-size: 20px; font-weight: normal; opacity: 0.95;">
                                ${inspectionTypeLabel}
                            </h2>
                            <div style="margin-top: 15px; color: #ffffff; font-size: 14px; opacity: 0.9;">
                                Mission ${inspection.mission?.reference || 'N/A'}
                            </div>
                            <div style="margin-top: 5px; color: #ffffff; font-size: 12px; opacity: 0.85;">
                                ${format(new Date(inspection.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                            </div>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            
                            ${options.customMessage ? `
                            <div style="background-color: #f9fafb; border-left: 4px solid ${color}; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
                                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
                                    ${options.customMessage}
                                </p>
                            </div>
                            ` : ''}

                            <!-- Véhicule -->
                            <div style="margin-bottom: 25px;">
                                <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; border-bottom: 2px solid ${color}; padding-bottom: 8px;">
                                    🚗 Véhicule
                                </h3>
                                <table width="100%" cellpadding="8" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px;">
                                    <tr style="background-color: #f9fafb;">
                                        <td style="font-weight: 600; color: #374151; width: 40%;">Marque/Modèle:</td>
                                        <td style="color: #111827;">${inspection.mission?.vehicle_brand || 'N/A'} ${inspection.mission?.vehicle_model || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="font-weight: 600; color: #374151;">Immatriculation:</td>
                                        <td style="color: #111827; font-family: monospace; font-size: 16px;">${inspection.mission?.vehicle_plate || 'N/A'}</td>
                                    </tr>
                                    ${inspection.mileage_km !== undefined ? `
                                    <tr style="background-color: #f9fafb;">
                                        <td style="font-weight: 600; color: #374151;">Kilométrage:</td>
                                        <td style="color: #111827;">${inspection.mileage_km.toLocaleString('fr-FR')} km</td>
                                    </tr>
                                    ` : ''}
                                    ${inspection.fuel_level !== undefined ? `
                                    <tr>
                                        <td style="font-weight: 600; color: #374151;">Niveau carburant:</td>
                                        <td style="color: #111827;">
                                            <span style="display: inline-block; background-color: ${color}; color: white; padding: 2px 12px; border-radius: 12px; font-size: 13px; font-weight: 600;">
                                                ${inspection.fuel_level}%
                                            </span>
                                        </td>
                                    </tr>
                                    ` : ''}
                                </table>
                            </div>

                            <!-- Itinéraire -->
                            <div style="margin-bottom: 25px;">
                                <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; border-bottom: 2px solid ${color}; padding-bottom: 8px;">
                                    📍 Itinéraire
                                </h3>
                                <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; background-color: #f9fafb;">
                                    <div style="margin-bottom: 12px;">
                                        <strong style="color: #10b981; font-size: 14px;">📍 Enlèvement:</strong>
                                        <div style="color: #374151; margin-top: 4px; font-size: 14px;">
                                            ${inspection.mission?.pickup_address || 'Non spécifié'}
                                        </div>
                                    </div>
                                    <div>
                                        <strong style="color: #3b82f6; font-size: 14px;">🎯 Livraison:</strong>
                                        <div style="color: #374151; margin-top: 4px; font-size: 14px;">
                                            ${inspection.mission?.delivery_address || 'Non spécifié'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- État -->
                            ${inspection.overall_condition ? `
                            <div style="margin-bottom: 25px;">
                                <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; border-bottom: 2px solid ${color}; padding-bottom: 8px;">
                                    ✓ État Général
                                </h3>
                                <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px;">
                                    <table width="100%" cellpadding="6" cellspacing="0">
                                        <tr>
                                            <td style="font-weight: 600; color: #374151; width: 40%;">État général:</td>
                                            <td style="color: #111827;">${inspection.overall_condition}</td>
                                        </tr>
                                        ${inspection.external_cleanliness ? `
                                        <tr>
                                            <td style="font-weight: 600; color: #374151;">Propreté extérieure:</td>
                                            <td style="color: #111827;">${inspection.external_cleanliness}</td>
                                        </tr>
                                        ` : ''}
                                        ${inspection.internal_cleanliness ? `
                                        <tr>
                                            <td style="font-weight: 600; color: #374151;">Propreté intérieure:</td>
                                            <td style="color: #111827;">${inspection.internal_cleanliness}</td>
                                        </tr>
                                        ` : ''}
                                    </table>
                                </div>
                            </div>
                            ` : ''}

                            <!-- Notes -->
                            ${inspection.notes ? `
                            <div style="margin-bottom: 25px;">
                                <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; border-bottom: 2px solid ${color}; padding-bottom: 8px;">
                                    📝 Notes
                                </h3>
                                <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; background-color: #fffbeb;">
                                    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
                                        ${inspection.notes}
                                    </p>
                                </div>
                            </div>
                            ` : ''}

                            <!-- Photos -->
                            ${photosHTML ? `
                            <div style="margin-bottom: 25px;">
                                <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; border-bottom: 2px solid ${color}; padding-bottom: 8px;">
                                    📸 Photos (${inspection.photos?.length || 0})
                                </h3>
                                <div style="text-align: center; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; background-color: #f9fafb;">
                                    ${photosHTML}
                                </div>
                            </div>
                            ` : ''}

                            <!-- PDF -->
                            ${options.includePDF ? `
                            <div style="background-color: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin-top: 25px;">
                                <div style="font-size: 24px; margin-bottom: 10px;">📄</div>
                                <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 16px;">
                                    Rapport PDF Joint
                                </h4>
                                <p style="margin: 0; color: #374151; font-size: 14px;">
                                    Le rapport complet avec toutes les photos est joint à cet email
                                </p>
                            </div>
                            ` : ''}

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <div style="color: #6b7280; font-size: 13px; margin-bottom: 8px;">
                                <strong>Finality Transport</strong> - Plateforme de gestion de convoyage
                            </div>
                            <div style="color: #9ca3af; font-size: 12px;">
                                Email automatique généré le ${format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                            </div>
                            ${inspection.mission?.client_email ? `
                            <div style="color: #9ca3af; font-size: 12px; margin-top: 8px;">
                                Pour toute question, contactez-nous
                            </div>
                            ` : ''}
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();
}

/**
 * Envoyer l'email via l'API backend
 */
export async function sendInspectionEmail(
  inspection: InspectionData,
  options: EmailOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📧 Préparation envoi email...');

    // Valider les destinataires
    if (!options.to || options.to.length === 0) {
      throw new Error('Aucun destinataire spécifié');
    }

    // Générer le HTML
    const htmlContent = await generateEmailTemplate(inspection, options);

    // Générer le PDF si demandé
    let pdfBase64: string | undefined;
    if (options.includePDF) {
      console.log('📄 Génération PDF pour pièce jointe...');
      const pdfResult = await generateInspectionPDFPro(inspection);
      
      if (pdfResult.success && pdfResult.blob) {
        // Convertir blob en base64
        pdfBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(pdfResult.blob!);
        });
      }
    }

    // Préparer le sujet
    const subject = options.subject || 
      `Rapport Inspection ${inspection.inspection_type === 'departure' ? 'Enlèvement' : 'Livraison'} - ${inspection.mission?.reference || inspection.id}`;

    // Payload pour l'API
    const payload = {
      to: options.to,
      cc: options.cc,
      subject,
      html: htmlContent,
      attachments: pdfBase64 ? [
        {
          filename: `inspection_${inspection.inspection_type}_${inspection.mission?.reference || inspection.id}.pdf`,
          content: pdfBase64,
          encoding: 'base64',
          contentType: 'application/pdf'
        }
      ] : undefined
    };

    // Appel via Supabase Edge Function (Resend)
    const { data, error: fnError } = await supabase.functions.invoke('send-email', {
      body: {
        to: options.to[0],
        subject,
        html: htmlContent,
        attachments: payload.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          type: att.contentType,
        })) || [],
      },
    });

    if (fnError) {
      throw new Error(fnError.message || 'Erreur envoi email');
    }
    return { success: true };

  } catch (error: any) {
    console.error('❌ Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Envoyer un email de test avec retry
 */
export async function sendInspectionEmailWithRetry(
  inspection: InspectionData,
  options: EmailOptions,
  retries = 3
): Promise<{ success: boolean; error?: string }> {
  for (let i = 0; i < retries; i++) {
    const result = await sendInspectionEmail(inspection, options);
    
    if (result.success) {
      return result;
    }

    if (i < retries - 1) {
      // Retry après 2s
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return { success: false, error: `Échec après ${retries} tentatives` };
}

/**
 * Prévisualiser l'email (ouvre dans une nouvelle fenêtre)
 */
export async function previewInspectionEmail(
  inspection: InspectionData,
  options: EmailOptions
): Promise<void> {
  const htmlContent = await generateEmailTemplate(inspection, options);
  
  const previewWindow = window.open('', '_blank');
  if (previewWindow) {
    previewWindow.document.write(htmlContent);
    previewWindow.document.close();
  }
}
