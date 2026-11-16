// Notificaciones: categorías que cada persona puede activar o apagar.

export type TipoAviso = "tareas" | "votaciones" | "acusaciones" | "gastos";

export const TIPOS_AVISO: { id: TipoAviso; titulo: string; detalle: string }[] = [
  { id: "tareas", titulo: "Quehaceres", detalle: "Lo que te toca hoy, tareas nuevas y las notas que te dan." },
  { id: "votaciones", titulo: "Votaciones", detalle: "Premios, castigos y gastos por votar, y cómo terminaron." },
  { id: "acusaciones", titulo: "Acusaciones", detalle: "Si te acusan, la defensa de los demás y el plazo para defenderte." },
  { id: "gastos", titulo: "Gastos fijos", detalle: "Antes de que venza un pago y si quedó atrasado." },
];

export type Preferencias = Record<TipoAviso, boolean>;

export function preferenciasDe(guardadas: Partial<Preferencias> | undefined | null): Preferencias {
  return { tareas: true, votaciones: true, acusaciones: true, gastos: true, ...(guardadas ?? {}) };
}

export type Aviso = {
  tipo: TipoAviso;
  titulo: string;
  cuerpo: string;
  /** Ruta que se abre al tocarla. */
  url: string;
  /** Avisos con el mismo tag se reemplazan en vez de acumularse. */
  tag?: string;
};
