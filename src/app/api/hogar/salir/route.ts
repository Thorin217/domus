import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, handler, miembroActual, requireUser } from "@/lib/server/api";
import { liberarPendientes } from "@/lib/server/quehaceres";

/** El usuario sale de su hogar. Si es el último integrante, el hogar se borra. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser(req);
  const db = adminDb();

  const { hogarRef, borrado } = await db.runTransaction(async (tx) => {
    const { hogarRef, integrante } = await miembroActual(user.uid, tx);
    const [hogar, integrantes] = await Promise.all([tx.get(hogarRef), tx.get(hogarRef.collection("integrantes"))]);
    const otros = integrantes.docs.filter((d) => d.id !== user.uid);

    if (otros.length === 0) {
      // Último integrante: se borra el hogar completo.
      const codigo = hogar.get("codigo") as string | undefined;
      if (codigo) tx.delete(db.collection("codigos").doc(codigo));
      tx.delete(hogarRef.collection("integrantes").doc(user.uid));
      tx.delete(hogarRef);
      tx.set(db.collection("usuarios").doc(user.uid), { hogarId: null }, { merge: true });
      return { hogarRef, borrado: true };
    }

    const quedaAdmin = otros.some((d) => d.get("rol") === "admin");
    if (integrante.rol === "admin" && !quedaAdmin) {
      throw new ApiError(409, "Eres el único admin. Nombra a otro integrante como admin antes de salir.");
    }
    tx.delete(hogarRef.collection("integrantes").doc(user.uid));
    tx.update(hogarRef, { integrantes: otros.length });
    tx.set(db.collection("usuarios").doc(user.uid), { hogarId: null }, { merge: true });
    return { hogarRef, borrado: false };
  });

  // Fuera de la transacción: limpieza que puede tocar muchos documentos.
  if (borrado) await db.recursiveDelete(hogarRef);
  else await liberarPendientes(hogarRef, user.uid);

  return Response.json({ ok: true });
});
