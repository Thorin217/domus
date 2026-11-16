"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Compra, GastoFijo } from "./types";

/** Compras de un mes (incluye pagos de gastos fijos), más recientes primero. */
export function useCompras(hogarId: string, mes: string) {
  const [estado, setEstado] = useState<{ clave: string; lista: Compra[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clave = `${hogarId}|${mes}`;

  useEffect(() => {
    const q = query(collection(getDb(), "hogares", hogarId, "compras"), where("mes", "==", mes));
    return onSnapshot(
      q,
      (s) => {
        const lista = s.docs.map((d) => ({ id: d.id, gastoFijoId: null, ...d.data() }) as Compra);
        lista.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.concepto.localeCompare(b.concepto, "es"));
        setEstado({ clave: `${hogarId}|${mes}`, lista });
      },
      () => setError("No pudimos cargar las compras."),
    );
  }, [hogarId, mes]);

  return { compras: estado?.clave === clave ? estado.lista : null, error };
}

/** Todos los gastos fijos del hogar. */
export function useGastosFijos(hogarId: string) {
  const [estado, setEstado] = useState<{ clave: string; lista: GastoFijo[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      collection(getDb(), "hogares", hogarId, "gastosFijos"),
      (s) =>
        setEstado({
          clave: hogarId,
          lista: s.docs.map((d) => ({ id: d.id, avisoDias: 3, activo: true, ...d.data() }) as GastoFijo),
        }),
      () => setError("No pudimos cargar los gastos fijos."),
    );
  }, [hogarId]);

  return { fijos: estado?.clave === hogarId ? estado.lista : null, error };
}
