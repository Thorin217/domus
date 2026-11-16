import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, adminActual, handler, leerJson, limpiarTexto, requireUser } from "@/lib/server/api";
import { LIMITES_PREMIOS, reglasDe, type Reglas } from "@/lib/premios/types";

function umbral(v: unknown, campo: string) {
  if (typeof v !== "number" || v < 1 || v > 5 || Math.round(v * 10) !== v * 10) {
    throw new ApiError(400, `${campo} va de 1 a 5 (con un decimal).`);
  }
  return v;
}

function booleano(v: unknown) {
  if (typeof v !== "boolean") throw new ApiError(400, "Dato inválido.");
  return v;
}

/** Admin: cambia las reglas de premios y castigos (solo los campos enviados). */
export const PATCH = handler(async (req: Request) => {
  const user = await requireUser(req);
  const body = await leerJson<Reglas>(req);
  const db = adminDb();

  const reglas = await db.runTransaction(async (tx) => {
    const { hogarRef } = await adminActual(user.uid, tx);
    const hogar = await tx.get(hogarRef);
    const r = reglasDe(hogar.get("reglas"));

    if (body.umbralPremio !== undefined) r.umbralPremio = umbral(body.umbralPremio, "El promedio para premio");
    if (body.umbralCastigo !== undefined) r.umbralCastigo = umbral(body.umbralCastigo, "El promedio para castigo");
    if (r.umbralCastigo >= r.umbralPremio) throw new ApiError(400, "El promedio para castigo debe ser menor que el de premio.");
    if (body.votacion !== undefined) {
      if (body.votacion !== "mayoria" && body.votacion !== "todos") throw new ApiError(400, "Modo de votación inválido.");
      r.votacion = body.votacion;
    }
    if (body.noHechoCuentaComoUno !== undefined) r.noHechoCuentaComoUno = booleano(body.noHechoCuentaComoUno);
    if (body.catalogoConVoto !== undefined) r.catalogoConVoto = booleano(body.catalogoConVoto);
    if (body.gastoConVoto !== undefined) r.gastoConVoto = booleano(body.gastoConVoto);
    if (body.canjesPorSemana !== undefined) {
      const n = body.canjesPorSemana;
      if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > LIMITES_PREMIOS.canjesMax) {
        throw new ApiError(400, `Los canjes por semana van de 0 a ${LIMITES_PREMIOS.canjesMax}.`);
      }
      r.canjesPorSemana = n;
    }
    if (body.fondoNombre !== undefined) r.fondoNombre = limpiarTexto(body.fondoNombre, LIMITES_PREMIOS.nombre, "el nombre del fondo");
    if (body.fondoMeta !== undefined) {
      const m = body.fondoMeta;
      if (m !== null && (typeof m !== "number" || !Number.isInteger(m) || m < 100 || m > LIMITES_PREMIOS.fondoMax)) {
        throw new ApiError(400, "La meta debe ser de al menos $1.");
      }
      r.fondoMeta = m;
    }
    tx.update(hogarRef, { reglas: r });
    return r;
  });

  return Response.json({ reglas });
});
