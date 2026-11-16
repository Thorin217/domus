import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, handler, leerJson, limpiarTexto, miembroActual, requireUser } from "@/lib/server/api";
import { avisosDeVotacion, contextoHogar, decidir } from "@/lib/server/premios";
import { responderConAvisos } from "@/lib/server/push";
import { LIMITES_PREMIOS } from "@/lib/premios/types";

/**
 * El acusado responde: escribe su defensa (la familia la lee y vota) o acepta el castigo.
 * Puede corregir su defensa mientras la acusación siga abierta.
 */
export const POST = handler(async (req: Request, ctx: RouteContext<"/api/hogar/votaciones/[id]/defensa">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const body = await leerJson<{ texto: string; aceptar: boolean }>(req);
  const aceptar = body.aceptar === true;
  const texto = aceptar ? null : limpiarTexto(body.texto, LIMITES_PREMIOS.defensa, "tu defensa");
  const db = adminDb();

  const r = await db.runTransaction(async (tx) => {
    const { hogarRef } = await miembroActual(user.uid, tx);
    const ref = hogarRef.collection("votaciones").doc(id);
    const [snap, h] = await Promise.all([tx.get(ref), contextoHogar(tx, hogarRef)]);
    if (!snap.exists) throw new ApiError(404, "Esa acusación ya no existe.");
    const v = snap.data()!;
    if (v.tipo !== "acusacion") throw new ApiError(400, "Solo se responde a una acusación.");
    if (v.objetivo !== user.uid) throw new ApiError(403, "Solo la persona acusada puede responder.");
    if (v.estado !== "abierta") throw new ApiError(409, "Esa acusación ya se decidió.");

    if (aceptar) v.aceptada = true;
    else v.defensa = { texto };
    tx.update(ref, aceptar ? { aceptada: true } : { defensa: { texto, en: FieldValue.serverTimestamp() } });
    const estado = decidir(tx, hogarRef, ref, v, h);
    return { estado, avisos: avisosDeVotacion({ ...v, id }, estado, h, aceptar ? "voto" : "defensa") };
  });

  return responderConAvisos(r);
});
