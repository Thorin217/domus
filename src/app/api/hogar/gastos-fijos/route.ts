import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, adminActual, handler, leerJson, requireUser } from "@/lib/server/api";
import { categoriasDe, datosFijo } from "@/lib/server/gastos";
import { esMes } from "@/lib/gastos/types";

/** Admin: agrega un gasto fijo (alquiler, luz…) que se repite cada mes desde `desde`. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser(req);
  const body = (await leerJson<Record<string, unknown>>(req)) as Record<string, unknown>;
  if (!esMes(body.desde)) throw new ApiError(400, "Mes inválido.");
  const db = adminDb();

  const id = await db.runTransaction(async (tx) => {
    const { hogarRef } = await adminActual(user.uid, tx);
    const hogar = await tx.get(hogarRef);
    const datos = datosFijo(body, categoriasDe(hogar.data() ?? {}), false);
    const ref = hogarRef.collection("gastosFijos").doc();
    tx.set(ref, { ...datos, desde: body.desde, activo: true, creadoEn: FieldValue.serverTimestamp() });
    return ref.id;
  });

  return Response.json({ id });
});
