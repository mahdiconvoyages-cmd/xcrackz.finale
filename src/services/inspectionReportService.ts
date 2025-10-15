/**
 * Inspection Report Service - React Native Version
 * 
 * Version simplifiée pour mobile
 */

import { supabase } from '../lib/supabase';

export interface InspectionReport {
  mission_id: string;
  mission_reference: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  departure_inspection?: any;
  arrival_inspection?: any;
  pdf_url?: string;
  created_at: string;
  is_complete: boolean;
}

/**
 * Liste tous les rapports d'inspection
 */
export async function listInspectionReports(
  userId: string
): Promise<{ success: boolean; reports: InspectionReport[]; message: string }> {
  try {
    // Récupérer les inspections directement de l'utilisateur
    const { data: inspections, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transformer en format InspectionReport
    const reports: InspectionReport[] = (inspections || []).map(inspection => ({
      mission_id: inspection.id, // Utiliser l'ID de l'inspection comme mission_id
      mission_reference: `INS-${inspection.id.substring(0, 8).toUpperCase()}`,
      vehicle_brand: inspection.vehicle_brand,
      vehicle_model: inspection.vehicle_model,
      vehicle_plate: inspection.vehicle_registration,
      departure_inspection: inspection.status !== 'draft' ? inspection : null,
      arrival_inspection: inspection.status === 'completed' ? inspection : null,
      pdf_url: inspection.pdf_url,
      created_at: inspection.created_at,
      is_complete: inspection.status === 'completed',
    }));

    return {
      success: true,
      reports,
      message: `${reports.length} rapports trouvés`,
    };
  } catch (error: any) {
    return {
      success: false,
      reports: [],
      message: error.message,
    };
  }
}

/**
 * Télécharge toutes les photos d'un rapport
 */
export async function downloadAllPhotos(
  report: InspectionReport
): Promise<{ success: boolean; urls: string[]; message: string }> {
  const urls: string[] = [];

  try {
    if (report.departure_inspection?.photos) {
      report.departure_inspection.photos.forEach((photo: any) => {
        if (photo.photo_url) urls.push(photo.photo_url);
      });
    }

    if (report.arrival_inspection?.photos) {
      report.arrival_inspection.photos.forEach((photo: any) => {
        if (photo.photo_url) urls.push(photo.photo_url);
      });
    }

    return {
      success: true,
      urls,
      message: `${urls.length} photos trouvées`,
    };
  } catch (error: any) {
    return {
      success: false,
      urls: [],
      message: error.message,
    };
  }
}

/**
 * Génère un PDF via le nouveau générateur amélioré
 * - Pas d'images intégrées (uniquement liens)
 * - Descriptions IA Gemini complètes
 * - Récapitulatif IA final
 */
export async function generateInspectionPDF(
  report: InspectionReport
): Promise<{ url: string; success: boolean; message: string }> {
  try {
    // Import dynamique du nouveau générateur
    const { generateInspectionPDFNew } = await import('./inspectionPdfGeneratorNew');

    // Récupérer les données complètes de l'inspection
    const { data: inspection, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('id', report.mission_id)
      .single();

    if (error || !inspection) {
      throw new Error('Inspection non trouvée');
    }

    // Récupérer les photos
    const { data: photos, error: photosError } = await supabase
      .from('inspection_photos')
      .select('*')
      .eq('inspection_id', report.mission_id)
      .order('created_at', { ascending: true });

    if (photosError) {
      console.error('Erreur récupération photos:', photosError);
    }

    // Séparer photos départ/arrivée
    const departurePhotos = (photos || []).filter(p => p.inspection_type === 'departure');
    const arrivalPhotos = (photos || []).filter(p => p.inspection_type === 'arrival');

    // Préparer les données mission
    const missionData = {
      reference: report.mission_reference,
      vehicle_brand: inspection.vehicle_brand || report.vehicle_brand || 'N/A',
      vehicle_model: inspection.vehicle_model || report.vehicle_model || 'N/A',
      vehicle_plate: inspection.vehicle_registration || report.vehicle_plate || 'N/A',
      vehicle_vin: inspection.vehicle_vin || 'N/A',
      pickup_address: inspection.pickup_address || 'N/A',
      delivery_address: inspection.delivery_address || 'N/A',
      pickup_time: inspection.pickup_time,
      delivery_time: inspection.delivery_time,
    };

    // Préparer les inspections
    const departureInspection = inspection.status !== 'draft' ? {
      id: inspection.id,
      inspection_type: 'departure' as const,
      overall_condition: inspection.overall_condition || 'good',
      fuel_level: inspection.fuel_level || 0,
      mileage_km: inspection.mileage_departure || 0,
      notes: inspection.notes_departure || '',
      signature_url: inspection.signature_departure_url,
      checklist: inspection.checklist_departure || [],
      completed_at: inspection.created_at,
      created_at: inspection.created_at,
    } : null;

    const arrivalInspection = inspection.status === 'completed' ? {
      id: inspection.id,
      inspection_type: 'arrival' as const,
      overall_condition: inspection.overall_condition_arrival || 'good',
      fuel_level: inspection.fuel_level_arrival || 0,
      mileage_km: inspection.mileage_arrival || 0,
      notes: inspection.notes_arrival || '',
      signature_url: inspection.signature_arrival_url,
      checklist: inspection.checklist_arrival || [],
      completed_at: inspection.updated_at,
      created_at: inspection.created_at,
    } : null;

    // Générer le PDF avec le nouveau générateur
    const result = await generateInspectionPDFNew(
      missionData,
      departureInspection,
      arrivalInspection,
      departurePhotos,
      arrivalPhotos
    );

    // Créer un blob et une URL
    const pdfBlob = result.pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);

    return {
      success: true,
      url,
      message: 'PDF généré avec succès (avec descriptions IA)',
    };
  } catch (error: any) {
    console.error('Erreur génération PDF:', error);
    return {
      success: false,
      url: '',
      message: error.message || 'Erreur génération PDF',
    };
  }
}

/**
 * Envoie le rapport par email
 */
export async function sendInspectionReportByEmail(
  report: InspectionReport,
  recipientEmail: string,
  senderName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

    const response = await fetch(`${apiUrl}/api/email/inspection-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to_email: recipientEmail,
        sender_name: senderName,
        report: {
          mission_reference: report.mission_reference,
          vehicle: `${report.vehicle_brand} ${report.vehicle_model}`,
          is_complete: report.is_complete,
          departure: report.departure_inspection,
          arrival: report.arrival_inspection,
        },
        photo_urls: await downloadAllPhotos(report).then(r => r.urls),
      }),
    });

    const result = await response.json();

    return {
      success: result.success,
      message: result.message,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
    };
  }
}
