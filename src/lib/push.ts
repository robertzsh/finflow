import { VAPID_PUBLIC_KEY } from './config';
import * as cloud from './cloud';

export type EnableResult = { ok: true } | { ok: false; reason: 'unsupported' | 'denied' | 'novapid' | 'error' };

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}
export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}
export function localTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
}

function urlB64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Current push endpoint for this device, if already subscribed. */
export async function currentEndpoint(): Promise<string | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub?.endpoint ?? null;
}

/** Ask permission, subscribe this device, and store the subscription + preferred times. */
export async function enablePush(hours: number[], tz: string): Promise<EnableResult> {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'novapid' };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: 'denied' };
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource });
    }
    const json: any = sub.toJSON();
    await cloud.savePushSubscription({ endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, hours, tz });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** Update the send times (and timezone) for the existing subscription. */
export async function setReminderTimes(hours: number[], tz: string): Promise<void> {
  const endpoint = await currentEndpoint();
  if (endpoint) await cloud.updatePushPref(endpoint, { hours, tz, enabled: true });
}

/** Turn reminders off for this device: unsubscribe and remove the stored row. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await cloud.removePushSubscription(sub.endpoint).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
}

/** Reads whether this device currently has reminders on, and at what times. */
export async function reminderState(): Promise<{ on: boolean; hours: number[] } | null> {
  const fallback = { on: false, hours: [10, 22] };
  if (!pushSupported() || Notification.permission !== 'granted') return fallback;
  const endpoint = await currentEndpoint();
  if (!endpoint) return fallback;
  const pref = await cloud.getPushPref(endpoint);
  return { on: !!pref?.enabled, hours: pref?.hours?.length ? pref.hours : [10, 22] };
}
