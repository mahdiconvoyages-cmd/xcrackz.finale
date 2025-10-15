import { supabase } from '../lib/supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import Constants from 'expo-constants';

export interface VehicleInspection {
  id: string;
  mission_id: string;
  inspector_id: string;
  inspection_type: 'departure' | 'arrival';
  vehicle_info: {
    brand?: string;
    model?: string;
    plate?: string;
    vin?: string;
    year?: number;
    color?: string;
  };
  overall_condition?: string;
  fuel_level?: number;
  mileage_km?: number;
  damages: Array<{
    type: string;
    description: string;
    severity: 'minor' | 'moderate' | 'severe';
    location: string;
  }>;
  notes?: string;
  inspector_signature?: string;
  client_signature?: string;
  latitude?: number;
  longitude?: number;
  location_address?: string;
  status: 'in_progress' | 'completed' | 'validated';
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InspectionPhoto {
  id: string;
  inspection_id: string;
  photo_url: string;
  photo_type: 'front' | 'back' | 'left_side' | 'right_side' | 'interior' | 'dashboard' | 'damage' | 'document' | 'other';
  description?: string;
  annotations: any[];
  latitude?: number;
  longitude?: number;
  taken_at: string;
}

export async function startInspection(
  missionId: string,
  inspectionType: 'departure' | 'arrival',
  location?: { latitude: number; longitude: number; address?: string }
): Promise<VehicleInspection | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: mission } = await supabase
      .from('missions')
      .select('vehicle_brand, vehicle_model, vehicle_plate, vehicle_vin, vehicle_year, vehicle_color')
      .eq('id', missionId)
      .single();

    const inspectionData = {
      mission_id: missionId,
      inspector_id: user.id,
      inspection_type: inspectionType,
      vehicle_info: mission ? {
        brand: mission.vehicle_brand,
        model: mission.vehicle_model,
        plate: mission.vehicle_plate,
        vin: mission.vehicle_vin,
        year: mission.vehicle_year,
        color: mission.vehicle_color,
      } : {},
      damages: [],
      status: 'in_progress',
      latitude: location?.latitude,
      longitude: location?.longitude,
      location_address: location?.address,
    };

    const { data, error } = await supabase
      .from('vehicle_inspections')
      .insert([inspectionData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error starting inspection:', error);
    return null;
  }
}

export async function getInspection(inspectionId: string): Promise<VehicleInspection | null> {
  try {
    const { data, error } = await supabase
      .from('vehicle_inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching inspection:', error);
    return null;
  }
}

export async function updateInspection(
  inspectionId: string,
  updates: Partial<VehicleInspection>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('vehicle_inspections')
      .update(updates)
      .eq('id', inspectionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating inspection:', error);
    return false;
  }
}

export async function completeInspection(
  inspectionId: string,
  finalData: {
    overall_condition?: string;
    fuel_level?: number;
    mileage_km?: number;
    notes?: string;
    inspector_signature?: string;
    client_signature?: string;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('vehicle_inspections')
      .update({
        ...finalData,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', inspectionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error completing inspection:', error);
    return false;
  }
}

export async function uploadInspectionPhoto(
  inspectionId: string,
  photoUri: string,
  photoType: InspectionPhoto['photo_type'],
  description?: string,
  location?: { latitude: number; longitude: number }
): Promise<InspectionPhoto | null> {
  try {
    console.log('📸 RADICAL UPLOAD - Starting...', { inspectionId, photoType, uri: photoUri });
    
    const fileName = `inspection_${inspectionId}_${Date.now()}_${photoType}.jpg`;
    const filePath = `inspections/${inspectionId}/${fileName}`;

    // Get session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ No session');
      throw new Error('No active session');
    }

    console.log('✅ Session OK, token:', session.access_token.substring(0, 20) + '...');

    // Get Supabase config from environment
    const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    console.log('🔧 Supabase URL:', supabaseUrl);

    // Create FormData with the image
    const formData = new FormData();
    
    // @ts-ignore - React Native FormData
    formData.append('file', {
      uri: photoUri,
      name: fileName,
      type: 'image/jpeg',
    });

    console.log('📤 Uploading via FormData to:', `${supabaseUrl}/storage/v1/object/inspection-photos/${filePath}`);

    // Upload directly via fetch
    const uploadUrl = `${supabaseUrl}/storage/v1/object/inspection-photos/${filePath}`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseKey!,
      },
      body: formData,
    });

    const uploadResult = await uploadResponse.text();
    console.log('📥 Upload response:', uploadResponse.status, uploadResult);

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status} - ${uploadResult}`);
    }

    console.log('✅ Upload successful!');

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('inspection-photos')
      .getPublicUrl(filePath);

    console.log('📷 Public URL:', publicUrl);

    // Save to database
    const { data: photoData, error: photoError } = await supabase
      .from('inspection_photos')
      .insert([{
        inspection_id: inspectionId,
        photo_url: publicUrl,
        photo_type: photoType,
        description,
        latitude: location?.latitude,
        longitude: location?.longitude,
        taken_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (photoError) {
      console.error('❌ Photo record error:', photoError);
      throw photoError;
    }

    console.log('✅✅✅ PHOTO SAVED TO DB:', photoData.id);
    return photoData;
    
  } catch (error) {
    console.error('❌❌❌ RADICAL UPLOAD ERROR:', error);
    return null;
  }
}

export async function getInspectionPhotos(inspectionId: string): Promise<InspectionPhoto[]> {
  try {
    const { data, error } = await supabase
      .from('inspection_photos')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('taken_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching photos:', error);
    return [];
  }
}

export async function deleteInspectionPhoto(photoId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('inspection_photos')
      .delete()
      .eq('id', photoId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting photo:', error);
    return false;
  }
}

export async function getMissionInspections(missionId: string): Promise<{
  departure: VehicleInspection | null;
  arrival: VehicleInspection | null;
}> {
  try {
    const { data, error } = await supabase
      .from('vehicle_inspections')
      .select('*')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const departure = data?.find(i => i.inspection_type === 'departure') || null;
    const arrival = data?.find(i => i.inspection_type === 'arrival') || null;

    return { departure, arrival };
  } catch (error) {
    console.error('Error fetching mission inspections:', error);
    return { departure: null, arrival: null };
  }
}

export async function addDamage(
  inspectionId: string,
  damage: {
    type: string;
    description: string;
    severity: 'minor' | 'moderate' | 'severe';
    location: string;
  }
): Promise<boolean> {
  try {
    const inspection = await getInspection(inspectionId);
    if (!inspection) return false;

    const damages = [...(inspection.damages || []), damage];

    return await updateInspection(inspectionId, { damages });
  } catch (error) {
    console.error('Error adding damage:', error);
    return false;
  }
}

export async function removeDamage(
  inspectionId: string,
  damageIndex: number
): Promise<boolean> {
  try {
    const inspection = await getInspection(inspectionId);
    if (!inspection) return false;

    const damages = [...(inspection.damages || [])];
    damages.splice(damageIndex, 1);

    return await updateInspection(inspectionId, { damages });
  } catch (error) {
    console.error('Error removing damage:', error);
    return false;
  }
}

/**
 * Lock an inspection (prevent further modifications)
 */
export async function lockInspection(inspectionId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('lock_inspection', {
      inspection_uuid: inspectionId
    });

    if (error) {
      console.error('Error locking inspection:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error locking inspection:', error);
    return false;
  }
}

/**
 * Add driver signature to inspection
 */
export async function addDriverSignature(
  inspectionId: string,
  signature: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('inspections')
      .update({
        driver_signature: signature,
        driver_signed_at: new Date().toISOString()
      })
      .eq('id', inspectionId);

    if (error) {
      console.error('Error adding driver signature:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error adding driver signature:', error);
    return false;
  }
}

/**
 * Add client signature to inspection
 */
export async function addClientSignature(
  inspectionId: string,
  signature: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('inspections')
      .update({
        client_signature: signature,
        client_signed_at: new Date().toISOString()
      })
      .eq('id', inspectionId);

    if (error) {
      console.error('Error adding client signature:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error adding client signature:', error);
    return false;
  }
}

/**
 * Check if inspection is locked
 */
export async function isInspectionLocked(inspectionId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('inspections')
      .select('status')
      .eq('id', inspectionId)
      .single();

    if (error) {
      console.error('Error checking lock status:', error);
      return false;
    }

    return data?.status === 'locked';
  } catch (error) {
    console.error('Error checking lock status:', error);
    return false;
  }
}

