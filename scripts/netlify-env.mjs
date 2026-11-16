// Genera .env.netlify con las variables que necesita el sitio en Netlify, listo para
// "Site configuration → Environment variables → Import from a .env file".
// El archivo queda fuera de git (.env*) y con permisos 600. NO lo pegues en chats ni lo subas.
//
// Uso: node scripts/netlify-env.mjs
import { readFileSync, writeFileSync, chmodSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

// Solo los campos que usa el Admin SDK: cabe en el límite de ~4 KB de variables de las funciones.
const sa = JSON.parse(readFileSync("service-account.json", "utf8"));
const cuenta = JSON.stringify({ project_id: sa.project_id, client_email: sa.client_email, private_key: sa.private_key });

const funciones = { FIREBASE_SERVICE_ACCOUNT: cuenta };
const publicas = {};
for (const [k, v] of Object.entries(env)) {
  if (k === "FIREBASE_SERVICE_ACCOUNT" || k === "FIREBASE_SERVICE_ACCOUNT_PATH") continue;
  (k.startsWith("NEXT_PUBLIC_") ? publicas : funciones)[k] = v;
}

const linea = (k, v) => `${k}='${v.replace(/'/g, "'\\''")}'`;
const salida = [
  "# Funciones y build (secretas):",
  ...Object.entries(funciones).map(([k, v]) => linea(k, v)),
  "",
  "# Solo build (NEXT_PUBLIC_*): en Netlify, limita su alcance a 'Builds' para que no cuenten en el límite de las funciones.",
  ...Object.entries(publicas).map(([k, v]) => linea(k, v)),
  "",
].join("\n");

writeFileSync(".env.netlify", salida);
chmodSync(".env.netlify", 0o600);

const bytes = Object.entries(funciones).reduce((s, [k, v]) => s + k.length + v.length + 1, 0);
console.log(`Listo: .env.netlify (${Object.keys(funciones).length} secretas, ${Object.keys(publicas).length} públicas).`);
console.log(`Tamaño de las variables de funciones: ${bytes} bytes de ~4096.`);
if (env.VAPID_SUBJECT?.includes("example.com")) console.log("Ojo: VAPID_SUBJECT sigue siendo provisional; pon tu correo o dominio.");
