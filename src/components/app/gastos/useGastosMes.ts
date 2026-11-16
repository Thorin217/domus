"use client";

import { useEffect, useMemo, useState } from "react";
import { useCompras, useGastosFijos } from "@/lib/gastos/useGastos";
import { finanzasDe, fijosDelMes, mesDe, resumenMes, sumarMeses, type Compra, type Filtro } from "@/lib/gastos/types";
import { hoyISO } from "@/lib/quehaceres/types";
import type { Hogar } from "@/lib/hogar/types";
import type { Aviso } from "../quehaceres/util";

/** Estado común de Resumen, Compras y Gastos fijos: mes, filtro, datos y resumen calculado. */
export function useGastosMes(hogar: Hogar) {
  const [hoy] = useState(hoyISO);
  const actual = mesDe(hoy);
  const [mes, setMes] = useState(actual);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [aviso, setAviso] = useState<Aviso>(null);
  const { compras, error: e1 } = useCompras(hogar.id, mes);
  const { fijos, error: e2 } = useGastosFijos(hogar.id);
  const { categorias, presupuesto } = finanzasDe(hogar);

  const delMes = useMemo(() => (compras && fijos ? fijosDelMes(fijos, compras, mes, hoy) : null), [compras, fijos, mes, hoy]);
  const resumen = useMemo(
    () => (compras && delMes ? resumenMes(compras, delMes, presupuesto, filtro) : null),
    // presupuesto se recalcula en cada render; sus datos vienen de hogar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compras, delMes, filtro, hogar.presupuesto, hogar.presupuestoMensual],
  );

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  const visibles: Compra[] | null = compras ? compras.filter((c) => filtro === "todos" || c.tipo === filtro) : null;

  return {
    hoy,
    actual,
    mes,
    cambiarMes: (d: number) => setMes((m) => sumarMeses(m, d)),
    irAMes: setMes,
    filtro,
    setFiltro,
    aviso,
    setAviso,
    compras,
    visibles,
    fijos,
    delMes,
    resumen,
    categorias,
    presupuesto,
    error: e1 ?? e2,
  };
}
