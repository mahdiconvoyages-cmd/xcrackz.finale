import { supabase } from '../lib/supabase';

export interface Mission {
  id: string;
  reference: string;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  vehicle_vin?: string;
  vehicle_image_url?: string;
  pickup_address: string;
  pickup_date: string;
  pickup_lat?: number;
  pickup_lng?: number;
  pickup_contact_id?: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  delivery_address: string;
  delivery_date: string;
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_contact_id?: string;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  distance?: number;
  driver_id?: string;
  price: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface MissionWithContacts extends Mission {
  pickup_contact?: Contact;
  delivery_contact?: Contact;
  driver?: Contact;
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: string;
  company_name?: string;
}

export interface Inspection {
  id: string;
  mission_id: string;
  type: 'departure' | 'arrival';
  vehicle_mileage: number;
  fuel_level: string;
  exterior_condition: string;
  interior_condition: string;
  notes?: string;
  damages?: any;
  inspector_signature?: string;
  client_signature?: string;
  location_latitude?: number;
  location_longitude?: number;
  location_address?: string;
  inspected_at: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  mission_id: string;
  contact_id: string;
  payment_ht: number;
  commission: number;
  status: string;
  assigned_at: string;
}

export async function getMissions(userId: string): Promise<Mission[]> {
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching missions:', error);
    throw error;
  }

  return data || [];
}

export async function getMissionById(
  missionId: string
): Promise<MissionWithContacts | null> {
  // Fetch mission without joins to avoid foreign key errors
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('id', missionId)
    .single();

  if (error) {
    console.error('Error fetching mission:', error);
    return null;
  }

  // Optionally fetch related contacts separately if needed
  const mission = data as MissionWithContacts;
  
  // Try to fetch pickup contact if ID exists
  if (mission.pickup_contact_id) {
    const { data: pickupContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', mission.pickup_contact_id)
      .single();
    if (pickupContact) mission.pickup_contact = pickupContact;
  }
  
  // Try to fetch delivery contact if ID exists
  if (mission.delivery_contact_id) {
    const { data: deliveryContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', mission.delivery_contact_id)
      .single();
    if (deliveryContact) mission.delivery_contact = deliveryContact;
  }
  
  // Try to fetch driver contact if ID exists
  if (mission.driver_id) {
    const { data: driver } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', mission.driver_id)
      .single();
    if (driver) mission.driver = driver;
  }

  return mission;
}

export async function createMission(
  missionData: Partial<Mission>
): Promise<Mission | null> {
  if (!missionData.user_id) {
    throw new Error('User ID is required');
  }

  const { data: credits, error: creditsError } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', missionData.user_id)
    .maybeSingle();

  if (creditsError) {
    console.error('Error checking credits:', creditsError);
    throw new Error('Impossible de vérifier vos crédits');
  }

  const currentBalance = credits?.balance || 0;

  if (currentBalance < 1) {
    throw new Error('Crédits insuffisants. Vous avez besoin de 1 crédit pour créer une mission.');
  }

  const { data, error } = await supabase
    .from('missions')
    .insert([missionData])
    .select()
    .single();

  if (error) {
    console.error('Error creating mission:', error);
    throw error;
  }

  const { error: deductError } = await supabase.rpc('deduct_credits', {
    p_user_id: missionData.user_id,
    p_amount: 1,
    p_description: `Création de mission ${data.reference}`,
  });

  if (deductError) {
    console.error('Error deducting credits:', deductError);
  }

  return data;
}

export async function updateMission(
  missionId: string,
  updates: Partial<Mission>
): Promise<Mission | null> {
  const { data, error } = await supabase
    .from('missions')
    .update(updates)
    .eq('id', missionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating mission:', error);
    throw error;
  }

  return data;
}

export async function deleteMission(missionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('missions')
    .delete()
    .eq('id', missionId);

  if (error) {
    console.error('Error deleting mission:', error);
    return false;
  }

  return true;
}

export async function getMissionInspections(
  missionId: string
): Promise<Inspection[]> {
  const { data, error } = await supabase
    .from('vehicle_inspections')
    .select('*')
    .eq('mission_id', missionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching inspections:', error);
    return [];
  }

  return data || [];
}

export async function getDriverMissions(driverId: string): Promise<Mission[]> {
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('driver_id', driverId)
    .order('pickup_date', { ascending: true });

  if (error) {
    console.error('Error fetching driver missions:', error);
    throw error;
  }

  return data || [];
}

export async function getContacts(userId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }

  return data || [];
}

export async function assignMissionToDriver(
  missionId: string,
  driverId: string,
  paymentHT: number,
  commission: number
): Promise<Assignment | null> {
  const { data: assignment, error: assignError } = await supabase
    .from('mission_assignments')
    .insert([
      {
        mission_id: missionId,
        contact_id: driverId,
        payment_ht: paymentHT,
        commission: commission,
        status: 'assigned',
      },
    ])
    .select()
    .single();

  if (assignError) {
    console.error('Error creating assignment:', assignError);
    throw assignError;
  }

  const { error: updateError } = await supabase
    .from('missions')
    .update({ driver_id: driverId, status: 'assigned' })
    .eq('id', missionId);

  if (updateError) {
    console.error('Error updating mission:', updateError);
    throw updateError;
  }

  return assignment;
}

/**
 * Récupère les assignations créées par l'utilisateur
 */
export async function getMissionAssignments(
  userId: string
): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from('mission_assignments')
    .select(
      `
      *,
      mission:missions(*),
      contact:contacts(*)
    `
    )
    .eq('user_id', userId)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }

  return data || [];
}

/**
 * Récupère les missions assignées À l'utilisateur (en tant que contact)
 */
export async function getMyAssignedMissions(
  userId: string
): Promise<Assignment[]> {
  // Récupérer d'abord le contact_id de l'utilisateur
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (contactError || !contact) {
    console.log('[Missions] Aucun contact trouvé pour user_id:', userId);
    return [];
  }

  // Charger les assignations où on est le contact
  const { data, error } = await supabase
    .from('mission_assignments')
    .select(
      `
      *,
      mission:missions(*),
      contact:contacts(*)
    `
    )
    .eq('contact_id', contact.id)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('Error fetching assigned missions:', error);
    return [];
  }

  console.log(`[Missions] ${data?.length || 0} missions assignées trouvées`);
  return data || [];
}

/**
 * Récupère TOUTES les assignations (créées + reçues)
 */
export async function getAllAssignments(
  userId: string
): Promise<Assignment[]> {
  const [created, received] = await Promise.all([
    getMissionAssignments(userId),
    getMyAssignedMissions(userId)
  ]);

  // Fusionner et dédupliquer par ID
  const allAssignments = [...created, ...received];
  const uniqueAssignments = allAssignments.filter(
    (assignment, index, self) =>
      index === self.findIndex((a) => a.id === assignment.id)
  );

  return uniqueAssignments.sort((a, b) => 
    new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
  );
}

export function subscribeMissionUpdates(
  missionId: string,
  callback: (payload: any) => void
) {
  const subscription = supabase
    .channel(`mission:${missionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'missions',
        filter: `id=eq.${missionId}`,
      },
      callback
    )
    .subscribe();

  return subscription;
}

export async function uploadVehicleImage(
  file: any,
  missionId: string
): Promise<string | null> {
  const fileExt = file.uri.split('.').pop();
  const fileName = `${missionId}-${Date.now()}.${fileExt}`;
  const filePath = `vehicle-images/${fileName}`;

  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.type || 'image/jpeg',
    name: fileName,
  } as any);

  const { data, error } = await supabase.storage
    .from('missions')
    .upload(filePath, formData);

  if (error) {
    console.error('Error uploading image:', error);
    return null;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('missions').getPublicUrl(filePath);

  return publicUrl;
}
