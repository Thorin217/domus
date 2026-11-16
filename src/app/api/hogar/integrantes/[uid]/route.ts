import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, adminActual, handler, leerJson, limpiarTexto, miembroActual, requireUser } from "@/lib/server/api";
import { LIMITES, type Rol } from "@/lib/hogar/types";
import { liberarPendientes } from "@/lib/server/quehaceres";

/**
 * Cambia nombre y/o rol de un integrante.
 * - Cualquiera puede cambiar su propio nombre.
 * - Solo un admin cambia nombres de otros y roles.
 */
export const PATCH = handler(async (req: Request, ctx: RouteContext<"/api/hogar/integrantes/[uid]">) => {
  const user = await requireUser(req);
  const { uid } = await ctx.params;
  const body = await leerJson<{ nombre: string; rol: Rol }>(req);
  const db = adminDb();

  await db.runTransaction(async (tx) => {
    const propio = uid === user.uid;
    const necesitaAdmin = !propio || body.rol !== undefined;
    const { hogarRef } = necesitaAdmin ? await adminActual(user.uid, tx) : await miembroActual(user.uid, tx);

    const ref = hogarRef.collection("integrantes").doc(uid);
    const objetivo = await tx.get(ref);
    if (!objetivo.exists) throw new ApiError(404, "Ese integrante no está en tu hogar.");

    const cambios: Record<string, unknown> = {};
    if (body.nombre !== undefined) cambios.nombre = limpiarTexto(body.nombre, LIMITES.nombre, "el nombre");
    if (body.rol !== undefined) {
      if (body.rol !== "admin" && body.rol !== "miembro") throw new ApiError(400, "Rol inválido.");
      if (body.rol === "miembro" && objetivo.get("rol") === "admin") {
        const admins = await tx.get(hogarRef.collection("integrantes").where("rol", "==", "admin"));
        if (admins.size <= 1) throw new ApiError(409, "El hogar necesita al menos un admin.");
      }
      cambios.rol = body.rol;
    }
    if (!Object.keys(cambios).length) throw new ApiError(400, "No hay cambios.");

    tx.update(ref, cambios);
    if (propio && cambios.nombre) tx.set(db.collection("usuarios").doc(uid), { nombre: cambios.nombre }, { merge: true });
  });

  return Response.json({ ok: true });
});

/** Admin: quita a un integrante del hogar. Para salir uno mismo se usa /api/hogar/salir. */
export const DELETE = handler(async (req: Request, ctx: RouteContext<"/api/hogar/integrantes/[uid]">) => {
  const user = await requireUser(req);
  const { uid } = await ctx.params;
  if (uid === user.uid) throw new ApiError(400, "Para salir del hogar usa “Salir del hogar”.");
  const db = adminDb();

  const hogarRef = await db.runTransaction(async (tx) => {
    const { hogarRef } = await adminActual(user.uid, tx);
    const ref = hogarRef.collection("integrantes").doc(uid);
    const [objetivo, hogar] = await Promise.all([tx.get(ref), tx.get(hogarRef)]);
    if (!objetivo.exists) throw new ApiError(404, "Ese integrante no está en tu hogar.");

    tx.delete(ref);
    tx.update(hogarRef, { integrantes: Math.max(1, (hogar.get("integrantes") as number) - 1) });
    tx.set(db.collection("usuarios").doc(uid), { hogarId: null }, { merge: true });
    return hogarRef;
  });

  await liberarPendientes(hogarRef, uid);
  return Response.json({ ok: true });
});
