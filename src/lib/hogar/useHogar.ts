"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Hogar, Integrante } from "./types";

/** Hogar e integrantes en tiempo real. */
export function useHogar(hogarId: string | null | undefined) {
  const [hogar, setHogar] = useState<Hogar | null>(null);
  const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hogarId) return;
    const db = getDb();
    let listos = 0;
    const listo = () => ++listos >= 2 && setCargando(false);
    const fallo = () => {
      setError("No pudimos cargar tu hogar.");
      setCargando(false);
    };

    const a = onSnapshot(
      doc(db, "hogares", hogarId),
      (s) => {
        setHogar(s.exists() ? ({ id: s.id, ...s.data() } as Hogar) : null);
        listo();
      },
      fallo,
    );
    const b = onSnapshot(
      query(collection(db, "hogares", hogarId, "integrantes"), orderBy("unidoEn")),
      (s) => {
        setIntegrantes(s.docs.map((d) => ({ uid: d.id, ...d.data() }) as Integrante));
        listo();
      },
      fallo,
    );
    return () => {
      a();
      b();
    };
  }, [hogarId]);

  return { hogar, integrantes, cargando: hogarId ? cargando : false, error };
}
