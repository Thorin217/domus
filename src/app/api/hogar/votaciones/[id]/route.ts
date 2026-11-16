import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, handler, leerJson, miembroActual, requireUser } from "@/lib/server/api";
import { avisosDeVotacion, contextoHogar, decidir } from "@/lib/server/premios";
import { responderConAvisos } from "@/lib/server/push";
import { votantes, type Voto } from "@/lib/premios/types";

/**
 * Vota sí o no (se puede cambiar mientras siga abierta). Si con este voto se decide, se aplica.
 * `{ cerrar: true }`: cualquiera cuenta los votos de una acusación cuyo plazo de defensa ya venció.
 */
export const PATCH = handler(async (req: Request, ctx: RouteContext<"/api/hogar/votaciones/[id]">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const body = await leerJson<{ voto: Voto; cerrar: boolean }>(req);
  const cerrar = body.cerrar === true;
  if (!cerrar && body.voto !== "si" && body.voto !== "no") throw new ApiError(400, "Vota sí o no.");
  const db = adminDb();

  const r = await db.runTransaction(async (tx) => {
    const { hogarRef } = await miembroActual(user.uid, tx);
    const ref = hogarRef.collection("votaciones").doc(id);
    const [snap, h] = await Promise.all([tx.get(ref), contextoHogar(tx, hogarRef)]);
    if (!snap.exists) throw new ApiError(404, "Esa votación ya no existe.");
    const v = snap.data()!;
    if (v.estado !== "abierta") throw new ApiError(409, "Esa votación ya se cerró.");
    if (cerrar) {
      if (v.tipo !== "acusacion" || Date.now() <= (v.acusacion?.plazo ?? 0)) throw new ApiError(409, "Todavía corre el plazo de defensa.");
      const decidida = decidir(tx, hogarRef, ref, v, h);
      if (decidida === "abierta") tx.update(ref, { estado: "rechazada", motivo: "No hubo suficientes votos a favor.", cerradaEn: FieldValue.serverTimestamp() });
      const estado = decidida === "abierta" ? "rechazada" : decidida;
      return { estado, avisos: avisosDeVotacion({ ...v, id }, estado, h, "voto") };
    }
    if (!votantes({ objetivo: v.objetivo }, [...h.integrantes.keys()]).includes(user.uid)) {
      throw new ApiError(403, "No votas en algo que te afecta a ti.");
    }
    v.votos = { ...(v.votos ?? {}), [user.uid]: body.voto! };
    tx.update(ref, new FieldPath("votos", user.uid), body.voto!, "actualizadoEn", FieldValue.serverTimestamp());
    const estado = decidir(tx, hogarRef, ref, v, h);
    return { estado, avisos: avisosDeVotacion({ ...v, id }, estado, h, "voto") };
  });

  return responderConAvisos(r);
});

/** Quien la abrió o el admin la cancelan mientras siga abierta. */
export const DELETE = handler(async (req: Request, ctx: RouteContext<"/api/hogar/votaciones/[id]">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const db = adminDb();

  await db.runTransaction(async (tx) => {
    const { hogarRef, integrante } = await miembroActual(user.uid, tx);
    const ref = hogarRef.collection("votaciones").doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "Esa votación ya no existe.");
    if (snap.get("estado") !== "abierta") throw new ApiError(409, "Esa votación ya se cerró.");
    const esCreador = snap.get("creadoPor") === user.uid;
    if (!esCreador && (integrante.rol !== "admin" || snap.get("objetivo") === user.uid)) {
      throw new ApiError(403, snap.get("objetivo") === user.uid ? "No puedes cancelar una votación sobre ti." : "Solo quien la abrió o el admin pueden cancelarla.");
    }
    const itemId = snap.get("itemId") as string | null;
    if (snap.get("tipo") === "catalogo" && itemId) tx.update(hogarRef.collection("catalogo").doc(itemId), { estado: "rechazado" });
    tx.update(ref, { estado: "cancelada", motivo: null, cerradaEn: FieldValue.serverTimestamp() });
  });

  return Response.json({ ok: true });
});
