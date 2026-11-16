import { timingSafeEqual } from "node:crypto";
import { adminDb } from "@/lib/server/firebase-admin";
import { aTarea } from "@/lib/server/quehaceres";
import { notificar } from "@/lib/server/push";
import { horarioDe } from "@/lib/quehaceres/fijas";
import type { AsignacionGuardada } from "@/lib/quehaceres/types";
import { fijosDelMes, mesDe, moneda, type Compra, type GastoFijo } from "@/lib/gastos/types";

const HORA = 60 * 60 * 1000;

function autorizado(req: Request) {
  const secreto = process.env.CRON_SECRET;
  const llega = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!secreto || !llega) return false;
  const a = Buffer.from(secreto);
  const b = Buffer.from(llega);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Fecha de hoy en la zona horaria del hogar (por defecto, El Salvador). */
function hoyEnZona() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: process.env.DOMUS_ZONA || "America/El_Salvador" }).format(new Date());
}

const lista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}` : xs[0]);

/**
 * Avisos del día. Se llama una vez al día (idealmente temprano) desde un cron externo:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://tu-dominio/api/cron/avisos
 * Si se llama dos veces el mismo día, la segunda no repite avisos (salvo con ?forzar=1).
 */
export async function GET(req: Request) {
  if (!autorizado(req)) return Response.json({ error: "No autorizado." }, { status: 401 });
  const forzar = new URL(req.url).searchParams.get("forzar") === "1";
  const db = adminDb();
  const hoy = hoyEnZona();
  const mes = mesDe(hoy);
  const ahora = Date.now();
  const resumen = { hogares: 0, omitidos: 0, enviados: 0 };

  for (const hogar of (await db.collection("hogares").get()).docs) {
    const marca = hogar.ref.collection("meta").doc("avisos");
    if (!forzar && (await marca.get()).get("fecha") === hoy) {
      resumen.omitidos++;
      continue;
    }
    resumen.hogares++;
    const [integrantes, tareas, asignaciones, fijos, pagos, votaciones] = await Promise.all([
      hogar.ref.collection("integrantes").get(),
      hogar.ref.collection("tareas").get(),
      hogar.ref.collection("asignaciones").where("fecha", "==", hoy).get(),
      hogar.ref.collection("gastosFijos").get(),
      hogar.ref.collection("compras").where("mes", "==", mes).get(),
      hogar.ref.collection("votaciones").where("estado", "==", "abierta").get(),
    ]);
    const todos = integrantes.docs.map((d) => d.id);
    const envios: Promise<{ enviados: number }>[] = [];

    // 1) Lo que le toca hoy a cada quien.
    const horario = horarioDe(
      [hoy],
      tareas.docs.map((d) => aTarea(d.id, d.data())),
      asignaciones.docs.map((d) => ({ id: d.id, ...d.data() }) as AsignacionGuardada),
    );
    const porPersona = new Map<string, string[]>();
    for (const a of horario) if (a.estado === "pendiente") porPersona.set(a.uid, [...(porPersona.get(a.uid) ?? []), a.tarea]);
    for (const [uid, ts] of porPersona) {
      if (!todos.includes(uid)) continue;
      envios.push(notificar([uid], { tipo: "tareas", titulo: "Hoy te toca", cuerpo: `${lista(ts)}.`, url: "/quehaceres", tag: "hoy" }));
    }

    // 2) Gastos fijos: el día del aviso, el día antes, el día del vencimiento y si se atrasó.
    const delMes = fijosDelMes(
      fijos.docs.map((d) => ({ id: d.id, avisoDias: 3, activo: true, ...d.data() }) as GastoFijo),
      pagos.docs.map((d) => ({ id: d.id, gastoFijoId: null, ...d.data() }) as Compra),
      mes,
      hoy,
    );
    for (const f of delMes) {
      const e = f.estado;
      const monto = moneda(f.monto);
      let titulo: string | null = null;
      if (e.tipo === "pronto" && e.dias === 0) titulo = `Hoy vence ${f.fijo.nombre}`;
      else if (e.tipo === "pronto" && e.dias === 1) titulo = `Mañana vence ${f.fijo.nombre}`;
      else if (e.tipo === "pronto" && e.dias === f.fijo.avisoDias) titulo = `${f.fijo.nombre} vence en ${e.dias} días`;
      else if (e.tipo === "atrasado" && (e.dias === 1 || e.dias % 7 === 0)) titulo = `${f.fijo.nombre} está atrasado`;
      if (titulo) {
        envios.push(
          notificar(todos, {
            tipo: "gastos",
            titulo,
            cuerpo: `${monto}. Cuando lo paguen, márquenlo en Domus.`,
            url: "/gastos-fijos",
            tag: `fijo-${f.fijo.id}`,
          }),
        );
      }
    }

    // 3) Acusaciones: recordar al acusado antes del plazo; avisar a quien acusó cuando venció.
    for (const v of votaciones.docs) {
      if (v.get("tipo") !== "acusacion" || v.get("defensa") || v.get("aceptada")) continue;
      const plazo = (v.get("acusacion.plazo") as number) ?? 0;
      const objetivo = v.get("objetivo") as string;
      if (plazo > ahora && plazo - ahora <= 24 * HORA && todos.includes(objetivo)) {
        envios.push(
          notificar([objetivo], {
            tipo: "acusaciones",
            titulo: "Te queda poco para defenderte",
            cuerpo: `Quedan unas ${Math.max(1, Math.round((plazo - ahora) / HORA))} horas. Si no respondes, la familia decide sin tu versión.`,
            url: "/premios#t-votacion",
            tag: `votacion-${v.id}`,
          }),
        );
      } else if (plazo <= ahora && ahora - plazo <= 24 * HORA) {
        envios.push(
          notificar([v.get("creadoPor") as string], {
            tipo: "acusaciones",
            titulo: "Venció el plazo de defensa",
            cuerpo: "Ya se pueden contar los votos de tu acusación.",
            url: "/premios#t-votacion",
            tag: `votacion-${v.id}`,
          }),
        );
      }
    }

    for (const r of await Promise.all(envios)) resumen.enviados += r.enviados;
    await marca.set({ fecha: hoy, en: new Date() });
  }

  return Response.json({ hoy, ...resumen });
}
