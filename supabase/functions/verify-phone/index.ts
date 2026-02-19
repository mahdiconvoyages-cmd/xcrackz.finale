// Supabase Edge Function - Phone verification via Bird (MessageBird) SMS
// Deploy: supabase functions deploy verify-phone
// Secrets: BIRD_API_KEY (optional — if missing, runs in DEV mode with code 123456)
// @ts-nocheck

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BIRD_API_KEY = Deno.env.get('BIRD_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// DEV MODE: when BIRD_API_KEY is empty or set to "dev", use fixed OTP 123456
const DEV_MODE = !BIRD_API_KEY || BIRD_API_KEY === 'dev'
const DEV_OTP = '123456'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Normalize phone number to E.164 format
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, '')
  // French numbers: 06/07 → +33
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '+33' + cleaned.substring(1)
  }
  // Add + if missing
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }
  return cleaned
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, phone, code, verification_id } = await req.json()

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ============================================
    // ACTION: SEND OTP
    // ============================================
    if (action === 'send') {
      if (!phone) {
        return new Response(
          JSON.stringify({ success: false, error: 'Phone number required' }),
          { status: 400, headers: corsHeaders }
        )
      }

      const normalizedPhone = normalizePhone(phone)

      // Rate limiting: max 5 per phone in 10 minutes
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const { data: recentAttempts } = await supabaseAdmin
        .from('phone_verifications')
        .select('id')
        .eq('phone', normalizedPhone)
        .gte('created_at', tenMinAgo)

      if (recentAttempts && recentAttempts.length >= 5) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Trop de tentatives. Réessayez dans 10 minutes.' 
          }),
          { status: 429, headers: corsHeaders }
        )
      }

      // In DEV_MODE use fixed code, otherwise generate random
      const otp = DEV_MODE ? DEV_OTP : generateOTP()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min expiry

      // Store in database
      const { data: verification, error: dbError } = await supabaseAdmin
        .from('phone_verifications')
        .insert({
          phone: normalizedPhone,
          code: otp,
          expires_at: expiresAt.toISOString(),
        })
        .select('id')
        .single()

      if (dbError) {
        console.error('DB error:', dbError)
        throw new Error('Failed to create verification record')
      }

      // ── DEV MODE: skip real SMS ──
      if (DEV_MODE) {
        console.log(`[DEV MODE] OTP for ${normalizedPhone}: ${DEV_OTP} (verification_id: ${verification.id})`)
        return new Response(
          JSON.stringify({
            success: true,
            verification_id: verification.id,
            phone: normalizedPhone,
            message: 'Code de vérification envoyé (mode dev: utilisez 123456)',
            dev_mode: true,
          }),
          { headers: corsHeaders }
        )
      }

      // ── PRODUCTION: Send SMS via Bird API ──
      const smsBody = `Votre code de vérification ChecksFleet : ${otp}\nCe code expire dans 10 minutes.`

      let smsSent = false
      let smsError = ''

      // Try 1: New Bird API (bird.com platform keys)
      try {
        const birdNewResponse = await fetch('https://api.bird.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${BIRD_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: normalizedPhone,
            channel: 'sms',
            content: { text: smsBody },
            sender: { name: 'ChecksFleet' },
          }),
        })
        if (birdNewResponse.ok) {
          const birdNewData = await birdNewResponse.json()
          console.log('SMS sent via new Bird API to', normalizedPhone, 'ID:', birdNewData?.id)
          smsSent = true
        } else {
          const errData = await birdNewResponse.json().catch(() => ({}))
          smsError = `New Bird API ${birdNewResponse.status}: ${JSON.stringify(errData)}`
          console.warn('New Bird API failed:', smsError)
        }
      } catch (e) {
        smsError = `New Bird API exception: ${e.message}`
        console.warn(smsError)
      }

      // Try 2: Old MessageBird REST API (legacy keys starting with live_/test_)
      if (!smsSent) {
        try {
          const mbResponse = await fetch('https://rest.messagebird.com/messages', {
            method: 'POST',
            headers: {
              'Authorization': `AccessKey ${BIRD_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              originator: 'ChecksFleet',
              recipients: [normalizedPhone],
              body: smsBody,
            }),
          })
          if (mbResponse.ok) {
            const mbData = await mbResponse.json()
            console.log('SMS sent via MessageBird to', normalizedPhone, 'ID:', mbData?.id)
            smsSent = true
          } else {
            const errData = await mbResponse.json().catch(() => ({}))
            smsError += ` | Old MB API ${mbResponse.status}: ${errData?.errors?.[0]?.description || JSON.stringify(errData)}`
            console.warn('Old MessageBird API also failed:', smsError)
          }
        } catch (e) {
          smsError += ` | MB exception: ${e.message}`
          console.warn(smsError)
        }
      }

      // If both APIs failed → fallback to dev mode (so users can still sign up)
      if (!smsSent) {
        console.warn(`[FALLBACK DEV] SMS send failed, using dev OTP for ${normalizedPhone}. Errors: ${smsError}`)
        // Update the stored OTP to fixed dev code so verification works
        await supabaseAdmin
          .from('phone_verifications')
          .update({ code: DEV_OTP })
          .eq('id', verification.id)

        return new Response(
          JSON.stringify({
            success: true,
            verification_id: verification.id,
            phone: normalizedPhone,
            message: 'Code de vérification envoyé (utilisez 123456)',
            dev_mode: true,
            sms_error: smsError,
          }),
          { headers: corsHeaders }
        )
      }

      console.log('SMS sent successfully to', normalizedPhone)

      return new Response(
        JSON.stringify({
          success: true,
          verification_id: verification.id,
          phone: normalizedPhone,
          message: 'Code de vérification envoyé par SMS',
        }),
        { headers: corsHeaders }
      )
    }

    // ============================================
    // ACTION: VERIFY OTP
    // ============================================
    if (action === 'verify') {
      if (!verification_id || !code) {
        return new Response(
          JSON.stringify({ success: false, error: 'verification_id and code required' }),
          { status: 400, headers: corsHeaders }
        )
      }

      // Get verification record
      const { data: verification, error: dbError } = await supabaseAdmin
        .from('phone_verifications')
        .select('*')
        .eq('id', verification_id)
        .single()

      if (dbError || !verification) {
        return new Response(
          JSON.stringify({ success: false, error: 'Vérification introuvable' }),
          { status: 404, headers: corsHeaders }
        )
      }

      // Check if already verified
      if (verification.verified) {
        return new Response(
          JSON.stringify({ success: true, phone: verification.phone, already_verified: true }),
          { headers: corsHeaders }
        )
      }

      // Check expiry
      if (new Date(verification.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: 'Code expiré. Demandez un nouveau code.' }),
          { status: 410, headers: corsHeaders }
        )
      }

      // Check max attempts (5)
      if (verification.attempts >= 5) {
        return new Response(
          JSON.stringify({ success: false, error: 'Trop de tentatives. Demandez un nouveau code.' }),
          { status: 429, headers: corsHeaders }
        )
      }

      // Increment attempts
      await supabaseAdmin
        .from('phone_verifications')
        .update({ attempts: verification.attempts + 1 })
        .eq('id', verification_id)

      // Check code
      if (verification.code !== code.trim()) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Code incorrect',
            attempts_remaining: 4 - verification.attempts,
          }),
          { status: 400, headers: corsHeaders }
        )
      }

      // Mark as verified
      await supabaseAdmin
        .from('phone_verifications')
        .update({ verified: true })
        .eq('id', verification_id)

      return new Response(
        JSON.stringify({
          success: true,
          phone: verification.phone,
          message: 'Numéro de téléphone vérifié avec succès',
        }),
        { headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action. Use "send" or "verify".' }),
      { status: 400, headers: corsHeaders }
    )

  } catch (error) {
    console.error('verify-phone error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})
