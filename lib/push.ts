import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase-server';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.NEXT_PUBLIC_SITE_URL || 'https://calgaryoaths.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
};

/**
 * Send a push notification to a specific user (all their subscriptions).
 * Silently returns if VAPID keys are not configured.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const { data: subscriptions } = await supabaseAdmin
    .from('co_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subscriptions?.length) return;

  const notification = JSON.stringify({
    ...payload,
    icon: payload.icon || '/icons/icon-192x192.svg',
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notification
        );
      } catch (err: unknown) {
        // 404 or 410 = subscription expired/invalid, remove it
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabaseAdmin
            .from('co_push_subscriptions')
            .delete()
            .eq('id', sub.id);
        }
        throw err;
      }
    })
  );

  return results;
}

/**
 * Send a push notification to the vendor (commissioner) who owns a booking.
 * Looks up the commissioner's auth user_id and sends to all their subscriptions.
 */
export async function sendPushToCommissioner(commissionerId: string, payload: PushPayload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  // Look up the user_id for this commissioner
  const { data: profile } = await supabaseAdmin
    .from('co_profiles')
    .select('id')
    .eq('commissioner_id', commissionerId)
    .eq('role', 'vendor')
    .single();

  if (!profile) return;

  return sendPushToUser(profile.id, payload);
}
