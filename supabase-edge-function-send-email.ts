/**
 * 📧 SUPABASE EDGE FUNCTION - ENVOI D'EMAILS
 * 
 * Déployer avec: supabase functions deploy send-email
 * 
 * Variables requises:
 * - SENDGRID_API_KEY ou RESEND_API_KEY
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ===========================================
// INTERFACE
// ===========================================

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    type: string; // mime type
  }>;
}

// ===========================================
// FONCTION PRINCIPALE
// ===========================================

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // 2. Parser les données
    const emailData: EmailRequest = await req.json();

    console.log('📧 Sending email to:', emailData.to);
    console.log('📄 Subject:', emailData.subject);
    console.log('📎 Attachments:', emailData.attachments?.length || 0);

    // 3. Validation
    if (!emailData.to || !emailData.subject || !emailData.html) {
      throw new Error('Missing required fields: to, subject, html');
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.to)) {
      throw new Error('Invalid email address');
    }

    // 4. Envoyer via SendGrid OU Resend
    const sendGridKey = Deno.env.get('SENDGRID_API_KEY');
    const resendKey = Deno.env.get('RESEND_API_KEY');

    let emailResult;

    if (sendGridKey) {
      emailResult = await sendViaSendGrid(emailData, sendGridKey);
    } else if (resendKey) {
      emailResult = await sendViaResend(emailData, resendKey);
    } else {
      throw new Error('No email service configured (SENDGRID_API_KEY or RESEND_API_KEY)');
    }

    // 5. Logger dans la base de données (optionnel)
    try {
      await supabaseClient.from('email_logs').insert({
        user_id: user.id,
        recipient: emailData.to,
        subject: emailData.subject,
        status: emailResult.success ? 'sent' : 'failed',
        error_message: emailResult.error || null,
        sent_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log email:', logError);
      // Non-bloquant
    }

    // 6. Retourner le résultat
    return new Response(
      JSON.stringify({
        success: emailResult.success,
        message: emailResult.success ? 'Email sent successfully' : emailResult.error,
        messageId: emailResult.messageId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: emailResult.success ? 200 : 400,
      }
    );
  } catch (error: any) {
    console.error('❌ Error sending email:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Failed to send email',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// ===========================================
// SENDGRID
// ===========================================

async function sendViaSendGrid(emailData: EmailRequest, apiKey: string) {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: emailData.to }],
          },
        ],
        from: {
          email: 'noreply@checksfleet.com',
          name: 'CHECKSFLEET - Inspection de Véhicules',
        },
        reply_to: {
          email: 'contact@checksfleet.com',
        },
        subject: emailData.subject,
        content: [
          {
            type: 'text/html',
            value: emailData.html,
          },
        ],
        attachments: emailData.attachments?.map((att) => ({
          content: att.content,
          filename: att.filename,
          type: att.type,
          disposition: 'attachment',
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('SendGrid error:', error);
      return {
        success: false,
        error: `SendGrid error: ${error}`,
      };
    }

    // SendGrid retourne un header X-Message-Id
    const messageId = response.headers.get('X-Message-Id');

    console.log('✅ Email sent via SendGrid, message ID:', messageId);

    return {
      success: true,
      messageId,
    };
  } catch (error: any) {
    console.error('SendGrid exception:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ===========================================
// RESEND
// ===========================================

async function sendViaResend(emailData: EmailRequest, apiKey: string) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CHECKSFLEET <noreply@checksfleet.com>',
        to: [emailData.to],
        subject: emailData.subject,
        html: emailData.html,
        attachments: emailData.attachments?.map((att) => ({
          content: att.content,
          filename: att.filename,
        })),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend error:', result);
      return {
        success: false,
        error: `Resend error: ${result.message || 'Unknown error'}`,
      };
    }

    console.log('✅ Email sent via Resend, ID:', result.id);

    return {
      success: true,
      messageId: result.id,
    };
  } catch (error: any) {
    console.error('Resend exception:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ===========================================
// NOTES
// ===========================================

/**
 * 📝 DÉPLOIEMENT:
 * 
 * 1. Créer la fonction:
 *    supabase functions new send-email
 * 
 * 2. Copier ce fichier dans:
 *    supabase/functions/send-email/index.ts
 * 
 * 3. Déployer:
 *    supabase functions deploy send-email
 * 
 * 4. Configurer les secrets:
 *    supabase secrets set SENDGRID_API_KEY=your_key_here
 *    # OU
 *    supabase secrets set RESEND_API_KEY=your_key_here
 * 
 * 5. Tester:
 *    curl -i --location --request POST 'https://your-project.supabase.co/functions/v1/send-email' \
 *      --header 'Authorization: Bearer YOUR_ANON_KEY' \
 *      --header 'Content-Type: application/json' \
 *      --data '{"to":"test@example.com","subject":"Test","html":"<h1>Hello</h1>"}'
 * 
 * 📊 TABLE EMAIL_LOGS (optionnelle):
 * 
 * CREATE TABLE email_logs (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES auth.users(id),
 *   recipient VARCHAR(255) NOT NULL,
 *   subject TEXT NOT NULL,
 *   status VARCHAR(50) NOT NULL,
 *   error_message TEXT,
 *   sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 * 
 * CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
 * CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
 */
