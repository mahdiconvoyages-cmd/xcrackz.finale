import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface RequestBody {
  missionId: string;
}

/**
 * POST /api/create-public-report
 * 
 * Crée ou met à jour un lien de partage public pour un rapport d'inspection
 * 
 * Body:
 * {
 *   "missionId": "uuid"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "shareUrl": "https://xcrackz.com/rapport/ABC123XYZ",
 *   "shareToken": "ABC123XYZ",
 *   "reportId": "uuid"
 * }
 */
export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { missionId } = req.body as RequestBody;

    if (!missionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'missionId is required' 
      });
    }

    console.log('🔗 Creating public report for mission:', missionId);

    // Appeler la fonction PostgreSQL
    const { data, error } = await supabase.rpc('create_or_update_public_report', {
      p_mission_id: missionId
    });

    if (error) {
      console.error('❌ Error creating public report:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    if (!data || data.success === false) {
      console.error('❌ Failed to create public report:', data);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create public report' 
      });
    }

    console.log('✅ Public report created:', data);

    return res.status(200).json({
      success: true,
      shareUrl: data.share_url,
      shareToken: data.share_token,
      reportId: data.report_id
    });

  } catch (error: any) {
    console.error('❌ create-public-report error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    });
  }
}
