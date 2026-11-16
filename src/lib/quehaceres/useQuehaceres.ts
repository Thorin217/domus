"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { TODOS_LOS_DIAS, type AsignacionGuardada, type Tarea } from "./types";

/** Catálogo de tareas del hogar en tiempo real. */
export function useTareas(hogarId: string) {
  const [tareas, setTareas] = useState<Tarea[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      collection(getDb(), "hogares", hogarId, "tareas"),
      (s) => {
        const lista = s.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            nombre: x.nombre,
            puntos: x.puntos,
            dias: x.dias ?? TODOS_LOS_DIAS,
            candidatos: x.candidatos ?? [],
            activa: x.activa !== false,
            fijos: x.fijos ?? {},
          } satisfies Tarea;
        });
        lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
        setTareas(lista);
      },
      () => setError("No pudimos cargar las tareas."),
    );
  }, [hogarId]);

  return { tareas, error };
}

/** Asignaciones guardadas entre dos fechas (inclusive) en tiempo real. Las fijas se suman con `horarioDe`. */
export function useAsignaciones(hogarId: string, desde: string, hasta: string) {
  const [estado, setEstado] = useState<{ clave: string; lista: AsignacionGuardada[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clave = `${hogarId}|${desde}|${hasta}`;

  useEffect(() => {
    const q = query(
      collection(getDb(), "hogares", hogarId, "asignaciones"),
      where("fecha", ">=", desde),
      where("fecha", "<=", hasta),
    );
    return onSnapshot(
      q,
      (s) => {
        const lista = s.docs.map((d) => ({ id: d.id, ...d.data() }) as AsignacionGuardada);
        lista.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.tarea.localeCompare(b.tarea, "es"));
        setEstado({ clave: `${hogarId}|${desde}|${hasta}`, lista });
      },
      () => setError("No pudimos cargar el horario."),
    );
  }, [hogarId, desde, hasta]);

  // Mientras llega la semana nueva no se muestra la anterior.
  return { guardadas: estado?.clave === clave ? estado.lista : null, error };
}
