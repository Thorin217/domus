import "server-only";
import type { DocumentReference } from "firebase-admin/firestore";
import { ApiError, limpiarTexto } from "./api";
import { LIMITES_TAREAS, TODOS_LOS_DIAS, esFechaISO, sumarDias, type Fija, type Tarea } from "@/lib/quehaceres/types";

export function validarNombreTarea(v: unknown) {
  return limpiarTexto(v, LIMITES_TAREAS.nombre, "el nombre de la tarea");
}

export function validarPuntos(v: unknown) {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < LIMITES_TAREAS.puntosMin || n > LIMITES_TAREAS.puntosMax) {
    throw new ApiError(400, `Los puntos van de ${LIMITES_TAREAS.puntosMin} a ${LIMITES_TAREAS.puntosMax}.`);
  }
  return n;
}

export function validarDias(v: unknown) {
  if (v === undefined) return TODOS_LOS_DIAS;
  if (!Array.isArray(v) || !v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
    throw new ApiError(400, "Días inválidos.");
  }
  const dias = [...new Set(v as number[])].sort();
  if (!dias.length) throw new ApiError(400, "Elige al menos un día.");
  return dias;
}

/** Candidatos: uids que deben ser integrantes actuales. Vacío = todos. */
export function validarCandidatos(v: unknown, integrantes: Set<string>) {
  if (v === undefined) return [];
  if (!Array.isArray(v) || !v.every((u) => typeof u === "string")) throw new ApiError(400, "Integrantes inválidos.");
  const lista = [...new Set(v as string[])];
  if (lista.some((u) => !integrantes.has(u))) throw new ApiError(400, "Alguien de la lista ya no está en el hogar.");
  return lista.length === integrantes.size ? [] : lista;
}

export function validarFechas(v: unknown) {
  if (!Array.isArray(v) || !v.length || v.length > LIMITES_TAREAS.fechasMax || !v.every(esFechaISO)) {
    throw new ApiError(400, "Fechas inválidas.");
  }
  return [...new Set(v as string[])].sort();
}

/** Margen de zona horaria: no se puede marcar algo de más de un día en el futuro (UTC). */
export function noEsFuturo(fecha: string) {
  const manana = sumarDias(new Date().toISOString().slice(0, 10), 1);
  if (fecha > manana) throw new ApiError(400, "No puedes marcar una tarea de un día que todavía no llega.");
}

export async function uidsIntegrantes(hogarRef: DocumentReference) {
  const snap = await hogarRef.collection("integrantes").get();
  return new Set(snap.docs.map((d) => d.id));
}

export function aTarea(id: string, data: FirebaseFirestore.DocumentData): Tarea {
  return {
    id,
    nombre: data.nombre,
    puntos: data.puntos,
    dias: data.dias ?? TODOS_LOS_DIAS,
    candidatos: data.candidatos ?? [],
    activa: data.activa !== false,
    fijos: (data.fijos as Record<string, Fija> | undefined) ?? {},
  };
}

/**
 * Quita del horario las tareas pendientes de alguien que ya no está en el hogar
 * (desde ayer en UTC, para cubrir cualquier zona horaria). Lo hecho queda en el historial.
 */
export async function liberarPendientes(hogarRef: DocumentReference, uid: string) {
  // Sus asignaciones fijas dejan de existir.
  const tareas = await hogarRef.collection("tareas").get();
  for (const t of tareas.docs) {
    const fijos = (t.get("fijos") as Record<string, Fija> | undefined) ?? {};
    const quedan = Object.fromEntries(Object.entries(fijos).filter(([, f]) => f.uid !== uid));
    if (Object.keys(quedan).length !== Object.keys(fijos).length) await t.ref.update({ fijos: quedan });
  }

  // Sus votaciones abiertas (canjes y castigos) se cancelan.
  const votaciones = await hogarRef.collection("votaciones").where("objetivo", "==", uid).get();
  for (const v of votaciones.docs) {
    if (v.get("estado") === "abierta") await v.ref.update({ estado: "cancelada", motivo: "Ya no está en el hogar." });
  }

  const desde = sumarDias(new Date().toISOString().slice(0, 10), -1);
  const snap = await hogarRef.collection("asignaciones").where("uid", "==", uid).get();
  const pendientes = snap.docs.filter((d) => d.get("estado") === "pendiente" && (d.get("fecha") as string) >= desde);
  for (let i = 0; i < pendientes.length; i += 400) {
    const batch = hogarRef.firestore.batch();
    pendientes.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/** Datos de una asignación para guardar (desde la tarea y, si aplica, su regla fija). */
export function docAsignacion(t: Tarea, fecha: string, uid: string, fija: boolean) {
  return { fecha, tareaId: t.id, tarea: t.nombre, puntos: t.puntos, uid, estado: "pendiente" as const, fija };
}
