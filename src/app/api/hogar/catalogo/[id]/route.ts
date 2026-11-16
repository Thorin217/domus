import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, adminActual, handler, requireUser } from "@/lib/server/api";

/** Admin: archiva un premio o castigo (deja de ofrecerse; lo ya canjeado queda en el historial). */
export const DELETE = handler(async (req: Request, ctx: RouteContext<"/api/hogar/catalogo/[id]">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const db = adminDb();

  await db.runTransaction(async (tx) => {
    const { hogarRef } = await adminActual(user.uid, tx);
    const ref = hogarRef.collection("catalogo").doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "Ese premio o castigo ya no existe.");
    if (snap.get("estado") !== "aprobado") throw new ApiError(409, "Solo se archiva lo que ya está aprobado.");
    tx.update(ref, { estado: "archivado" });
  });

  return Response.json({ ok: true });
});
