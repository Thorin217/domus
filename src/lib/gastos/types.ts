// Compras, gastos fijos y presupuesto (cliente y servidor). Todos los montos en centavos de dólar.

export type TipoCompra = "familiar" | "personal";

export type Categoria = { id: string; nombre: string };

export const CATEGORIAS_POR_DEFECTO: Categoria[] = [
  { id: "supermercado", nombre: "Supermercado" },
  { id: "vivienda", nombre: "Vivienda y servicios" },
  { id: "transporte", nombre: "Transporte" },
  { id: "colegio", nombre: "Colegio" },
  { id: "salud", nombre: "Salud" },
  { id: "ocio", nombre: "Ocio" },
  { id: "otros", nombre: "Otros" },
];

export type Presupuesto = {
  /** Tope mensual del hogar (solo cuentan compras familiares y gastos fijos). */
  total: number | null;
  /** Tope opcional por categoría. */
  porCategoria: Record<string, number>;
};

export const LIMITES_GASTOS = {
  concepto: 60,
  categoria: 30,
  categoriasMax: 20,
  montoMax: 10_000_000, // $100,000
  avisoMax: 15,
};

export type Compra = {
  id: string;
  concepto: string;
  monto: number;
  categoria: string;
  fecha: string;
  /** "2026-11": para consultar por mes. */
  mes: string;
  pagadoPor: string;
  tipo: TipoCompra;
  creadoPor: string;
  /** Si es el pago de un gasto fijo. */
  gastoFijoId: string | null;
};

export type GastoFijo = {
  id: string;
  nombre: string;
  /** Monto esperado (el real se anota al pagarlo). */
  monto: number;
  categoria: string;
  /** Día del mes en que vence (1–31; en meses cortos, el último día). */
  dia: number;
  /** Cuántos días antes se avisa. */
  avisoDias: number;
  /** Primer mes en que cuenta ("2026-11"). */
  desde: string;
  activo: boolean;
};

/** Datos del hogar para presupuesto y categorías (con valores por defecto). */
export function finanzasDe(hogar: {
  categorias?: Categoria[];
  presupuesto?: Partial<Presupuesto>;
  presupuestoMensual?: number | null;
}) {
  const categorias = hogar.categorias?.length ? hogar.categorias : CATEGORIAS_POR_DEFECTO;
  const viejo = hogar.presupuestoMensual != null ? Math.round(hogar.presupuestoMensual * 100) : null;
  const presupuesto: Presupuesto = {
    total: hogar.presupuesto ? (hogar.presupuesto.total ?? null) : viejo,
    porCategoria: hogar.presupuesto?.porCategoria ?? {},
  };
  return { categorias, presupuesto };
}

// ---------- Fechas por mes ----------

export function mesDe(fecha: string) {
  return fecha.slice(0, 7);
}

export function esMes(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

export function sumarMeses(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function diasDelMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

/** Fecha de vencimiento de un gasto fijo en un mes (31 en febrero → 28/29). */
export function vencimiento(dia: number, mes: string) {
  return `${mes}-${String(Math.min(dia, diasDelMes(mes))).padStart(2, "0")}`;
}

/** Id de la compra que paga un gasto fijo en un mes: un solo pago por mes. */
export function idPagoFijo(gastoFijoId: string, mes: string) {
  return `fijo_${gastoFijoId}_${mes}`;
}

const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "noviembre 2026" / "noviembre". */
export function nombreMes(mes: string, conAnio = true) {
  const [a, m] = mes.split("-").map(Number);
  return conAnio ? `${MESES_LARGOS[m - 1]} ${a}` : MESES_LARGOS[m - 1];
}

/** Días entre dos fechas ISO (b − a). */
export function diasEntre(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

// ---------- Estado de un gasto fijo en un mes ----------

export type EstadoFijo =
  | { tipo: "pagado"; compra: Compra }
  | { tipo: "atrasado"; dias: number }
  | { tipo: "pronto"; dias: number } // dentro del aviso
  | { tipo: "pendiente"; dias: number };

/** Gastos fijos que cuentan en un mes: activos desde ese mes, o ya pagados en él. */
export function fijosDelMes(fijos: GastoFijo[], compras: Compra[], mes: string, hoy: string) {
  const pagos = new Map(compras.filter((c) => c.gastoFijoId).map((c) => [c.gastoFijoId!, c]));
  return fijos
    .filter((f) => pagos.has(f.id) || (f.activo && f.desde <= mes))
    .map((f) => {
      const vence = vencimiento(f.dia, mes);
      const compra = pagos.get(f.id);
      const dias = diasEntre(hoy, vence);
      const estado: EstadoFijo = compra
        ? { tipo: "pagado", compra }
        : dias < 0
          ? { tipo: "atrasado", dias: -dias }
          : dias <= f.avisoDias
            ? { tipo: "pronto", dias }
            : { tipo: "pendiente", dias };
      return { fijo: f, vence, estado, monto: compra ? compra.monto : f.monto };
    })
    .sort((a, b) => a.vence.localeCompare(b.vence) || a.fijo.nombre.localeCompare(b.fijo.nombre, "es"));
}

export type FijoDelMes = ReturnType<typeof fijosDelMes>[number];

/** "Vence hoy" · "En 2 días" · "Venció hace 3 días" · "Pagado el 14 nov". */
export function textoVence(f: FijoDelMes) {
  const e = f.estado;
  if (e.tipo === "pagado") return "Pagado";
  if (e.tipo === "atrasado") return e.dias === 1 ? "Venció ayer" : `Venció hace ${e.dias} días`;
  if (e.dias === 0) return "Vence hoy";
  if (e.dias === 1) return "Vence mañana";
  return `En ${e.dias} días`;
}

// ---------- Resumen del mes ----------

export type Filtro = "todos" | TipoCompra;

export function resumenMes(compras: Compra[], fijos: FijoDelMes[], presupuesto: Presupuesto, filtro: Filtro) {
  const diaADia = compras.filter((c) => !c.gastoFijoId && (filtro === "todos" || c.tipo === filtro));
  const fijosVisibles = filtro === "personal" ? [] : fijos;
  const totalFijos = fijosVisibles.reduce((s, f) => s + f.monto, 0);
  const totalDiaADia = diaADia.reduce((s, c) => s + c.monto, 0);

  // Presupuesto: siempre con lo familiar (las personales no cuentan), sin importar el filtro.
  const familiares = compras.filter((c) => !c.gastoFijoId && c.tipo === "familiar").reduce((s, c) => s + c.monto, 0);
  const comprometido = familiares + fijos.reduce((s, f) => s + f.monto, 0);

  const porCategoria = new Map<string, number>();
  const porCategoriaFamiliar = new Map<string, number>();
  for (const c of diaADia) porCategoria.set(c.categoria, (porCategoria.get(c.categoria) ?? 0) + c.monto);
  for (const f of fijosVisibles) porCategoria.set(f.fijo.categoria, (porCategoria.get(f.fijo.categoria) ?? 0) + f.monto);
  for (const c of compras.filter((c) => !c.gastoFijoId && c.tipo === "familiar")) {
    porCategoriaFamiliar.set(c.categoria, (porCategoriaFamiliar.get(c.categoria) ?? 0) + c.monto);
  }
  for (const f of fijos) porCategoriaFamiliar.set(f.fijo.categoria, (porCategoriaFamiliar.get(f.fijo.categoria) ?? 0) + f.monto);

  // Por integrante: lo que cada quien pagó (compras y gastos fijos pagados).
  const porIntegrante = new Map<string, number>();
  for (const c of compras.filter((c) => filtro === "todos" || c.tipo === filtro)) {
    porIntegrante.set(c.pagadoPor, (porIntegrante.get(c.pagadoPor) ?? 0) + c.monto);
  }

  return {
    total: totalFijos + totalDiaADia,
    totalFijos,
    fijosPagados: fijosVisibles.filter((f) => f.estado.tipo === "pagado").length,
    fijosCantidad: fijosVisibles.length,
    totalDiaADia,
    cantidadDiaADia: diaADia.length,
    comprometido,
    disponible: presupuesto.total != null ? presupuesto.total - comprometido : null,
    porCategoria,
    porCategoriaFamiliar,
    porIntegrante,
  };
}

// ---------- Formato ----------

const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Centavos → "$1,284.50" (siempre con centavos, como en el diseño). */
export function moneda(centavos: number) {
  return (centavos < 0 ? "−" : "") + usd2.format(Math.abs(centavos) / 100);
}

/** "48.20" / "48,20" / "$1,284.50" → centavos, o null si no es válido. */
export function leerMonto(texto: string) {
  let t = texto.replace(/[$\s]/g, "");
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(t)) t = t.replace(/,/g, "");
  else t = t.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const c = Math.round(Number(t) * 100);
  return c > 0 ? c : null;
}
