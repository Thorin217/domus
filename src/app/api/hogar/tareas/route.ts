import { FieldValue } from "firebase-admin/firestore";
import { ApiError, adminActual, handler, leerJson, requireUser } from "@/lib/server/api";
import { uidsIntegrantes, validarCandidatos, validarDias, validarNombreTarea, validarPuntos } from "@/lib/server/quehaceres";
import { LIMITES_TAREAS } from "@/lib/quehaceres/types";

/** Admin: crea una tarea en el catálogo del hogar. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser(req);
  const body = await leerJson<{ nombre: string; puntos: number; dias: number[]; candidatos: string[] }>(req);
  const { hogarRef } = await adminActual(user.uid);

  const nombre = validarNombreTarea(body.nombre);
  const puntos = validarPuntos(body.puntos);
  const dias = validarDias(body.dias);
  const candidatos = validarCandidatos(body.candidatos, await uidsIntegrantes(hogarRef));

  const tareas = hogarRef.collection("tareas");
  const existentes = await tareas.get();
  if (existentes.size >= LIMITES_TAREAS.tareasMax) throw new ApiError(409, `Máximo ${LIMITES_TAREAS.tareasMax} tareas por hogar.`);
  if (existentes.docs.some((d) => (d.get("nombre") as string).toLowerCase() === nombre.toLowerCase())) {
    throw new ApiError(409, "Ya existe una tarea con ese nombre.");
  }

  const ref = await tareas.add({ nombre, puntos, dias, candidatos, activa: true, creadoEn: FieldValue.serverTimestamp() });
  return Response.json({ id: ref.id });
});
