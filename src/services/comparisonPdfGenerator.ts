/**
 * 📊 Générateur PDF de Comparaison Départ/Arrivée
 * 
 * Compare les inspections de départ et d'arrivée côte-à-côte :
 * - Photos comparées (avant/après)
 * - Signatures comparées
 * - États du véhicule comparés
 * - Export des photos individuellement
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import JSZip from 'jszip';

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
  mileage_km?: number;
  fuel_level?: number;
  overall_condition?: string;
  client_name?: string;
  client_signature?: string;
  inspector_signature?: string;
  driver_name?: string;
  notes?: string;
  mission?: {
    reference: string;
    vehicle_brand: string;
    vehicle_model: string;
    vehicle_plate: string;
    pickup_address: string;
    delivery_address: string;
  };
  photos?: Photo[];
}

/**
 * Convertir une image URL en base64
 */
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await FileSystem.downloadAsync(
      url,
      FileSystem.cacheDirectory + `temp_${Date.now()}.jpg`
    );

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
 * Générer le HTML de comparaison
 */
async function generateComparisonHTML(
  departureInspection: InspectionData,
  arrivalInspection: InspectionData
): Promise<string> {
  const mission = departureInspection.mission || arrivalInspection.mission;
  const reference = mission?.reference || 'N/A';

  // Convertir les signatures en base64
  const departureSignature = departureInspection.client_signature
    ? await imageUrlToBase64(departureInspection.client_signature)
    : '';
  const arrivalSignature = arrivalInspection.client_signature
    ? await imageUrlToBase64(arrivalInspection.client_signature)
    : '';

  // Convertir les photos en base64 (première photo de chaque type)
  const departurePhotos = departureInspection.photos || [];
  const arrivalPhotos = arrivalInspection.photos || [];

  const departurePhotoBase64 = departurePhotos.length > 0
    ? await imageUrlToBase64(departurePhotos[0].photo_url)
    : '';
  const arrivalPhotoBase64 = arrivalPhotos.length > 0
    ? await imageUrlToBase64(arrivalPhotos[0].photo_url)
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rapport Comparatif - ${reference}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 30px;
      background: #ffffff;
      color: #111827;
    }
    
    /* En-tête */
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #3b82f6;
    }
    
    .header h1 {
      font-size: 28px;
      color: #1f2937;
      margin-bottom: 10px;
    }
    
    .header .subtitle {
      font-size: 16px;
      color: #6b7280;
    }
    
    /* Informations mission */
    .mission-info {
      background: #f3f4f6;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    
    .mission-info h2 {
      font-size: 18px;
      color: #111827;
      margin-bottom: 15px;
    }
    
    .mission-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    
    .mission-item {
      background: white;
      padding: 10px;
      border-radius: 6px;
    }
    
    .mission-label {
      font-size: 11px;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    
    .mission-value {
      font-size: 14px;
      color: #111827;
      font-weight: 500;
    }
    
    /* Tableau de comparaison */
    .comparison-section {
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .comparison-table {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .comparison-column {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
    }
    
    .comparison-column.departure {
      border-color: #3b82f6;
    }
    
    .comparison-column.arrival {
      border-color: #10b981;
    }
    
    .column-header {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 15px;
      padding: 10px;
      border-radius: 8px;
      text-align: center;
      color: white;
    }
    
    .column-header.departure {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
    }
    
    .column-header.arrival {
      background: linear-gradient(135deg, #10b981, #059669);
    }
    
    .data-item {
      background: white;
      padding: 10px;
      margin-bottom: 10px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    
    .data-label {
      font-size: 11px;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    
    .data-value {
      font-size: 14px;
      color: #111827;
      font-weight: 600;
    }
    
    /* Photos */
    .photo-comparison {
      margin-bottom: 30px;
    }
    
    .photos-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    .photo-box {
      text-align: center;
    }
    
    .photo-box img {
      width: 100%;
      height: 250px;
      object-fit: cover;
      border-radius: 10px;
      border: 2px solid #e5e7eb;
      margin-bottom: 10px;
    }
    
    .photo-box.departure img {
      border-color: #3b82f6;
    }
    
    .photo-box.arrival img {
      border-color: #10b981;
    }
    
    .photo-label {
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
    }
    
    /* Signatures */
    .signature-comparison {
      margin-bottom: 30px;
    }
    
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    .signature-box {
      background: #f9fafb;
      padding: 15px;
      border-radius: 10px;
      border: 2px solid #e5e7eb;
      text-align: center;
    }
    
    .signature-box.departure {
      border-color: #3b82f6;
    }
    
    .signature-box.arrival {
      border-color: #10b981;
    }
    
    .signature-box img {
      width: 100%;
      max-width: 300px;
      height: 120px;
      object-fit: contain;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      margin-bottom: 10px;
    }
    
    .signature-label {
      font-size: 12px;
      color: #6b7280;
      font-weight: 600;
    }
    
    /* Différences */
    .differences-section {
      background: #fef3c7;
      border: 2px solid #f59e0b;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
    }
    
    .differences-title {
      font-size: 18px;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 15px;
    }
    
    .difference-item {
      background: white;
      padding: 12px;
      margin-bottom: 10px;
      border-radius: 6px;
      border-left: 4px solid #f59e0b;
    }
    
    .difference-label {
      font-size: 13px;
      font-weight: 600;
      color: #92400e;
      margin-bottom: 5px;
    }
    
    .difference-values {
      font-size: 12px;
      color: #78350f;
    }
    
    .difference-values .arrow {
      color: #f59e0b;
      font-weight: 700;
      margin: 0 8px;
    }
    
    /* Footer */
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
    }
    
    /* Impression */
    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <!-- En-tête -->
  <div class="header">
    <h1>📊 RAPPORT COMPARATIF</h1>
    <p class="subtitle">Inspection Départ vs Arrivée</p>
  </div>
  
  <!-- Informations mission -->
  <div class="mission-info">
    <h2>Informations de la Mission</h2>
    <div class="mission-grid">
      <div class="mission-item">
        <div class="mission-label">Référence</div>
        <div class="mission-value">${reference}</div>
      </div>
      <div class="mission-item">
        <div class="mission-label">Véhicule</div>
        <div class="mission-value">${mission?.vehicle_brand || 'N/A'} ${mission?.vehicle_model || ''}</div>
      </div>
      <div class="mission-item">
        <div class="mission-label">Immatriculation</div>
        <div class="mission-value">${mission?.vehicle_plate || 'N/A'}</div>
      </div>
      <div class="mission-item">
        <div class="mission-label">Date de génération</div>
        <div class="mission-value">${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</div>
      </div>
    </div>
  </div>
  
  <!-- Comparaison Photos -->
  ${departurePhotoBase64 && arrivalPhotoBase64 ? `
  <div class="photo-comparison comparison-section">
    <h2 class="section-title">📷 Comparaison Photos</h2>
    <div class="photos-grid">
      <div class="photo-box departure">
        <img src="${departurePhotoBase64}" alt="Photo départ" />
        <p class="photo-label">DÉPART</p>
      </div>
      <div class="photo-box arrival">
        <img src="${arrivalPhotoBase64}" alt="Photo arrivée" />
        <p class="photo-label">ARRIVÉE</p>
      </div>
    </div>
  </div>
  ` : ''}
  
  <!-- Comparaison Données -->
  <div class="comparison-section">
    <h2 class="section-title">📋 Comparaison des États</h2>
    <div class="comparison-table">
      <!-- Colonne Départ -->
      <div class="comparison-column departure">
        <div class="column-header departure">🚗 DÉPART</div>
        
        <div class="data-item">
          <div class="data-label">Date & Heure</div>
          <div class="data-value">${format(new Date(departureInspection.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</div>
        </div>
        
        <div class="data-item">
          <div class="data-label">Kilométrage</div>
          <div class="data-value">${departureInspection.mileage_km ? departureInspection.mileage_km.toLocaleString('fr-FR') + ' km' : 'N/A'}</div>
        </div>
        
        <div class="data-item">
          <div class="data-label">Niveau Carburant</div>
          <div class="data-value">${departureInspection.fuel_level || 'N/A'}%</div>
        </div>
        
        <div class="data-item">
          <div class="data-label">État Général</div>
          <div class="data-value">${departureInspection.overall_condition || 'N/A'}</div>
        </div>
        
        <div class="data-item">
          <div class="data-label">Lieu</div>
          <div class="data-value">${mission?.pickup_address || 'N/A'}</div>
        </div>
        
        ${departureInspection.notes ? `
        <div class="data-item">
          <div class="data-label">Notes</div>
          <div class="data-value">${departureInspection.notes}</div>
        </div>
        ` : ''}
      </div>
      
      <!-- Colonne Arrivée -->
      <div class="comparison-column arrival">
        <div class="column-header arrival">🏁 ARRIVÉE</div>
        
        <div class="data-item">
          <div class="data-label">Date & Heure</div>
          <div class="data-value">${format(new Date(arrivalInspection.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</div>
        </div>
        
        <div class="data-item">
          <div class="data-label">Kilométrage</div>
          <div class="data-value">${arrivalInspection.mileage_km ? arrivalInspection.mileage_km.toLocaleString('fr-FR') + ' km' : 'N/A'}</div>
        </div>
        
        <div class="data-item">
          <div class="data-label">Niveau Carburant</div>
          <div class="data-value">${arrivalInspection.fuel_level || 'N/A'}%</div>
        </div>
        
        <div class="data-item">
          <div class="data-label">État Général</div>
          <div class="data-value">${arrivalInspection.overall_condition || 'N/A'}</div>
        </div>
        
        <div class="data-item">
          <div class="data-label">Lieu</div>
          <div class="data-value">${mission?.delivery_address || 'N/A'}</div>
        </div>
        
        ${arrivalInspection.notes ? `
        <div class="data-item">
          <div class="data-label">Notes</div>
          <div class="data-value">${arrivalInspection.notes}</div>
        </div>
        ` : ''}
      </div>
    </div>
  </div>
  
  <!-- Différences Détectées -->
  ${(() => {
    const differences = [];
    
    // Kilométrage
    if (departureInspection.mileage_km && arrivalInspection.mileage_km) {
      const kmDiff = arrivalInspection.mileage_km - departureInspection.mileage_km;
      if (kmDiff > 0) {
        differences.push({
          label: 'Kilométrage parcouru',
          value: `${kmDiff.toLocaleString('fr-FR')} km`
        });
      }
    }
    
    // Carburant
    if (departureInspection.fuel_level && arrivalInspection.fuel_level) {
      const fuelDiff = arrivalInspection.fuel_level - departureInspection.fuel_level;
      if (fuelDiff !== 0) {
        differences.push({
          label: 'Variation carburant',
          value: `${departureInspection.fuel_level}% → ${arrivalInspection.fuel_level}% (${fuelDiff > 0 ? '+' : ''}${fuelDiff}%)`
        });
      }
    }
    
    // État
    if (departureInspection.overall_condition !== arrivalInspection.overall_condition) {
      differences.push({
        label: 'État général',
        value: `${departureInspection.overall_condition} → ${arrivalInspection.overall_condition}`
      });
    }
    
    if (differences.length === 0) return '';
    
    return `
    <div class="differences-section">
      <h3 class="differences-title">⚠️ Différences Détectées</h3>
      ${differences.map(diff => `
        <div class="difference-item">
          <div class="difference-label">${diff.label}</div>
          <div class="difference-values">${diff.value}</div>
        </div>
      `).join('')}
    </div>
    `;
  })()}
  
  <!-- Comparaison Signatures -->
  ${departureSignature && arrivalSignature ? `
  <div class="signature-comparison comparison-section">
    <h2 class="section-title">✍️ Comparaison Signatures</h2>
    <div class="signatures-grid">
      <div class="signature-box departure">
        <img src="${departureSignature}" alt="Signature départ" />
        <p class="signature-label">Client DÉPART${departureInspection.client_name ? ` - ${departureInspection.client_name}` : ''}</p>
      </div>
      <div class="signature-box arrival">
        <img src="${arrivalSignature}" alt="Signature arrivée" />
        <p class="signature-label">Client ARRIVÉE${arrivalInspection.client_name ? ` - ${arrivalInspection.client_name}` : ''}</p>
      </div>
    </div>
  </div>
  ` : ''}
  
  <!-- Footer -->
  <div class="footer">
    <p>Document généré automatiquement le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
    <p>Rapport comparatif - Mission ${reference}</p>
  </div>
</body>
</html>
  `;
}

/**
 * 📊 Générer et partager le PDF de comparaison
 */
export async function generateComparisonPDF(
  departureInspection: InspectionData,
  arrivalInspection: InspectionData
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    console.log('📊 Génération PDF comparatif...');

    const html = await generateComparisonHTML(departureInspection, arrivalInspection);

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const reference = (departureInspection.mission?.reference || 'N/A').replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `comparaison_${reference}.pdf`;

    if (Platform.OS === 'ios') {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Rapport Comparatif - ${reference}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      const newUri = FileSystem.documentDirectory + fileName;
      await FileSystem.moveAsync({ from: uri, to: newUri });
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Rapport Comparatif - ${reference}`,
      });
    }

    console.log('✅ PDF comparatif généré et partagé');
    return { success: true, uri };
  } catch (error: any) {
    console.error('❌ Erreur génération PDF comparatif:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 📸 Exporter toutes les photos d'une mission en ZIP
 */
export async function exportMissionPhotos(
  missionReference: string,
  departurePhotos: Photo[],
  arrivalPhotos: Photo[]
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    console.log('📸 Export photos en cours...');

    const zip = new JSZip();
    
    // Dossier départ
    const departureFolder = zip.folder('01_Depart');
    for (let i = 0; i < departurePhotos.length; i++) {
      const photo = departurePhotos[i];
      try {
        const response = await FileSystem.downloadAsync(
          photo.photo_url,
          FileSystem.cacheDirectory + `temp_dep_${i}.jpg`
        );
        
        const base64 = await FileSystem.readAsStringAsync(response.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        departureFolder?.file(
          `depart_${i + 1}_${photo.photo_type}.jpg`,
          base64,
          { base64: true }
        );
      } catch (err) {
        console.warn(`Erreur photo départ ${i}:`, err);
      }
    }
    
    // Dossier arrivée
    const arrivalFolder = zip.folder('02_Arrivee');
    for (let i = 0; i < arrivalPhotos.length; i++) {
      const photo = arrivalPhotos[i];
      try {
        const response = await FileSystem.downloadAsync(
          photo.photo_url,
          FileSystem.cacheDirectory + `temp_arr_${i}.jpg`
        );
        
        const base64 = await FileSystem.readAsStringAsync(response.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        arrivalFolder?.file(
          `arrivee_${i + 1}_${photo.photo_type}.jpg`,
          base64,
          { base64: true }
        );
      } catch (err) {
        console.warn(`Erreur photo arrivée ${i}:`, err);
      }
    }
    
    // Générer le ZIP
    const zipContent = await zip.generateAsync({ type: 'base64' });
    
    // Sauvegarder
    const fileName = `photos_${missionReference.replace(/[^a-zA-Z0-9-_]/g, '_')}.zip`;
    const fileUri = FileSystem.documentDirectory + fileName;
    
    await FileSystem.writeAsStringAsync(fileUri, zipContent, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Partager
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/zip',
      dialogTitle: `Photos Mission ${missionReference}`,
    });
    
    console.log('✅ Photos exportées:', fileUri);
    return { success: true, uri: fileUri };
  } catch (error: any) {
    console.error('❌ Erreur export photos:', error);
    return { success: false, error: error.message };
  }
}
