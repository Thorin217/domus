// Tipos y reglas compartidas entre cliente y servidor.

export type Rol = "admin" | "miembro";

export type Hogar = {
  id: string;
  nombre: string;
  codigo: string;
  moneda: "USD";
  /** Obsoleto (dólares): se usa como respaldo si no hay `presupuesto`. */
  presupuestoMensual: number | null;
  /** Presupuesto en centavos: total del hogar y topes por categoría. */
  presupuesto?: import("@/lib/gastos/types").Presupuesto;
  /** Categorías de compras (si falta, CATEGORIAS_POR_DEFECTO). */
  categorias?: import("@/lib/gastos/types").Categoria[];
  creadoPor: string;
  integrantes: number;
  /** Reglas de premios y castigos (parciales: se completan con REGLAS_POR_DEFECTO). */
  reglas?: Partial<import("@/lib/premios/types").Reglas>;
  /** Fondo familiar: saldo en caja y multas por cobrar (USD). */
  fondo?: import("@/lib/premios/types").Fondo;
};

export type Integrante = {
  uid: string;
  nombre: string;
  email: string | null;
  rol: Rol;
  /** Índice en PALETA_INTEGRANTES */
  color: number;
  /** Saldo de puntos: suma al marcar tareas hechas, se gasta al canjear premios. */
  puntos?: number;
};

export type Usuario = {
  hogarId: string | null;
  nombre: string;
  /** Qué notificaciones quiere recibir (faltantes = sí). */
  avisos?: Partial<import("@/lib/avisos/types").Preferencias>;
};

/** Color fijo por integrante (DESIGN.md §2): fondo + color de texto legible. */
export const PALETA_INTEGRANTES = [
  { fondo: "#00509D", texto: "#FFFFFF" }, // steel azure
  { fondo: "#00296B", texto: "#FFFFFF" }, // imperial blue
  { fondo: "#FDC500", texto: "#00296B" }, // yellow
  { fondo: "#8DB7E8", texto: "#00296B" }, // sky
] as const;

/** Más de cuatro integrantes: se repite la paleta con borde de 2px imperial-blue. */
export function estiloIntegrante(color: number) {
  if (color < PALETA_INTEGRANTES.length) {
    const c = PALETA_INTEGRANTES[color];
    return { background: c.fondo, color: c.texto };
  }
  const c = PALETA_INTEGRANTES[color % PALETA_INTEGRANTES.length];
  return { background: c.fondo, color: c.texto, boxShadow: "inset 0 0 0 2px #00296B" };
}

export function inicial(nombre: string) {
  return (nombre.trim()[0] ?? "?").toUpperCase();
}

/** Sin letras ni números que se confunden (0/O, 1/I/L). */
export const ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const LARGO_CODIGO = 6;

export function normalizarCodigo(codigo: string) {
  return codigo.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export const LIMITES = {
  nombre: 40,
  nombreHogar: 50,
  presupuestoMax: 1_000_000,
  integrantesMax: 12,
};
