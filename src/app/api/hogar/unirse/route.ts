import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, handler, leerJson, limpiarTexto, requireUser } from "@/lib/server/api";
import { LARGO_CODIGO, LIMITES, normalizarCodigo } from "@/lib/hogar/types";

/** Une al usuario a un hogar con el código familiar. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser(req);
  const body = await leerJson<{ codigo: string; nombre: string }>(req);
  const nombre = limpiarTexto(body.nombre, LIMITES.nombre, "tu nombre");
  const codigo = normalizarCodigo(typeof body.codigo === "string" ? body.codigo : "");
  if (codigo.length !== LARGO_CODIGO) throw new ApiError(400, `El código tiene ${LARGO_CODIGO} letras o números.`);

  const db = adminDb();
  const usuarioRef = db.collection("usuarios").doc(user.uid);

  const hogarId = await db.runTransaction(async (tx) => {
    const [usuario, codigoSnap] = await Promise.all([
      tx.get(usuarioRef),
      tx.get(db.collection("codigos").doc(codigo)),
    ]);
    if (usuario.get("hogarId")) throw new ApiError(409, "Ya perteneces a un hogar.");
    if (!codigoSnap.exists) throw new ApiError(404, "Ese código no existe. Revísalo con quien te invitó.");

    const hogarId = codigoSnap.get("hogarId") as string;
    const hogarRef = db.collection("hogares").doc(hogarId);
    const integrantes = await tx.get(hogarRef.collection("integrantes"));
    if (integrantes.size >= LIMITES.integrantesMax) {
      throw new ApiError(409, `Este hogar ya tiene ${LIMITES.integrantesMax} integrantes.`);
    }

    // Siguiente color libre (DESIGN.md: "un integrante nuevo toma el siguiente color libre").
    const usados = new Set(integrantes.docs.map((d) => d.get("color") as number));
    let color = 0;
    while (usados.has(color)) color++;

    tx.set(hogarRef.collection("integrantes").doc(user.uid), {
      nombre,
      email: user.email ?? null,
      rol: "miembro",
      color,
      unidoEn: FieldValue.serverTimestamp(),
    });
    tx.update(hogarRef, { integrantes: integrantes.size + 1 });
    tx.set(usuarioRef, { hogarId, nombre }, { merge: true });
    return hogarId;
  });

  return Response.json({ hogarId });
});
