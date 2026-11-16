import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, adminActual, codigoLibre, handler, leerJson, limpiarTexto, requireUser } from "@/lib/server/api";
import { LIMITES } from "@/lib/hogar/types";

/** Crea un hogar nuevo; quien lo crea queda como admin. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser(req);
  const body = await leerJson<{ nombreHogar: string; nombre: string }>(req);
  const nombreHogar = limpiarTexto(body.nombreHogar, LIMITES.nombreHogar, "el nombre del hogar");
  const nombre = limpiarTexto(body.nombre, LIMITES.nombre, "tu nombre");

  const db = adminDb();
  const usuarioRef = db.collection("usuarios").doc(user.uid);
  const hogarRef = db.collection("hogares").doc();

  const codigo = await db.runTransaction(async (tx) => {
    const usuario = await tx.get(usuarioRef);
    if (usuario.get("hogarId")) throw new ApiError(409, "Ya perteneces a un hogar.");
    const codigo = await codigoLibre(db, tx);

    tx.set(hogarRef, {
      nombre: nombreHogar,
      codigo,
      moneda: "USD",
      presupuestoMensual: null,
      creadoPor: user.uid,
      creadoEn: FieldValue.serverTimestamp(),
      integrantes: 1,
    });
    tx.set(hogarRef.collection("integrantes").doc(user.uid), {
      nombre,
      email: user.email ?? null,
      rol: "admin",
      color: 0,
      unidoEn: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection("codigos").doc(codigo), { hogarId: hogarRef.id });
    tx.set(usuarioRef, { hogarId: hogarRef.id, nombre }, { merge: true });
    return codigo;
  });

  return Response.json({ hogarId: hogarRef.id, codigo }, { status: 201 });
});

/** Admin: cambia el nombre del hogar (el presupuesto se ajusta en /api/hogar/presupuesto). */
export const PATCH = handler(async (req: Request) => {
  const user = await requireUser(req);
  const body = await leerJson<{ nombre: string }>(req);
  const { hogarRef } = await adminActual(user.uid);

  const cambios: Record<string, unknown> = {};
  if (body.nombre !== undefined) cambios.nombre = limpiarTexto(body.nombre, LIMITES.nombreHogar, "el nombre del hogar");
  if (!Object.keys(cambios).length) throw new ApiError(400, "No hay cambios.");

  await hogarRef.update(cambios);
  return Response.json({ ok: true });
});
