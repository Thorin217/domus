import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { handler, leerJson, miembroActual, requireUser } from "@/lib/server/api";
import { categoriasDe, datosCompra } from "@/lib/server/gastos";

/** Cualquier integrante anota una compra. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser(req);
  const body = (await leerJson<Record<string, unknown>>(req)) as Record<string, unknown>;
  const db = adminDb();

  const id = await db.runTransaction(async (tx) => {
    const { hogarRef } = await miembroActual(user.uid, tx);
    const [hogar, integrantes] = await Promise.all([tx.get(hogarRef), tx.get(hogarRef.collection("integrantes"))]);
    const datos = datosCompra(body, categoriasDe(hogar.data() ?? {}), new Set(integrantes.docs.map((d) => d.id)));
    const ref = hogarRef.collection("compras").doc();
    tx.set(ref, { ...datos, creadoPor: user.uid, gastoFijoId: null, creadoEn: FieldValue.serverTimestamp() });
    return ref.id;
  });

  return Response.json({ id });
});
