/**
 * 🎯 Service Avancé de Rapports d'Inspection
 * 
 * Récupération complète des données d'inspection avec :
 * - Inspections départ et arrivée
 * - Informations véhicule complètes
 * - Clients expéditeur et réceptionnaire
 * - Signatures convoyeur et clients
 * - Photos haute résolution
 * - Métadonnées complètes
 */

// @ts-nocheck
import { supabase } from '../lib/supabase';

export interface InspectionPhoto {
  id: string;
  url: string;
  category: string;
  note?: string;
  created_at: string;
}

export interface InspectionDamage {
  id: string;
  location: string;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  photo_url?: string;
}

export interface InspectionDetails {
  id: string;
  mission_id: string;
  inspection_type: 'departure' | 'arrival';
  status: string;
  
  // Métadonnées temporelles
  created_at: string;
  completed_at?: string;
  inspection_date?: string;
  
  // État véhicule
  mileage?: number;
  fuel_level?: number;
  cleanliness_interior?: number;
  cleanliness_exterior?: number;
  
  // Documentation
  has_vehicle_documents: boolean;
  has_insurance: boolean;
  has_registration: boolean;
  
  // Équipements
  has_spare_wheel: boolean;
  has_jack: boolean;
  has_warning_triangle: boolean;
  has_first_aid_kit: boolean;
  has_fire_extinguisher: boolean;
  
  // Notes et observations
  notes?: string;
  internal_notes?: string;
  damages_notes?: string;
  
  // Signatures
  driver_signature?: string;
  client_signature?: string;
  
  // Photos et dommages
  photos: InspectionPhoto[];
  damages: InspectionDamage[];
  
  // Métadonnées GPS
  gps_latitude?: number;
  gps_longitude?: number;
  gps_location_name?: string;
}

export interface VehicleInfo {
  brand: string;
  model: string;
  plate: string;
  vin?: string;
  year?: number;
  color?: string;
  vehicle_type?: string;
}

export interface ClientInfo {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  company?: string;
}

export interface MissionInfo {
  id: string;
  reference: string;
  status: string;
  created_at: string;
  pickup_date?: string;
  delivery_date?: string;
  pickup_address?: string;
  delivery_address?: string;
  distance_km?: number;
  price?: number;
}

export interface InspectionReportComplete {
  mission: MissionInfo;
  vehicle: VehicleInfo;
  driver: {
    id: string;
    email: string;
    name?: string;
  };
  sender_client?: ClientInfo;
  receiver_client?: ClientInfo;
  inspection_departure?: InspectionDetails;
  inspection_arrival?: InspectionDetails;
  has_complete_report: boolean;
}

/**
 * Récupère un rapport d'inspection complet par ID de mission
 */
export async function getCompleteInspectionReport(
  missionId: string
): Promise<{ success: boolean; report?: InspectionReportComplete; message: string }> {
  try {
    // 1. Récupérer la mission (sans les relations clients pour l'instant)
    const { data: missionData, error: missionError } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .single();

    if (missionError) throw missionError;
    if (!missionData) {
      return { success: false, message: 'Mission non trouvée' };
    }

    // 2. Récupérer les inspections
    const { data: inspections, error: inspectionsError } = await supabase
      .from('vehicle_inspections')
      .select('*')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: true });

    if (inspectionsError) throw inspectionsError;

    // 3. Pour chaque inspection, récupérer photos et dommages
    const processedInspections: { [key: string]: InspectionDetails } = {};
    
    for (const inspection of inspections || []) {
      // Photos - try v2 schema first, fallback to inspection_photos
      let photos = [];
      try {
        const { data: photosV2, error: v2Error } = await supabase
          .from('inspection_photos_v2')
          .select('id, full_url, thumbnail_url, photo_type, taken_at, note')
          .eq('inspection_id', inspection.id)
          .order('created_at', { ascending: true });
        
        if (v2Error) throw v2Error;
        photos = photosV2 || [];
      } catch (error) {
        // Fallback to inspection_photos table
        console.log('Using inspection_photos fallback:', error);
        const { data: photosLegacy } = await supabase
          .from('inspection_photos')
          .select('id, photo_url, photo_type, created_at')
          .eq('inspection_id', inspection.id)
          .order('created_at', { ascending: true });
        photos = (photosLegacy || []).map(p => ({
          id: p.id,
          full_url: p.photo_url,
          thumbnail_url: p.photo_url,
          photo_type: p.photo_type,
          taken_at: p.created_at,
          note: null
        }));
      }

      // Récupérer les dommages pour cette inspection (optionnel - table peut ne pas exister)
      let damages = [];
      try {
        const { data } = await supabase
          .from('inspection_damages')
          .select('*')
          .eq('inspection_id', inspection.id);
        damages = data || [];
      } catch (error) {
        // Table inspection_damages n'existe pas encore - ignorer
        console.log('Table inspection_damages non disponible:', error);
      }

      const inspectionDetails: InspectionDetails = {
        ...inspection,
        photos: (photos || []).map(p => ({
          id: p.id,
          url: p.full_url,
          thumbnail_url: p.thumbnail_url,
          category: p.photo_type || 'general',
          note: p.note,
          created_at: p.taken_at
        })),
        damages: damages
      };

      if (inspection.inspection_type === 'departure') {
        processedInspections.departure = inspectionDetails;
      } else if (inspection.inspection_type === 'arrival') {
        processedInspections.arrival = inspectionDetails;
      }
    }

    // 4. Construire le rapport complet
    const report: InspectionReportComplete = {
      mission: {
        id: missionData.id,
        reference: missionData.reference,
        status: missionData.status,
        created_at: missionData.created_at,
        pickup_date: missionData.pickup_date,
        delivery_date: missionData.delivery_date,
        pickup_address: missionData.pickup_address,
        delivery_address: missionData.delivery_address,
        distance_km: missionData.distance_km,
        price: missionData.price
      },
      vehicle: {
        brand: missionData.vehicle_brand || 'N/A',
        model: missionData.vehicle_model || 'N/A',
        plate: missionData.vehicle_plate || 'N/A',
        vin: missionData.vehicle_vin,
        year: missionData.vehicle_year,
        color: missionData.vehicle_color,
        vehicle_type: missionData.vehicle_type
      },
      driver: {
        id: missionData.user_id,
        email: missionData.driver_email || '',
        name: missionData.driver_name
      },
      sender_client: undefined,
      receiver_client: undefined,
      inspection_departure: processedInspections.departure,
      inspection_arrival: processedInspections.arrival,
      has_complete_report: !!(processedInspections.departure && processedInspections.arrival)
    };

    return { success: true, report, message: 'Rapport chargé avec succès' };
  } catch (error: any) {
    console.error('❌ Erreur récupération rapport:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Liste tous les rapports d'inspection pour un utilisateur
 */
export async function listInspectionReports(
  userId: string
): Promise<{ success: boolean; reports: InspectionReportComplete[]; message: string }> {
  try {
    // Récupérer toutes les missions avec au moins une inspection
    const { data: missions, error: missionsError } = await supabase
      .from('missions')
      .select(`
        id,
        reference,
        status,
        created_at,
        vehicle_brand,
        vehicle_model,
        vehicle_plate,
        pickup_date,
        delivery_date,
        vehicle_inspections!inner (
          id
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (missionsError) throw missionsError;

    if (!missions || missions.length === 0) {
      return { success: true, reports: [], message: 'Aucun rapport trouvé' };
    }

    // Charger le rapport complet pour chaque mission
    const reports: InspectionReportComplete[] = [];
    
    for (const mission of missions) {
      const result = await getCompleteInspectionReport(mission.id);
      if (result.success && result.report) {
        reports.push(result.report);
      }
    }

    return { success: true, reports, message: `${reports.length} rapport(s) chargé(s)` };
  } catch (error: any) {
    console.error('❌ Erreur listage rapports:', error);
    return { success: false, reports: [], message: error.message };
  }
}

/**
 * Télécharge toutes les photos d'une inspection en ZIP
 */
export async function downloadInspectionPhotosZip(
  inspection: InspectionDetails,
  type: 'departure' | 'arrival'
): Promise<{ success: boolean; message: string }> {
  try {
    if (!inspection.photos || inspection.photos.length === 0) {
      return { success: false, message: 'Aucune photo à télécharger' };
    }

    // Dynamically import JSZip only when needed
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Télécharger toutes les photos
    for (let i = 0; i < inspection.photos.length; i++) {
      const photo = inspection.photos[i];
      try {
        const response = await fetch(photo.url);
        const blob = await response.blob();
        const extension = photo.url.split('.').pop() || 'jpg';
        zip.file(`${type}_photo_${i + 1}_${photo.category}.${extension}`, blob);
      } catch (err) {
        console.warn(`⚠️ Photo ${i + 1} ignorée:`, err);
      }
    }

    // Générer et télécharger le ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspection_${type}_photos_${new Date().getTime()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, message: `${inspection.photos.length} photo(s) téléchargée(s)` };
  } catch (error: any) {
    console.error('❌ Erreur téléchargement ZIP:', error);
    return { success: false, message: error.message };
  }
}
