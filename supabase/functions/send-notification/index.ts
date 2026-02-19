import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { encode as base64url } from 'https://deno.land/std@0.168.0/encoding/base64url.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const FCM_SERVICE_ACCOUNT = Deno.env.get('FCM_SERVICE_ACCOUNT');

/**
 * Generate a signed JWT and exchange it for a Google OAuth2 access token
 * to authenticate with FCM HTTP v1 API.
 */
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const headerB64 = base64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import RSA private key from PEM
  const pemContent = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');

  const binaryKey = Uint8Array.from(atob(pemContent), (c: string) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = base64url(new Uint8Array(signature));
  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange self-signed JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get Google access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, userIds, type, title, message, data } = await req.json();

    if (!FCM_SERVICE_ACCOUNT) {
      throw new Error('FCM_SERVICE_ACCOUNT secret not configured');
    }
    if (!title) {
      throw new Error('title is required');
    }

    const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT);
    const projectId = serviceAccount.project_id;

    // Get OAuth2 access token for FCM
    const accessToken = await getAccessToken(serviceAccount);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Determine target user IDs
    const targetUserIds: string[] = userId ? [userId] : (userIds || []);
    if (targetUserIds.length === 0) {
      throw new Error('No targeting specified (userId or userIds required)');
    }

    // Fetch FCM tokens from profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, fcm_token')
      .in('id', targetUserIds)
      .not('fcm_token', 'is', null);

    if (profilesError) {
      throw new Error(`Error fetching profiles: ${profilesError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      console.log('No FCM tokens found for targeted users');
      return new Response(
        JSON.stringify({ success: true, recipients: 0, failed: 0, message: 'No FCM tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Send push notification to each device via FCM HTTP v1
    let successCount = 0;
    let failCount = 0;
    const results: any[] = [];

    for (const profile of profiles) {
      try {
        const fcmPayload = {
          message: {
            token: profile.fcm_token,
            notification: {
              title,
              body: message || '',
            },
            data: {
              type: type || 'general',
              userId: profile.id,
              ...(data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {}),
            },
            android: {
              priority: 'high' as const,
              notification: {
                channel_id: 'checksfleet_notifications',
                sound: 'default',
                default_sound: true,
                default_vibrate_timings: true,
              },
            },
          },
        };

        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(fcmPayload),
          }
        );

        const result = await response.json();

        if (response.ok) {
          successCount++;
          results.push({ userId: profile.id, success: true, messageId: result.name });
        } else {
          failCount++;
          results.push({ userId: profile.id, success: false, error: result.error?.message });

          // If the token is unregistered / invalid, clear it from the DB
          if (
            result.error?.code === 404 ||
            result.error?.code === 400 ||
            result.error?.status === 'NOT_FOUND' ||
            result.error?.details?.some((d: any) => d.errorCode === 'UNREGISTERED')
          ) {
            await supabase.from('profiles').update({ fcm_token: null }).eq('id', profile.id);
            console.log(`Cleared invalid FCM token for user ${profile.id}`);
          }
        }
      } catch (e) {
        failCount++;
        results.push({ userId: profile.id, success: false, error: e.message });
      }
    }

    // Log notifications
    const logs = profiles.map((p: any, i: number) => ({
      user_id: p.id,
      action: 'sent',
      type: type || 'general',
      title,
      message,
      data,
      success: results[i]?.success ?? false,
    }));

    await supabase.from('notification_logs').insert(logs).catch((err: any) => {
      console.warn('Failed to log notifications:', err.message);
    });

    console.log(`FCM send complete: ${successCount} sent, ${failCount} failed out of ${profiles.length}`);

    return new Response(
      JSON.stringify({ success: true, recipients: successCount, failed: failCount, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('send-notification error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
