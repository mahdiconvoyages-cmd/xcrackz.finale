import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || '' // Utilise ANON_KEY pour accès public
);

/**
 * GET /api/public-report/:token
 * 
 * Récupère toutes les données d'un rapport public par token
 * Accessible sans authentification
 * 
 * Response:
 * {
 *   "share_token": "ABC123XYZ",
 *   "view_count": 42,
 *   "mission": { ... },
 *   "departure": { datetime, location, notes, signatures, photos },
 *   "arrival": { datetime, location, notes, signatures, photos } | null
 * }
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
    // Extraire le token de l'URL
    // Format: /api/public-report/ABC123XYZ ou ?token=ABC123XYZ
    const token = req.query.token || req.url?.split('/').pop();

    if (!token || token === 'public-report') {
      return res.status(400).json({ 
        error: 'Share token is required' 
      });
    }

    console.log('📖 Fetching public report:', token);

    // Appeler la fonction PostgreSQL
    const { data, error } = await supabase.rpc('get_public_report_data', {
      p_share_token: token
    });

    if (error) {
      console.error('❌ Error fetching public report:', error);
      return res.status(500).json({ 
        error: error.message 
      });
    }

    if (!data) {
      console.log('❌ Report not found:', token);
      return res.status(404).json({ 
        error: 'Report not found' 
      });
    }

    // Vérifier si le rapport est expiré
    if (data.error) {
      if (data.error === 'Report expired') {
        return res.status(410).json({ 
          error: 'This report has expired' 
        });
      }
      return res.status(404).json({ 
        error: data.error 
      });
    }

    console.log('✅ Public report fetched successfully');
    console.log('   Mission:', data.mission?.reference);
    console.log('   Departure photos:', data.departure?.photos?.length || 0);
    console.log('   Arrival photos:', data.arrival?.photos?.length || 0);
    console.log('   View count:', data.view_count);

    return res.status(200).json(data);

  } catch (error: any) {
    console.error('❌ public-report error:', error);
    return res.status(500).json({ 
      error: error?.message || 'Internal server error' 
    });
  }
}
