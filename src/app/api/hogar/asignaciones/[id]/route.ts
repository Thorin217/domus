import { FieldValue, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, adminActual, handler, leerJson, miembroActual, requireUser } from "@/lib/server/api";
import { aTarea, docAsignacion, noEsFuturo } from "@/lib/server/quehaceres";
import { fijaEn } from "@/lib/quehaceres/fijas";
import { esFechaISO, type EstadoTarea } from "@/lib/quehaceres/types";

const ESTADOS: EstadoTarea[] = ["pendiente", "hecho", "no_hecho"];

/**
 * Lee la asignación `${fecha}_${tareaId}`. Si no está guardada pero la cubre una asignación fija,
 * la devuelve calculada (como un cumpleaños: existe aunque nunca se haya guardado).
 */
async function leerAsignacion(tx: Transaction, hogarRef: DocumentReference, id: string) {
  const ref = hogarRef.collection("asignaciones").doc(id);
  const snap = await tx.get(ref);
  const fecha = id.slice(0, 10);
  const tareaId = id.slice(11);
  if (!esFechaISO(fecha) || id[10] !== "_" || !tareaId) throw new ApiError(404, "Esa tarea no está en el horario.");

  const tareaSnap = await tx.get(hogarRef.collection("tareas").doc(tareaId));
  const tarea = tareaSnap.exists ? aTarea(tareaSnap.id, tareaSnap.data()!) : null;
  const fija = tarea ? fijaEn(tarea, fecha) : null;

  if (snap.exists) {
    if (snap.get("estado") === "quitada") throw new ApiError(404, "Esa tarea ya no está en el horario.");
    return { ref, existe: true, datos: snap.data()!, fija };
  }
  if (!tarea || !tarea.activa || !fija) throw new ApiError(404, "Esa tarea ya no está en el horario.");
  return { ref, existe: false, datos: docAsignacion(tarea, fecha, fija.uid, true) as Record<string, unknown>, fija };
}

/**
 * Cambia una asignación.
 * - Quien la tiene asignada la marca hecha o pendiente.
 * - El admin además puede marcar "no se hizo" y pasarla a otro integrante (solo ese día).
 */
export const PATCH = handler(async (req: Request, ctx: RouteContext<"/api/hogar/asignaciones/[id]">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const body = await leerJson<{ estado: EstadoTarea; uid: string }>(req);
  const db = adminDb();

  await db.runTransaction(async (tx) => {
    const { hogarRef, integrante } = await miembroActual(user.uid, tx);
    const esAdmin = integrante.rol === "admin";
    const a = await leerAsignacion(tx, hogarRef, id);

    const cambios: Record<string, unknown> = {};

    if (body.uid !== undefined) {
      if (!esAdmin) throw new ApiError(403, "Solo el admin del hogar puede reasignar tareas.");
      if (typeof body.uid !== "string") throw new ApiError(400, "Dato inválido.");
      const destino = await tx.get(hogarRef.collection("integrantes").doc(body.uid));
      if (!destino.exists) throw new ApiError(404, "Ese integrante no está en tu hogar.");
      if (a.datos.estado !== "pendiente" && body.estado === undefined) {
        throw new ApiError(409, "Esta tarea ya se marcó. Vuelve a dejarla pendiente para reasignarla.");
      }
      cambios.uid = body.uid;
    }

    if (body.estado !== undefined) {
      if (!ESTADOS.includes(body.estado)) throw new ApiError(400, "Estado inválido.");
      const propia = a.datos.uid === user.uid;
      if (!esAdmin && !propia) throw new ApiError(403, "Solo puedes marcar tus propias tareas.");
      if (!esAdmin && body.estado === "no_hecho") throw new ApiError(403, "Solo el admin marca una tarea como no hecha.");
      if (body.estado !== "pendiente") noEsFuturo(a.datos.fecha as string);
      cambios.estado = body.estado;
      cambios.marcadoPor = body.estado === "pendiente" ? null : user.uid;
    }

    if (!Object.keys(cambios).length) throw new ApiError(400, "No hay cambios.");

    // Saldo de puntos: sale de quien la tenía hecha y entra a quien la tiene hecha ahora.
    const antes = a.datos.estado === "hecho" ? (a.datos.uid as string) : null;
    const nuevoUid = (cambios.uid ?? a.datos.uid) as string;
    const despues = (cambios.estado ?? a.datos.estado) === "hecho" ? nuevoUid : null;
    const puntos = (a.datos.puntos as number | undefined) ?? 0;
    const ajustes = new Map<string, number>();
    if (antes !== despues && puntos) {
      if (antes) ajustes.set(antes, -puntos);
      if (despues) ajustes.set(despues, (ajustes.get(despues) ?? 0) + puntos);
    }
    const fichas = await Promise.all([...ajustes.keys()].map((u) => tx.get(hogarRef.collection("integrantes").doc(u))));

    const final: Record<string, unknown> = { ...a.datos, ...cambios, actualizadoEn: FieldValue.serverTimestamp() };
    // Las notas son de la tarea hecha: si deja de estar hecha (o cambia de dueño), se borran.
    if (antes !== despues) delete final.calificaciones;
    tx.set(a.ref, final);
    for (const ficha of fichas) {
      if (ficha.exists) tx.update(ficha.ref, { puntos: FieldValue.increment(ajustes.get(ficha.id)!) });
    }
  });

  return Response.json({ ok: true });
});

/**
 * Admin: quita una tarea del horario de ese día.
 * Si ese día lo cubre una asignación fija, queda una marca "quitada" para que no vuelva a aparecer.
 */
export const DELETE = handler(async (req: Request, ctx: RouteContext<"/api/hogar/asignaciones/[id]">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const db = adminDb();

  await db.runTransaction(async (tx) => {
    const { hogarRef } = await adminActual(user.uid, tx);
    const a = await leerAsignacion(tx, hogarRef, id);
    if (a.fija) tx.set(a.ref, { ...a.datos, estado: "quitada", actualizadoEn: FieldValue.serverTimestamp() });
    else tx.delete(a.ref);
  });

  return Response.json({ ok: true });
});
