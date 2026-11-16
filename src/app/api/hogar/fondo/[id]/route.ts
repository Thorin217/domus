import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, adminActual, handler, requireUser } from "@/lib/server/api";

async function multaPendiente(tx: FirebaseFirestore.Transaction, hogarRef: FirebaseFirestore.DocumentReference, id: string) {
  const ref = hogarRef.collection("fondo").doc(id);
  const snap = await tx.get(ref);
  if (!snap.exists || snap.get("tipo") !== "multa") throw new ApiError(404, "Esa multa ya no existe.");
  if (snap.get("pagado")) throw new ApiError(409, "Esa multa ya se pagó.");
  return { ref, monto: snap.get("monto") as number };
}

/** Admin: la multa se pagó; el dinero entra al fondo. */
export const PATCH = handler(async (req: Request, ctx: RouteContext<"/api/hogar/fondo/[id]">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  await adminDb().runTransaction(async (tx) => {
    const { hogarRef } = await adminActual(user.uid, tx);
    const { ref, monto } = await multaPendiente(tx, hogarRef, id);
    tx.update(ref, { pagado: true, fecha: new Date().toISOString().slice(0, 10) });
    tx.set(hogarRef, { fondo: { porCobrar: FieldValue.increment(-monto), saldo: FieldValue.increment(monto) } }, { merge: true });
  });
  return Response.json({ ok: true });
});

/** Admin: perdona una multa que no se ha pagado. */
export const DELETE = handler(async (req: Request, ctx: RouteContext<"/api/hogar/fondo/[id]">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  await adminDb().runTransaction(async (tx) => {
    const { hogarRef } = await adminActual(user.uid, tx);
    const { ref, monto } = await multaPendiente(tx, hogarRef, id);
    tx.delete(ref);
    tx.set(hogarRef, { fondo: { porCobrar: FieldValue.increment(-monto) } }, { merge: true });
  });
  return Response.json({ ok: true });
});
