import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, handler, leerJson, miembroActual, requireUser } from "@/lib/server/api";
import { validarFechaCompra, validarMontoGasto } from "@/lib/server/gastos";
import { esMes, idPagoFijo, mesDe } from "@/lib/gastos/types";

/**
 * Cualquier integrante marca pagado un gasto fijo en un mes, con el monto real.
 * Queda como una compra familiar del mes (una sola por gasto fijo y mes).
 */
export const POST = handler(async (req: Request, ctx: RouteContext<"/api/hogar/gastos-fijos/[id]/pagar">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const body = await leerJson<{ mes: string; monto: number; fecha: string; pagadoPor: string }>(req);
  if (!esMes(body.mes)) throw new ApiError(400, "Mes inválido.");
  const mes = body.mes;
  const monto = validarMontoGasto(body.monto);
  const fecha = validarFechaCompra(body.fecha);
  if (mesDe(fecha) !== mes) throw new ApiError(400, "La fecha del pago tiene que ser de ese mes.");
  const db = adminDb();

  await db.runTransaction(async (tx) => {
    const { hogarRef } = await miembroActual(user.uid, tx);
    const fijoRef = hogarRef.collection("gastosFijos").doc(id);
    const pagoRef = hogarRef.collection("compras").doc(idPagoFijo(id, mes));
    const pagadoPor = typeof body.pagadoPor === "string" ? body.pagadoPor : user.uid;
    const [fijo, pago, pagador] = await Promise.all([
      tx.get(fijoRef),
      tx.get(pagoRef),
      tx.get(hogarRef.collection("integrantes").doc(pagadoPor)),
    ]);
    if (!fijo.exists) throw new ApiError(404, "Ese gasto fijo ya no existe.");
    if (pago.exists) throw new ApiError(409, "Ese gasto ya está pagado este mes.");
    if (!pagador.exists) throw new ApiError(400, "Elige quién pagó.");
    tx.set(pagoRef, {
      concepto: fijo.get("nombre"),
      monto,
      categoria: fijo.get("categoria"),
      fecha,
      mes,
      pagadoPor,
      tipo: "familiar",
      creadoPor: user.uid,
      gastoFijoId: id,
      creadoEn: FieldValue.serverTimestamp(),
    });
  });

  return Response.json({ ok: true });
});
