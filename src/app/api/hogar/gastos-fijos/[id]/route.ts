import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, adminActual, handler, leerJson, requireUser } from "@/lib/server/api";
import { categoriasDe, datosFijo } from "@/lib/server/gastos";

/** Admin: edita un gasto fijo (lo ya pagado no cambia). */
export const PATCH = handler(async (req: Request, ctx: RouteContext<"/api/hogar/gastos-fijos/[id]">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const body = (await leerJson<Record<string, unknown>>(req)) as Record<string, unknown>;
  const db = adminDb();

  await db.runTransaction(async (tx) => {
    const { hogarRef } = await adminActual(user.uid, tx);
    const ref = hogarRef.collection("gastosFijos").doc(id);
    const [snap, hogar] = await Promise.all([tx.get(ref), tx.get(hogarRef)]);
    if (!snap.exists) throw new ApiError(404, "Ese gasto fijo ya no existe.");
    const datos = datosFijo(body, categoriasDe(hogar.data() ?? {}), true);
    if (!Object.keys(datos).length) throw new ApiError(400, "No hay cambios.");
    tx.update(ref, { ...datos, actualizadoEn: FieldValue.serverTimestamp() });
  });

  return Response.json({ ok: true });
});

/** Admin: elimina un gasto fijo. Los pagos ya hechos quedan como compras. */
export const DELETE = handler(async (req: Request, ctx: RouteContext<"/api/hogar/gastos-fijos/[id]">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  await adminDb().runTransaction(async (tx) => {
    const { hogarRef } = await adminActual(user.uid, tx);
    const ref = hogarRef.collection("gastosFijos").doc(id);
    if (!(await tx.get(ref)).exists) throw new ApiError(404, "Ese gasto fijo ya no existe.");
    tx.delete(ref);
  });
  return Response.json({ ok: true });
});
