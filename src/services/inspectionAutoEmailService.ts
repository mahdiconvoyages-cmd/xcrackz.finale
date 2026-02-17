/**
 * 📧 SYSTÈME D'ENVOI AUTOMATIQUE DES RAPPORTS D'INSPECTION
 * 
 * Fonctionnalités:
 * ✅ Email automatique au signataire départ (rapport départ + photos)
 * ✅ Email automatique au signataire arrivée (rapport complet)
 * ✅ Génération PDF avant envoi
 * ✅ Pièces jointes automatiques
 * ✅ Templates HTML professionnels
 */

import { supabase } from '../lib/supabase';
import { generateCompletePDF } from './inspectionPdfGeneratorComplete';
import { generateInspectionPDFModern } from './inspectionPdfGeneratorModern';

// ==========================================
// INTERFACES
// ==========================================

interface InspectionEmailData {
  mission: {
    reference: string;
    vehicle_brand?: string;
    vehicle_model?: string;
    vehicle_plate?: string;
    pickup_address?: string;
    delivery_address?: string;
  };
  inspection: {
    id: string;
    inspection_type: 'departure' | 'arrival';
    client_name?: string;
    client_email?: string;
    created_at: string;
  };
}

interface EmailResult {
  success: boolean;
  message: string;
  emailsSent?: number;
}

// ==========================================
// CONFIGURATION
// ==========================================

const EMAIL_CONFIG = {
  fromEmail: 'noreply@checksfleet.com',
  fromName: 'CHECKSFLEET - Gestion de Transport',
  replyTo: 'contact@checksfleet.com',
};

// ==========================================
// TEMPLATES EMAIL
// ==========================================

function generateDepartureEmailTemplate(data: InspectionEmailData): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport d'Inspection Départ</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .content {
      padding: 30px;
    }
    .info-box {
      background-color: #f0fdfa;
      border-left: 4px solid #14b8a6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box strong {
      color: #0d9488;
      display: block;
      margin-bottom: 5px;
    }
    .mission-details {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .mission-details table {
      width: 100%;
      border-collapse: collapse;
    }
    .mission-details td {
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .mission-details td:first-child {
      font-weight: 600;
      color: #6b7280;
      width: 40%;
    }
    .mission-details tr:last-child td {
      border-bottom: none;
    }
    .attachment-notice {
      background-color: #fef3c7;
      border: 1px solid #fbbf24;
      color: #92400e;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      display: flex;
      align-items: center;
    }
    .attachment-notice::before {
      content: "📎";
      font-size: 24px;
      margin-right: 15px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .button {
      display: inline-block;
      background-color: #14b8a6;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #0d9488;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚗 Rapport d'Inspection Départ</h1>
      <p>Mission ${data.mission.reference}</p>
    </div>
    
    <div class="content">
      <p>Bonjour <strong>${data.inspection.client_name || 'Madame, Monsieur'}</strong>,</p>
      
      <p>Nous vous confirmons la <strong>prise en charge</strong> de votre véhicule pour la mission de transport suivante :</p>
      
      <div class="mission-details">
        <table>
          <tr>
            <td>Référence mission</td>
            <td><strong>${data.mission.reference}</strong></td>
          </tr>
          <tr>
            <td>Véhicule</td>
            <td>${data.mission.vehicle_brand || ''} ${data.mission.vehicle_model || ''}</td>
          </tr>
          <tr>
            <td>Immatriculation</td>
            <td><strong>${data.mission.vehicle_plate || 'N/A'}</strong></td>
          </tr>
          <tr>
            <td>Lieu de départ</td>
            <td>${data.mission.pickup_address || 'N/A'}</td>
          </tr>
          <tr>
            <td>Date d'inspection</td>
            <td>${new Date(data.inspection.created_at).toLocaleString('fr-FR')}</td>
          </tr>
        </table>
      </div>
      
      <div class="info-box">
        <strong>✅ État du véhicule vérifié</strong>
        <p style="margin: 5px 0 0 0;">L'inspection de départ a été effectuée et documentée avec photos. Vous trouverez le rapport complet en pièce jointe.</p>
      </div>
      
      <div class="attachment-notice">
        <div>
          <strong>Pièce jointe incluse :</strong>
          <p style="margin: 5px 0 0 0;">Rapport d'inspection départ avec photos du véhicule (PDF)</p>
        </div>
      </div>
      
      <p>Ce document contient :</p>
      <ul>
        <li>✓ État général du véhicule au départ</li>
        <li>✓ Photos détaillées (extérieur et intérieur)</li>
        <li>✓ Kilométrage et niveau de carburant</li>
        <li>✓ Votre signature de validation</li>
      </ul>
      
      <p><strong>Conservez ce rapport</strong> pour vos dossiers. Vous recevrez un second email avec le rapport complet une fois le véhicule livré à destination.</p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="font-size: 14px; color: #6b7280;">Pour toute question concernant cette mission, contactez-nous à ${EMAIL_CONFIG.replyTo}</p>
    </div>
    
    <div class="footer">
      <p><strong>CHECKSFLEET</strong> - Solution professionnelle de gestion de transport</p>
      <p>Cet email a été généré automatiquement. Merci de ne pas y répondre directement.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function generateArrivalEmailTemplate(data: InspectionEmailData): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport Complet de Transport</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .content {
      padding: 30px;
    }
    .success-box {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .success-box h2 {
      margin: 0 0 10px 0;
      font-size: 20px;
    }
    .success-box p {
      margin: 0;
      opacity: 0.95;
    }
    .mission-details {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .mission-details table {
      width: 100%;
      border-collapse: collapse;
    }
    .mission-details td {
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .mission-details td:first-child {
      font-weight: 600;
      color: #6b7280;
      width: 40%;
    }
    .mission-details tr:last-child td {
      border-bottom: none;
    }
    .info-box {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box strong {
      color: #1e40af;
      display: block;
      margin-bottom: 5px;
    }
    .attachment-notice {
      background-color: #fef3c7;
      border: 1px solid #fbbf24;
      color: #92400e;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      display: flex;
      align-items: center;
    }
    .attachment-notice::before {
      content: "📎";
      font-size: 24px;
      margin-right: 15px;
    }
    .comparison-table {
      width: 100%;
      margin: 20px 0;
      border-collapse: collapse;
    }
    .comparison-table th {
      background-color: #f3f4f6;
      padding: 12px;
      text-align: left;
      border-bottom: 2px solid #e5e7eb;
    }
    .comparison-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .comparison-table tr:last-child td {
      border-bottom: none;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Transport Terminé</h1>
      <p>Rapport Complet - Mission ${data.mission.reference}</p>
    </div>
    
    <div class="content">
      <p>Bonjour <strong>${data.inspection.client_name || 'Madame, Monsieur'}</strong>,</p>
      
      <div class="success-box">
        <h2>✅ Véhicule livré avec succès</h2>
        <p>L'inspection d'arrivée a été effectuée et le véhicule vous a été remis</p>
      </div>
      
      <p>Nous vous confirmons la <strong>livraison</strong> de votre véhicule pour la mission suivante :</p>
      
      <div class="mission-details">
        <table>
          <tr>
            <td>Référence mission</td>
            <td><strong>${data.mission.reference}</strong></td>
          </tr>
          <tr>
            <td>Véhicule</td>
            <td>${data.mission.vehicle_brand || ''} ${data.mission.vehicle_model || ''}</td>
          </tr>
          <tr>
            <td>Immatriculation</td>
            <td><strong>${data.mission.vehicle_plate || 'N/A'}</strong></td>
          </tr>
          <tr>
            <td>Lieu de livraison</td>
            <td>${data.mission.delivery_address || 'N/A'}</td>
          </tr>
          <tr>
            <td>Date de livraison</td>
            <td>${new Date(data.inspection.created_at).toLocaleString('fr-FR')}</td>
          </tr>
        </table>
      </div>
      
      <div class="info-box">
        <strong>📋 Rapport complet inclus</strong>
        <p style="margin: 5px 0 0 0;">Ce rapport contient les inspections de départ ET d'arrivée avec toutes les photos du véhicule avant et après transport.</p>
      </div>
      
      <div class="attachment-notice">
        <div>
          <strong>Pièce jointe incluse :</strong>
          <p style="margin: 5px 0 0 0;">Rapport complet de transport avec photos départ + arrivée (PDF)</p>
        </div>
      </div>
      
      <p>Ce document professionnel contient :</p>
      <ul>
        <li>✓ Inspection complète au départ (état initial)</li>
        <li>✓ Inspection complète à l'arrivée (état final)</li>
        <li>✓ Toutes les photos (départ + arrivée)</li>
        <li>✓ Comparaison kilométrage et carburant</li>
        <li>✓ Distance parcourue pendant le transport</li>
        <li>✓ Signatures des deux parties</li>
      </ul>
      
      <p><strong>Conservez ce rapport</strong> pour vos dossiers et assurances. Il constitue une preuve officielle de l'état du véhicule avant et après transport.</p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="text-align: center; color: #6b7280;">
        <strong>Merci de votre confiance !</strong><br>
        Pour toute question, contactez-nous à ${EMAIL_CONFIG.replyTo}
      </p>
    </div>
    
    <div class="footer">
      <p><strong>CHECKSFLEET</strong> - Solution professionnelle de gestion de transport</p>
      <p>Cet email a été généré automatiquement. Merci de ne pas y répondre directement.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ==========================================
// FONCTIONS D'ENVOI EMAIL
// ==========================================

/**
 * Envoyer l'email de l'inspection départ
 */
export async function sendDepartureInspectionEmail(
  inspectionId: string
): Promise<EmailResult> {
  try {
    console.log('📧 Envoi email inspection départ...', inspectionId);

    // 1. Charger les données de l'inspection
    const { data: inspectionRaw, error: inspError } = await supabase
      .from('vehicle_inspections')
      .select(`
        *,
        mission:missions (
          reference,
          vehicle_brand,
          vehicle_model,
          vehicle_plate,
          pickup_address,
          delivery_address
        )
      `)
      .eq('id', inspectionId)
      .eq('inspection_type', 'departure')
      .single();

    if (inspError || !inspectionRaw) {
      throw new Error('Inspection non trouvée');
    }

    const inspection: any = inspectionRaw; // assouplir le typage pour accéder aux champs dynamiques

    // Vérifier qu'il y a un email
    if (!inspection.client_email) {
      console.warn('⚠️ Pas d\'email pour le signataire départ');
      return {
        success: false,
        message: 'Pas d\'email renseigné pour le signataire',
      };
    }

    // 2. Charger les photos
    const { data: photos } = await supabase
      .from('inspection_photos')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: true });

    // 3. Générer le PDF moderne (section départ seule)
    const pdfResult = await generateInspectionPDFModern(
      inspection.mission,
      inspection,
      null, // pas d'arrivée
      photos || [],
      []
    );

    if (!pdfResult.success) {
      throw new Error('Erreur génération PDF');
    }

    const pdfBlob = pdfResult.pdf.output('blob');
    const pdfBase64 = await blobToBase64(pdfBlob);

    // 4. Générer le template email
    const emailHTML = generateDepartureEmailTemplate({
      mission: inspection.mission,
      inspection: {
        id: inspection.id,
        inspection_type: 'departure',
        client_name: inspection.client_name,
        client_email: inspection.client_email,
        created_at: inspection.created_at,
      },
    });

    // 5. Envoyer l'email via Supabase Edge Function (à implémenter)
    // L'email n'est pas encore envoyé - le service d'envoi doit être configuré
    console.log('📨 Email préparé pour:', inspection.client_email);
    console.log('📄 PDF attaché:', pdfBase64.length, 'bytes');
    console.log('📧 HTML template length:', emailHTML.length, 'chars');

    // TODO: Appeler une Edge Function Supabase pour l'envoi
    // const { data, error } = await supabase.functions.invoke('send-email', {
    //   body: {
    //     to: inspection.client_email,
    //     subject: `Rapport d'inspection départ - Mission ${inspection.mission.reference}`,
    //     html: emailHTML,
    //     attachments: [{
    //       filename: `Inspection_Depart_${inspection.mission.reference}.pdf`,
    //       content: pdfBase64,
    //       type: 'application/pdf',
    //     }],
    //   },
    // });

    return {
      success: false,
      message: 'Rapport PDF préparé mais l\'envoi par email n\'est pas encore configuré',
      emailsSent: 0,
    };
  } catch (error: any) {
    console.error('❌ Erreur envoi email départ:', error);
    return {
      success: false,
      message: error.message || 'Erreur envoi email',
    };
  }
}

/**
 * Envoyer l'email du rapport complet (après arrivée)
 */
export async function sendArrivalCompleteEmail(
  arrivalInspectionId: string
): Promise<EmailResult> {
  try {
    console.log('📧 Envoi email rapport complet...', arrivalInspectionId);

    // 1. Charger l'inspection d'arrivée
    const { data: arrivalInspectionRaw, error: arrivalError } = await supabase
      .from('vehicle_inspections')
      .select(`
        *,
        mission:missions (
          id,
          reference,
          vehicle_brand,
          vehicle_model,
          vehicle_plate,
          pickup_address,
          delivery_address,
          pickup_date,
          delivery_date
        )
      `)
      .eq('id', arrivalInspectionId)
      .eq('inspection_type', 'arrival')
      .single();

    if (arrivalError || !arrivalInspectionRaw) {
      throw new Error('Inspection d\'arrivée non trouvée');
    }

    const arrivalInspection: any = arrivalInspectionRaw;

    // Vérifier qu'il y a un email
    if (!arrivalInspection.client_email) {
      console.warn('⚠️ Pas d\'email pour le signataire arrivée');
      return {
        success: false,
        message: 'Pas d\'email renseigné pour le signataire',
      };
    }

    // 2. Charger l'inspection de départ (même mission)
    const { data: departureInspectionRaw } = await supabase
      .from('vehicle_inspections')
      .select('*')
      .eq('mission_id', arrivalInspection.mission_id)
      .eq('inspection_type', 'departure')
      .single();

    const departureInspection: any = departureInspectionRaw || null;

    // 3. Charger toutes les photos (départ + arrivée)
    const { data: departurePhotos } = await supabase
      .from('inspection_photos')
      .select('*')
  .eq('inspection_id', departureInspection?.id || '')
      .order('created_at', { ascending: true });

    const { data: arrivalPhotos } = await supabase
      .from('inspection_photos')
      .select('*')
      .eq('inspection_id', arrivalInspectionId)
      .order('created_at', { ascending: true });

    // 3bis. Charger documents scannés et frais liés à l'inspection d'arrivée
    const { data: scannedDocuments } = await supabase
      .from('inspection_documents')
      .select('*')
      .eq('inspection_id', arrivalInspectionId)
      .order('created_at', { ascending: true });

    const { data: expenses } = await supabase
      .from('inspection_expenses')
      .select('*')
      .eq('inspection_id', arrivalInspectionId)
      .order('created_at', { ascending: true });

    // 4. Générer le PDF COMPLET (départ + arrivée)
    const pdfResult = await generateCompletePDF(
      arrivalInspection.mission,
      departureInspection || null,
      arrivalInspection,
      departurePhotos || [],
      arrivalPhotos || [],
      scannedDocuments || [],
      (expenses || []).map((e: any) => ({
        id: e.id,
        label: e.description || e.expense_type || 'Frais',
        amount: Number(e.amount || 0),
        currency: 'EUR',
        category: e.expense_type,
        date: e.created_at,
      }))
    );

    if (!pdfResult.success) {
      throw new Error('Erreur génération PDF complet');
    }

    const pdfBlob = pdfResult.pdf.output('blob');
    const pdfBase64 = await blobToBase64(pdfBlob);

    // 5. Générer le template email
    const emailHTML = generateArrivalEmailTemplate({
      mission: arrivalInspection.mission,
      inspection: {
        id: arrivalInspection.id,
        inspection_type: 'arrival',
        client_name: arrivalInspection.client_name,
        client_email: arrivalInspection.client_email,
        created_at: arrivalInspection.created_at,
      },
    });

    // 6. Envoyer l'email
    console.log('📨 Email complet préparé pour:', arrivalInspection.client_email);
    console.log('📄 PDF complet attaché:', pdfBase64.length, 'bytes');
    console.log('📧 HTML template length:', emailHTML.length, 'chars');

    // TODO: Appeler Edge Function
    // const { data, error } = await supabase.functions.invoke('send-email', {
    //   body: {
    //     to: arrivalInspection.client_email,
    //     subject: `Rapport complet de transport - Mission ${arrivalInspection.mission.reference}`,
    //     html: emailHTML,
    //     attachments: [{
    //       filename: `Rapport_Complet_${arrivalInspection.mission.reference}.pdf`,
    //       content: pdfBase64,
    //       type: 'application/pdf',
    //     }],
    //   },
    // });

    return {
      success: false,
      message: 'Rapport PDF préparé mais l\'envoi par email n\'est pas encore configuré',
      emailsSent: 0,
    };
  } catch (error: any) {
    console.error('❌ Erreur envoi email arrivée:', error);
    return {
      success: false,
      message: error.message || 'Erreur envoi email',
    };
  }
}

/**
 * Fonction déclenchée automatiquement après signature d'inspection
 */
export async function triggerInspectionEmailAuto(
  inspectionId: string,
  inspectionType: 'departure' | 'arrival'
): Promise<EmailResult> {
  console.log(`🔔 Déclenchement auto email ${inspectionType}...`);

  if (inspectionType === 'departure') {
    return await sendDepartureInspectionEmail(inspectionId);
  } else {
    return await sendArrivalCompleteEmail(inspectionId);
  }
}

// ==========================================
// UTILITAIRES
// ==========================================

/**
 * Convertir Blob en Base64
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Retirer le préfixe "data:application/pdf;base64,"
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ==========================================
// EXPORT
// ==========================================

export default {
  sendDepartureInspectionEmail,
  sendArrivalCompleteEmail,
  triggerInspectionEmailAuto,
};
