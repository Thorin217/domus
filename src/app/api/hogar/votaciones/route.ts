import { adminDb } from "@/lib/server/firebase-admin";
import { responderConAvisos } from "@/lib/server/push";
import { ApiError, handler, leerJson, miembroActual, requireUser } from "@/lib/server/api";
import { limpiarTexto } from "@/lib/server/api";
import { abrirVotacion, contextoHogar, hoyUTC, promedioSemana, validarSemana, vigentesDe } from "@/lib/server/premios";
import { LIMITES_PREMIOS, PLAZO_DEFENSA_MS, dinero } from "@/lib/premios/types";
import { inicioSemana } from "@/lib/quehaceres/types";

/**
 * Abre una votación:
 * - canje: quien pide su premio (promedio de la semana ≥ umbral, puntos suficientes, límite por semana).
 * - castigo: otro integrante lo propone si el promedio de la persona quedó bajo el umbral
 *   (el admin puede proponerlo siempre). Uno por persona y semana.
 * - acusacion: cualquiera acusa a otro por algo que hizo (motivo + castigo del catálogo), sin importar
 *   su promedio. El acusado tiene 48 h para defenderse o aceptar; recién entonces se cuentan los votos.
 */
export const POST = handler(async (req: Request) => {
  const user = await requireUser(req);
  const body = await leerJson<{ tipo: "canje" | "castigo" | "acusacion"; itemId: string; uid: string; semana: string; motivo: string }>(req);
  if (body.tipo !== "canje" && body.tipo !== "castigo" && body.tipo !== "acusacion") throw new ApiError(400, "Tipo inválido.");
  if (typeof body.itemId !== "string") throw new ApiError(400, "Falta el premio o castigo.");
  if (body.tipo === "acusacion") return acusar(user.uid, body);
  const semana = validarSemana(body.semana);
  const tipo = body.tipo;
  const db = adminDb();

  const r = await db.runTransaction(async (tx) => {
    const { hogarRef, integrante } = await miembroActual(user.uid, tx);
    const objetivo = tipo === "canje" ? user.uid : body.uid;
    if (typeof objetivo !== "string") throw new ApiError(400, "Falta a quién se aplica.");
    if (tipo === "castigo" && objetivo === user.uid) throw new ApiError(400, "No puedes proponerte un castigo a ti mismo.");

    const ctx = await contextoHogar(tx, hogarRef);
    const [item, promedio, vigentes] = await Promise.all([
      tx.get(hogarRef.collection("catalogo").doc(body.itemId!)),
      promedioSemana(tx, hogarRef, objetivo, semana, ctx.reglas),
      vigentesDe(tx, hogarRef, objetivo, tipo, semana),
    ]);
    const persona = ctx.integrantes.get(objetivo);
    if (!persona) throw new ApiError(404, "Esa persona no está en tu hogar.");
    if (!item.exists || item.get("estado") !== "aprobado" || item.get("tipo") !== (tipo === "canje" ? "premio" : "castigo")) {
      throw new ApiError(404, tipo === "canje" ? "Ese premio no está disponible." : "Ese castigo no está disponible.");
    }
    const { reglas } = ctx;

    if (tipo === "canje") {
      if (promedio === null || promedio < reglas.umbralPremio) {
        throw new ApiError(409, `Necesitas un promedio de ${reglas.umbralPremio} ★ o más esa semana para canjear.`);
      }
      if (vigentes >= reglas.canjesPorSemana) {
        throw new ApiError(409, reglas.canjesPorSemana ? "Ya usaste tus canjes de esa semana." : "En tu hogar no se canjean premios por ahora.");
      }
      const costo = item.get("puntos") as number;
      if (((persona.puntos as number | undefined) ?? 0) < costo) throw new ApiError(409, "No te alcanzan los puntos para ese premio.");
      return abrirVotacion(tx, hogarRef, ctx, user.uid, {
        tipo,
        objetivo,
        itemId: item.id,
        titulo: item.get("nombre"),
        detalle: `${persona.nombre} canjea ${costo} pts (promedio ${promedio} ★)`,
        puntos: costo,
        semana,
      });
    }

    const esAdmin = integrante.rol === "admin";
    if (!esAdmin && (promedio === null || promedio >= reglas.umbralCastigo)) {
      throw new ApiError(409, `Solo se propone un castigo si el promedio de la semana quedó bajo ${reglas.umbralCastigo} ★.`);
    }
    if (vigentes > 0) throw new ApiError(409, `${persona.nombre} ya tiene un castigo esa semana.`);
    const monto = (item.get("monto") as number | null) ?? null;
    return abrirVotacion(tx, hogarRef, ctx, user.uid, {
      tipo,
      objetivo,
      itemId: item.id,
      titulo: item.get("nombre"),
      detalle:
        `Para ${persona.nombre}` +
        (promedio !== null ? ` (promedio ${promedio} ★)` : "") +
        (monto ? ` · multa de ${dinero(monto)} al fondo` : ""),
      monto,
      semana,
    });
  });

  return responderConAvisos(r);
});


async function acusar(uid: string, body: { itemId?: string; uid?: string; motivo?: string }) {
  const motivo = limpiarTexto(body.motivo, LIMITES_PREMIOS.motivo, "el motivo");
  if (typeof body.uid !== "string") throw new ApiError(400, "Elige a quién acusas.");
  if (body.uid === uid) throw new ApiError(400, "No puedes acusarte a ti mismo.");
  const objetivo = body.uid;

  const r = await adminDb().runTransaction(async (tx) => {
    const { hogarRef } = await miembroActual(uid, tx);
    const ctx = await contextoHogar(tx, hogarRef);
    const [item, previas] = await Promise.all([
      tx.get(hogarRef.collection("catalogo").doc(body.itemId!)),
      tx.get(hogarRef.collection("votaciones").where("objetivo", "==", objetivo)),
    ]);
    const persona = ctx.integrantes.get(objetivo);
    if (!persona) throw new ApiError(404, "Esa persona no está en tu hogar.");
    if (!item.exists || item.get("estado") !== "aprobado" || item.get("tipo") !== "castigo") {
      throw new ApiError(404, "Ese castigo no está disponible.");
    }
    if (previas.docs.some((d) => d.get("tipo") === "acusacion" && d.get("estado") === "abierta")) {
      throw new ApiError(409, `${persona.nombre} ya tiene una acusación abierta. Espera a que se decida.`);
    }
    const monto = (item.get("monto") as number | null) ?? null;
    return abrirVotacion(tx, hogarRef, ctx, uid, {
      tipo: "acusacion",
      objetivo,
      itemId: item.id,
      titulo: item.get("nombre"),
      detalle: monto ? `Multa de ${dinero(monto)} al fondo` : "Sin multa",
      monto,
      semana: inicioSemana(hoyUTC()),
      extra: { acusacion: { motivo, plazo: Date.now() + PLAZO_DEFENSA_MS }, defensa: null, aceptada: false },
    });
  });
  return responderConAvisos(r);
}
