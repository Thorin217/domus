"use client";

import { useMemo } from "react";
import type { Integrante } from "@/lib/hogar/types";
import { DIAS_NOMBRE, diaSemana, mesCorto, numeroDia } from "@/lib/quehaceres/types";

export type Aviso = { tipo: "ok" | "error"; texto: string } | null;

/** "lunes 9 nov" */
export function fechaLarga(iso: string) {
  return `${DIAS_NOMBRE[diaSemana(iso)]} ${numeroDia(iso)} ${mesCorto(iso)}`;
}

/** Datos de un integrante por uid (si ya no está en el hogar, un genérico). */
export function usePersonas(integrantes: Integrante[]) {
  return useMemo(() => {
    const mapa = new Map(integrantes.map((i) => [i.uid, i]));
    return (uid: string): Pick<Integrante, "nombre" | "color"> => mapa.get(uid) ?? { nombre: "Ya no está", color: 0 };
  }, [integrantes]);
}
