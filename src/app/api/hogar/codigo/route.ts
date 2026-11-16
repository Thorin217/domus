import { adminDb } from "@/lib/server/firebase-admin";
import { adminActual, codigoLibre, handler, requireUser } from "@/lib/server/api";

/** Admin: genera un código nuevo; el anterior deja de funcionar. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser(req);
  const db = adminDb();

  const codigo = await db.runTransaction(async (tx) => {
    const { hogarRef, hogarId } = await adminActual(user.uid, tx);
    const hogar = await tx.get(hogarRef);
    const anterior = hogar.get("codigo") as string | undefined;
    const codigo = await codigoLibre(db, tx);

    if (anterior) tx.delete(db.collection("codigos").doc(anterior));
    tx.set(db.collection("codigos").doc(codigo), { hogarId });
    tx.update(hogarRef, { codigo });
    return codigo;
  });

  return Response.json({ codigo });
});
