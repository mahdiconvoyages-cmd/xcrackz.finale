import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

/**
 * GET /api/download-report/:token
 * 
 * Télécharge un ZIP complet du rapport contenant:
 * - photos_depart/ (toutes les photos)
 * - photos_arrivee/ (toutes les photos)
 * - rapport_mission_[REF].txt (détails texte)
 * 
 * Response: Stream ZIP file
 */
export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extraire le token
    const token = req.query.token || req.url?.split('/').pop();

    if (!token || token === 'download-report') {
      return res.status(400).json({ error: 'Share token is required' });
    }

    console.log('📦 Generating ZIP for report:', token);

    // Récupérer les données du rapport
    const { data: reportData, error: reportError } = await supabase.rpc('get_public_report_data', {
      p_share_token: token
    });

    if (reportError || !reportData || reportData.error) {
      console.error('❌ Error fetching report:', reportError || reportData?.error);
      return res.status(404).json({ error: 'Report not found' });
    }

    const { mission, departure, arrival } = reportData;
    const reference = mission?.reference || token;

    console.log('📁 Building ZIP archive...');
    const zip = new JSZip();

    // Fonction helper pour télécharger une photo
    async function downloadPhoto(url: string): Promise<Buffer | null> {
      try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (e) {
        console.error('Failed to download photo:', url, e);
        return null;
      }
    }

    // Ajouter les photos de départ
    if (departure?.photos && Array.isArray(departure.photos)) {
      const departFolder = zip.folder('photos_depart');
      let depIndex = 1;
      for (const photo of departure.photos) {
        const photoUrl = photo.photo_url;
        if (photoUrl) {
          const buffer = await downloadPhoto(photoUrl);
          if (buffer) {
            const ext = photoUrl.split('.').pop()?.split('?')[0] || 'jpg';
            const type = photo.photo_type || 'autre';
            departFolder?.file(`${depIndex}_${type}.${ext}`, buffer);
            depIndex++;
          }
        }
      }
      console.log(`✅ ${depIndex - 1} photos départ ajoutées`);
    }

    // Ajouter les photos d'arrivée
    if (arrival?.photos && Array.isArray(arrival.photos)) {
      const arrivalFolder = zip.folder('photos_arrivee');
      let arrIndex = 1;
      for (const photo of arrival.photos) {
        const photoUrl = photo.photo_url;
        if (photoUrl) {
          const buffer = await downloadPhoto(photoUrl);
          if (buffer) {
            const ext = photoUrl.split('.').pop()?.split('?')[0] || 'jpg';
            const type = photo.photo_type || 'autre';
            arrivalFolder?.file(`${arrIndex}_${type}.${ext}`, buffer);
            arrIndex++;
          }
        }
      }
      console.log(`✅ ${arrIndex - 1} photos arrivée ajoutées`);
    }

    // Générer un fichier texte avec les détails
    const reportText = generateReportText(reportData);
    zip.file(`rapport_mission_${reference}.txt`, reportText);

    // Générer le ZIP
    console.log('🗜️ Compressing ZIP...');
    const zipBuffer = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    console.log(`✅ ZIP ready (${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

    // Envoyer le fichier
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="rapport_inspection_${reference}.zip"`);
    res.setHeader('Content-Length', zipBuffer.length.toString());
    return res.status(200).send(zipBuffer);

  } catch (error: any) {
    console.error('❌ download-report error:', error);
    return res.status(500).json({ 
      error: error?.message || 'Internal server error' 
    });
  }
}

/**
 * Génère un fichier texte avec tous les détails du rapport
 */
function generateReportText(data: any): string {
  const { mission, departure, arrival, view_count } = data;
  
  let text = '';
  text += '═══════════════════════════════════════════════════════\n';
  text += '            RAPPORT D\'INSPECTION VEHICULE              \n';
  text += '═══════════════════════════════════════════════════════\n\n';

  // Informations mission
  if (mission) {
    text += '📋 MISSION\n';
    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    text += `Référence: ${mission.reference || 'N/A'}\n`;
    text += `Statut: ${mission.status || 'N/A'}\n`;
    
    if (mission.vehicle) {
      text += `\n🚗 VEHICULE\n`;
      text += `Marque: ${mission.vehicle.brand || 'N/A'}\n`;
      text += `Modèle: ${mission.vehicle.model || 'N/A'}\n`;
      text += `Immatriculation: ${mission.vehicle.plate || 'N/A'}\n`;
      text += `Type: ${mission.vehicle.vehicle_type || 'N/A'}\n`;
    }
    text += '\n';
  }

  // Inspection départ
  if (departure) {
    text += '\n🟢 INSPECTION DE DÉPART\n';
    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    if (departure.datetime) {
      text += `📅 Date et heure: ${new Date(departure.datetime).toLocaleString('fr-FR')}\n`;
    }
    if (departure.location) {
      text += `📍 Lieu: ${departure.location}\n`;
    }
    text += `📸 Nombre de photos: ${departure.photos?.length || 0}\n`;
    
    if (departure.notes) {
      text += `\n📝 Notes du chauffeur:\n${departure.notes}\n`;
    }
    
    text += `\n✍️ Signatures:\n`;
    text += `   Chauffeur: ${departure.driver_signature ? '✓ Signé' : '✗ Non signé'}\n`;
    text += `   Client: ${departure.client_signature ? '✓ Signé' : '✗ Non signé'}\n`;
    text += '\n';
  }

  // Inspection arrivée
  if (arrival) {
    text += '\n🔴 INSPECTION D\'ARRIVÉE\n';
    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    if (arrival.datetime) {
      text += `📅 Date et heure: ${new Date(arrival.datetime).toLocaleString('fr-FR')}\n`;
    }
    if (arrival.location) {
      text += `📍 Lieu: ${arrival.location}\n`;
    }
    text += `📸 Nombre de photos: ${arrival.photos?.length || 0}\n`;
    
    if (arrival.notes) {
      text += `\n📝 Notes du chauffeur:\n${arrival.notes}\n`;
    }
    
    text += `\n✍️ Signatures:\n`;
    text += `   Chauffeur: ${arrival.driver_signature ? '✓ Signé' : '✗ Non signé'}\n`;
    text += `   Client: ${arrival.client_signature ? '✓ Signé' : '✗ Non signé'}\n`;
    text += '\n';
  } else {
    text += '\n🔴 INSPECTION D\'ARRIVÉE\n';
    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    text += 'Pas encore effectuée\n\n';
  }

  text += '\n═══════════════════════════════════════════════════════\n';
  text += `Rapport consulté ${view_count || 0} fois\n`;
  text += `Généré le ${new Date().toLocaleString('fr-FR')}\n`;
  text += 'Propulsé par CheckFlow - https://checkflow.fr\n';
  text += '═══════════════════════════════════════════════════════\n';

  return text;
}
