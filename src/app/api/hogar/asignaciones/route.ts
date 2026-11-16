import { FieldValue } from "firebase-admin/firestore";
import { ApiError, adminActual, handler, leerJson, requireUser } from "@/lib/server/api";
import { aTarea, docAsignacion, validarFechas } from "@/lib/server/quehaceres";
import { DIAS_NOMBRE, diaSemana, idAsignacion } from "@/lib/quehaceres/types";
import { responderConAvisos, type Pendiente } from "@/lib/server/push";

/**
 * Admin: asigna una tarea a un integrante.
 *
 * - Sin `repetir`: solo en esas fechas. Como el id es `${fecha}_${tareaId}`, si ese día la tarea
 *   era de otra persona se reasigna (una tarea nunca se repite el mismo día). Lo ya hecho no se toca.
 * - Con `repetir`: cada fecha marca el primer día de una asignación fija que se repite ese día de la
 *   semana todas las semanas, sin fin. No se guardan las semanas futuras: se calculan al mostrarlas.
 *   Lo pendiente ya guardado desde esa fecha pasa a la nueva persona.
 */
export const POST = handler(async (req: Request) => {
  const user = await requireUser(req);
  const body = await leerJson<{ tareaId: string; uid: string; fechas: string[]; repetir: boolean }>(req);
  const fechas = validarFechas(body.fechas);
  if (typeof body.tareaId !== "string" || typeof body.uid !== "string") throw new ApiError(400, "Datos inválidos.");
  const repetir = body.repetir === true;
  if (repetir && new Set(fechas.map(diaSemana)).size !== fechas.length) throw new ApiError(400, "Un día de la semana repetido.");
  const { db, hogarRef } = await adminActual(user.uid);

  const resultado = await db.runTransaction(async (tx) => {
    const tareaRef = hogarRef.collection("tareas").doc(body.tareaId!);
    const [tareaSnap, integrante] = await Promise.all([
      tx.get(tareaRef),
      tx.get(hogarRef.collection("integrantes").doc(body.uid!)),
    ]);
    if (!tareaSnap.exists) throw new ApiError(404, "Esa tarea ya no existe.");
    if (!integrante.exists) throw new ApiError(404, "Ese integrante no está en tu hogar.");
    const tarea = aTarea(tareaSnap.id, tareaSnap.data()!);

    if (repetir) {
      const inicio = new Map(fechas.map((f) => [diaSemana(f), f]));
      const guardadas = await tx.get(hogarRef.collection("asignaciones").where("tareaId", "==", tarea.id));

      const fijos = { ...tarea.fijos };
      for (const [dow, desde] of inicio) fijos[String(dow)] = { uid: body.uid!, desde };
      tx.update(tareaRef, { fijos });

      for (const d of guardadas.docs) {
        const fecha = d.get("fecha") as string;
        const desde = inicio.get(diaSemana(fecha));
        if (!desde || fecha < desde) continue;
        const estado = d.get("estado") as string;
        if (estado === "quitada") tx.delete(d.ref); // la nueva regla vuelve a cubrir ese día
        else if (estado === "pendiente") tx.update(d.ref, { uid: body.uid, fija: true, actualizadoEn: FieldValue.serverTimestamp() });
      }
      return { guardadas: fechas.length, omitidas: 0, repetir: true, tarea: tarea.nombre };
    }

    const refs = fechas.map((f) => hogarRef.collection("asignaciones").doc(idAsignacion(f, tarea.id)));
    const actuales = await Promise.all(refs.map((r) => tx.get(r)));

    let guardadas = 0;
    let omitidas = 0;
    actuales.forEach((snap, i) => {
      const estado = snap.exists ? snap.get("estado") : null;
      if (estado === "hecho" || estado === "no_hecho") {
        omitidas++;
        return;
      }
      tx.set(refs[i], {
        ...docAsignacion(tarea, fechas[i], body.uid!, false),
        actualizadoEn: FieldValue.serverTimestamp(),
      });
      guardadas++;
    });
    return { guardadas, omitidas, repetir: false, tarea: tarea.nombre };
  });

  const { tarea, ...resto } = resultado;
  const avisos: Pendiente[] =
    body.uid !== user.uid && resultado.guardadas > 0
      ? [
          {
            uids: [body.uid!],
            aviso: {
              tipo: "tareas",
              titulo: "Tienes una tarea nueva",
              cuerpo: repetir
                ? `${tarea}: te toca los ${fechas.map((f) => DIAS_NOMBRE[diaSemana(f)]).join(", ")}, cada semana.`
                : `${tarea}: ${resultado.guardadas === 1 ? "1 día" : `${resultado.guardadas} días`} de esta semana.`,
              url: "/quehaceres",
            },
          },
        ]
      : [];
  return responderConAvisos({ ...resto, avisos });
});
