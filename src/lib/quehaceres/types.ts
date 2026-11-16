// Quehaceres: tipos, límites y fechas compartidos entre cliente y servidor.

export type EstadoTarea = "pendiente" | "hecho" | "no_hecho";
/** En la base también existe "quitada": el admin sacó del horario un día de una tarea fija. */
export type EstadoGuardado = EstadoTarea | "quitada";

/** Asignación fija: esa tarea le toca a `uid` ese día de la semana, todas las semanas desde `desde`. */
export type Fija = { uid: string; desde: string };

/** Tarea del catálogo del hogar. */
export type Tarea = {
  id: string;
  nombre: string;
  puntos: number;
  /** Días de la semana en que se hace: 0 = lunes … 6 = domingo. */
  dias: number[];
  /** Quién puede hacerla (uids). Vacío = cualquiera. */
  candidatos: string[];
  activa: boolean;
  /** Fijas por día de la semana ("0" = lunes … "6" = domingo). */
  fijos: Record<string, Fija>;
};

/** Una tarea asignada a un integrante en una fecha. Id del doc: `${fecha}_${tareaId}`. */
export type Asignacion = {
  id: string;
  fecha: string; // YYYY-MM-DD
  tareaId: string;
  tarea: string; // nombre al momento de asignar
  puntos: number;
  uid: string;
  estado: EstadoTarea;
  /** Viene de una asignación fija (se repite cada semana). */
  fija?: boolean;
  /** Calculada desde la regla fija; todavía no existe en la base. */
  virtual?: boolean;
};

/** Documento tal como está en Firestore (puede ser una marca de "quitada"). */
export type AsignacionGuardada = Omit<Asignacion, "estado" | "virtual"> & { estado: EstadoGuardado };

export const LIMITES_TAREAS = {
  nombre: 40,
  puntosMin: 1,
  puntosMax: 100,
  tareasMax: 50,
  fechasMax: 14,
};

export const DIAS_CORTOS = ["L", "M", "X", "J", "V", "S", "D"] as const;
export const DIAS_NOMBRE = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"] as const;
export const DIAS_ABREV = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

export const TODOS_LOS_DIAS = [0, 1, 2, 3, 4, 5, 6];

export function idAsignacion(fecha: string, tareaId: string) {
  return `${fecha}_${tareaId}`;
}

// ---------- Fechas como texto YYYY-MM-DD (sin zona horaria) ----------

export function esFechaISO(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function aUTC(iso: string) {
  return new Date(`${iso}T00:00:00Z`);
}

/** Fecha local de hoy en el dispositivo. */
export function hoyISO(ahora = new Date()) {
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, "0");
  const d = String(ahora.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function sumarDias(iso: string, n: number) {
  const d = aUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = lunes … 6 = domingo. */
export function diaSemana(iso: string) {
  return (aUTC(iso).getUTCDay() + 6) % 7;
}

export function inicioSemana(iso: string) {
  return sumarDias(iso, -diaSemana(iso));
}

export function diasDeSemana(lunes: string) {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

export function numeroDia(iso: string) {
  return aUTC(iso).getUTCDate();
}

export function mesCorto(iso: string) {
  return MESES[aUTC(iso).getUTCMonth()];
}

/** "9 – 15 nov" o "29 dic – 4 ene". */
export function rangoSemana(lunes: string) {
  const domingo = sumarDias(lunes, 6);
  return mesCorto(lunes) === mesCorto(domingo)
    ? `${numeroDia(lunes)} – ${numeroDia(domingo)} ${mesCorto(domingo)}`
    : `${numeroDia(lunes)} ${mesCorto(lunes)} – ${numeroDia(domingo)} ${mesCorto(domingo)}`;
}

/** "L, X, V" · "Todos los días" · "Fines de semana" … */
export function textoDias(dias: number[]) {
  const s = [...new Set(dias)].sort();
  if (s.length === 7) return "Todos los días";
  if (s.join() === "0,1,2,3,4") return "Entre semana";
  if (s.join() === "5,6") return "Fines de semana";
  return s.map((d) => DIAS_CORTOS[d]).join(", ");
}
