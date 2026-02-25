// @ts-nocheck
// Supabase Edge Function — send-lift-notification
// Déployer : supabase functions deploy send-lift-notification
//
// Cette fonction reçoit {to_user_id, title, body, data},
// récupère le fcm_token de l'utilisateur et envoie la notif via FCM HTTP v1 API.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY")!; // Clé serveur Firebase Legacy

Deno.serve(async (req: Request) => {
  try {
    const { to_user_id, title, body, data } = await req.json();

    if (!to_user_id || !title) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
    }

    // Récupérer le token FCM de l'utilisateur
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("fcm_token")
      .eq("id", to_user_id)
      .maybeSingle();

    if (error || !profile?.fcm_token) {
      return new Response(JSON.stringify({ skipped: "no_token" }), { status: 200 });
    }

    // Envoyer via FCM Legacy HTTP API
    const fcmRes = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: profile.fcm_token,
        notification: { title, body },
        data: data ?? {},
        priority: "high",
        apns: {
          payload: {
            aps: { sound: "default", badge: 1 },
          },
        },
      }),
    });

    const fcmBody = await fcmRes.json();
    return new Response(JSON.stringify({ ok: true, fcm: fcmBody }), { status: 200 });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
