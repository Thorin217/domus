import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, handler, leerJson, miembroActual, requireUser } from "@/lib/server/api";
import { noEsFuturo } from "@/lib/server/quehaceres";
import { hoyUTC, textoOpcional } from "@/lib/server/premios";
import { responderConAvisos, type Pendiente } from "@/lib/server/push";
import { LIMITES_PREMIOS } from "@/lib/premios/types";
import { sumarDias } from "@/lib/quehaceres/types";

/** Días hacia atrás en los que todavía se puede calificar una tarea. */
const VENTANA = 14;

/** Califica (1 a 5 estrellas) una tarea hecha por otro integrante. Volver a calificar reemplaza la nota. */
export const POST = handler(async (req: Request, ctx: RouteContext<"/api/hogar/asignaciones/[id]/calificar">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const body = await leerJson<{ estrellas: number; comentario: string }>(req);
  const estrellas = body.estrellas;
  if (typeof estrellas !== "number" || !Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) {
    throw new ApiError(400, "Elige de 1 a 5 estrellas.");
  }
  const comentario = textoOpcional(body.comentario, LIMITES_PREMIOS.comentario, "el comentario");
  const db = adminDb();

  const r = await db.runTransaction(async (tx) => {
    const { hogarRef, integrante } = await miembroActual(user.uid, tx);
    const ref = hogarRef.collection("asignaciones").doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get("estado") !== "hecho") throw new ApiError(404, "Solo se califican tareas hechas.");
    if (snap.get("uid") === user.uid) throw new ApiError(403, "No puedes calificar tus propias tareas.");
    const fecha = snap.get("fecha") as string;
    noEsFuturo(fecha);
    if (fecha < sumarDias(hoyUTC(), -VENTANA)) throw new ApiError(400, `Solo se califican tareas de los últimos ${VENTANA} días.`);
    const nueva = !snap.get(`calificaciones.${user.uid}`);
    tx.update(ref, new FieldPath("calificaciones", user.uid), { estrellas, comentario, en: FieldValue.serverTimestamp() });
    const avisos: Pendiente[] = nueva
      ? [
          {
            uids: [snap.get("uid") as string],
            aviso: {
              tipo: "tareas",
              titulo: `${integrante.nombre} te calificó: ${"★".repeat(estrellas)}${"☆".repeat(5 - estrellas)}`,
              cuerpo: `${snap.get("tarea")}${comentario ? ` — “${comentario}”` : ""}`,
              url: "/premios",
            },
          },
        ]
      : [];
    return { ok: true, avisos };
  });

  return responderConAvisos(r);
});
