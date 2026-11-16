import { diaSemana, idAsignacion, sumarDias, type EstadoGuardado, type Tarea } from "./types";

/** `fija`: viene de una asignación fija y nunca se reparte. "quitada": el admin vació ese día a propósito. */
type Existente = { uid: string; estado: EstadoGuardado; puntos: number; fija?: boolean };

export type Reparto = { fecha: string; tareaId: string; uid: string };

/**
 * Reparte al azar las tareas de unas fechas entre los integrantes.
 *
 * Reglas:
 * - Cada tarea se asigna una sola vez por día (una persona por tarea y día).
 * - Solo se reparte en los días de la semana configurados en la tarea y entre sus candidatos.
 * - La carga (puntos) queda pareja: gana quien lleva menos puntos en el período.
 * - Se evita que alguien acumule varias tareas el mismo día si hay a quién más dárselas.
 * - Se evita repetir la misma tarea a la misma persona dos días seguidos.
 * - Lo ya hecho o marcado, las fijas y los días quitados nunca se tocan; lo pendiente solo se rehace si `reemplazar`.
 */
export function repartir({
  fechas,
  tareas,
  miembros,
  existentes,
  reemplazar,
  aleatorio = Math.random,
}: {
  fechas: string[];
  tareas: Tarea[];
  miembros: string[];
  /** Asignaciones ya guardadas (incluye el día anterior a la primera fecha), por id `${fecha}_${tareaId}`. */
  existentes: Map<string, Existente>;
  reemplazar: boolean;
  aleatorio?: () => number;
}): Reparto[] {
  const resultado: Reparto[] = [];
  if (!miembros.length) return resultado;

  const ordenadas = [...new Set(fechas)].sort();
  const enPeriodo = new Set(ordenadas);
  const quien = new Map<string, string>(); // id asignación → uid (lo que queda al final)
  const carga = new Map<string, number>(miembros.map((m) => [m, 0]));

  const seConserva = (e: Existente | undefined) => !!e && (e.fija || e.estado !== "pendiente" || !reemplazar);

  // Lo que se conserva cuenta para la carga y para "ayer".
  for (const [id, e] of existentes) {
    const fecha = id.slice(0, 10);
    if (enPeriodo.has(fecha) && !seConserva(e)) continue;
    if (e.estado === "quitada") continue;
    quien.set(id, e.uid);
    if (enPeriodo.has(fecha) && carga.has(e.uid)) carga.set(e.uid, carga.get(e.uid)! + e.puntos);
  }

  for (const fecha of ordenadas) {
    const dow = diaSemana(fecha);
    const delDia = tareas.filter((t) => t.activa && t.dias.includes(dow));

    const cargaDia = new Map<string, number>(miembros.map((m) => [m, 0]));
    for (const t of delDia) {
      const uid = seConserva(existentes.get(idAsignacion(fecha, t.id))) ? quien.get(idAsignacion(fecha, t.id)) : undefined;
      if (uid && cargaDia.has(uid)) cargaDia.set(uid, cargaDia.get(uid)! + 1);
    }

    const pendientes = delDia
      .filter((t) => !seConserva(existentes.get(idAsignacion(fecha, t.id))))
      .map((t) => ({ t, orden: aleatorio() }))
      // Primero las tareas con menos candidatos (más difíciles de ubicar); el resto en orden aleatorio.
      .sort((a, b) => candidatos(a.t, miembros).length - candidatos(b.t, miembros).length || a.orden - b.orden)
      .map((x) => x.t);

    for (const t of pendientes) {
      const opciones = candidatos(t, miembros);
      if (!opciones.length) continue;
      const ayer = quien.get(idAsignacion(sumarDias(fecha, -1), t.id));

      let mejor = opciones[0];
      let mejorPuntaje = Infinity;
      for (const uid of opciones) {
        const puntaje =
          carga.get(uid)! +
          cargaDia.get(uid)! * 12 +
          (uid === ayer && opciones.length > 1 ? 1000 : 0) +
          aleatorio() * 4; // desempate al azar
        if (puntaje < mejorPuntaje) {
          mejorPuntaje = puntaje;
          mejor = uid;
        }
      }

      quien.set(idAsignacion(fecha, t.id), mejor);
      carga.set(mejor, carga.get(mejor)! + t.puntos);
      cargaDia.set(mejor, cargaDia.get(mejor)! + 1);
      resultado.push({ fecha, tareaId: t.id, uid: mejor });
    }
  }

  return resultado;
}

function candidatos(t: Tarea, miembros: string[]) {
  return t.candidatos.length ? miembros.filter((m) => t.candidatos.includes(m)) : miembros;
}
