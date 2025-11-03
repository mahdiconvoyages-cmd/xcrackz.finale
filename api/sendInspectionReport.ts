// Serverless API to send inspection report emails (PDF + photos ZIP)
// Supports mode: 'departure' | 'arrival' | 'both' with optional custom message

import JSZip from 'jszip';
import Mailjet from 'node-mailjet';
import { createClient } from '@supabase/supabase-js';

// ---- Types ----
type SendMode = 'departure' | 'arrival' | 'both';

type InspectionPhoto = {
  photo_url: string;
  photo_type?: string;
};

type MissionInfo = {
  reference: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
};

type InspectionData = {
  id: string;
  mission_id: string;
  inspection_type: 'departure' | 'arrival';
  created_at: string;
  mileage_km?: number;
  fuel_level?: number;
  mission: MissionInfo;
  photos: InspectionPhoto[];
};

// ---- Clients ----
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || '',
  { auth: { persistSession: false } }
);

const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY || '',
  process.env.MAILJET_SECRET_KEY || ''
);

// ---- Utilities ----
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function downloadPhoto(url: string): Promise<Buffer | null> {
  try {
    if (!url) return null;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const arr = await resp.arrayBuffer();
    return Buffer.from(arr);
  } catch (e) {
    console.warn('downloadPhoto error', e);
    return null;
  }
}

async function getInspectionData(inspectionId: string): Promise<InspectionData | null> {
  // Load inspection + mission
  const { data: insp, error } = await supabase
    .from('vehicle_inspections')
    .select(`
      *,
      mission:missions (
        reference,
        vehicle_brand,
        vehicle_model,
        vehicle_plate
      )
    `)
    .eq('id', inspectionId)
    .maybeSingle();
  if (error || !insp) {
    console.error('getInspectionData error', error);
    return null;
  }

  // Load photos
  const { data: photos, error: pErr } = await supabase
    .from('inspection_photos')
    .select('photo_url, photo_type')
    .eq('inspection_id', insp.id)
    .order('created_at', { ascending: true });
  if (pErr) {
    console.warn('getInspectionData photos error', pErr);
  }

  const normalized: InspectionPhoto[] = (photos || []).map((p: any, i: number) => {
    let url = p.photo_url || '';
    // If not absolute, try to build from public storage bucket
    if (url && !/^https?:\/\//i.test(url)) {
      try {
        const { data: pub } = supabase.storage.from('inspection-photos').getPublicUrl(url);
        url = (pub as any)?.publicUrl || (pub as any)?.public_url || url;
      } catch (e) {
        // ignore
      }
    }
    return { photo_url: url, photo_type: p.photo_type };
  });

  const mission: MissionInfo = {
    reference: insp.mission?.reference || `MISS-${(insp.mission_id || '').slice(0, 8)}`,
    vehicle_brand: insp.mission?.vehicle_brand || '',
    vehicle_model: insp.mission?.vehicle_model || '',
    vehicle_plate: insp.mission?.vehicle_plate || 'N/A',
  };

  return {
    id: insp.id,
    mission_id: insp.mission_id,
    inspection_type: insp.inspection_type,
    created_at: insp.created_at,
    mileage_km: insp.mileage_km ?? insp.mileage_departure ?? insp.mileage_arrival,
    fuel_level: insp.fuel_level ?? insp.fuel_level_arrival ?? insp.fuel_level_departure,
    mission,
    photos: normalized,
  };
}

/** Create a ZIP with photos for one inspection */
async function createPhotosZip(inspection: InspectionData): Promise<Buffer | null> {
  if (!inspection.photos || inspection.photos.length === 0) return null;
  const zip = new JSZip();
  let photoCount = 0;
  for (const photo of inspection.photos) {
    const buf = await downloadPhoto(photo.photo_url);
    if (buf) {
      photoCount++;
      const fileName = `${photo.photo_type || 'photo'}_${photoCount}.jpg`;
      zip.file(fileName, buf);
    }
  }
  if (photoCount === 0) return null;
  return zip.generateAsync({ type: 'nodebuffer' });
}

/** Create a combined ZIP with photos for multiple inspections */
async function createCombinedPhotosZip(inspections: InspectionData[]): Promise<Buffer | null> {
  const zip = new JSZip();
  let added = 0;
  for (const insp of inspections) {
    if (!insp.photos) continue;
    let idx = 0;
    for (const photo of insp.photos) {
      const buf = await downloadPhoto(photo.photo_url);
      if (buf) {
        idx++;
        added++;
        const prefix = insp.inspection_type === 'departure' ? 'depart' : 'arrivee';
        zip.file(`${prefix}/${photo.photo_type || 'photo'}_${idx}.jpg`, buf);
      }
    }
  }
  if (added === 0) return null;
  return zip.generateAsync({ type: 'nodebuffer' });
}

/** Fallback simple PDF as HTML buffer (replace with real generator if available server-side) */
async function generateInspectionPDF(inspection: InspectionData): Promise<Buffer> {
  const inspectionType = inspection.inspection_type === 'departure' ? 'départ' : 'arrivée';
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
  <title>Etat des lieux - ${inspectionType}</title>
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
          <div class="info-value">${(inspection.mileage_km ?? 0).toLocaleString('fr-FR')} km</div>
        </div>
        <div class="info-item">
          <div class="info-label">Niveau carburant</div>
          <div class="info-value">${inspection.fuel_level ?? 0}%</div>
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
      <p>Généré automatiquement par Finality • ${new Date().toLocaleDateString('fr-FR')}</p>
    </div>
  </body>
  </html>`;
  return Buffer.from(htmlContent, 'utf-8');
}

// ----- Server-side PDF cache helpers -----
async function getCachedPdfUrlServer(inspectionId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('inspection_pdfs')
    .select('pdf_url, generated_at')
    .eq('inspection_id', inspectionId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('getCachedPdfUrlServer error', error);
    return null;
  }
  return (data as any)?.pdf_url ?? null;
}

async function triggerServerPdfServer(inspectionId: string): Promise<boolean> {
  const { error } = await (supabase as any).rpc('regenerate_inspection_pdf', { p_inspection_id: inspectionId });
  if (error) {
    console.warn('triggerServerPdfServer error', error);
    return false;
  }
  return true;
}

async function waitForPdfUrl(inspectionId: string, timeoutMs = 15000): Promise<string | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const url = await getCachedPdfUrlServer(inspectionId);
    if (url) return url;
    await new Promise((r) => setTimeout(r, 1200));
  }
  return null;
}

async function fetchBufferFromUrl(url: string): Promise<Buffer | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const arr = await resp.arrayBuffer();
    return Buffer.from(arr);
  } catch (e) {
    console.warn('fetchBufferFromUrl error', e);
    return null;
  }
}

async function getPdfBufferPreferServer(inspection: InspectionData): Promise<Buffer> {
  let url = await getCachedPdfUrlServer(inspection.id);
  if (!url) {
    const trig = await triggerServerPdfServer(inspection.id);
    if (trig) {
      url = await waitForPdfUrl(inspection.id);
    }
  }
  if (url) {
    const buf = await fetchBufferFromUrl(url);
    if (buf) return buf;
  }
  return generateInspectionPDF(inspection);
}

// ---- Email HTML templates ----
function generateEmailHTMLSingle(inspection: InspectionData, introMessage?: string): string {
  const inspectionType = inspection.inspection_type === 'departure' ? 'départ' : 'arrivée';
  const photoCount = inspection.photos?.length || 0;
  const intro = introMessage ? `<p>${introMessage.replace(/\n/g, '<br/>')}</p>` : '<p>Bonjour,</p>';
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0 0; opacity: 0.95; }
    .content { background: #f8fafc; padding: 30px; }
    .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #0ea5e9; border-radius: 4px; }
    .info-box strong { color: #0284c7; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; background: #f1f5f9; border-radius: 0 0 8px 8px; }
  </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🚗 État des lieux - ${inspection.mission.reference}</h1>
        <p>Inspection de ${inspectionType}</p>
      </div>
      <div class="content">
        ${intro}
        <p>Vous trouverez ci-joint l'état des lieux ${inspectionType} du véhicule :</p>
        <div class="info-box">
          <strong>📋 Mission :</strong> ${inspection.mission.reference}<br>
          <strong>🚗 Véhicule :</strong> ${inspection.mission.vehicle_brand || ''} ${inspection.mission.vehicle_model || ''}<br>
          <strong>🔖 Immatriculation :</strong> ${inspection.mission.vehicle_plate || 'N/A'}<br>
          <strong>📍 Type :</strong> Inspection de ${inspectionType}<br>
          <strong>📅 Date :</strong> ${new Date(inspection.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
        <div class="info-box">
          <strong>📊 Détails inspection :</strong><br>
          - Kilométrage : ${(inspection.mileage_km ?? 0).toLocaleString('fr-FR')} km<br>
          - Niveau carburant : ${inspection.fuel_level ?? 0}%<br>
          - Nombre de photos : ${photoCount}
        </div>
        <p><strong>📎 Pièces jointes :</strong></p>
        <ul>
          <li>✅ Rapport PDF avec détails</li>
          ${photoCount > 0 ? '<li>✅ Archive ZIP avec toutes les photos haute résolution</li>' : ''}
        </ul>
        <p>Ces documents constituent le dossier officiel de l'état des lieux.</p>
        <p>Cordialement,<br><strong>Finality Transport</strong></p>
      </div>
      <div class="footer">© 2025 Finality • Rapport d'état des lieux</div>
    </div>
  </body>
  </html>`;
}

function generateEmailHTMLCombined(inspections: InspectionData[], introMessage?: string): string {
  const inspByType = Object.fromEntries(inspections.map(i => [i.inspection_type, i])) as any;
  const mission = inspections[0].mission;
  const intro = introMessage ? `<p>${introMessage.replace(/\n/g, '<br/>')}</p>` : '<p>Bonjour,</p>';
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f8fafc; padding: 30px; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
    .card { background: white; padding: 14px; border-left: 4px solid #0ea5e9; border-radius: 4px; }
    .title { color: #0284c7; font-weight: bold; margin-bottom: 6px; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; background: #f1f5f9; border-radius: 0 0 8px 8px; }
  </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🚗 État des lieux complet - ${mission.reference}</h1>
      </div>
      <div class="content">
        ${intro}
        <div class="card">
          <div class="title">Informations véhicule</div>
          <div><strong>Véhicule:</strong> ${mission.vehicle_brand || ''} ${mission.vehicle_model || ''} • <strong>Immat:</strong> ${mission.vehicle_plate || 'N/A'}</div>
        </div>
        <div class="grid">
          ${inspByType['departure'] ? `
          <div class="card">
            <div class="title">Inspection de départ</div>
            <div>Kilométrage: ${(inspByType['departure'].mileage_km ?? 0).toLocaleString('fr-FR')} km • Carburant: ${inspByType['departure'].fuel_level ?? 0}%</div>
          </div>`: ''}
          ${inspByType['arrival'] ? `
          <div class="card">
            <div class="title">Inspection d'arrivée</div>
            <div>Kilométrage: ${(inspByType['arrival'].mileage_km ?? 0).toLocaleString('fr-FR')} km • Carburant: ${inspByType['arrival'].fuel_level ?? 0}%</div>
          </div>`: ''}
        </div>
        <p><strong>📎 Pièces jointes :</strong> 2 rapports PDF + archive photos</p>
        <p>Cordialement,<br><strong>Finality Transport</strong></p>
      </div>
      <div class="footer">© 2025 Finality • Rapport d'état des lieux</div>
    </div>
  </body>
  </html>`;
}

/** Send email via Mailjet */
async function sendEmailGeneric(toEmail: string, subject: string, html: string, attachments: any[]) {
  const request = mailjet
    .post('send', { version: 'v3.1' })
    .request({
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_FROM_EMAIL || 'no-reply@finality.app',
            Name: process.env.MAILJET_FROM_NAME || 'Finality',
          },
          To: [{ Email: toEmail }],
          Cc: process.env.INTERNAL_EMAIL ? [{ Email: process.env.INTERNAL_EMAIL }] : undefined,
          Subject: subject,
          HTMLPart: html,
          Attachments: attachments,
        },
      ],
    });
  const response = await request;
  return (response as any)?.body?.Messages?.[0];
}

/** Log email status */
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
    sendgrid_message_id: mailjetMessageId, // legacy column name kept for compatibility
    error_message: errorMessage,
  });
}

// ---- Handler ----
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { inspectionId, toEmail, mode = 'departure', message } = req.body as {
      inspectionId: string;
      toEmail: string;
      mode?: SendMode;
      message?: string;
    };

    if (!inspectionId || !toEmail) {
      return res.status(400).json({ error: 'Missing required fields: inspectionId, toEmail' });
    }
    if (!isValidEmail(toEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    console.log(`📧 Envoi rapport inspection: ${inspectionId} → ${toEmail} (mode=${mode})`);

    // 1) Load primary inspection
    const inspection = await getInspectionData(inspectionId);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });

    // 2) Determine inspections to include
    const inspections: InspectionData[] = [inspection];
    if (mode === 'both') {
      const counterpartType = inspection.inspection_type === 'departure' ? 'arrival' : 'departure';
      const { data: other, error: otherErr } = await supabase
        .from('vehicle_inspections')
        .select('*')
        .eq('mission_id', inspection.mission_id)
        .eq('inspection_type', counterpartType)
        .maybeSingle();
      if (!otherErr && other) {
        const full = await getInspectionData((other as any).id);
        if (full) inspections.push(full);
      }
    } else if (mode === 'departure' || mode === 'arrival') {
      if (inspection.inspection_type !== mode) {
        const { data: requested, error: reqErr } = await supabase
          .from('vehicle_inspections')
          .select('*')
          .eq('mission_id', inspection.mission_id)
          .eq('inspection_type', mode)
          .maybeSingle();
        if (!reqErr && requested) {
          const full = await getInspectionData((requested as any).id);
          if (full) {
            inspections.length = 0;
            inspections.push(full);
          }
        }
      }
    }

    // 3) PDFs
    console.log('📄 Récupération des PDFs (cache serveur si dispo)...');
    const pdfBuffers: { filename: string; buffer: Buffer }[] = [];
    for (const insp of inspections) {
      const buf = await getPdfBufferPreferServer(insp);
      const typeLabel = insp.inspection_type === 'departure' ? 'Depart' : 'Arrivee';
      pdfBuffers.push({ filename: `Rapport_${typeLabel}_${insp.mission.reference}.pdf`, buffer: buf });
    }

    // 4) Photos ZIP
    console.log('📦 Création ZIP photos...');
    let zipBuffer: Buffer | null = null;
    if (mode === 'both' && inspections.length > 1) {
      zipBuffer = await createCombinedPhotosZip(inspections);
    } else {
      zipBuffer = await createPhotosZip(inspections[0]);
    }

    // 5) Attachments
    const attachments: any[] = pdfBuffers.map((p) => ({
      ContentType: 'application/pdf',
      Filename: p.filename,
      Base64Content: p.buffer.toString('base64'),
    }));
    if (zipBuffer) {
      const zipName = mode === 'both'
        ? `Photos_Complet_${inspection.mission.reference}.zip`
        : `Photos_${inspection.inspection_type === 'departure' ? 'Depart' : 'Arrivee'}_${inspection.mission.reference}.zip`;
      attachments.push({
        ContentType: 'application/zip',
        Filename: zipName,
        Base64Content: zipBuffer.toString('base64'),
      });
    }

    // 6) Email content
    const subject = mode === 'both'
      ? `Rapports d'état des lieux (complet) - ${inspection.mission.reference}`
      : `Rapport d'état des lieux (${inspection.inspection_type === 'departure' ? 'départ' : 'arrivée'}) - ${inspection.mission.reference}`;
    const html = mode === 'both'
      ? generateEmailHTMLCombined(inspections, message)
      : generateEmailHTMLSingle(inspections[0], message);

    // 7) Send
    console.log('📨 Envoi email via Mailjet...');
    const mailjetResponse = await sendEmailGeneric(toEmail, subject, html, attachments);

    // 8) Update status + log
    await supabase
      .from('vehicle_inspections')
      .update({ status: 'sent', client_email: toEmail })
      .eq('id', inspections[0].id);

    await logEmailSent(
      inspections[0].id,
      toEmail,
      'sent',
      mailjetResponse?.To?.[0]?.MessageID?.toString()
    );

    console.log('✅ Email envoyé avec succès!');
    return res.status(200).json({
      success: true,
      message: 'Rapport envoyé avec succès',
      messageId: mailjetResponse?.To?.[0]?.MessageID,
      photoCount: inspections.reduce((acc, i) => acc + (i.photos?.length || 0), 0),
    });
  } catch (error: any) {
    console.error('❌ sendInspectionReport error', error);
    try {
      if (req?.body?.inspectionId && req?.body?.toEmail) {
        await logEmailSent(req.body.inspectionId, req.body.toEmail, 'failed', undefined, error?.message);
      }
    } catch {}
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}

// (end)
