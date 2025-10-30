/**
 * Shared inspection report service for web and mobile
 */
import { supabase } from '../../lib/supabase';

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

export async function listInspectionReports(
  userId: string
): Promise<{ success: boolean; reports: InspectionReport[]; message: string }> {
  try {
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
      .order('created_at', { ascending: false });

    if (error) throw error;

    const missionMap = new Map<string, InspectionReport>();

    (inspections || []).forEach((inspection: any) => {
      const missionId = inspection.mission_id;

      if (!missionMap.has(missionId)) {
        missionMap.set(missionId, {
          mission_id: missionId,
          mission_reference: inspection.missions?.reference || `MISS-${(missionId || '').substring(0, 8)}`,
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

      report.is_complete = !!(report.departure_inspection && report.arrival_inspection);
    });

    const reports = Array.from(missionMap.values());

    for (const report of reports) {
      if (report.departure_inspection?.id) {
        const { data: deptPhotos } = await supabase
          .from('inspection_photos')
          .select('*')
          .eq('inspection_id', report.departure_inspection.id)
          .order('created_at', { ascending: true });

        if (deptPhotos) report.departure_inspection.photos = deptPhotos;
      }

      if (report.arrival_inspection?.id) {
        const { data: arrPhotos } = await supabase
          .from('inspection_photos')
          .select('*')
          .eq('inspection_id', report.arrival_inspection.id)
          .order('created_at', { ascending: true });

        if (arrPhotos) report.arrival_inspection.photos = arrPhotos;
      }
    }

    return {
      success: true,
      reports,
      message: `${reports.length} rapports trouvés`,
    };
  } catch (error: any) {
    console.error('Error in shared listInspectionReports:', error);
    return { success: false, reports: [], message: error.message };
  }
}

export async function downloadAllPhotos(
  report: InspectionReport
): Promise<{ success: boolean; photos: { url: string; type: 'departure' | 'arrival'; name: string }[]; message: string }> {
  const photos: { url: string; type: 'departure' | 'arrival'; name: string }[] = [];
  try {
    if (report.departure_inspection?.id) {
      const { data: departurePhotos } = await supabase
        .from('inspection_photos')
        .select('photo_url, photo_type')
        .eq('inspection_id', report.departure_inspection.id);

      if (departurePhotos) {
        departurePhotos.forEach((p: any, index: number) => {
          if (p.photo_url) {
            photos.push({
              url: p.photo_url,
              type: 'departure',
              name: `depart-${p.photo_type || `photo-${index + 1}`}.jpg`
            });
          }
        });
      }
    }

    if (report.arrival_inspection?.id) {
      const { data: arrivalPhotos } = await supabase
        .from('inspection_photos')
        .select('photo_url, photo_type')
        .eq('inspection_id', report.arrival_inspection.id);

      if (arrivalPhotos) {
        arrivalPhotos.forEach((p: any, index: number) => {
          if (p.photo_url) {
            photos.push({
              url: p.photo_url,
              type: 'arrival',
              name: `arrivee-${p.photo_type || `photo-${index + 1}`}.jpg`
            });
          }
        });
      }
    }

    return { success: true, photos, message: `${photos.length} photos trouvées` };
  } catch (error: any) {
    return { success: false, photos: [], message: error.message };
  }
}

export async function generateInspectionPDF(
  report: InspectionReport
): Promise<{ url: string; success: boolean; message: string }> {
  try {
    // Reuse web generator logic if available
    const { generateInspectionPDFModern } = await import('../../services/inspectionPdfGeneratorModern');

    const inspectionToUse = report.departure_inspection || report.arrival_inspection;
    if (!inspectionToUse?.id) throw new Error('Aucune inspection trouvée pour ce rapport');

    const { data: inspection, error } = await supabase
      .from('vehicle_inspections')
      .select(`*, missions (*)`)
      .eq('id', inspectionToUse.id)
      .single();

    if (error || !inspection) throw new Error('Inspection non trouvée');

    const allPhotos: any[] = [];
    if (report.departure_inspection?.id) {
      const { data: deptPhotos } = await supabase
        .from('inspection_photos')
        .select('*')
        .eq('inspection_id', report.departure_inspection.id)
        .order('created_at', { ascending: true });

      if (deptPhotos) allPhotos.push(...deptPhotos.map((p: any) => ({ ...p, inspection_type: 'departure' })));
    }

    if (report.arrival_inspection?.id) {
      const { data: arrPhotos } = await supabase
        .from('inspection_photos')
        .select('*')
        .eq('inspection_id', report.arrival_inspection.id)
        .order('created_at', { ascending: true });

      if (arrPhotos) allPhotos.push(...arrPhotos.map((p: any) => ({ ...p, inspection_type: 'arrival' })));
    }

    const departurePhotos = allPhotos.filter((p) => p.inspection_type === 'departure');
    const arrivalPhotos = allPhotos.filter((p) => p.inspection_type === 'arrival');

    const inspectionData = inspection as any;

    const missionData = {
      reference: inspectionData.missions?.reference || report.mission_reference || 'N/A',
      vehicle_brand: inspectionData.missions?.vehicle_brand || report.vehicle_brand || 'N/A',
      vehicle_model: inspectionData.missions?.vehicle_model || report.vehicle_model || 'N/A',
      vehicle_plate: inspectionData.missions?.vehicle_plate || report.vehicle_plate || 'N/A',
      pickup_address: inspectionData.missions?.pickup_address || 'Adresse de départ non renseignée',
      delivery_address: inspectionData.missions?.delivery_address || 'Adresse de livraison non renseignée',
      pickup_time: inspectionData.missions?.pickup_time || inspectionData.created_at,
      delivery_time: inspectionData.missions?.delivery_time || inspectionData.updated_at,
    };

    const departureInspection = report.departure_inspection
      ? {
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
        }
      : null;

    const arrivalInspection = report.arrival_inspection
      ? {
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
        }
      : null;

    const result = await generateInspectionPDFModern(
      missionData,
      departureInspection,
      arrivalInspection,
      departurePhotos,
      arrivalPhotos
    );

    if (!result.success) throw new Error(result.message);

    const pdfBlob = result.pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);

    return { success: true, url, message: 'PDF moderne généré avec succès' };
  } catch (error: any) {
    console.error('Erreur génération PDF shared:', error);
    return { success: false, url: '', message: error.message || 'Erreur génération PDF' };
  }
}
