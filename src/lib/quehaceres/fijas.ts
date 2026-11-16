import { diaSemana, idAsignacion, type Asignacion, type AsignacionGuardada, type Fija, type Tarea } from "./types";

/** La regla fija que cubre esa tarea en esa fecha, si hay. */
export function fijaEn(t: Tarea, fecha: string): Fija | null {
  const f = t.fijos[String(diaSemana(fecha))];
  return f && fecha >= f.desde ? f : null;
}

/**
 * Horario de unas fechas: lo guardado manda; donde no hay nada guardado y hay una regla fija,
 * se calcula la asignación (como un cumpleaños: no hace falta guardarla para que exista).
 * Las marcas "quitada" ocultan ese día.
 */
export function horarioDe(fechas: string[], tareas: Tarea[], guardadas: AsignacionGuardada[]): Asignacion[] {
  const porId = new Map(guardadas.map((g) => [g.id, g]));
  const lista: Asignacion[] = [];

  for (const g of guardadas) {
    if (g.estado !== "quitada") lista.push(g as Asignacion);
  }
  for (const fecha of fechas) {
    for (const t of tareas) {
      if (!t.activa) continue;
      const f = fijaEn(t, fecha);
      if (!f) continue;
      const id = idAsignacion(fecha, t.id);
      if (porId.has(id)) continue;
      lista.push({ id, fecha, tareaId: t.id, tarea: t.nombre, puntos: t.puntos, uid: f.uid, estado: "pendiente", fija: true, virtual: true });
    }
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.tarea.localeCompare(b.tarea, "es"));
}
