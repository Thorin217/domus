// Recalcula el saldo de puntos de cada integrante: puntos de sus tareas hechas − premios canjeados.
// Uso: node scripts/recalcular-puntos.mjs            (muestra los cambios sin guardar)
//      node scripts/recalcular-puntos.mjs --guardar  (los guarda)
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({ credential: cert(JSON.parse(readFileSync(new URL("../service-account.json", import.meta.url)))) });
const db = getFirestore();
const guardar = process.argv.includes("--guardar");

for (const hogar of (await db.collection("hogares").get()).docs) {
  const saldo = new Map();
  for (const a of (await hogar.ref.collection("asignaciones").where("estado", "==", "hecho").get()).docs) {
    saldo.set(a.get("uid"), (saldo.get(a.get("uid")) ?? 0) + (a.get("puntos") ?? 0));
  }
  for (const v of (await hogar.ref.collection("votaciones").where("tipo", "==", "canje").get()).docs) {
    if (v.get("estado") === "aprobada") saldo.set(v.get("objetivo"), (saldo.get(v.get("objetivo")) ?? 0) - (v.get("puntos") ?? 0));
  }
  for (const i of (await hogar.ref.collection("integrantes").get()).docs) {
    const nuevo = saldo.get(i.id) ?? 0;
    const actual = i.get("puntos");
    if (actual === nuevo) continue;
    console.log(`${hogar.get("nombre")} · ${i.get("nombre")}: ${actual ?? "—"} → ${nuevo}`);
    if (guardar) await i.ref.update({ puntos: nuevo });
  }
}
console.log(guardar ? "Listo." : "Vista previa: agrega --guardar para aplicar.");
