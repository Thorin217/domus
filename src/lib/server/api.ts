import "server-only";
import { randomInt } from "node:crypto";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { DocumentReference, Firestore, Transaction } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebase-admin";
import { ALFABETO_CODIGO, LARGO_CODIGO, type Integrante } from "@/lib/hogar/types";

/** Error con mensaje para el usuario (en español) y código HTTP. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser(req: Request): Promise<DecodedIdToken> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new ApiError(401, "Tienes que iniciar sesión.");
  try {
    return await adminAuth().verifyIdToken(token);
  } catch {
    throw new ApiError(401, "Tu sesión venció. Vuelve a entrar.");
  }
}

export async function leerJson<T>(req: Request): Promise<Partial<T>> {
  try {
    return (await req.json()) as Partial<T>;
  } catch {
    throw new ApiError(400, "Datos inválidos.");
  }
}

/** Envuelve un handler: convierte ApiError en JSON y oculta errores internos. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ApiError) return Response.json({ error: e.message }, { status: e.status });
      console.error(e);
      return Response.json({ error: "Algo salió mal. Intenta de nuevo." }, { status: 500 });
    }
  };
}

export function limpiarTexto(valor: unknown, max: number, campo: string): string {
  if (typeof valor !== "string") throw new ApiError(400, `Falta ${campo}.`);
  const limpio = valor.replace(/\s+/g, " ").trim();
  if (!limpio) throw new ApiError(400, `Falta ${campo}.`);
  if (limpio.length > max) throw new ApiError(400, `${campo[0].toUpperCase() + campo.slice(1)} es muy largo (máx. ${max}).`);
  return limpio;
}

export function generarCodigo() {
  let c = "";
  for (let i = 0; i < LARGO_CODIGO; i++) c += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)];
  return c;
}

/** Código libre: se reserva dentro de la transacción para que no choquen dos hogares. */
export async function codigoLibre(db: Firestore, tx: Transaction) {
  for (let i = 0; i < 8; i++) {
    const codigo = generarCodigo();
    const snap = await tx.get(db.collection("codigos").doc(codigo));
    if (!snap.exists) return codigo;
  }
  throw new ApiError(503, "No pudimos generar un código. Intenta de nuevo.");
}

/** Hogar del usuario y su ficha de integrante (o error si no tiene). */
export async function miembroActual(uid: string, tx?: Transaction) {
  const db = adminDb();
  const get = (ref: DocumentReference) => (tx ? tx.get(ref) : ref.get());
  const usuario = await get(db.collection("usuarios").doc(uid));
  const hogarId = usuario.get("hogarId") as string | null | undefined;
  if (!hogarId) throw new ApiError(404, "Todavía no perteneces a un hogar.");
  const hogarRef = db.collection("hogares").doc(hogarId);
  const integranteSnap = await get(hogarRef.collection("integrantes").doc(uid));
  if (!integranteSnap.exists) throw new ApiError(403, "Ya no perteneces a este hogar.");
  return { db, hogarId, hogarRef, integrante: integranteSnap.data() as Integrante };
}

export async function adminActual(uid: string, tx?: Transaction) {
  const m = await miembroActual(uid, tx);
  if (m.integrante.rol !== "admin") throw new ApiError(403, "Solo el admin del hogar puede hacer esto.");
  return m;
}
