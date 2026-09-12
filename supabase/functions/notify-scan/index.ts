/**
 * notify-scan — Supabase Edge Function
 *
 * Called by a Supabase Database Webhook on INSERT to scan_events.
 * Looks up the owner's FCM token and sends a push notification via FCM v1 API.
 *
 * Required env vars (set in Supabase dashboard → Edge Functions → Secrets):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   FCM_SERVER_KEY  ← from Firebase Console → Project Settings → Cloud Messaging → Server Key
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FCM_KEY      = Deno.env.get('FCM_SERVER_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

serve(async (req) => {
  try {
    const body = await req.json();

    // Supabase webhook sends: { type, table, schema, record, old_record }
    const record = body?.record;
    if (!record || body?.type !== 'INSERT') {
      return new Response('not an insert', { status: 200 });
    }

    const {
      owner_id: ownerId,
      scanner_city: city,
      scanner_country: country,
      file_name: fileName,
      scanner_user_id: scannerUserId,
    } = record;

    if (!ownerId) return new Response('no owner_id', { status: 200 });

    // Don't notify when the owner scans their own image
    if (scannerUserId && scannerUserId === ownerId) {
      return new Response('self-scan skipped', { status: 200 });
    }

    // Look up the owner's FCM token
    const { data: tokenRow } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', ownerId)
      .maybeSingle();

    if (!tokenRow?.token) {
      return new Response('no fcm token for owner', { status: 200 });
    }

    // Build notification text
    const locationStr = [city, country].filter(Boolean).join(', ') || 'unknown location';
    const fileStr = fileName ? `"${fileName}"` : 'your image';
    const title = '🔍 Image Scanned';
    const bodyText = `Someone scanned ${fileStr} from ${locationStr}`;

    // Send via FCM Legacy HTTP API
    const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: tokenRow.token,
        notification: { title, body: bodyText, sound: 'default' },
        data: {
          type: 'scan_event',
          owner_id: ownerId,
          file_name: fileName ?? '',
          city: city ?? '',
          country: country ?? '',
        },
        priority: 'high',
        android: { priority: 'high', notification: { channel_id: 'pinit_scans' } },
      }),
    });

    const fcmBody = await fcmRes.json();

    return new Response(JSON.stringify({ ok: true, fcm: fcmBody }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
