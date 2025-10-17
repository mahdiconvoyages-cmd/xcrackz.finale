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
    // Récupérer les inspections depuis vehicle_inspections avec inspector_id
    const { data: inspections, error } = await supabase
      .from('vehicle_inspections')
      .select(`
        *,
        missions (
          id,
          reference,
          vehicle_brand,
          vehicle_model,
          vehicle_plate,
          status
        )
      `)
      // .eq('inspector_id', userId)  // ⚠️ COMMENTÉ pour voir TOUTES les inspections
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading inspections:', error);
      throw error;
    }

    console.log('Loaded inspections:', inspections);

    // ✅ GROUPER par mission pour créer des rapports complets
    const missionMap = new Map<string, InspectionReport>();
    
    (inspections || []).forEach((inspection: any) => {
      const missionId = inspection.mission_id;
      
      if (!missionMap.has(missionId)) {
        missionMap.set(missionId, {
          mission_id: missionId,
          mission_reference: inspection.missions?.reference || `MISS-${missionId.substring(0, 8)}`,
          vehicle_brand: inspection.missions?.vehicle_brand,
          vehicle_model: inspection.missions?.vehicle_model,
          vehicle_plate: inspection.missions?.vehicle_plate,
          departure_inspection: null,
          arrival_inspection: null,
          created_at: inspection.created_at,
          is_complete: false,
        });
      }
      
      const report = missionMap.get(missionId)!;
      
      if (inspection.inspection_type === 'departure') {
        report.departure_inspection = inspection;
      } else if (inspection.inspection_type === 'arrival') {
        report.arrival_inspection = inspection;
      }
      
      // Marquer comme complet si départ ET arrivée existent
      report.is_complete = !!(report.departure_inspection && report.arrival_inspection);
    });

    const reports = Array.from(missionMap.values());

    // Charger les photos pour chaque inspection
    for (const report of reports) {
      // Photos de l'inspection de départ
      if (report.departure_inspection?.id) {
        const { data: deptPhotos, error: deptError } = await supabase
          .from('inspection_photos')
          .select('*')
          .eq('inspection_id', report.departure_inspection.id)
          .order('created_at', { ascending: true });
        
        console.log(`Photos départ pour inspection ${report.departure_inspection.id}:`, deptPhotos?.length || 0, 'photos', deptError);
        
        if (deptPhotos && deptPhotos.length > 0) {
          report.departure_inspection.photos = deptPhotos;
          console.log('Photos départ chargées:', deptPhotos);
        } else {
          console.warn('Aucune photo de départ trouvée pour inspection:', report.departure_inspection.id);
          // Vérifier si des photos existent
          const { count } = await supabase
            .from('inspection_photos')
            .select('*', { count: 'exact', head: true });
          console.log('Total photos dans la table inspection_photos:', count);
        }
      }

      // Photos de l'inspection d'arrivée
      if (report.arrival_inspection?.id) {
        const { data: arrPhotos, error: arrError } = await supabase
          .from('inspection_photos')
          .select('*')
          .eq('inspection_id', report.arrival_inspection.id)
          .order('created_at', { ascending: true });
        
        console.log(`Photos arrivée pour inspection ${report.arrival_inspection.id}:`, arrPhotos?.length || 0, 'photos', arrError);
        
        if (arrPhotos && arrPhotos.length > 0) {
          report.arrival_inspection.photos = arrPhotos;
          console.log('Photos arrivée chargées:', arrPhotos);
        }
      }
    }

    console.log('Formatted reports with photos:', reports);

    return {
      success: true,
      reports,
      message: `${reports.length} rapports trouvés`,
    };
  } catch (error: any) {
    console.error('Error in listInspectionReports:', error);
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
    // Récupérer les photos depuis la table inspection_photos
    // Pour l'inspection de départ
    if (report.departure_inspection?.id) {
      const { data: departurePhotos, error: deptError } = await supabase
        .from('inspection_photos')
        .select('photo_url')
        .eq('inspection_id', report.departure_inspection.id);

      if (!deptError && departurePhotos) {
        departurePhotos.forEach((photo: any) => {
          if (photo.photo_url) urls.push(photo.photo_url);
        });
      }
    }

    // Pour l'inspection d'arrivée
    if (report.arrival_inspection?.id) {
      const { data: arrivalPhotos, error: arrError } = await supabase
        .from('inspection_photos')
        .select('photo_url')
        .eq('inspection_id', report.arrival_inspection.id);

      if (!arrError && arrivalPhotos) {
        arrivalPhotos.forEach((photo: any) => {
          if (photo.photo_url) urls.push(photo.photo_url);
        });
      }
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
 * Génère un PDF moderne avec design violet
 * - Photos en grille 2x2
 * - Header moderne avec fond violet
 * - Comparaison départ/arrivée
 * - Footer sur toutes les pages
 */
export async function generateInspectionPDF(
  report: InspectionReport
): Promise<{ url: string; success: boolean; message: string }> {
  try {
    // Import du nouveau générateur MODERNE
    const { generateInspectionPDFModern } = await import('./inspectionPdfGeneratorModern');

    // Utiliser l'inspection de départ en priorité, sinon l'arrivée
    const inspectionToUse = report.departure_inspection || report.arrival_inspection;
    
    if (!inspectionToUse?.id) {
      throw new Error('Aucune inspection trouvée pour ce rapport');
    }

    // Récupérer les données complètes de l'inspection depuis vehicle_inspections
    const { data: inspection, error } = await supabase
      .from('vehicle_inspections')
      .select(`
        *,
        missions (*)
      `)
      .eq('id', inspectionToUse.id)
      .single();

    if (error || !inspection) {
      console.error('Inspection not found:', error);
      throw new Error('Inspection non trouvée');
    }

    console.log('Inspection data for PDF:', inspection);

    // Récupérer toutes les photos pour cette mission (départ + arrivée)
    const allPhotos: any[] = [];
    
    // Photos de départ
    if (report.departure_inspection?.id) {
      const { data: deptPhotos } = await supabase
        .from('inspection_photos')
        .select('*')
        .eq('inspection_id', report.departure_inspection.id)
        .order('created_at', { ascending: true });
      
      console.log(`Photos départ PDF (${report.departure_inspection.id}):`, deptPhotos?.length || 0);
      
      if (deptPhotos) {
        allPhotos.push(...deptPhotos.map((p: any) => ({ ...p, inspection_type: 'departure' })));
      }
    }
    
    // Photos d'arrivée
    if (report.arrival_inspection?.id) {
      const { data: arrPhotos } = await supabase
        .from('inspection_photos')
        .select('*')
        .eq('inspection_id', report.arrival_inspection.id)
        .order('created_at', { ascending: true });
      
      console.log(`Photos arrivée PDF (${report.arrival_inspection.id}):`, arrPhotos?.length || 0);
      
      if (arrPhotos) {
        allPhotos.push(...arrPhotos.map((p: any) => ({ ...p, inspection_type: 'arrival' })));
      }
    }

    // Séparer photos départ/arrivée
    const departurePhotos = allPhotos.filter(p => p.inspection_type === 'departure');
    const arrivalPhotos = allPhotos.filter(p => p.inspection_type === 'arrival');

    console.log('Total photos pour PDF:', { departure: departurePhotos.length, arrival: arrivalPhotos.length });

    // Type assertion pour accéder aux données jointes
    const inspectionData = inspection as any;

    // Préparer les données mission (accès correct via inspectionData.missions)
    const missionData = {
      reference: inspectionData.missions?.reference || report.mission_reference || 'N/A',
      vehicle_brand: inspectionData.missions?.vehicle_brand || report.vehicle_brand || 'N/A',
      vehicle_model: inspectionData.missions?.vehicle_model || report.vehicle_model || 'N/A',
      vehicle_plate: inspectionData.missions?.vehicle_plate || report.vehicle_plate || 'N/A',
      vehicle_vin: inspectionData.missions?.vehicle_vin || inspectionData.vehicle_vin || 'N/A',
      pickup_address: inspectionData.missions?.pickup_address || 'Adresse de départ non renseignée',
      delivery_address: inspectionData.missions?.delivery_address || 'Adresse de livraison non renseignée',
      pickup_time: inspectionData.missions?.pickup_time || inspectionData.created_at,
      delivery_time: inspectionData.missions?.delivery_time || inspectionData.updated_at,
    };

    console.log('Mission data for PDF:', missionData);

    // Préparer les inspections
    const departureInspection = report.departure_inspection ? {
      id: inspectionData.id,
      inspection_type: 'departure' as const,
      overall_condition: inspectionData.overall_condition || 'good',
      fuel_level: inspectionData.fuel_level || 0,
      mileage_km: inspectionData.mileage_departure || 0,
      notes: inspectionData.notes_departure || '',
      signature_url: inspectionData.signature_departure_url,
      checklist: inspectionData.checklist_departure || [],
      completed_at: inspectionData.created_at,
      created_at: inspectionData.created_at,
    } : null;

    const arrivalInspection = report.arrival_inspection ? {
      id: inspectionData.id,
      inspection_type: 'arrival' as const,
      overall_condition: inspectionData.overall_condition_arrival || 'good',
      fuel_level: inspectionData.fuel_level_arrival || 0,
      mileage_km: inspectionData.mileage_arrival || 0,
      notes: inspectionData.notes_arrival || '',
      signature_url: inspectionData.signature_arrival_url,
      checklist: inspectionData.checklist_arrival || [],
      completed_at: inspectionData.updated_at,
      created_at: inspectionData.created_at,
    } : null;

    // Générer le PDF avec le NOUVEAU générateur MODERNE
    const result = await generateInspectionPDFModern(
      missionData,
      departureInspection,
      arrivalInspection,
      departurePhotos,
      arrivalPhotos
    );

    if (!result.success) {
      throw new Error(result.message);
    }

    // Créer un blob et une URL
    const pdfBlob = result.pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);

    return {
      success: true,
      url,
      message: 'PDF moderne généré avec succès',
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
