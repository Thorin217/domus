import { ApiError, adminActual, handler, leerJson, requireUser } from "@/lib/server/api";
import { uidsIntegrantes, validarCandidatos, validarDias, validarNombreTarea, validarPuntos } from "@/lib/server/quehaceres";
import { diaSemana, esFechaISO, type Fija } from "@/lib/quehaceres/types";

/** Admin: edita una tarea. Los cambios aplican a lo que se asigne de aquí en adelante. */
export const PATCH = handler(async (req: Request, ctx: RouteContext<"/api/hogar/tareas/[id]">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const body = await leerJson<{
    nombre: string;
    puntos: number;
    dias: number[];
    candidatos: string[];
    activa: boolean;
    /** Días de la semana ("0"…"6") cuya asignación fija se quita, desde `hoy`. */
    quitarFijos: string[];
    hoy: string;
  }>(req);
  const { db, hogarRef } = await adminActual(user.uid);

  const ref = hogarRef.collection("tareas").doc(id);
  const actual = await ref.get();
  if (!actual.exists) throw new ApiError(404, "Esa tarea ya no existe.");

  const cambios: Record<string, unknown> = {};
  if (body.nombre !== undefined) {
    const nombre = validarNombreTarea(body.nombre);
    const otras = await hogarRef.collection("tareas").get();
    if (otras.docs.some((d) => d.id !== id && (d.get("nombre") as string).toLowerCase() === nombre.toLowerCase())) {
      throw new ApiError(409, "Ya existe una tarea con ese nombre.");
    }
    cambios.nombre = nombre;
  }
  if (body.puntos !== undefined) cambios.puntos = validarPuntos(body.puntos);
  if (body.dias !== undefined) cambios.dias = validarDias(body.dias);
  if (body.candidatos !== undefined) cambios.candidatos = validarCandidatos(body.candidatos, await uidsIntegrantes(hogarRef));
  if (body.activa !== undefined) {
    if (typeof body.activa !== "boolean") throw new ApiError(400, "Dato inválido.");
    cambios.activa = body.activa;
  }
  let limpiar: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  if (body.quitarFijos !== undefined) {
    if (!Array.isArray(body.quitarFijos) || !esFechaISO(body.hoy)) throw new ApiError(400, "Datos inválidos.");
    const quitar = new Set(body.quitarFijos.map(String));
    const fijos = { ...((actual.get("fijos") as Record<string, Fija> | undefined) ?? {}) };
    for (const d of quitar) delete fijos[d];
    cambios.fijos = fijos;
    // Lo pendiente que venía de esa fija, de hoy en adelante, sale del horario.
    const guardadas = await hogarRef.collection("asignaciones").where("tareaId", "==", id).get();
    limpiar = guardadas.docs.filter(
      (d) =>
        quitar.has(String(diaSemana(d.get("fecha") as string))) &&
        (d.get("fecha") as string) >= body.hoy! &&
        (d.get("estado") === "quitada" || (d.get("estado") === "pendiente" && d.get("fija") === true)),
    );
  }
  if (!Object.keys(cambios).length) throw new ApiError(400, "No hay cambios.");

  const batch = db.batch();
  batch.update(ref, cambios);
  limpiar.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return Response.json({ ok: true });
});

/**
 * Admin: borra una tarea del catálogo y sus asignaciones pendientes desde `desde` (hoy del dispositivo).
 * Lo ya hecho queda en el historial.
 */
export const DELETE = handler(async (req: Request, ctx: RouteContext<"/api/hogar/tareas/[id]">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const desde = new URL(req.url).searchParams.get("desde");
  if (!esFechaISO(desde)) throw new ApiError(400, "Fecha inválida.");
  const { db, hogarRef } = await adminActual(user.uid);

  const ref = hogarRef.collection("tareas").doc(id);
  if (!(await ref.get()).exists) throw new ApiError(404, "Esa tarea ya no existe.");

  const pendientes = await hogarRef
    .collection("asignaciones")
    .where("tareaId", "==", id)
    .get();
  const batch = db.batch();
  for (const d of pendientes.docs) {
    const estado = d.get("estado");
    if ((estado === "pendiente" && (d.get("fecha") as string) >= desde) || estado === "quitada") batch.delete(d.ref);
  }
  batch.delete(ref);
  await batch.commit();

  return Response.json({ ok: true });
});
