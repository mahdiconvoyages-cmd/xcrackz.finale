import { supabase } from '../lib/supabase';

export interface DriverContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_driver: boolean;
  driver_licenses: string[];
  current_latitude: number | null;
  current_longitude: number | null;
  availability_status: 'available' | 'busy' | 'offline';
  rating_average: number;
  missions_completed: number;
  last_location_update: string | null;
}

export interface DriverRecommendation {
  contact: DriverContact;
  totalScore: number;
  proximityScore: number;
  availabilityScore: number;
  licenseScore: number;
  historyScore: number;
  distanceKm: number | null;
  etaMinutes: number | null;
  reason: string;
}

export interface MissionRequirements {
  pickupLat: number;
  pickupLng: number;
  pickupDate?: Date;
  requiredLicense?: string;
}

function calculateProximityScore(distanceKm: number | null): number {
  if (!distanceKm) return 0;

  if (distanceKm < 5) return 40;
  if (distanceKm < 10) return 30;
  if (distanceKm < 20) return 20;
  if (distanceKm < 50) return 10;
  return 5;
}

function calculateAvailabilityScore(
  status: string,
  pickupDate?: Date
): number {
  if (status === 'available') return 30;
  if (status === 'busy') return 0;
  if (status === 'offline') return 0;
  return 15;
}

function calculateLicenseScore(
  driverLicenses: string[],
  requiredLicense?: string
): number {
  if (!requiredLicense) return 20;

  if (driverLicenses.includes(requiredLicense)) return 20;

  const licenseHierarchy: Record<string, string[]> = {
    'B': [],
    'C': ['B'],
    'D': ['B'],
    'CE': ['B', 'C'],
    'DE': ['B', 'D'],
  };

  const required = licenseHierarchy[requiredLicense] || [];
  const hasPrerequisites = required.every(lic => driverLicenses.includes(lic));

  if (hasPrerequisites) return 10;

  return 0;
}

function calculateHistoryScore(
  rating: number,
  missionsCompleted: number
): number {
  const ratingScore = (rating / 5) * 5;

  let experienceScore = 0;
  if (missionsCompleted > 50) experienceScore = 5;
  else if (missionsCompleted > 20) experienceScore = 3;
  else if (missionsCompleted > 5) experienceScore = 2;
  else if (missionsCompleted > 0) experienceScore = 1;

  return ratingScore + experienceScore;
}

function estimateETA(distanceKm: number | null): number | null {
  if (!distanceKm) return null;

  const avgSpeedKmh = 50;
  const minutes = (distanceKm / avgSpeedKmh) * 60;

  return Math.round(minutes);
}

function generateRecommendationReason(
  proximityScore: number,
  availabilityScore: number,
  licenseScore: number,
  historyScore: number,
  distanceKm: number | null
): string {
  const reasons: string[] = [];

  if (proximityScore >= 30 && distanceKm) {
    reasons.push(`À seulement ${distanceKm.toFixed(1)} km`);
  }

  if (availabilityScore === 30) {
    reasons.push('Disponible immédiatement');
  }

  if (licenseScore === 20) {
    reasons.push('Permis adéquat');
  }

  if (historyScore >= 8) {
    reasons.push('Expérience élevée');
  } else if (historyScore >= 5) {
    reasons.push('Bonne expérience');
  }

  if (reasons.length === 0) {
    return 'Chauffeur disponible';
  }

  return reasons.join(' • ');
}

export async function getRecommendedDrivers(
  requirements: MissionRequirements
): Promise<DriverRecommendation[]> {
  try {
    const { data: drivers, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('is_driver', true)
      .order('rating_average', { ascending: false });

    if (error) throw error;
    if (!drivers || drivers.length === 0) return [];

    const recommendations: DriverRecommendation[] = [];

    for (const driver of drivers) {
      let distanceKm: number | null = null;

      if (driver.current_latitude && driver.current_longitude) {
        const { data: distanceData } = await supabase.rpc('calculate_distance_km', {
          lat1: driver.current_latitude,
          lon1: driver.current_longitude,
          lat2: requirements.pickupLat,
          lon2: requirements.pickupLng,
        });

        distanceKm = distanceData;
      }

      const proximityScore = calculateProximityScore(distanceKm);
      const availabilityScore = calculateAvailabilityScore(
        driver.availability_status,
        requirements.pickupDate
      );
      const licenseScore = calculateLicenseScore(
        driver.driver_licenses || [],
        requirements.requiredLicense
      );
      const historyScore = calculateHistoryScore(
        driver.rating_average || 0,
        driver.missions_completed || 0
      );

      const totalScore = proximityScore + availabilityScore + licenseScore + historyScore;
      const etaMinutes = estimateETA(distanceKm);
      const reason = generateRecommendationReason(
        proximityScore,
        availabilityScore,
        licenseScore,
        historyScore,
        distanceKm
      );

      recommendations.push({
        contact: driver as DriverContact,
        totalScore,
        proximityScore,
        availabilityScore,
        licenseScore,
        historyScore,
        distanceKm,
        etaMinutes,
        reason,
      });
    }

    recommendations.sort((a, b) => b.totalScore - a.totalScore);

    return recommendations;
  } catch (error) {
    console.error('Error getting driver recommendations:', error);
    return [];
  }
}

export async function assignDriverToMission(
  missionId: string,
  contactId: string,
  recommendation: DriverRecommendation
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('mission_assignments').insert({
      mission_id: missionId,
      contact_id: contactId,
      user_id: user.id,
      status: 'proposed',
      total_score: recommendation.totalScore,
      proximity_score: recommendation.proximityScore,
      availability_score: recommendation.availabilityScore,
      license_score: recommendation.licenseScore,
      history_score: recommendation.historyScore,
      distance_km: recommendation.distanceKm,
      eta_minutes: recommendation.etaMinutes,
      recommendation_reason: recommendation.reason,
      proposed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error assigning driver to mission:', error);
    return false;
  }
}

export async function updateDriverLocation(
  contactId: string,
  latitude: number,
  longitude: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('contacts')
      .update({
        current_latitude: latitude,
        current_longitude: longitude,
        last_location_update: new Date().toISOString(),
      })
      .eq('id', contactId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating driver location:', error);
    return false;
  }
}

export async function updateDriverAvailability(
  contactId: string,
  status: 'available' | 'busy' | 'offline'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('contacts')
      .update({ availability_status: status })
      .eq('id', contactId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating driver availability:', error);
    return false;
  }
}
