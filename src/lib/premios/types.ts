// Premios y castigos: reglas, catálogo, votaciones y fondo familiar (cliente y servidor).

import type { Asignacion } from "@/lib/quehaceres/types";

// ---------- Reglas del hogar (las configura el admin) ----------

export type ModoVotacion = "mayoria" | "todos";

export type Reglas = {
  /** Promedio semanal mínimo para poder canjear un premio. */
  umbralPremio: number;
  /** Por debajo de este promedio semanal se puede proponer un castigo. */
  umbralCastigo: number;
  /** Mayoría simple o todos de acuerdo. */
  votacion: ModoVotacion;
  /** Las tareas que no se hicieron cuentan como 1 estrella en el promedio. */
  noHechoCuentaComoUno: boolean;
  /** Cuántos premios puede canjear cada integrante por semana. */
  canjesPorSemana: number;
  /** Lo que se propone al catálogo pasa por votación (si no, solo el admin agrega y queda aprobado). */
  catalogoConVoto: boolean;
  /** Nombre y meta del fondo familiar. */
  fondoNombre: string;
  fondoMeta: number | null;
  /** Gastar del fondo requiere votación de la familia. */
  gastoConVoto: boolean;
};

export const REGLAS_POR_DEFECTO: Reglas = {
  umbralPremio: 4,
  umbralCastigo: 2.5,
  votacion: "mayoria",
  noHechoCuentaComoUno: true,
  canjesPorSemana: 1,
  catalogoConVoto: true,
  fondoNombre: "Ahorro para salidas",
  fondoMeta: null,
  gastoConVoto: false,
};

export function reglasDe(guardadas: Partial<Reglas> | undefined | null): Reglas {
  return { ...REGLAS_POR_DEFECTO, ...(guardadas ?? {}) };
}

export const LIMITES_PREMIOS = {
  nombre: 40,
  descripcion: 120,
  comentario: 140,
  puntosMax: 10_000,
  /** Montos en centavos de dólar. */
  montoMax: 100_000,
  fondoMax: 100_000_000,
  canjesMax: 7,
  motivo: 200,
  defensa: 300,
};

/** Tiempo que tiene el acusado para defenderse antes de que se cuenten los votos. */
export const PLAZO_DEFENSA_MS = 48 * 60 * 60 * 1000;

// ---------- Catálogo ----------

export type TipoItem = "premio" | "castigo";
export type EstadoItem = "propuesto" | "aprobado" | "rechazado" | "archivado";

export type ItemCatalogo = {
  id: string;
  tipo: TipoItem;
  nombre: string;
  descripcion: string;
  /** Premio: cuánto cuesta en puntos. */
  puntos: number | null;
  /** Castigo: multa en centavos de dólar que va al fondo familiar (null = sin multa). */
  monto: number | null;
  estado: EstadoItem;
  propuestoPor: string;
};

// ---------- Votaciones ----------

export type TipoVotacion = "catalogo" | "canje" | "castigo" | "acusacion" | "gasto";
export type EstadoVotacion = "abierta" | "aprobada" | "rechazada" | "cancelada";
export type Voto = "si" | "no";

export type Votacion = {
  id: string;
  tipo: TipoVotacion;
  estado: EstadoVotacion;
  /** A quién afecta (canje / castigo): no vota en su propia votación. */
  objetivo: string | null;
  itemId: string | null;
  titulo: string;
  detalle: string;
  puntos: number | null;
  monto: number | null;
  /** Lunes de la semana evaluada (canje / castigo). */
  semana: string | null;
  votos: Record<string, Voto>;
  /** Por qué se rechazó sola (sin puntos o sin saldo al aprobarse). */
  motivo?: string | null;
  /** Acusación: qué hizo y hasta cuándo puede defenderse (ms). */
  acusacion?: { motivo: string; plazo: number } | null;
  /** Lo que respondió el acusado. */
  defensa?: { texto: string } | null;
  /** El acusado aceptó el castigo sin votación. */
  aceptada?: boolean;
  creadoPor: string;
};

/** Quiénes votan: todos menos el afectado. */
export function votantes(v: Pick<Votacion, "objetivo">, integrantes: string[]) {
  return integrantes.filter((u) => u !== v.objetivo);
}

/** Resultado con los votos actuales, o null si todavía no se decide. */
export function resultado(votos: Record<string, Voto>, elegibles: string[], modo: ModoVotacion): "aprobada" | "rechazada" | null {
  const n = elegibles.length;
  if (n === 0) return "aprobada";
  const si = elegibles.filter((u) => votos[u] === "si").length;
  const no = elegibles.filter((u) => votos[u] === "no").length;
  if (modo === "todos") {
    if (no > 0) return "rechazada";
    return si === n ? "aprobada" : null;
  }
  if (si * 2 > n) return "aprobada";
  if (no * 2 >= n) return "rechazada";
  return null;
}

// ---------- Fondo familiar ----------

export type TipoMovimiento = "multa" | "aporte" | "gasto";

export type Movimiento = {
  id: string;
  tipo: TipoMovimiento;
  /** Centavos. */
  monto: number;
  descripcion: string;
  /** Multa: quién la paga. Aporte: quién aporta. */
  uid: string | null;
  /** Multas: si ya se puso el dinero en el fondo. */
  pagado: boolean;
  /** Fecha UTC (respaldo); para mostrar se usa `creadoEn` en la hora local. */
  fecha: string;
  creadoEn?: { toDate: () => Date } | null;
};

/** Saldo en caja y multas por cobrar, en centavos. */
export type Fondo = { saldo: number; porCobrar: number };

// ---------- Promedio semanal ----------

export type Calificacion = { estrellas: number; comentario: string };

/** Asignación guardada con sus calificaciones (uid de quien califica → nota). */
export type AsignacionCalificada = Asignacion & { calificaciones?: Record<string, Calificacion> };

/**
 * Promedio de estrellas de un integrante en un conjunto de asignaciones (normalmente una semana).
 * Cuentan las notas que otros dieron a sus tareas hechas; si la regla lo dice, cada tarea no hecha vale 1.
 */
export function promedioDe(uid: string, asignaciones: AsignacionCalificada[], reglas: Pick<Reglas, "noHechoCuentaComoUno">) {
  const notas: number[] = [];
  for (const a of asignaciones) {
    if (a.uid !== uid) continue;
    if (a.estado === "hecho") {
      for (const [quien, c] of Object.entries(a.calificaciones ?? {})) if (quien !== uid) notas.push(c.estrellas);
    } else if (a.estado === "no_hecho" && reglas.noHechoCuentaComoUno) {
      notas.push(1);
    }
  }
  if (!notas.length) return { promedio: null as number | null, notas: 0 };
  const promedio = Math.round((notas.reduce((s, n) => s + n, 0) / notas.length) * 10) / 10;
  return { promedio, notas: notas.length };
}

export type EstadoSemana = "premio" | "castigo" | "normal" | "sin_notas";

export function estadoSemana(promedio: number | null, reglas: Pick<Reglas, "umbralPremio" | "umbralCastigo">): EstadoSemana {
  if (promedio === null) return "sin_notas";
  if (promedio >= reglas.umbralPremio) return "premio";
  if (promedio < reglas.umbralCastigo) return "castigo";
  return "normal";
}

const usd = new Intl.NumberFormat("es-US", { style: "currency", currency: "USD" });
const usdEntero = new Intl.NumberFormat("es-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Centavos → "$1" o "$2.50". */
export function dinero(centavos: number) {
  return (centavos % 100 === 0 ? usdEntero : usd).format(centavos / 100);
}

/** "2.50" / "2,5" / "$3" → centavos, o null si no es un monto válido. */
export function aCentavos(texto: string) {
  const limpio = texto.replace(/[$\s]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  return Math.round(Number(limpio) * 100);
}

/** Una acusación se decide cuando el acusado responde o vence el plazo. */
export function puedeDecidirse(v: Pick<Votacion, "tipo" | "acusacion" | "defensa" | "aceptada">, ahora = Date.now()) {
  if (v.tipo !== "acusacion") return true;
  return !!v.defensa || !!v.aceptada || ahora > (v.acusacion?.plazo ?? 0);
}

/** Multas pagadas: total, del mes y por persona (centavos). */
export function recolectado(multas: Movimiento[], mes: string) {
  const pagadas = multas.filter((m) => m.tipo === "multa" && m.pagado);
  const porPersona = new Map<string, number>();
  for (const m of pagadas) if (m.uid) porPersona.set(m.uid, (porPersona.get(m.uid) ?? 0) + m.monto);
  return {
    total: pagadas.reduce((s, m) => s + m.monto, 0),
    mes: pagadas.filter((m) => m.fecha.startsWith(mes)).reduce((s, m) => s + m.monto, 0),
    cantidad: pagadas.length,
    porPersona: [...porPersona].sort((a, b) => b[1] - a[1]),
  };
}
