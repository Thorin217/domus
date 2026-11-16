import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, handler, leerJson, miembroActual, requireUser } from "@/lib/server/api";
import { categoriasDe, datosCompra } from "@/lib/server/gastos";

/** La compra y si el usuario puede cambiarla (quien la anotó, quien pagó o el admin). */
async function compraEditable(tx: Transaction, uid: string, id: string) {
  const m = await miembroActual(uid, tx);
  const ref = m.hogarRef.collection("compras").doc(id);
  const snap = await tx.get(ref);
  if (!snap.exists) throw new ApiError(404, "Esa compra ya no existe.");
  const c = snap.data()!;
  if (m.integrante.rol !== "admin" && c.creadoPor !== uid && c.pagadoPor !== uid) {
    throw new ApiError(403, "Solo quien la anotó, quien pagó o el admin pueden cambiarla.");
  }
  return { ...m, ref, compra: c };
}

/** Edita una compra (se envían todos los campos). */
export const PATCH = handler(async (req: Request, ctx: RouteContext<"/api/hogar/compras/[id]">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const body = (await leerJson<Record<string, unknown>>(req)) as Record<string, unknown>;
  const db = adminDb();

  await db.runTransaction(async (tx) => {
    const { hogarRef, ref, compra } = await compraEditable(tx, user.uid, id);
    const [hogar, integrantes] = await Promise.all([tx.get(hogarRef), tx.get(hogarRef.collection("integrantes"))]);
    const datos = datosCompra(body, categoriasDe(hogar.data() ?? {}), new Set(integrantes.docs.map((d) => d.id)));
    if (compra.gastoFijoId) {
      // El pago de un gasto fijo sigue siendo de ese mes y familiar.
      if (datos.mes !== compra.mes) throw new ApiError(400, "El pago de un gasto fijo tiene que quedar en el mismo mes.");
      datos.tipo = "familiar";
    }
    tx.update(ref, { ...datos, actualizadoEn: FieldValue.serverTimestamp() });
  });

  return Response.json({ ok: true });
});

export const DELETE = handler(async (req: Request, ctx: RouteContext<"/api/hogar/compras/[id]">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  await adminDb().runTransaction(async (tx) => {
    const { ref } = await compraEditable(tx, user.uid, id);
    tx.delete(ref);
  });
  return Response.json({ ok: true });
});
