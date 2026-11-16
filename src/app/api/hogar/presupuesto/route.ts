import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, adminActual, handler, leerJson, limpiarTexto, requireUser } from "@/lib/server/api";
import { LIMITES_GASTOS, finanzasDe, type Categoria } from "@/lib/gastos/types";

function monto(v: unknown) {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 100 || v > LIMITES_GASTOS.montoMax) {
    throw new ApiError(400, "Los montos del presupuesto van de $1 a $100,000.");
  }
  return v;
}

/** "Vivienda y servicios" → "vivienda-y-servicios" (único). */
function idNuevo(nombre: string, usados: Set<string>) {
  const base =
    nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "categoria";
  let id = base;
  for (let i = 2; usados.has(id); i++) id = `${base}-${i}`;
  usados.add(id);
  return id;
}

/**
 * Admin: presupuesto mensual (total y por categoría) y lista de categorías.
 * Las categorías se envían completas: con `id` se renombran; sin `id` son nuevas. Las que faltan se
 * quitan de la lista (las compras viejas conservan su categoría y se muestran como "Otra").
 * Cada categoría puede traer su `tope` (centavos o null); si alguna lo trae, reemplaza los topes.
 */
export const PATCH = handler(async (req: Request) => {
  const user = await requireUser(req);
  const body = await leerJson<{
    total: number | null;
    porCategoria: Record<string, number>;
    categorias: (Partial<Categoria> & { tope?: number | null })[];
  }>(req);
  const db = adminDb();

  const r = await db.runTransaction(async (tx) => {
    const { hogarRef } = await adminActual(user.uid, tx);
    const actual = finanzasDe((await tx.get(hogarRef)).data() ?? {});
    let categorias = actual.categorias;
    let topes: Record<string, number> | null = null;

    if (body.categorias !== undefined) {
      if (!Array.isArray(body.categorias) || !body.categorias.length || body.categorias.length > LIMITES_GASTOS.categoriasMax) {
        throw new ApiError(400, `Deja entre 1 y ${LIMITES_GASTOS.categoriasMax} categorías.`);
      }
      const usados = new Set(actual.categorias.map((c) => c.id));
      const nombres = new Set<string>();
      categorias = body.categorias.map((c) => {
        const nombre = limpiarTexto(c?.nombre, LIMITES_GASTOS.categoria, "el nombre de la categoría");
        if (nombres.has(nombre.toLowerCase())) throw new ApiError(400, `“${nombre}” está repetida.`);
        nombres.add(nombre.toLowerCase());
        const id = typeof c.id === "string" && actual.categorias.some((x) => x.id === c.id) ? c.id : idNuevo(nombre, usados);
        if (c.tope !== undefined) {
          topes ??= {};
          if (c.tope !== null) topes[id] = monto(c.tope);
        }
        return { id, nombre };
      });
    }

    const presupuesto = { ...actual.presupuesto };
    if (body.total !== undefined) presupuesto.total = body.total === null ? null : monto(body.total);
    if (body.porCategoria !== undefined) {
      if (typeof body.porCategoria !== "object" || body.porCategoria === null) throw new ApiError(400, "Dato inválido.");
      presupuesto.porCategoria = Object.fromEntries(Object.entries(body.porCategoria).map(([k, v]) => [k, monto(v)]));
    }
    if (topes) presupuesto.porCategoria = topes;
    // Solo topes de categorías que existen.
    presupuesto.porCategoria = Object.fromEntries(
      Object.entries(presupuesto.porCategoria).filter(([k]) => categorias.some((c) => c.id === k)),
    );

    tx.update(hogarRef, { categorias, presupuesto, presupuestoMensual: FieldValue.delete() });
    return { categorias, presupuesto };
  });

  return Response.json(r);
});
