/**
 * infrastructure/notifications/notifier — adaptador de notificaciones.
 *
 * Implementa el puerto NotificationService. Usa la Notification API del
 * navegador a través de un Service Worker, de modo que las notificaciones
 * aparezcan aunque la pestaña esté en segundo plano.
 *
 * Las notificaciones las dispara el timer de la app (no hay servidor de push).
 * El puerto está abstraído para poder migrar a Web Push real en la fase 2.
 */

let swRegistration = null;

/** Registra el Service Worker (idempotente). */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js');
    return swRegistration;
  } catch (_e) {
    return null;
  }
}

/** ¿El navegador soporta notificaciones? */
export function notificationsSupported() {
  return 'Notification' in window;
}

/** Estado actual del permiso: 'granted' | 'denied' | 'default' | 'unsupported'. */
export function permissionStatus() {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

/** Pide permiso para notificar. Devuelve el estado resultante. */
export async function requestPermission() {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch (_e) {
    return Notification.permission;
  }
}

/** Reproduce una campana suave (preferencia del usuario). */
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (_e) {
    /* el sonido es opcional */
  }
}

/**
 * Muestra una notificación.
 * @param {{ title: string, body: string, tag?: string, sound?: boolean }} opts
 */
export async function notify({ title, body, tag = 'bloque', sound = true }) {
  if (sound) playChime();
  if (permissionStatus() !== 'granted') return;
  const options = {
    body,
    tag,
    renotify: true,
    icon: '/icon.svg',
    badge: '/icon.svg',
  };
  try {
    const reg = swRegistration ?? (await navigator.serviceWorker?.ready);
    if (reg) {
      await reg.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
  } catch (_e) {
    /* notificar es best-effort */
  }
}

/**
 * Eventos accionables de Bloque. Una sola función semántica por momento del
 * flujo, para que las llamadas del motor de ejecución sean legibles.
 */
export const notifier = {
  registerServiceWorker,
  requestPermission,
  permissionStatus,

  /** Es hora de iniciar el primer bloque del día. */
  firstBlock(blockTitle, sound) {
    return notify({
      title: 'Hora de empezar',
      body: `Tu primer bloque: ${blockTitle}`,
      tag: 'bloque-first',
      sound,
    });
  },

  /** Terminó un segmento de trabajo: empieza la pausa. */
  breakStart(activity, sound) {
    return notify({
      title: 'Pausa',
      body: activity,
      tag: 'bloque-break',
      sound,
    });
  },

  /** Terminó la pausa: vuelve al trabajo. */
  breakEnd(blockTitle, sound) {
    return notify({
      title: 'De vuelta al trabajo',
      body: blockTitle,
      tag: 'bloque-resume',
      sound,
    });
  },

  /** Se completaron todos los bloques del día. */
  dayComplete(sound) {
    return notify({
      title: 'Día completo',
      body: 'Terminaste todos tus bloques. Revisa el resumen.',
      tag: 'bloque-day',
      sound,
    });
  },
};
