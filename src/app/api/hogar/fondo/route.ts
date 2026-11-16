import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { responderConAvisos } from "@/lib/server/push";
import { ApiError, adminActual, handler, leerJson, limpiarTexto, requireUser } from "@/lib/server/api";
import { abrirVotacion, contextoHogar, hoyUTC, validarMonto } from "@/lib/server/premios";
import { LIMITES_PREMIOS, dinero } from "@/lib/premios/types";

/**
 * Admin: registra un aporte al fondo o un gasto (la salida a comer).
 * Si las reglas lo piden, el gasto pasa primero por votación.
 */
export const POST = handler(async (req: Request) => {
  const user = await requireUser(req);
  const body = await leerJson<{ tipo: "aporte" | "gasto"; monto: number; descripcion: string; uid: string | null }>(req);
  if (body.tipo !== "aporte" && body.tipo !== "gasto") throw new ApiError(400, "Tipo inválido.");
  const tipo = body.tipo;
  const monto = validarMonto(body.monto, LIMITES_PREMIOS.fondoMax);
  const descripcion = limpiarTexto(body.descripcion, LIMITES_PREMIOS.descripcion, "la descripción");
  const db = adminDb();

  const r = await db.runTransaction(async (tx) => {
    const { hogarRef } = await adminActual(user.uid, tx);
    const ctx = await contextoHogar(tx, hogarRef);
    const uid = tipo === "aporte" && typeof body.uid === "string" ? body.uid : null;
    if (uid && !ctx.integrantes.has(uid)) throw new ApiError(404, "Esa persona no está en tu hogar.");
    const saldo = (ctx.hogar.fondo?.saldo as number | undefined) ?? 0;

    if (tipo === "gasto") {
      if (saldo < monto) throw new ApiError(409, `En el fondo hay ${dinero(saldo)}; no alcanza para ${dinero(monto)}.`);
      if (ctx.reglas.gastoConVoto) {
        return abrirVotacion(tx, hogarRef, ctx, user.uid, {
          tipo: "gasto",
          titulo: descripcion,
          detalle: `Gastar ${dinero(monto)} del fondo`,
          monto,
        });
      }
    }

    tx.set(hogarRef.collection("fondo").doc(), {
      tipo,
      monto,
      descripcion,
      uid,
      pagado: true,
      fecha: hoyUTC(),
      votacionId: null,
      creadoEn: FieldValue.serverTimestamp(),
    });
    tx.set(hogarRef, { fondo: { saldo: FieldValue.increment(tipo === "aporte" ? monto : -monto) } }, { merge: true });
    return { estado: "aprobada" };
  });

  return responderConAvisos(r);
});
