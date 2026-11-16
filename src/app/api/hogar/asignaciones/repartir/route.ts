import { responderConAvisos, type Pendiente } from "@/lib/server/push";
import { FieldValue } from "firebase-admin/firestore";
import { ApiError, adminActual, handler, leerJson, requireUser } from "@/lib/server/api";
import { aTarea, docAsignacion, validarFechas } from "@/lib/server/quehaceres";
import { repartir } from "@/lib/quehaceres/repartir";
import { fijaEn } from "@/lib/quehaceres/fijas";
import { idAsignacion, sumarDias, type EstadoGuardado } from "@/lib/quehaceres/types";

/** Admin: reparte al azar las tareas activas en las fechas pedidas (normalmente una semana). */
export const POST = handler(async (req: Request) => {
  const user = await requireUser(req);
  const body = await leerJson<{ fechas: string[]; reemplazar: boolean }>(req);
  const fechas = validarFechas(body.fechas);
  const reemplazar = body.reemplazar === true;
  const { db, hogarRef } = await adminActual(user.uid);

  const resultado = await db.runTransaction(async (tx) => {
    const desde = sumarDias(fechas[0], -1); // el día anterior sirve para no repetir "ayer"
    const hasta = fechas[fechas.length - 1];
    const [integrantes, tareasSnap, asignSnap] = await Promise.all([
      tx.get(hogarRef.collection("integrantes")),
      tx.get(hogarRef.collection("tareas")),
      tx.get(hogarRef.collection("asignaciones").where("fecha", ">=", desde).where("fecha", "<=", hasta)),
    ]);

    const tareas = tareasSnap.docs.map((d) => aTarea(d.id, d.data())).filter((t) => t.activa);
    if (!tareas.length) throw new ApiError(409, "Primero crea al menos una tarea.");

    const existentes = new Map(
      asignSnap.docs.map((d) => {
        const estado = d.get("estado") as EstadoGuardado;
        return [
          d.id,
          {
            uid: d.get("uid") as string,
            estado,
            puntos: estado === "quitada" ? 0 : ((d.get("puntos") as number) ?? 0),
            fija: d.get("fija") === true,
          },
        ];
      }),
    );
    // Las asignaciones fijas (aunque no estén guardadas) ocupan su lugar y cuentan para la carga.
    for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
      for (const t of tareas) {
        const fija = fijaEn(t, f);
        const id = idAsignacion(f, t.id);
        if (fija && !existentes.has(id)) existentes.set(id, { uid: fija.uid, estado: "pendiente", puntos: t.puntos, fija: true });
      }
    }

    const reparto = repartir({
      fechas,
      tareas,
      miembros: integrantes.docs.map((d) => d.id),
      existentes,
      reemplazar,
    });

    const porId = new Map(tareas.map((t) => [t.id, t]));
    for (const r of reparto) {
      const t = porId.get(r.tareaId)!;
      tx.set(hogarRef.collection("asignaciones").doc(idAsignacion(r.fecha, r.tareaId)), {
        ...docAsignacion(t, r.fecha, r.uid, false),
        actualizadoEn: FieldValue.serverTimestamp(),
      });
    }
    // A cada quien (menos al admin que reparte), cuántas tareas le tocaron.
    const porPersona = new Map<string, number>();
    for (const r of reparto) porPersona.set(r.uid, (porPersona.get(r.uid) ?? 0) + 1);
    porPersona.delete(user.uid);
    const avisos: Pendiente[] = [...porPersona].map(([uid, n]) => ({
      uids: [uid],
      aviso: {
        tipo: "tareas",
        titulo: "Ya está el horario de la semana",
        cuerpo: `Te ${n === 1 ? "tocó 1 tarea" : `tocaron ${n} tareas`}. Mira qué días.`,
        url: "/quehaceres",
        tag: "reparto",
      },
    }));
    return { asignadas: reparto.length, avisos };
  });

  return responderConAvisos(resultado);
});
