// @ts-nocheck
// Supabase Edge Function — send-lift-notification
// Déployer : supabase functions deploy send-lift-notification
//
// Cette fonction reçoit {to_user_id, title, body, data},
// récupère le fcm_token de l'utilisateur et envoie la notif via FCM v1 API.
// Nécessite le secret FIREBASE_SERVICE_ACCOUNT (JSON du compte de service Firebase).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Google OAuth2 token generation for FCM v1 ---
async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsignedToken = `${enc(header)}.${enc(payload)}`;

  // Import the RSA private key
  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsignedToken}.${sig}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`OAuth2 token error: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

// --- Main ---
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_SA_JSON = Deno.env.get("FIREBASE_SERVICE_ACCOUNT")!;
const serviceAccount = JSON.parse(FIREBASE_SA_JSON);
const FCM_PROJECT_ID = serviceAccount.project_id; // "checksfleet"

Deno.serve(async (req: Request) => {
  try {
    const { to_user_id, title, body, data } = await req.json();

    if (!to_user_id || !title) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
      });
    }

    // Récupérer le token FCM de l'utilisateur
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("fcm_token")
      .eq("id", to_user_id)
      .maybeSingle();

    if (error || !profile?.fcm_token) {
      return new Response(JSON.stringify({ skipped: "no_token" }), {
        status: 200,
      });
    }

    // Obtenir un access token OAuth2
    const accessToken = await getAccessToken(serviceAccount);

    // Envoyer via FCM v1 API
    const fcmRes = await fetch(
      `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token: profile.fcm_token,
            notification: { title, body },
            data: data
              ? Object.fromEntries(
                  Object.entries(data).map(([k, v]) => [k, String(v)])
                )
              : {},
            android: {
              priority: "HIGH",
              notification: { sound: "default" },
            },
            apns: {
              payload: {
                aps: { sound: "default", badge: 1 },
              },
            },
          },
        }),
      }
    );

    const fcmBody = await fcmRes.json();

    if (!fcmRes.ok) {
      console.error("FCM v1 error:", JSON.stringify(fcmBody));
      return new Response(
        JSON.stringify({ error: "fcm_failed", details: fcmBody }),
        { status: 502 }
      );
    }

    return new Response(JSON.stringify({ ok: true, fcm: fcmBody }), {
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
