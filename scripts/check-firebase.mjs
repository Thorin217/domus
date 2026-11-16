// Verifica que Auth (correo/contraseña) y Firestore estén activos en el proyecto.
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const sa = JSON.parse(readFileSync(new URL("../service-account.json", import.meta.url)));
const app = initializeApp({ credential: cert(sa) });

const token = (await app.options.credential.getAccessToken()).access_token;
const res = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${sa.project_id}/config`, {
  headers: { Authorization: `Bearer ${token}` },
});
const cfg = await res.json();
if (!res.ok) console.log("Auth:", res.status, cfg.error?.message);
else console.log("Auth correo/contraseña:", cfg.signIn?.email?.enabled ?? false, "| dominios:", cfg.authorizedDomains?.join(", "));

const idp = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${sa.project_id}/defaultSupportedIdpConfigs`, {
  headers: { Authorization: `Bearer ${token}` },
});
const idpJson = await idp.json();
console.log("Proveedores extra:", (idpJson.defaultSupportedIdpConfigs ?? []).map((p) => `${p.name.split("/").pop()}=${p.enabled}`).join(", ") || "ninguno");

try {
  const cols = await getFirestore().listCollections();
  console.log("Firestore OK. Colecciones:", cols.map((c) => c.id).join(", ") || "(vacía)");
} catch (e) {
  console.log("Firestore ERROR:", e.code, e.message.split("\n")[0]);
}
