import { handler, requireUser } from "@/lib/server/api";
import { notificar } from "@/lib/server/push";

/** Manda un aviso de prueba a todos los dispositivos del usuario. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser(req);
  const r = await notificar([user.uid], {
    tipo: "tareas",
    titulo: "¡Listo! Domus te avisará aquí",
    cuerpo: "Así te van a llegar las tareas del día, las votaciones y los pagos por vencer.",
    url: "/familia",
    tag: "prueba",
  }, { ignorarPreferencias: true });
  return Response.json(r);
});
