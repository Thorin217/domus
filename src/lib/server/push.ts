import "server-only";
import { createHash } from "node:crypto";
import webpush, { WebPushError, type PushSubscription } from "web-push";
import { adminDb } from "./firebase-admin";
import { preferenciasDe, type Aviso } from "@/lib/avisos/types";

let listo = false;

/** null si faltan las claves (las notificaciones quedan apagadas sin romper nada). */
function configurar() {
  if (listo) return true;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:avisos@example.com", publica, privada);
  listo = true;
  return true;
}

export function idSuscripcion(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 40);
}

/**
 * Dispositivos: `dispositivos/{hash del endpoint}` = { uid, sub }. Un dispositivo tiene un solo dueño:
 * si otra persona inicia sesión en el mismo teléfono y activa avisos, pasa a ser suyo.
 */
export function dispositivos() {
  return adminDb().collection("dispositivos");
}

/** Valida lo que manda el navegador (PushSubscription.toJSON()). */
export function validarSuscripcion(v: unknown): PushSubscription | null {
  const s = v as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  if (!s || typeof s.endpoint !== "string" || !/^https:\/\//.test(s.endpoint) || s.endpoint.length > 1000) return null;
  if (typeof s.keys?.p256dh !== "string" || typeof s.keys?.auth !== "string") return null;
  return { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
}

/**
 * Envía un aviso a varias personas (a todos sus dispositivos), respetando lo que cada una apagó.
 * Nunca lanza: un aviso que no sale no debe romper la acción que lo provocó.
 * Las suscripciones que el servicio da por vencidas (404/410) se borran.
 */
export async function notificar(uids: Iterable<string>, aviso: Aviso, opciones: { ignorarPreferencias?: boolean } = {}) {
  if (!configurar()) return { enviados: 0 };
  const db = adminDb();
  let enviados = 0;
  const payload = JSON.stringify({ titulo: aviso.titulo, cuerpo: aviso.cuerpo, url: aviso.url, tag: aviso.tag });

  await Promise.all(
    [...new Set(uids)].map(async (uid) => {
      try {
        const [perfil, subs] = await Promise.all([db.collection("usuarios").doc(uid).get(), dispositivos().where("uid", "==", uid).get()]);
        if (!opciones.ignorarPreferencias && !preferenciasDe(perfil.get("avisos"))[aviso.tipo]) return;
        await Promise.all(
          subs.docs.map(async (d) => {
            try {
              await webpush.sendNotification(d.get("sub") as PushSubscription, payload, { TTL: 60 * 60 * 24, urgency: "normal", timeout: 5000 });
              enviados++;
            } catch (e) {
              if (e instanceof WebPushError && (e.statusCode === 404 || e.statusCode === 410)) await d.ref.delete();
              else console.error("push", uid, (e as Error).message);
            }
          }),
        );
      } catch (e) {
        console.error("push", uid, (e as Error).message);
      }
    }),
  );
  return { enviados };
}

/** Avisos calculados dentro de una transacción para enviarlos al terminar. */
export type Pendiente = { uids: string[]; aviso: Aviso };

export async function enviarPendientes(pendientes: Pendiente[]) {
  await Promise.all(pendientes.filter((p) => p.uids.length).map((p) => notificar(p.uids, p.aviso)));
}

/**
 * Envía los avisos y después responde con `r` (sin sus avisos).
 * Se espera el envío a propósito: en hosting serverless (Netlify) el trabajo que
 * queda pendiente después de responder puede cortarse. Un aviso fallido nunca
 * hace fallar la acción.
 */
export async function responderConAvisos(r: object & { avisos?: Pendiente[] }) {
  const { avisos, ...resto } = r;
  if (avisos?.length) await enviarPendientes(avisos).catch((e) => console.error("push", (e as Error).message));
  return Response.json(resto);
}
