import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { 
      userId, 
      userIds, 
      filters, 
      type, 
      title, 
      message, 
      data,
      channel,
      templateId 
    } = await req.json();

    // Validation
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      throw new Error('OneSignal credentials not configured');
    }

    if (!title && !templateId) {
      throw new Error('Either title or templateId is required');
    }

    // Initialize Supabase client
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build notification payload
    const payload: any = {
      app_id: ONESIGNAL_APP_ID,
      headings: title ? { en: title, fr: title } : undefined,
      contents: message ? { en: message, fr: message } : undefined,
      data: {
        type,
        ...data,
      },
      android_channel_id: channel || 'default',
      ios_sound: 'notification.wav',
      android_sound: 'notification',
      priority: channel === 'urgent' ? 10 : 5,
      template_id: templateId,
    };

    // Add targeting
    if (userId) {
      // Single user by external_user_id
      payload.include_external_user_ids = [userId];
    } else if (userIds && userIds.length > 0) {
      // Multiple users
      payload.include_external_user_ids = userIds;
    } else if (filters && filters.length > 0) {
      // Segment filters
      payload.filters = filters;
    } else {
      throw new Error('No targeting specified (userId, userIds, or filters required)');
    }

    // Send notification via OneSignal
    console.log('Sending notification:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OneSignal error:', result);
      throw new Error(result.errors ? JSON.stringify(result.errors) : 'Failed to send notification');
    }

    // Log notification to database
    const notificationId = result.id;
    const recipients = result.recipients || 0;

    console.log(`Notification ${notificationId} sent to ${recipients} recipients`);

    // Log to notification_logs table
    if (userId) {
      await supabase.from('notification_logs').insert({
        notification_id: notificationId,
        user_id: userId,
        action: 'sent',
        type,
        title,
        message,
        data,
        channel,
        success: true,
      });
    } else if (userIds && userIds.length > 0) {
      const logs = userIds.map((uid: string) => ({
        notification_id: notificationId,
        user_id: uid,
        action: 'sent',
        type,
        title,
        message,
        data,
        channel,
        success: true,
      }));
      await supabase.from('notification_logs').insert(logs);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationId,
        recipients,
        data: result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
