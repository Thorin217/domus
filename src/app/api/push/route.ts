import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, handler, leerJson, requireUser } from "@/lib/server/api";
import { dispositivos, idSuscripcion, validarSuscripcion } from "@/lib/server/push";
import { TIPOS_AVISO, type Preferencias } from "@/lib/avisos/types";

const MAX_DISPOSITIVOS = 10;

/** Guarda la suscripción de este dispositivo. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser(req);
  const body = await leerJson<{ sub: unknown }>(req);
  const sub = validarSuscripcion(body.sub);
  if (!sub) throw new ApiError(400, "Este navegador no entregó una suscripción válida.");
  const id = idSuscripcion(sub.endpoint);
  const suyos = await dispositivos().where("uid", "==", user.uid).get();
  // Si ya hay demasiados dispositivos, se olvida el más viejo.
  if (suyos.size >= MAX_DISPOSITIVOS && !suyos.docs.some((d) => d.id === id)) {
    const viejo = [...suyos.docs].sort((x, y) => (x.get("creadoEn")?.toMillis?.() ?? 0) - (y.get("creadoEn")?.toMillis?.() ?? 0))[0];
    await viejo.ref.delete();
  }
  const dispositivo = (req.headers.get("user-agent") ?? "").slice(0, 200);
  await dispositivos().doc(id).set({ uid: user.uid, sub, dispositivo, creadoEn: FieldValue.serverTimestamp() });
  return Response.json({ ok: true });
});

/** Este dispositivo deja de recibir avisos. */
export const DELETE = handler(async (req: Request) => {
  const user = await requireUser(req);
  const body = await leerJson<{ endpoint: string }>(req);
  if (typeof body.endpoint !== "string") throw new ApiError(400, "Dato inválido.");
  const ref = dispositivos().doc(idSuscripcion(body.endpoint));
  const snap = await ref.get();
  if (snap.exists && snap.get("uid") === user.uid) await ref.delete();
  return Response.json({ ok: true });
});

/** Qué avisos quiere recibir (vale para todos sus dispositivos). */
export const PATCH = handler(async (req: Request) => {
  const user = await requireUser(req);
  const body = await leerJson<{ avisos: Partial<Preferencias> }>(req);
  const avisos: Partial<Preferencias> = {};
  for (const t of TIPOS_AVISO) {
    const v = body.avisos?.[t.id];
    if (v === undefined) continue;
    if (typeof v !== "boolean") throw new ApiError(400, "Dato inválido.");
    avisos[t.id] = v;
  }
  await adminDb().collection("usuarios").doc(user.uid).set({ avisos }, { merge: true });
  return Response.json({ ok: true });
});
