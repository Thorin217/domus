import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { responderConAvisos } from "@/lib/server/push";
import { ApiError, handler, leerJson, limpiarTexto, miembroActual, requireUser } from "@/lib/server/api";
import { abrirVotacion, contextoHogar, textoOpcional, validarMonto, validarPuntosPremio } from "@/lib/server/premios";
import { LIMITES_PREMIOS, dinero, type ItemCatalogo } from "@/lib/premios/types";

/**
 * Propone un premio o un castigo para el catálogo.
 * Si las reglas piden voto, se abre una votación (quien propone vota a favor); si no, solo el admin agrega.
 */
export const POST = handler(async (req: Request) => {
  const user = await requireUser(req);
  const body = await leerJson<ItemCatalogo>(req);
  if (body.tipo !== "premio" && body.tipo !== "castigo") throw new ApiError(400, "Elige premio o castigo.");
  const tipo = body.tipo;
  const nombre = limpiarTexto(body.nombre, LIMITES_PREMIOS.nombre, "el nombre");
  const descripcion = textoOpcional(body.descripcion, LIMITES_PREMIOS.descripcion, "la descripción");
  const puntos = tipo === "premio" ? validarPuntosPremio(body.puntos) : null;
  const monto = tipo === "castigo" && body.monto ? validarMonto(body.monto) : null;
  const db = adminDb();

  const r = await db.runTransaction(async (tx) => {
    const { hogarRef, integrante } = await miembroActual(user.uid, tx);
    const ctx = await contextoHogar(tx, hogarRef);
    const conVoto = ctx.reglas.catalogoConVoto;
    if (!conVoto && integrante.rol !== "admin") throw new ApiError(403, "En tu hogar solo el admin agrega premios y castigos.");

    const ref = hogarRef.collection("catalogo").doc();
    tx.set(ref, {
      tipo,
      nombre,
      descripcion,
      puntos,
      monto,
      estado: conVoto ? "propuesto" : "aprobado",
      propuestoPor: user.uid,
      creadoEn: FieldValue.serverTimestamp(),
    });
    if (!conVoto) return { estado: "aprobada" };
    const detalle = tipo === "premio" ? `Premio de ${puntos} pts` : monto ? `Castigo con multa de ${dinero(monto)} al fondo` : "Castigo";
    return abrirVotacion(tx, hogarRef, ctx, user.uid, {
      tipo: "catalogo",
      itemId: ref.id,
      titulo: nombre,
      detalle: descripcion ? `${detalle} · ${descripcion}` : detalle,
      puntos,
      monto,
    });
  });

  return responderConAvisos(r);
});
