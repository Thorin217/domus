import "server-only";
import type { DocumentData } from "firebase-admin/firestore";
import { ApiError, limpiarTexto } from "./api";
import { esFechaISO, sumarDias } from "@/lib/quehaceres/types";
import { LIMITES_GASTOS, finanzasDe, mesDe, type Categoria, type TipoCompra } from "@/lib/gastos/types";

export function validarMontoGasto(v: unknown) {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > LIMITES_GASTOS.montoMax) {
    throw new ApiError(400, "Escribe un monto válido (hasta $100,000).");
  }
  return v;
}

export function validarCategoria(v: unknown, categorias: Categoria[]) {
  if (typeof v !== "string" || !categorias.some((c) => c.id === v)) throw new ApiError(400, "Elige una categoría.");
  return v;
}

/** Fecha de compra: no del futuro (con un día de margen por zona horaria) ni de hace más de 2 años. */
export function validarFechaCompra(v: unknown) {
  const hoy = new Date().toISOString().slice(0, 10);
  if (!esFechaISO(v) || v > sumarDias(hoy, 1) || v < sumarDias(hoy, -730)) throw new ApiError(400, "Fecha inválida.");
  return v;
}

export function validarTipo(v: unknown): TipoCompra {
  if (v !== "familiar" && v !== "personal") throw new ApiError(400, "Elige familiar o personal.");
  return v;
}

export function categoriasDe(hogar: DocumentData) {
  return finanzasDe(hogar).categorias;
}

/** Datos de una compra a partir del cuerpo (todos los campos obligatorios). */
export function datosCompra(body: Record<string, unknown>, categorias: Categoria[], integrantes: Set<string>) {
  const fecha = validarFechaCompra(body.fecha);
  const pagadoPor = body.pagadoPor;
  if (typeof pagadoPor !== "string" || !integrantes.has(pagadoPor)) throw new ApiError(400, "Elige quién pagó.");
  return {
    concepto: limpiarTexto(body.concepto, LIMITES_GASTOS.concepto, "el concepto"),
    monto: validarMontoGasto(body.monto),
    categoria: validarCategoria(body.categoria, categorias),
    fecha,
    mes: mesDe(fecha),
    pagadoPor,
    tipo: validarTipo(body.tipo),
  };
}

/** Campos de un gasto fijo (para crear: todos; para editar: solo los enviados). */
export function datosFijo(body: Record<string, unknown>, categorias: Categoria[], parcial: boolean) {
  const d: Record<string, unknown> = {};
  const hay = (k: string) => !parcial || body[k] !== undefined;
  if (hay("nombre")) d.nombre = limpiarTexto(body.nombre, LIMITES_GASTOS.concepto, "el nombre");
  if (hay("monto")) d.monto = validarMontoGasto(body.monto);
  if (hay("categoria")) d.categoria = validarCategoria(body.categoria, categorias);
  if (hay("dia")) {
    const n = body.dia;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 31) throw new ApiError(400, "El día va de 1 a 31.");
    d.dia = n;
  }
  if (hay("avisoDias")) {
    const n = body.avisoDias ?? 3;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > LIMITES_GASTOS.avisoMax) {
      throw new ApiError(400, `El aviso va de 0 a ${LIMITES_GASTOS.avisoMax} días antes.`);
    }
    d.avisoDias = n;
  }
  if (parcial && body.activo !== undefined) {
    if (typeof body.activo !== "boolean") throw new ApiError(400, "Dato inválido.");
    d.activo = body.activo;
  }
  return d;
}
