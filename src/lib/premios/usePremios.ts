"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { ItemCatalogo, Movimiento, Votacion } from "./types";

function useColeccion<T>(hogarId: string, nombre: string, mensaje: string, max?: number) {
  const [estado, setEstado] = useState<{ clave: string; lista: T[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clave = `${hogarId}|${nombre}`;

  useEffect(() => {
    const ref = collection(getDb(), "hogares", hogarId, nombre);
    const q = max ? query(ref, orderBy("creadoEn", "desc"), limit(max)) : query(ref, orderBy("creadoEn", "desc"));
    return onSnapshot(
      q,
      (s) => setEstado({ clave: `${hogarId}|${nombre}`, lista: s.docs.map((d) => ({ id: d.id, ...d.data() }) as T) }),
      () => setError(mensaje),
    );
  }, [hogarId, nombre, mensaje, max]);

  return { lista: estado?.clave === clave ? estado.lista : null, error };
}

/** Premios y castigos del hogar (todos los estados), más nuevos primero. */
export function useCatalogo(hogarId: string) {
  return useColeccion<ItemCatalogo>(hogarId, "catalogo", "No pudimos cargar los premios y castigos.");
}

/** Últimas votaciones (abiertas y cerradas). */
export function useVotaciones(hogarId: string) {
  return useColeccion<Votacion>(hogarId, "votaciones", "No pudimos cargar las votaciones.", 60);
}

/** Últimos movimientos del fondo familiar. */
export function useMovimientos(hogarId: string) {
  return useColeccion<Movimiento>(hogarId, "fondo", "No pudimos cargar el fondo.", 40);
}

/** Todas las multas (pagadas y por cobrar), para lo recolectado y lo pendiente. */
export function useMultas(hogarId: string) {
  const [estado, setEstado] = useState<{ clave: string; lista: Movimiento[] } | null>(null);
  useEffect(() => {
    const q = query(collection(getDb(), "hogares", hogarId, "fondo"), where("tipo", "==", "multa"));
    return onSnapshot(
      q,
      (s) => setEstado({ clave: hogarId, lista: s.docs.map((d) => ({ id: d.id, ...d.data() }) as Movimiento) }),
      () => setEstado({ clave: hogarId, lista: [] }),
    );
  }, [hogarId]);
  return estado?.clave === hogarId ? estado.lista : null;
}

/** Hora actual que se actualiza cada minuto (para plazos). */
export function useAhora() {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}
