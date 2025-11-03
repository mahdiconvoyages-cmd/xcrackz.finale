/**
 * API Serverless : Envoi automatique rapport inspection
 * 
 * Déclenché après validation d'une inspection (départ ou arrivée)
 * Génère PDF + ZIP photos et envoie email au client via SendGrid
 * 
 * POST /api/sendInspectionReport
 * Body: { inspectionId: string, clientEmail: string }
 */

import { createClient } from '@supabase/supabase-js';
import Mailjet from 'node-mailjet';
import JSZip from 'jszip';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Configuration Mailjet
const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY || '',
  process.env.MAILJET_SECRET_KEY || ''
);

// Configuration Supabase (service key pour accès complet)
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

interface InspectionData {
  id: string;
  mission_id: string;
  type: 'departure' | 'arrival';
  km: number;
  fuel_level: string;
  created_at: string;
  client_email?: string;
  mission: {
    reference: string;
    vehicle_brand?: string;
    vehicle_model?: string;
    vehicle_plate?: string;
  };
  photos: Array<{
    photo_url: string;
    category: string;
  }>;
}

/**
 * Valide un email
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Récupère les données complètes de l'inspection
 */
async function getInspectionData(inspectionId: string): Promise<InspectionData | null> {
  const { data: inspection, error } = await supabase
    .from('vehicle_inspections')
    .select(`
      id,
      mission_id,
      type,
      km,
      fuel_level,
      created_at,
      client_email,
      mission:missions!inner (
        reference,
        vehicle_brand,
        vehicle_model,
        vehicle_plate
      )
    `)
    .eq('id', inspectionId)
    .single();

  if (error || !inspection) {
    console.error('Erreur récupération inspection:', error);
    return null;
  }

  // Récupérer les photos
  const { data: photos, error: photosError } = await supabase
    .from('inspection_photos')
    .select('photo_url, category')
    .eq('inspection_id', inspectionId);

  if (photosError) {
    console.error('Erreur récupération photos:', photosError);
  }

  return {
    ...inspection,
    photos: photos || [],
  };
}

/**
 * Télécharge une photo depuis Supabase Storage
 */
async function downloadPhoto(photoUrl: string): Promise<Buffer | null> {
  try {
    // Extraire le path depuis l'URL
    const urlObj = new URL(photoUrl);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
    
    if (!pathMatch) {
      console.error('URL invalide:', photoUrl);
      return null;
    }

    const filePath = pathMatch[1];
    
    // Télécharger depuis Supabase Storage
    const { data, error } = await supabase.storage
      .from('inspection-photos')
      .download(filePath);

    if (error || !data) {
      console.error('Erreur téléchargement photo:', error);
      return null;
    }

    return Buffer.from(await data.arrayBuffer());
  } catch (err) {
    console.error('Erreur téléchargement photo:', err);
    return null;
  }
}

/**
 * Créer un ZIP avec toutes les photos
 */
async function createPhotosZip(inspection: InspectionData): Promise<Buffer | null> {
  if (!inspection.photos || inspection.photos.length === 0) {
    return null;
  }

  const zip = new JSZip();
  let photoCount = 0;

  for (const photo of inspection.photos) {
    const photoBuffer = await downloadPhoto(photo.photo_url);
    
    if (photoBuffer) {
      photoCount++;
      const fileName = `${photo.category || 'photo'}_${photoCount}.jpg`;
      zip.file(fileName, photoBuffer);
    }
  }

  if (photoCount === 0) {
    return null;
  }

  return zip.generateAsync({ type: 'nodebuffer' });
}

/**
 * Générer le contenu HTML de l'email
 */
function generateEmailHTML(inspection: InspectionData): string {
  const inspectionType = inspection.type === 'departure' ? 'départ' : 'arrivée';
  const photoCount = inspection.photos?.length || 0;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { 
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); 
      color: white; 
      padding: 30px; 
      text-align: center; 
      border-radius: 8px 8px 0 0; 
    }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0 0; opacity: 0.95; }
    .content { background: #f8fafc; padding: 30px; }
    .info-box { 
      background: white; 
      padding: 15px; 
      margin: 15px 0; 
      border-left: 4px solid #0ea5e9;
      border-radius: 4px;
    }
    .info-box strong { color: #0284c7; }
    .footer { 
      text-align: center; 
      padding: 20px; 
      color: #64748b; 
      font-size: 12px; 
      background: #f1f5f9;
      border-radius: 0 0 8px 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚗 État des lieux - ${inspection.mission.reference}</h1>
      <p>Inspection de ${inspectionType}</p>
    </div>
    
    <div class="content">
      <p>Bonjour,</p>
      
      <p>Vous trouverez ci-joint l'état des lieux complet du véhicule :</p>
      
      <div class="info-box">
        <strong>📋 Mission :</strong> ${inspection.mission.reference}<br>
        <strong>🚗 Véhicule :</strong> ${inspection.mission.vehicle_brand || ''} ${inspection.mission.vehicle_model || ''}<br>
        <strong>🔖 Immatriculation :</strong> ${inspection.mission.vehicle_plate || 'N/A'}<br>
        <strong>📍 Type :</strong> Inspection de ${inspectionType}<br>
        <strong>📅 Date :</strong> ${new Date(inspection.created_at).toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
      
      <div class="info-box">
        <strong>📊 Détails inspection :</strong><br>
        - Kilométrage : ${inspection.km.toLocaleString('fr-FR')} km<br>
        - Niveau carburant : ${inspection.fuel_level}<br>
        - Nombre de photos : ${photoCount}
      </div>
      
      <p><strong>📎 Pièces jointes :</strong></p>
      <ul>
        <li>✅ Rapport PDF complet avec détails et photos</li>
        ${photoCount > 0 ? '<li>✅ Archive ZIP avec toutes les photos haute résolution</li>' : ''}
      </ul>
      
      <p>Ces documents constituent le dossier officiel de l'état des lieux.</p>
      
      <p>Cordialement,<br><strong>L'équipe xCrackz</strong></p>
    </div>
    
    <div class="footer">
      <p>© 2025 xCrackz - Gestion de missions automobiles</p>
      <p>Cet email a été envoyé automatiquement suite à la validation de l'inspection.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Générer un PDF simple avec les détails de l'inspection
 * TODO: Intégrer avec votre générateur PDF existant
 */
async function generateInspectionPDF(inspection: InspectionData): Promise<Buffer> {
  // Version simplifiée - à remplacer par votre générateur PDF existant
  const inspectionType = inspection.type === 'departure' ? 'départ' : 'arrivée';
  const photoCount = inspection.photos?.length || 0;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    .header { text-align: center; border-bottom: 3px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #0284c7; margin: 0; }
    .section { margin: 20px 0; }
    .section h2 { color: #0284c7; border-left: 4px solid #0ea5e9; padding-left: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .info-item { padding: 10px; background: #f8fafc; border-radius: 4px; }
    .info-label { font-weight: bold; color: #64748b; font-size: 12px; }
    .info-value { font-size: 16px; margin-top: 5px; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>État des lieux - ${inspectionType}</h1>
    <p>Mission: ${inspection.mission.reference}</p>
  </div>
  
  <div class="section">
    <h2>Informations véhicule</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Marque & Modèle</div>
        <div class="info-value">${inspection.mission.vehicle_brand || ''} ${inspection.mission.vehicle_model || ''}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Immatriculation</div>
        <div class="info-value">${inspection.mission.vehicle_plate || 'N/A'}</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2>État du véhicule</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Kilométrage</div>
        <div class="info-value">${inspection.km.toLocaleString('fr-FR')} km</div>
      </div>
      <div class="info-item">
        <div class="info-label">Niveau carburant</div>
        <div class="info-value">${inspection.fuel_level}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Date inspection</div>
        <div class="info-value">${new Date(inspection.created_at).toLocaleDateString('fr-FR')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Photos prises</div>
        <div class="info-value">${photoCount}</div>
      </div>
    </div>
  </div>
  
  <div class="footer">
    <p>Généré automatiquement par xCrackz - ${new Date().toLocaleDateString('fr-FR')}</p>
  </div>
</body>
</html>
  `;

  // Note: Cette version utilise juste le HTML
  // Pour une vraie génération PDF, utilisez puppeteer, pdfkit ou votre solution existante
  return Buffer.from(htmlContent, 'utf-8');
}

/**
 * Envoyer l'email via Mailjet
 */
async function sendEmail(
  inspection: InspectionData,
  clientEmail: string,
  pdfBuffer: Buffer,
  zipBuffer: Buffer | null
) {
  const inspectionType = inspection.type === 'departure' ? 'départ' : 'arrivée';
  
  const attachments: any[] = [
    {
      ContentType: 'application/pdf',
      Filename: `Rapport_${inspectionType}_${inspection.mission.reference}.pdf`,
      Base64Content: pdfBuffer.toString('base64'),
    },
  ];

  if (zipBuffer) {
    attachments.push({
      ContentType: 'application/zip',
      Filename: `Photos_${inspectionType}_${inspection.mission.reference}.zip`,
      Base64Content: zipBuffer.toString('base64'),
    });
  }

  const request = mailjet
    .post('send', { version: 'v3.1' })
    .request({
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_FROM_EMAIL || 'no-reply@xcrackz.com',
            Name: process.env.MAILJET_FROM_NAME || 'xCrackz',
          },
          To: [
            {
              Email: clientEmail,
            },
          ],
          Cc: process.env.INTERNAL_EMAIL ? [
            {
              Email: process.env.INTERNAL_EMAIL,
            },
          ] : undefined,
          Subject: `État des lieux ${inspectionType} - ${inspection.mission.reference}`,
          HTMLPart: generateEmailHTML(inspection),
          Attachments: attachments,
        },
      ],
    });

  const response = await request;
  return response.body.Messages[0];
}

/**
 * Logger l'envoi dans la base de données
 */
async function logEmailSent(
  inspectionId: string,
  recipientEmail: string,
  status: 'sent' | 'failed',
  mailjetMessageId?: string,
  errorMessage?: string
) {
  await supabase.from('email_logs').insert({
    inspection_id: inspectionId,
    recipient_email: recipientEmail,
    status,
    sendgrid_message_id: mailjetMessageId, // On garde le nom de colonne pour compatibilité
    error_message: errorMessage,
  });
}

/**
 * Fonction principale (Vercel serverless)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vérifier la méthode
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { inspectionId, clientEmail } = req.body;

    // Validation des paramètres
    if (!inspectionId || !clientEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields: inspectionId, clientEmail' 
      });
    }

    if (!isValidEmail(clientEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    console.log(`📧 Envoi rapport inspection: ${inspectionId} → ${clientEmail}`);

    // 1. Récupérer les données de l'inspection
    const inspection = await getInspectionData(inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // 2. Générer le PDF
    console.log('📄 Génération PDF...');
    const pdfBuffer = await generateInspectionPDF(inspection);

    // 3. Créer le ZIP des photos
    console.log('📦 Création ZIP photos...');
    const zipBuffer = await createPhotosZip(inspection);

    // 4. Envoyer l'email
    console.log('📨 Envoi email via Mailjet...');
    const mailjetResponse = await sendEmail(
      inspection,
      clientEmail,
      pdfBuffer,
      zipBuffer
    );

    // 5. Mettre à jour le statut de l'inspection
    await supabase
      .from('vehicle_inspections')
      .update({ status: 'sent', client_email: clientEmail })
      .eq('id', inspectionId);

    // 6. Logger l'envoi
    await logEmailSent(
      inspectionId,
      clientEmail,
      'sent',
      mailjetResponse.To[0].MessageID?.toString()
    );

    console.log('✅ Email envoyé avec succès!');

    return res.status(200).json({
      success: true,
      message: 'Rapport envoyé avec succès',
      messageId: mailjetResponse.To[0].MessageID,
      photoCount: inspection.photos?.length || 0,
    });

  } catch (error: any) {
    console.error('❌ Erreur envoi email:', error);

    // Logger l'échec
    if (req.body.inspectionId && req.body.clientEmail) {
      await logEmailSent(
        req.body.inspectionId,
        req.body.clientEmail,
        'failed',
        undefined,
        error.message
      );
    }

    return res.status(500).json({
      error: 'Failed to send inspection report',
      details: error.message,
    });
  }
}
