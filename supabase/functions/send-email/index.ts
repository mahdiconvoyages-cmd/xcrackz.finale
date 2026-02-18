// Supabase Edge Function pour envoyer des emails avec pièces jointes
// Deploy: supabase functions deploy send-email
// @ts-nocheck

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''

interface EmailRequest {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: string // base64
    type: string
  }>
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { to, subject, html, attachments = [] }: EmailRequest = await req.json()

    // Validation
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to, subject, html' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Option 1: Utiliser Resend (service email moderne)
    if (RESEND_API_KEY) {
      const emailData: any = {
        from: 'ChecksFleet <contact@checksfleet.com>',
        to: [to],
        subject: subject,
        html: html,
      }

      // Ajouter les pièces jointes si présentes
      if (attachments.length > 0) {
        emailData.attachments = attachments.map(att => ({
          filename: att.filename,
          content: att.content,
        }))
      }

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      })

      const resendData = await resendResponse.json()

      if (!resendResponse.ok) {
        throw new Error(`Resend error: ${JSON.stringify(resendData)}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: resendData.id,
          message: 'Email sent successfully via Resend'
        }),
        {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    // Option 2: Utiliser SMTP (si Resend non configuré)
    // Nécessite de configurer un service SMTP externe
    else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No email service configured. Please set RESEND_API_KEY secret.' 
        }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

  } catch (error) {
    console.error('Email send error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
