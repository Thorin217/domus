import "server-only";
import { FieldValue, type DocumentData, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { ApiError, limpiarTexto } from "./api";
import type { Pendiente } from "./push";
import { inicioSemana, sumarDias } from "@/lib/quehaceres/types";
import {
  LIMITES_PREMIOS,
  dinero,
  promedioDe,
  puedeDecidirse,
  reglasDe,
  resultado,
  votantes,
  type AsignacionCalificada,
  type Reglas,
  type TipoVotacion,
  type Voto,
} from "@/lib/premios/types";

export function hoyUTC() {
  return new Date().toISOString().slice(0, 10);
}

/** Lunes de esta semana o de la anterior (con margen de un día por zona horaria). */
export function validarSemana(v: unknown) {
  const hoy = hoyUTC();
  const validas = new Set<string>();
  for (const d of [-1, 0, 1]) {
    const lunes = inicioSemana(sumarDias(hoy, d));
    validas.add(lunes);
    validas.add(sumarDias(lunes, -7));
  }
  if (typeof v !== "string" || !validas.has(v)) throw new ApiError(400, "Solo se puede usar la semana actual o la anterior.");
  return v;
}

/** Monto en centavos (entero positivo hasta `max`). */
export function validarMonto(v: unknown, max: number = LIMITES_PREMIOS.montoMax) {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > max) {
    throw new ApiError(400, `El monto va de $0.01 a $${(max / 100).toLocaleString("en-US")}.`);
  }
  return v;
}

export function validarPuntosPremio(v: unknown) {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > LIMITES_PREMIOS.puntosMax) {
    throw new ApiError(400, `Los puntos van de 1 a ${LIMITES_PREMIOS.puntosMax}.`);
  }
  return v;
}

export function textoOpcional(v: unknown, max: number, campo: string) {
  if (v === undefined || v === null || (typeof v === "string" && !v.trim())) return "";
  return limpiarTexto(v, max, campo);
}

/** Hogar, reglas y lista de integrantes leídos dentro de la transacción. */
export async function contextoHogar(tx: Transaction, hogarRef: DocumentReference) {
  const [hogar, integrantes] = await Promise.all([tx.get(hogarRef), tx.get(hogarRef.collection("integrantes"))]);
  return {
    hogar: hogar.data() ?? {},
    reglas: reglasDe(hogar.get("reglas") as Partial<Reglas> | undefined),
    integrantes: new Map(integrantes.docs.map((d) => [d.id, d.data()])),
  };
}

/** Promedio de la semana de un integrante, leído dentro de la transacción. */
export async function promedioSemana(tx: Transaction, hogarRef: DocumentReference, uid: string, lunes: string, reglas: Reglas) {
  const snap = await tx.get(
    hogarRef
      .collection("asignaciones")
      .where("fecha", ">=", lunes)
      .where("fecha", "<=", sumarDias(lunes, 6)),
  );
  const asignaciones = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AsignacionCalificada);
  return promedioDe(uid, asignaciones, reglas).promedio;
}

/** Votaciones de canje o castigo de una persona en una semana (abiertas o aprobadas). */
export async function vigentesDe(tx: Transaction, hogarRef: DocumentReference, uid: string, tipo: TipoVotacion, semana: string) {
  const snap = await tx.get(hogarRef.collection("votaciones").where("objetivo", "==", uid));
  return snap.docs.filter(
    (d) => d.get("tipo") === tipo && d.get("semana") === semana && ["abierta", "aprobada"].includes(d.get("estado")),
  ).length;
}

type Ctx = Awaited<ReturnType<typeof contextoHogar>>;

/**
 * Decide la votación con los votos actuales y aplica sus efectos (solo escrituras: todo lo
 * necesario ya se leyó en `ctx`). Devuelve el estado final.
 */
export function decidir(tx: Transaction, hogarRef: DocumentReference, ref: DocumentReference, v: DocumentData, ctx: Ctx) {
  const votos = (v.votos ?? {}) as Record<string, Voto>;
  const elegibles = votantes({ objetivo: v.objetivo ?? null }, [...ctx.integrantes.keys()]);
  if (!puedeDecidirse(v as Parameters<typeof puedeDecidirse>[0])) return "abierta" as const;
  let decision = v.aceptada ? "aprobada" : resultado(votos, elegibles, ctx.reglas.votacion);
  let motivo: string | null = null;
  if (!decision) return "abierta" as const;

  if (decision === "aprobada") {
    if (v.tipo === "canje") {
      const quien = ctx.integrantes.get(v.objetivo);
      if (!quien) decision = "rechazada";
      else if (((quien.puntos as number | undefined) ?? 0) < v.puntos) {
        decision = "rechazada";
        motivo = "No le alcanzaban los puntos al momento de aprobarse.";
      }
    }
    if (v.tipo === "gasto" && ((ctx.hogar.fondo?.saldo as number | undefined) ?? 0) < v.monto) {
      decision = "rechazada";
      motivo = "No había saldo suficiente en el fondo.";
    }
  }

  if (v.tipo === "catalogo" && v.itemId) {
    tx.update(hogarRef.collection("catalogo").doc(v.itemId), { estado: decision === "aprobada" ? "aprobado" : "rechazado" });
  }
  if (decision === "aprobada") {
    if (v.tipo === "canje") {
      tx.update(hogarRef.collection("integrantes").doc(v.objetivo), { puntos: FieldValue.increment(-v.puntos) });
    }
    if ((v.tipo === "castigo" || v.tipo === "acusacion") && v.monto) {
      tx.set(hogarRef.collection("fondo").doc(), {
        tipo: "multa",
        monto: v.monto,
        descripcion: v.titulo,
        uid: v.objetivo,
        pagado: false,
        fecha: hoyUTC(),
        votacionId: ref.id,
        creadoEn: FieldValue.serverTimestamp(),
      });
      tx.set(hogarRef, { fondo: { porCobrar: FieldValue.increment(v.monto) } }, { merge: true });
    }
    if (v.tipo === "gasto") {
      tx.set(hogarRef.collection("fondo").doc(), {
        tipo: "gasto",
        monto: v.monto,
        descripcion: v.titulo,
        uid: null,
        pagado: true,
        fecha: hoyUTC(),
        votacionId: ref.id,
        creadoEn: FieldValue.serverTimestamp(),
      });
      tx.set(hogarRef, { fondo: { saldo: FieldValue.increment(-v.monto) } }, { merge: true });
    }
  }

  tx.update(ref, { estado: decision, motivo, cerradaEn: FieldValue.serverTimestamp() });
  return decision;
}

/** Crea una votación (con el voto de quien la abre, si le toca votar) y la decide si ya se puede. */
export function abrirVotacion(
  tx: Transaction,
  hogarRef: DocumentReference,
  ctx: Ctx,
  creadoPor: string,
  datos: {
    tipo: TipoVotacion;
    titulo: string;
    detalle?: string;
    objetivo?: string | null;
    itemId?: string | null;
    puntos?: number | null;
    monto?: number | null;
    semana?: string | null;
    /** Campos propios del tipo (p. ej. la acusación). */
    extra?: Record<string, unknown>;
  },
) {
  const ref = hogarRef.collection("votaciones").doc();
  const objetivo = datos.objetivo ?? null;
  const votos: Record<string, Voto> = creadoPor !== objetivo ? { [creadoPor]: "si" } : {};
  const v = {
    tipo: datos.tipo,
    estado: "abierta",
    objetivo,
    itemId: datos.itemId ?? null,
    titulo: datos.titulo,
    detalle: datos.detalle ?? "",
    puntos: datos.puntos ?? null,
    monto: datos.monto ?? null,
    semana: datos.semana ?? null,
    votos,
    motivo: null,
    creadoPor,
    creadoEn: FieldValue.serverTimestamp(),
    ...(datos.extra ?? {}),
  };
  tx.set(ref, v);
  const estado = decidir(tx, hogarRef, ref, v, ctx);
  return { id: ref.id, estado, avisos: avisosDeVotacion({ ...v, id: ref.id }, estado, ctx, "nueva") };
}

// ---------- Avisos de votaciones ----------

const recorte = (t: string, n = 90) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

/**
 * Qué avisar después de abrir, votar o defenderse en una votación.
 * Solo lee `v` y `ctx` (ya leídos en la transacción); el envío se hace al terminar.
 */
export function avisosDeVotacion(
  v: DocumentData,
  estado: "abierta" | "aprobada" | "rechazada",
  ctx: Ctx,
  evento: "nueva" | "voto" | "defensa",
): Pendiente[] {
  const nombre = (uid: string | null) => (uid && ctx.integrantes.get(uid)?.nombre) || "Alguien";
  const objetivo = (v.objetivo as string | null) ?? null;
  const creador = v.creadoPor as string;
  const quienVota = votantes({ objetivo }, [...ctx.integrantes.keys()]);
  const esAcusacion = v.tipo === "acusacion";
  const tipo = esAcusacion ? "acusaciones" : "votaciones";
  const url = "/premios#t-votacion";
  const tag = `votacion-${v.id ?? v.titulo}`;
  const multa = v.monto ? ` (multa de ${dinero(v.monto)} al fondo)` : "";
  const sin = (lista: (string | null)[], ...fuera: (string | null)[]) => lista.filter((u): u is string => !!u && !fuera.includes(u));

  if (estado !== "abierta") {
    const ok = estado === "aprobada";
    const avisos: Pendiente[] = [];
    if (v.tipo === "canje") {
      avisos.push({
        uids: sin([objetivo]),
        aviso: { tipo, url, tag, titulo: ok ? "¡Premio aprobado!" : "No se aprobó tu canje", cuerpo: ok ? `Disfruta: ${v.titulo}.` : `${v.titulo}: tus puntos siguen intactos.` },
      });
    } else if (v.tipo === "castigo" || esAcusacion) {
      avisos.push({
        uids: sin([objetivo]),
        aviso: { tipo, url, tag, titulo: ok ? "Se aprobó un castigo para ti" : "Te salvaste", cuerpo: ok ? `${v.titulo}${multa}.` : `La familia rechazó el castigo: ${v.titulo}.` },
      });
      avisos.push({
        uids: sin([creador], objetivo),
        aviso: { tipo, url, tag, titulo: ok ? `Castigo aprobado para ${nombre(objetivo)}` : `Se rechazó el castigo para ${nombre(objetivo)}`, cuerpo: v.titulo },
      });
    } else {
      avisos.push({
        uids: sin([creador]),
        aviso: { tipo, url, tag, titulo: ok ? "La familia aprobó tu propuesta" : "La familia rechazó tu propuesta", cuerpo: v.titulo },
      });
    }
    return avisos;
  }

  if (evento === "nueva") {
    if (esAcusacion) {
      return [
        {
          uids: sin([objetivo]),
          aviso: {
            tipo,
            url,
            tag,
            titulo: `${nombre(creador)} te acusó`,
            cuerpo: `“${recorte(v.acusacion?.motivo ?? "")}”. Tienes 48 horas para defenderte.`,
          },
        },
        {
          uids: sin(quienVota, creador, objetivo),
          aviso: { tipo, url, tag, titulo: `${nombre(creador)} acusa a ${nombre(objetivo)}`, cuerpo: `“${recorte(v.acusacion?.motivo ?? "")}”. Tu voto cuenta.` },
        },
      ];
    }
    const titulo =
      v.tipo === "canje"
        ? `${nombre(objetivo)} quiere canjear un premio`
        : v.tipo === "castigo"
          ? `Proponen un castigo para ${nombre(objetivo)}`
          : v.tipo === "gasto"
            ? "Proponen gastar del fondo"
            : "Nueva propuesta para el catálogo";
    return [{ uids: sin(quienVota, creador), aviso: { tipo, url, tag, titulo, cuerpo: `${v.titulo}. Entra a votar.` } }];
  }

  if (evento === "defensa" && esAcusacion) {
    return [
      {
        uids: sin(quienVota, objetivo),
        aviso: { tipo, url, tag, titulo: `${nombre(objetivo)} se defendió`, cuerpo: `“${recorte(v.defensa?.texto ?? "")}”. Ya puedes votar.` },
      },
    ];
  }
  return [];
}
